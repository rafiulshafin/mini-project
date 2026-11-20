import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let server;
let baseUrl;

test.before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/health returns healthy status and node version', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'healthy');
  assert.ok(data.uptime >= 0);
  assert.ok(data.nodeVersion);
});

test('GET /api/tasks returns task list with count', async () => {
  const res = await fetch(`${baseUrl}/api/tasks`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
  assert.equal(data.count, data.data.length);
});

test('POST /api/tasks creates a task and returns 201', async () => {
  const newTaskPayload = {
    title: 'Unit Test Task',
    description: 'Verifying automated test execution in Node.js',
    category: 'Testing',
    priority: 'High',
    dueDate: '2026-12-31'
  };

  const res = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTaskPayload)
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.title, newTaskPayload.title);
  assert.equal(body.data.priority, 'High');
  assert.equal(body.data.completed, false);
  assert.ok(body.data.id);

  // Verify it can be retrieved
  const getRes = await fetch(`${baseUrl}/api/tasks/${body.data.id}`);
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json();
  assert.equal(fetched.data.id, body.data.id);

  // Toggle completion
  const toggleRes = await fetch(`${baseUrl}/api/tasks/${body.data.id}/toggle`, {
    method: 'PATCH'
  });
  assert.equal(toggleRes.status, 200);
  const toggled = await toggleRes.json();
  assert.equal(toggled.data.completed, true);

  // Duplicate task
  const dupRes = await fetch(`${baseUrl}/api/tasks/${body.data.id}/duplicate`, {
    method: 'POST'
  });
  assert.equal(dupRes.status, 201);
  const duplicated = await dupRes.json();
  assert.equal(duplicated.success, true);
  assert.match(duplicated.data.title, /Copy/);

  // Clean up duplicated task
  await fetch(`${baseUrl}/api/tasks/${duplicated.data.id}`, { method: 'DELETE' });

  // Delete original task
  const delRes = await fetch(`${baseUrl}/api/tasks/${body.data.id}`, {
    method: 'DELETE'
  });
  assert.equal(delRes.status, 200);

  // Verify deletion returns 404
  const verifyRes = await fetch(`${baseUrl}/api/tasks/${body.data.id}`);
  assert.equal(verifyRes.status, 404);
});

test('POST /api/tasks rejects invalid task with 400', async () => {
  const res = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '' })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /Title is required/i);
});

test('GET /api/stats returns metrics correctly', async () => {
  const res = await fetch(`${baseUrl}/api/stats`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok('total' in json.data);
  assert.ok('completed' in json.data);
  assert.ok('pending' in json.data);
  assert.ok('completionRate' in json.data);
  assert.ok('priorityBreakdown' in json.data);
  assert.ok('weeklyData' in json.data);
  assert.ok('statusBreakdown' in json.data);
  assert.ok('notifications' in json.data);
});

test('PATCH /api/tasks/:id/pin toggles pin status', async () => {
  const createRes = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Task to be Pinned' })
  });
  const created = await createRes.json();
  const id = created.data.id;
  assert.equal(created.data.pinned, false);

  const pinRes = await fetch(`${baseUrl}/api/tasks/${id}/pin`, { method: 'PATCH' });
  assert.equal(pinRes.status, 200);
  const pinned = await pinRes.json();
  assert.equal(pinned.success, true);
  assert.equal(pinned.data.pinned, true);

  const unpinRes = await fetch(`${baseUrl}/api/tasks/${id}/pin`, { method: 'PATCH' });
  const unpinned = await unpinRes.json();
  assert.equal(unpinned.data.pinned, false);

  await fetch(`${baseUrl}/api/tasks/${id}`, { method: 'DELETE' });
});

test('GET /api/tasks/export/csv exports CSV format', async () => {
  const res = await fetch(`${baseUrl}/api/tasks/export/csv`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  const text = await res.text();
  assert.match(text, /"ID","Title","Description"/);
});

test('POST /api/ai/breakdown generates subtasks', async () => {
  const res = await fetch(`${baseUrl}/api/ai/breakdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Implement OAuth Authentication', description: 'Google and GitHub login' })
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.subtasks));
  assert.ok(json.subtasks.length >= 3);
  assert.ok(json.subtasks[0].title);
});

test('POST /api/ai/polish enhances task title and description', async () => {
  const res = await fetch(`${baseUrl}/api/ai/polish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'fix navigation bar bug on mobile' })
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.title);
  assert.ok(json.data.description);
  assert.ok(json.data.category);
  assert.ok(json.data.priority);
});

test('POST /api/ai/summary returns executive briefing', async () => {
  const res = await fetch(`${baseUrl}/api/ai/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.headline);
  assert.ok(Array.isArray(json.data.highlights));
  assert.ok(json.data.focusRecommendation);
});
