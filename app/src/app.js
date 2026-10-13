const express = require('express');
const path = require('path');

function createApp() {
  const app = express();
  const tasks = [];
  let nextId = 1;
  const startedAt = Date.now();

  app.use(express.json({ limit: '10kb' }));

  // Structured JSON request logging (easy to search with `docker logs | grep`)
  app.use((req, res, next) => {
    const t0 = process.hrtime.bigint();
    res.on('finish', () => {
      if (req.path === '/health') return;
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      console.log(JSON.stringify({
        time: new Date().toISOString(), level: 'info', method: req.method,
        path: req.path, status: res.statusCode, ms: Math.round(ms * 10) / 10
      }));
    });
    next();
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (req, res) => res.json({ status: 'ok', uptime_s: Math.round((Date.now() - startedAt) / 1000) }));
  app.get('/version', (req, res) => res.json({
    version: process.env.APP_VERSION || 'dev',
    commit: process.env.GIT_SHA || 'local',
    built: process.env.BUILD_DATE || 'unknown'
  }));

  app.get('/api/tasks', (req, res) => res.json(tasks));

  app.post('/api/tasks', (req, res) => {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!title || title.length > 120) return res.status(400).json({ error: 'title is required (max 120 chars)' });
    const task = { id: nextId++, title, done: false, createdAt: new Date().toISOString() };
    tasks.push(task);
    res.status(201).json(task);
  });

  app.patch('/api/tasks/:id', (req, res) => {
    const task = tasks.find(t => t.id === Number(req.params.id));
    if (!task) return res.status(404).json({ error: 'not found' });
    if (typeof req.body.done === 'boolean') task.done = req.body.done;
    res.json(task);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const i = tasks.findIndex(t => t.id === Number(req.params.id));
    if (i === -1) return res.status(404).json({ error: 'not found' });
    tasks.splice(i, 1);
    res.status(204).end();
  });

  // Error handler (e.g. malformed JSON)
  app.use((err, req, res, next) => {
    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'error', message: err.message }));
    res.status(err.status || 500).json({ error: 'request failed' });
  });
  return app;
}

module.exports = { createApp };
