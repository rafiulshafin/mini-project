import test from 'node:test';
import assert from 'node:assert/strict';
import { taskStorage } from '../src/storage.js';

test('TaskStorage operations', async (t) => {
  await t.test('getAll returns tasks', async () => {
    const tasks = await taskStorage.getAll();
    assert.ok(Array.isArray(tasks));
    assert.ok(tasks.length >= 3);
  });

  await t.test('create adds a valid task', async () => {
    const created = await taskStorage.create({
      title: 'Automated Test Task',
      description: 'Testing storage methods directly',
      category: 'Testing',
      priority: 'High'
    });

    assert.ok(created.id);
    assert.equal(created.title, 'Automated Test Task');
    assert.equal(created.completed, false);

    // Fetch and check
    const fetched = await taskStorage.getById(created.id);
    assert.equal(fetched.title, 'Automated Test Task');

    // Toggle
    const toggled = await taskStorage.toggle(created.id);
    assert.equal(toggled.completed, true);

    // Delete
    const deleted = await taskStorage.delete(created.id);
    assert.equal(deleted, true);

    const checkNull = await taskStorage.getById(created.id);
    assert.equal(checkNull, null);
  });

  await t.test('create throws on missing title', async () => {
    await assert.rejects(
      async () => {
        await taskStorage.create({ title: '' });
      },
      { message: 'Task title is required' }
    );
  });

  await t.test('getStats calculates valid metrics', async () => {
    const stats = await taskStorage.getStats();
    assert.ok(typeof stats.total === 'number');
    assert.ok(typeof stats.completed === 'number');
    assert.ok(typeof stats.pending === 'number');
    assert.ok(typeof stats.completionRate === 'number');
    assert.ok(stats.priorityBreakdown);
  });
});
