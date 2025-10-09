/**
 * Seeds dada.eval_results from /data/final_results.json
 * Current JSON contains only qwen (rental, banking, academic) – works for now.
 * Later, re-run after you merge vicuna / ollama and insurance.
 */
const fs = require('fs');
const path = require('path');
const { query, pool } = require('./db');

async function main() {
  const jsonPath = path.resolve(__dirname, '../../backend/data/final_results.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('final_results.json not found at', jsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const rows = JSON.parse(raw);

  console.log(`Seeding ${rows.length} rows into dada.eval_results ...`);

  const sql = `
    INSERT INTO dada.eval_results
      (attack_family, attack_prompt, model_response, attack_success, latency, model_name, usecase)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (attack_prompt, model_name, usecase) DO NOTHING
  `;

  let inserted = 0;
  for (const r of rows) {
    // Defensive normalization in case future merged files add fields
    const values = [
      r.attack_family ?? null,
      r.attack_prompt ?? '',
      r.model_response ?? '',
      r.attack_success ?? false,
      r.latency ?? null,
      r.model_name ?? 'unknown',
      r.usecase ?? 'unknown',
    ];
    await query(sql, values);
    inserted++;
    if (inserted % 100 === 0) console.log(`  ...${inserted}`);
  }

  console.log(`Done. Seed attempted for ${inserted} rows (duplicates skipped).`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
