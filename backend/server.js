const express = require('express');
const cors = require('cors');
const { query } = require('./db/db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000; // mock server port

// === MOCK DATA ===
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

// === ENDPOINTS ===

// List models
app.get('/api/models', (req, res) => {
  res.json({ success: true, data: models });
});

// List usecases
app.get('/api/usecases', (req, res) => {
  res.json({ success: true, data: usecases });
});

// Run attack (just a dummy response)
app.post('/api/attacks/run', (req, res) => {
  const { modelId, usecaseId } = req.body;
  res.json({
    success: true,
    message: `Attack simulated for model ${modelId}, usecase ${usecaseId}`,
  });
});

// Activate defence
app.post('/api/defence/activate', (req, res) => {
  res.json({ success: true, message: 'Defence activated (mock)' });
});

// // History dashboard (dummy data)
// app.get('/api/history', (req, res) => {
//   res.json({
//     success: true,
//     data: [
//       { id: 1, model: 'GPT-3', usecase: 'QA', status: 'Success' },
//       { id: 2, model: 'GPT-4', usecase: 'Prompt Injection', status: 'Blocked' },
//     ],
//   });
// });

app.get('/api/history', async (req, res) => {
  try {
    const model = (req.query.model || 'All').trim();
    const usecase = (req.query.usecase || 'All').trim();

    // Distinct lists for filters
    const [modelsRows, usecasesRows] = await Promise.all([
      query(`SELECT DISTINCT model_name FROM dada.eval_results ORDER BY model_name`),
      query(`SELECT DISTINCT usecase FROM dada.eval_results ORDER BY usecase`),
    ]);
    const filterModels = ['All', ...modelsRows.rows.map(r => r.model_name)];
    const filterUsecases = ['All', ...usecasesRows.rows.map(r => r.usecase)];

    // Apply filters
    const where = [];
    const params = [];
    if (model && model !== 'All') { params.push(model); where.push(`model_name = $${params.length}`); }
    if (usecase && usecase !== 'All') { params.push(usecase); where.push(`usecase = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Fetch rows
    const rowsSql = `
      SELECT id, attack_family, attack_prompt, model_response, attack_success, latency, model_name, usecase
      FROM dada.eval_results
      ${whereSql}
      ORDER BY id DESC
      LIMIT 2000
    `;
    const rows = (await query(rowsSql, params)).rows;

    // Compute summary
    const total = rows.length;
    const successCount = rows.filter(r => !!r.attack_success).length;   // "attack succeeded"
    const failureCount = total - successCount;                          // "blocked"
    const successRate = total ? Math.round((successCount / total) * 1000) / 10 : 0;
    const avgLatency = total
      ? Math.round((rows.reduce((s, r) => s + (r.latency || 0), 0) / total) * 10) / 10
      : 0;

    // Map to the simple card-like objects your UI used before
    // const data = rows.map(r => ({
    //   id: r.id,
    //   model: r.model_name,
    //   usecase: r.usecase,
    //   attack_family: r.attack_family,
    //   // If you want the old labels exactly: 'Success' vs 'Blocked', change below.
    //   status: r.attack_success ? 'Attack Succeeded' : 'Blocked',
    //   latency: r.latency,
    // }));

    const data = rows.map(r => ({
      id: r.id,
      model: r.model_name,
      usecase: r.usecase,
      attack_family: r.attack_family,
      success: !!r.attack_success,                               
      status: r.attack_success ? 'True' : 'False',
      latency: r.latency,
      prompt: r.attack_prompt,                                   
      response: r.model_response                            
    }));

    res.json({
      success: true,
      filters: { models: filterModels, usecases: filterUsecases },
      summary: {
        total,
        success_count: successCount,
        failure_count: failureCount,
        success_rate: successRate,    // %
        avg_latency: avgLatency       // ms
      },
      data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});



// Taxonomy (dummy attack tree)
app.get('/api/taxonomy', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, attack: 'SQL Injection' },
      { id: 2, attack: 'Prompt Injection' },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});
