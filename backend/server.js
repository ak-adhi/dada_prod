const express = require('express');
const cors = require('cors');

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

// History dashboard (dummy data)
app.get('/api/history', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, model: 'GPT-3', usecase: 'QA', status: 'Success' },
      { id: 2, model: 'GPT-4', usecase: 'Prompt Injection', status: 'Blocked' },
    ],
  });
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
