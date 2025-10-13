const express = require('express');
const cors = require('cors');
const client = require('prom-client');

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

// === PROMETHEUS METRICS ===
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const attacksStarted = new client.Counter({
  name: 'dada_attacks_started_total',
  help: 'Total attacks started',
  labelNames: ['family', 'model', 'usecase'],
});
const attacksSucceeded = new client.Counter({
  name: 'dada_attacks_succeeded_total',
  help: 'Total attacks succeeded',
  labelNames: ['family', 'model', 'usecase', 'defence'],
});
const attacksFailed = new client.Counter({
  name: 'dada_attacks_failed_total',
  help: 'Total attacks failed',
  labelNames: ['family', 'model', 'usecase', 'reason'],
});
const attackDuration = new client.Histogram({
  name: 'dada_attack_duration_seconds',
  help: 'Attack wall time',
  labelNames: ['family', 'model', 'usecase'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
});
const runningAttacks = new client.Gauge({
  name: 'dada_running_attacks',
  help: 'In-flight attacks',
  labelNames: ['model'],
});

register.registerMetric(attacksStarted);
register.registerMetric(attacksSucceeded);
register.registerMetric(attacksFailed);
register.registerMetric(attackDuration);
register.registerMetric(runningAttacks);

// === ENDPOINTS ===

// List models
app.get('/api/models', (req, res) => {
  res.json({ success: true, data: models });
});

// List usecases
app.get('/api/usecases', (req, res) => {
  res.json({ success: true, data: usecases });
});

// Run attack (demo + metrics)
app.post('/api/attacks/run', async (req, res) => {
  const { modelId, usecaseId, family, model, usecase, defence } = req.body || {};

  const modelLabel =
    model ||
    (models.find((m) => m.id === Number(modelId))?.name) ||
    'unknown';
  const usecaseLabel =
    usecase ||
    (usecases.find((u) => u.id === Number(usecaseId))?.name) ||
    'unknown';
  const familyLabel = family || 'demo';
  const defenceLabel = defence || 'none';

  attacksStarted.inc({ family: familyLabel, model: modelLabel, usecase: usecaseLabel });
  runningAttacks.inc({ model: modelLabel });

  const end = attackDuration.startTimer({ family: familyLabel, model: modelLabel, usecase: usecaseLabel });

  try {
    // simulate 0.5–4.5s work
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 4000));

    const ok = Math.random() > 0.2; // 80% success
    if (ok) {
      attacksSucceeded.inc({ family: familyLabel, model: modelLabel, usecase: usecaseLabel, defence: defenceLabel });
      return res.json({
        success: true,
        message: `Attack simulated for model ${modelId ?? modelLabel}, usecase ${usecaseId ?? usecaseLabel}`,
      });
    } else {
      attacksFailed.inc({ family: familyLabel, model: modelLabel, usecase: usecaseLabel, reason: 'demo_error' });
      return res.json({
        success: false,
        message: 'Attack failed (demo)',
      });
    }
  } finally {
    end();
    runningAttacks.dec({ model: modelLabel });
  }
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

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});
