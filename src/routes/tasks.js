import { Router } from 'express';
import { taskStorage } from '../storage.js';

export const taskRouter = Router();

// GET /api/tasks - Retrieve all tasks with filtering and sorting
taskRouter.get('/', async (req, res, next) => {
  try {
    const { status, priority, category, tag, search, sortBy, includeArchived } = req.query;
    const tasks = await taskStorage.getAll({
      status,
      priority,
      category,
      tag,
      search,
      sortBy,
      includeArchived
    });
    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/export - Export all tasks as downloadable JSON
taskRouter.get('/export', async (req, res, next) => {
  try {
    const tasks = await taskStorage.getAll({ includeArchived: true });
    res.setHeader('Content-Disposition', 'attachment; filename="taskflow-backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(tasks, null, 2));
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/export/csv - Export all tasks as downloadable CSV
taskRouter.get('/export/csv', async (req, res, next) => {
  try {
    const tasks = await taskStorage.getAll({ includeArchived: true });
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'ID',
      'Title',
      'Description',
      'Category',
      'Priority',
      'Status',
      'Progress',
      'Pinned',
      'Due Date',
      'Tags',
      'Subtasks Count',
      'Subtasks Done',
      'Created At',
      'Updated At'
    ].map(h => `"${h}"`);

    const rows = tasks.map(t => {
      const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
      const doneCount = subtasks.filter(s => s.completed).length;
      return [
        escapeCsv(t.id),
        escapeCsv(t.title),
        escapeCsv(t.description),
        escapeCsv(t.category),
        escapeCsv(t.priority),
        escapeCsv(t.status),
        escapeCsv(`${t.progress || 0}%`),
        escapeCsv(t.pinned ? 'Yes' : 'No'),
        escapeCsv(t.dueDate || 'None'),
        escapeCsv(Array.isArray(t.tags) ? t.tags.join(', ') : ''),
        escapeCsv(subtasks.length),
        escapeCsv(doneCount),
        escapeCsv(t.createdAt),
        escapeCsv(t.updatedAt)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const filename = `taskflow-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/import - Import/restore tasks from JSON
taskRouter.post('/import', async (req, res, next) => {
  try {
    const tasks = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload: Expected an array of task objects'
      });
    }
    const count = await taskStorage.importData(tasks);
    res.json({
      success: true,
      message: `Successfully imported ${count} tasks`,
      count
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id - Retrieve single task
taskRouter.get('/:id', async (req, res, next) => {
  try {
    const task = await taskStorage.getById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks - Create new task
taskRouter.post('/', async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      status,
      dueDate,
      tags,
      subtasks,
      recurring,
      dependencies,
      progress,
      pinned
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Title is required and cannot be blank'
      });
    }

    const newTask = await taskStorage.create({
      title,
      description,
      category,
      priority,
      status,
      dueDate,
      tags,
      subtasks,
      recurring,
      dependencies,
      progress,
      pinned
    });

    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Task created successfully'
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id - Update existing task
taskRouter.put('/:id', async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      status,
      dueDate,
      completed,
      tags,
      subtasks,
      recurring,
      dependencies,
      progress,
      pinned,
      archived
    } = req.body;

    const updated = await taskStorage.update(req.params.id, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      ...(dueDate !== undefined && { dueDate }),
      ...(completed !== undefined && { completed: Boolean(completed) }),
      ...(tags !== undefined && { tags }),
      ...(subtasks !== undefined && { subtasks }),
      ...(recurring !== undefined && { recurring }),
      ...(dependencies !== undefined && { dependencies }),
      ...(progress !== undefined && { progress }),
      ...(pinned !== undefined && { pinned: Boolean(pinned) }),
      ...(archived !== undefined && { archived: Boolean(archived) })
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Task updated successfully'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/duplicate - Duplicate task
taskRouter.post('/:id/duplicate', async (req, res, next) => {
  try {
    const duplicated = await taskStorage.duplicate(req.params.id);
    if (!duplicated) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.status(201).json({
      success: true,
      data: duplicated,
      message: 'Task duplicated successfully'
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/archive - Toggle archive status
taskRouter.patch('/:id/archive', async (req, res, next) => {
  try {
    const task = await taskStorage.toggleArchive(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({
      success: true,
      data: task,
      message: `Task ${task.archived ? 'archived' : 'restored'}`
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/toggle - Toggle completion status
taskRouter.patch('/:id/toggle', async (req, res, next) => {
  try {
    const task = await taskStorage.toggle(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({
      success: true,
      data: task,
      message: `Task marked as ${task.completed ? 'completed' : 'active'}`
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/pin - Toggle pin status
taskRouter.patch('/:id/pin', async (req, res, next) => {
  try {
    const task = await taskStorage.togglePin(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({
      success: true,
      data: task,
      message: `Task ${task.pinned ? 'pinned to top' : 'unpinned'} successfully`
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/subtasks - Add a subtask
taskRouter.post('/:id/subtasks', async (req, res, next) => {
  try {
    const { title } = req.body;
    const result = await taskStorage.addSubtask(req.params.id, title);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.status(201).json({
      success: true,
      data: result.task,
      subtask: result.subtask,
      message: 'Subtask added'
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/subtasks/:subtaskId - Toggle subtask completion
taskRouter.patch('/:id/subtasks/:subtaskId', async (req, res, next) => {
  try {
    const result = await taskStorage.toggleSubtask(req.params.id, req.params.subtaskId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Task or subtask not found' });
    }
    res.json({
      success: true,
      data: result.task,
      subtask: result.subtask,
      message: 'Subtask updated'
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id/subtasks/:subtaskId - Delete subtask
taskRouter.delete('/:id/subtasks/:subtaskId', async (req, res, next) => {
  try {
    const success = await taskStorage.deleteSubtask(req.params.id, req.params.subtaskId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Task or subtask not found' });
    }
    res.json({
      success: true,
      message: 'Subtask deleted'
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id - Delete a task
taskRouter.delete('/:id', async (req, res, next) => {
  try {
    const success = await taskStorage.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});
