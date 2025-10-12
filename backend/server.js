const express = require('express');
const cors = require('cors');
const { query } = require('./db/db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000;

// ---- Mock endpoints kept (models/usecases/attacks/defence/taxonomy) ----
// If you still want the other mock endpoints, keep them here:
const models = [
  { id: 1, name: 'GPT-3' },
  { id: 2, name: 'GPT-4' },
  { id: 3, name: 'Custom LLM' },
];
const usecases = [
  { id: 1, name: 'Question Answering' },
  { id: 2, name: 'Text Classification' },
  { id: 3, name: 'Prompt Injection Test' },
];

app.get('/api/models', (_req, res) => {
  res.json({ success: true, data: models });
});
app.get('/api/usecases', (_req, res) => {
  res.json({ success: true, data: usecases });
});
app.post('/api/attacks/run', (req, res) => {
  const { modelId, usecaseId } = req.body || {};
  res.json({
    success: true,
    message: `Attack simulated for model ${modelId}, usecase ${usecaseId}`,
  });
});
app.post('/api/defence/activate', (_req, res) => {
  res.json({ success: true, message: 'Defence activated (mock)' });
});
app.get('/api/taxonomy', (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, attack: 'SQL Injection' },
      { id: 2, attack: 'Prompt Injection' },
    ],
  });
});

// History endpoint backed by Postgres ----
app.get('/api/history', async (req, res) => {
  try {
    const model = (req.query.model || 'All').trim();
    const usecase = (req.query.usecase || 'All').trim();
    const family = (req.query.family || 'All').trim();
    const successStr = (req.query.success || 'All').trim(); // 'All' | 'True' | 'False'

    // Filters for dropdowns
    const modelsQ = await query(`SELECT DISTINCT model_name AS m FROM dada.eval_results ORDER BY 1`);
    const usecasesQ = await query(`SELECT DISTINCT usecase AS u FROM dada.eval_results ORDER BY 1`);
    const familiesQ = await query(`SELECT DISTINCT attack_family AS f FROM dada.eval_results ORDER BY 1`);
    const successesQ = await query(`SELECT DISTINCT attack_success AS s FROM dada.eval_results ORDER BY 1`);

    const filters = {
      models: ['All', ...modelsQ.rows.map(r => r.m)],
      usecases: ['All', ...usecasesQ.rows.map(r => r.u)],
      families: ['All', ...familiesQ.rows.map(r => r.f)],
      successes: ['All', ...successesQ.rows.map(r => (r.s ? 'True' : 'False'))]
    };

    // Build WHERE dynamically
    const whereParts = [];
    const params = [];
    if (model !== 'All') {
      params.push(model);
      whereParts.push(`model_name = $${params.length}`);
    }
    if (usecase !== 'All') {
      params.push(usecase);
      whereParts.push(`usecase = $${params.length}`);
    }
    if (family !== 'All') {
      params.push(family);
      whereParts.push(`attack_family = $${params.length}`);
    }
    if (successStr !== 'All') {
      params.push(successStr === 'True'); // boolean
      whereParts.push(`attack_success = $${params.length}`);
    }
    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // Summary over the filtered set
    const summarySql = `
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN attack_success THEN 1 ELSE 0 END)::int AS success_count,
        SUM(CASE WHEN NOT attack_success THEN 1 ELSE 0 END)::int AS failure_count,
        ROUND(
          CASE WHEN COUNT(*) = 0 THEN 0
               ELSE 100.0 * SUM(CASE WHEN attack_success THEN 1 ELSE 0 END) / COUNT(*)
          END::numeric, 2
        )::float AS success_rate,
        ROUND(AVG(latency)::numeric, 2)::float AS avg_latency
      FROM dada.eval_results
      ${where}
    `;
    const s = await query(summarySql, params);
    const summary = s.rows[0] || {
      total: 0, success_count: 0, failure_count: 0, success_rate: 0, avg_latency: 0,
    };

    // Rows (latest first, cap 2000)
    const rowsSql = `
      SELECT id, model_name, usecase, attack_family, attack_name, attack_success, latency, attack_prompt, model_response
      FROM dada.eval_results
      ${where}
      ORDER BY id DESC
      LIMIT 2000
    `;
    const r = await query(rowsSql, params);

    const data = r.rows.map(row => ({
      id: row.id,
      model: row.model_name,
      usecase: row.usecase,
      attack_family: row.attack_family,
      attack_name: row.attack_name || 'unknown',
      success: !!row.attack_success,
      latency: row.latency,
      prompt: row.attack_prompt,
      response: row.model_response,
    }));

    return res.json({ success: true, filters, summary, data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: e.message });
  }
});


app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});
