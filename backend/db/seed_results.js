/**
 * Seeds dada.eval_results from ../data/final_results.json
 * Supports fields:
 *  - attack_name, attack_family, attack_prompt, model_response
 *  - attack_success (boolean), latency (or latency_ms), model_name, usecase
 *  - defended (boolean) [new] OR defence_active (boolean) [old]
 */
const fs = require('fs');
const path = require('path');
const { query, pool } = require('./db');

async function main() {
  const jsonPath = path.resolve(__dirname, '../data/final_results.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('final_results.json not found at', jsonPath);
    process.exit(1);
  }

  let rows;
  try {
    rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!Array.isArray(rows)) throw new Error('JSON root must be an array');
  } catch (e) {
    console.error('Invalid final_results.json:', e.message);
    process.exit(1);
  }

  console.log(`Seeding ${rows.length} rows into dada.eval_results ...`);

  // Upsert on (attack_prompt, model_name, usecase)
  const sql = `
    INSERT INTO dada.eval_results
      (attack_family, attack_prompt, model_response, attack_success, latency, model_name, usecase, attack_name, defence_active)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (attack_prompt, model_name, usecase) DO UPDATE
      SET model_response = EXCLUDED.model_response,
          attack_success = EXCLUDED.attack_success,
          latency       = EXCLUDED.latency,
          attack_family = EXCLUDED.attack_family,
          attack_name   = EXCLUDED.attack_name,
          defence_active= EXCLUDED.defence_active,
          created_at    = NOW()
  `;

  let inserted = 0;
  for (const r of rows) {
    // Prefer new 'latency' if present; fall back to old 'latency_ms'
    const latency =
      typeof r.latency === 'number' ? r.latency
      : typeof r.latency_ms === 'number' ? r.latency_ms
      : null;

    // Prefer new 'defended' if present; fall back to old 'defence_active'
    const defenceActive =
      typeof r.defended === 'boolean' ? r.defended
      : typeof r.defence_active === 'boolean' ? r.defence_active
      : false;

    const values = [
      r.attack_family ?? '',
      r.attack_prompt ?? '',
      r.model_response ?? '',
      !!r.attack_success,
      latency,
      r.model_name ?? 'unknown',
      r.usecase ?? 'unknown',
      r.attack_name ?? 'unknown',
      defenceActive,
    ];

    try {
      await query(sql, values);
      inserted++;
      if (inserted % 100 === 0) console.log(`  ...${inserted}`);
    } catch (e) {
      // keep inserting remaining rows
      console.warn('Row insert failed (skipped):', e.message);
    }
  }

  console.log(`Done. Upserted ${inserted} rows.`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
