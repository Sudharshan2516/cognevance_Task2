const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

let server, base;
test.before(async () => {
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const j = (path, method = 'GET', body) =>
  fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });

test('GET /health returns ok', async () => {
  const r = await j('/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).status, 'ok');
});

test('GET /version returns build info', async () => {
  const body = await (await j('/version')).json();
  assert.ok('version' in body && 'commit' in body);
});

test('create, list, complete and delete a task', async () => {
  const created = await j('/api/tasks', 'POST', { title: '  Write pipeline  ' });
  assert.strictEqual(created.status, 201);
  const task = await created.json();
  assert.strictEqual(task.title, 'Write pipeline');

  const list = await (await j('/api/tasks')).json();
  assert.ok(list.some(t => t.id === task.id));

  const patched = await (await j(`/api/tasks/${task.id}`, 'PATCH', { done: true })).json();
  assert.strictEqual(patched.done, true);

  assert.strictEqual((await j(`/api/tasks/${task.id}`, 'DELETE')).status, 204);
  assert.strictEqual((await j(`/api/tasks/${task.id}`, 'DELETE')).status, 404);
});

test('rejects empty and oversized titles', async () => {
  assert.strictEqual((await j('/api/tasks', 'POST', { title: '   ' })).status, 400);
  assert.strictEqual((await j('/api/tasks', 'POST', { title: 'x'.repeat(121) })).status, 400);
});

test('rejects malformed JSON with 400', async () => {
  const r = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.strictEqual(r.status, 400);
});

test('serves the web UI', async () => {
  const r = await j('/');
  assert.strictEqual(r.status, 200);
  assert.match(await r.text(), /Task Tracker/);
});
