const fs = require('fs');
const path = require('path');
const { pool, init } = require('./db');

const FILE = path.join(__dirname, 'seed_data', 'final_results.json');

async function main() {
  await init();

  const text = fs.readFileSync(FILE, 'utf-8');
  const rows = JSON.parse(text);

  console.log(`Seeding ${rows.length} rows from final_results.json`);
  let idx = 0;

  for (const r of rows) {
    idx += 1;
    const run_id = 'final-results';
    const model = r.model_name || r.model || 'unknown';
    const usecase = r.usecase || 'unknown';
    const latency = r.latency_ms ?? r.latency ?? 0;

    await pool.query(
      `INSERT INTO events
       (ts, run_id, attack_idx, model_name, usecase, attack_family, attack_prompt, model_response, attack_success, latency_ms)
       VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [
        run_id,
        idx,
        model,
        usecase,
        r.attack_family || 'unknown',
        r.attack_prompt || '',
        r.model_response || '',
        !!r.attack_success,
        Number(latency),
      ]
    );
  }

  console.log('Seed complete.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
