import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { CONFIG } from './config.js';

const INITIAL_TASKS = [
  {
    id: crypto.randomUUID(),
    title: 'Explore TaskFlow Next-Gen Features',
    description: 'Check out the Kanban board, interactive dependency flowchart, analytics charts, and keyboard command palette.',
    category: 'Work',
    priority: 'Critical',
    status: 'in_progress',
    completed: false,
    progress: 60,
    tags: ['Productivity', 'v2.0', 'Platform'],
    subtasks: [
      { id: crypto.randomUUID(), title: 'Test Kanban drag and drop', completed: true },
      { id: crypto.randomUUID(), title: 'Inspect dependency flowchart', completed: true },
      { id: crypto.randomUUID(), title: 'Try Command Palette (Ctrl+K)', completed: false }
    ],
    recurring: 'none',
    dependencies: [],
    archived: false,
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: 'Build Neural Core REST API',
    description: 'Create high-throughput microservices for data synchronization and real-time event streaming.',
    category: 'Engineering',
    priority: 'High',
    status: 'todo',
    completed: false,
    progress: 25,
    tags: ['Backend', 'NodeJS', 'API'],
    subtasks: [
      { id: crypto.randomUUID(), title: 'Design endpoint schemas', completed: true },
      { id: crypto.randomUUID(), title: 'Implement JWT authentication layer', completed: false }
    ],
    recurring: 'weekly',
    dependencies: [],
    archived: false,
    dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: 'Review System Architecture & Security',
    description: 'Conduct comprehensive penetration testing and verify encryption at rest.',
    category: 'Security',
    priority: 'Medium',
    status: 'review',
    completed: false,
    progress: 80,
    tags: ['Audit', 'SecOps'],
    subtasks: [
      { id: crypto.randomUUID(), title: 'Run SAIF compliance check', completed: true }
    ],
    recurring: 'monthly',
    dependencies: [],
    archived: false,
    dueDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: 'Daily High-Performance Protocol',
    description: '30 minutes HIIT cardio, hydration tracking, and cognitive reflection.',
    category: 'Health',
    priority: 'Low',
    status: 'completed',
    completed: true,
    progress: 100,
    tags: ['Habit', 'Wellness'],
    subtasks: [
      { id: crypto.randomUUID(), title: 'Morning stretching', completed: true },
      { id: crypto.randomUUID(), title: 'Hydration 3L', completed: true }
    ],
    recurring: 'daily',
    dependencies: [],
    archived: false,
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class TaskStorage {
  constructor() {
    const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
    this.dirPath = isVercel ? '/tmp' : CONFIG.DATA_DIR;
    this.filePath = isVercel ? path.join('/tmp', 'tasks.json') : CONFIG.DATA_FILE;
    this._fallbackSource = CONFIG.DATA_FILE;
    this._initPromise = this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dirPath, { recursive: true });
      try {
        await fs.access(this.filePath);
      } catch {
        // If on Vercel or fresh install, load from bundled tasks.json if available
        let seed = INITIAL_TASKS;
        try {
          const raw = await fs.readFile(this._fallbackSource, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            seed = parsed;
          }
        } catch {
          // Fall back to INITIAL_TASKS
        }
        await this._writeRaw(seed);
      }
    } catch (err) {
      console.error('Failed to initialize storage:', err);
    }
  }

  _normalizeTask(t) {
    if (!t) return null;
    const completed = Boolean(t.completed || t.status === 'completed');
    const status = t.status || (completed ? 'completed' : 'todo');
    const subtasks = Array.isArray(t.subtasks) ? t.subtasks.map(s => ({
      id: s.id || crypto.randomUUID(),
      title: s.title || '',
      completed: Boolean(s.completed)
    })) : [];

    let progress = typeof t.progress === 'number' ? t.progress : (completed ? 100 : 0);
    if (subtasks.length > 0) {
      const doneCount = subtasks.filter(s => s.completed).length;
      progress = Math.round((doneCount / subtasks.length) * 100);
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    let priority = t.priority || 'Medium';
    if (!validPriorities.map(p => p.toLowerCase()).includes(priority.toLowerCase())) {
      priority = 'Medium';
    } else {
      priority = validPriorities.find(p => p.toLowerCase() === priority.toLowerCase()) || 'Medium';
    }

    return {
      id: t.id || crypto.randomUUID(),
      title: (t.title || 'Untitled').trim(),
      description: (t.description || '').trim(),
      category: (t.category || 'General').trim(),
      priority,
      status: ['todo', 'in_progress', 'review', 'completed', 'archived'].includes(status) ? status : 'todo',
      completed: status === 'completed',
      progress,
      tags: Array.isArray(t.tags) ? t.tags.filter(Boolean).map(tag => String(tag).trim()) : [],
      subtasks,
      recurring: ['none', 'daily', 'weekly', 'monthly'].includes(t.recurring) ? t.recurring : 'none',
      dependencies: Array.isArray(t.dependencies) ? t.dependencies.filter(Boolean) : [],
      archived: Boolean(t.archived || status === 'archived'),
      dueDate: t.dueDate || null,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString()
    };
  }

  async _readRaw() {
    await this._initPromise;
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(t => this._normalizeTask(t));
    } catch (err) {
      console.error('Error reading data file, falling back to empty array:', err);
      return [];
    }
  }

  async _writeRaw(tasks) {
    const normalized = tasks.map(t => this._normalizeTask(t));
    const data = JSON.stringify(normalized, null, 2);
    await fs.writeFile(this.filePath, data, 'utf-8');
  }

  async getAll({ status, priority, category, tag, search, sortBy, includeArchived } = {}) {
    let tasks = await this._readRaw();

    // Unless explicitly requested, exclude archived tasks from normal views
    if (includeArchived !== 'true' && includeArchived !== true) {
      tasks = tasks.filter(t => !t.archived);
    } else if (status === 'archived') {
      tasks = tasks.filter(t => t.archived);
    }

    if (status && status !== 'all' && status !== 'archived') {
      if (status === 'completed') {
        tasks = tasks.filter(t => t.completed || t.status === 'completed');
      } else if (status === 'active') {
        tasks = tasks.filter(t => !t.completed && t.status !== 'completed');
      } else {
        tasks = tasks.filter(t => t.status === status);
      }
    }

    if (priority && priority !== 'all') {
      tasks = tasks.filter(t => t.priority.toLowerCase() === priority.toLowerCase());
    }

    if (category && category !== 'all') {
      tasks = tasks.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    if (tag && tag !== 'all') {
      tasks = tasks.filter(t => t.tags && t.tags.some(tg => tg.toLowerCase() === tag.toLowerCase()));
    }

    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tg => tg.toLowerCase().includes(q))) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    }

    // Sorting
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    switch (sortBy) {
      case 'oldest':
        tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'dueDate':
        tasks.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
        break;
      case 'priority':
        tasks.sort((a, b) => 
          (priorityWeight[b.priority?.toLowerCase()] || 0) - (priorityWeight[a.priority?.toLowerCase()] || 0)
        );
        break;
      case 'progress':
        tasks.sort((a, b) => (b.progress || 0) - (a.progress || 0));
        break;
      case 'title':
        tasks.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'newest':
      default:
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return tasks;
  }

  async getById(id) {
    const tasks = await this._readRaw();
    return tasks.find(t => t.id === id) || null;
  }

  async create({
    title,
    description = '',
    category = 'General',
    priority = 'Medium',
    status = 'todo',
    dueDate = null,
    tags = [],
    subtasks = [],
    recurring = 'none',
    dependencies = [],
    progress = 0
  }) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Task title is required');
    }

    const tasks = await this._readRaw();
    const newTask = this._normalizeTask({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category ? category.trim() : 'General',
      priority,
      status: ['todo', 'in_progress', 'review', 'completed'].includes(status) ? status : 'todo',
      completed: status === 'completed',
      dueDate: dueDate || null,
      tags: Array.isArray(tags) ? tags : [],
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      recurring: recurring || 'none',
      dependencies: Array.isArray(dependencies) ? dependencies : [],
      progress: typeof progress === 'number' ? progress : 0,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    tasks.unshift(newTask);
    await this._writeRaw(tasks);
    return newTask;
  }

  async update(id, updates) {
    const tasks = await this._readRaw();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    const task = tasks[index];

    let newStatus = updates.status !== undefined ? updates.status : task.status;
    let newCompleted = updates.completed !== undefined ? Boolean(updates.completed) : task.completed;

    if (updates.status === 'completed' && updates.completed === undefined) {
      newCompleted = true;
    } else if (updates.completed === true && updates.status === undefined) {
      newStatus = 'completed';
    } else if (updates.completed === false && newStatus === 'completed') {
      newStatus = 'todo';
    }

    let subtasks = updates.subtasks !== undefined ? updates.subtasks : task.subtasks;
    let progress = updates.progress !== undefined ? updates.progress : task.progress;
    if (Array.isArray(subtasks) && subtasks.length > 0) {
      const doneCount = subtasks.filter(s => s.completed).length;
      progress = Math.round((doneCount / subtasks.length) * 100);
      if (progress === 100 && newStatus !== 'completed') {
        newStatus = 'completed';
        newCompleted = true;
      }
    }

    const merged = {
      ...task,
      ...updates,
      status: newStatus,
      completed: newCompleted,
      subtasks,
      progress: newCompleted ? 100 : progress,
      id: task.id,
      createdAt: task.createdAt,
      updatedAt: new Date().toISOString()
    };

    const updated = this._normalizeTask(merged);
    tasks[index] = updated;
    await this._writeRaw(tasks);
    return updated;
  }

  async toggle(id) {
    const tasks = await this._readRaw();
    const task = tasks.find(t => t.id === id);
    if (!task) return null;

    const willBeCompleted = !task.completed;
    task.completed = willBeCompleted;
    task.status = willBeCompleted ? 'completed' : 'todo';
    task.progress = willBeCompleted ? 100 : 0;
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      task.subtasks.forEach(s => s.completed = willBeCompleted);
    }
    task.updatedAt = new Date().toISOString();

    await this._writeRaw(tasks);
    return task;
  }

  async duplicate(id) {
    const tasks = await this._readRaw();
    const task = tasks.find(t => t.id === id);
    if (!task) return null;

    const cloned = {
      ...task,
      id: crypto.randomUUID(),
      title: `${task.title} (Copy)`,
      completed: false,
      status: 'todo',
      progress: 0,
      subtasks: (task.subtasks || []).map(s => ({
        ...s,
        id: crypto.randomUUID(),
        completed: false
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const normalized = this._normalizeTask(cloned);
    tasks.unshift(normalized);
    await this._writeRaw(tasks);
    return normalized;
  }

  async toggleArchive(id) {
    const tasks = await this._readRaw();
    const task = tasks.find(t => t.id === id);
    if (!task) return null;

    task.archived = !task.archived;
    if (task.archived) {
      task.status = 'archived';
    } else {
      task.status = task.completed ? 'completed' : 'todo';
    }
    task.updatedAt = new Date().toISOString();

    await this._writeRaw(tasks);
    return task;
  }

  async addSubtask(taskId, title) {
    if (!title || !title.trim()) throw new Error('Subtask title is required');
    const tasks = await this._readRaw();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    const newSubtask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      completed: false
    };

    if (!Array.isArray(task.subtasks)) task.subtasks = [];
    task.subtasks.push(newSubtask);
    const doneCount = task.subtasks.filter(s => s.completed).length;
    task.progress = Math.round((doneCount / task.subtasks.length) * 100);
    task.updatedAt = new Date().toISOString();

    await this._writeRaw(tasks);
    return { task, subtask: newSubtask };
  }

  async toggleSubtask(taskId, subtaskId) {
    const tasks = await this._readRaw();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    const sub = (task.subtasks || []).find(s => s.id === subtaskId);
    if (!sub) return null;

    sub.completed = !sub.completed;
    const doneCount = task.subtasks.filter(s => s.completed).length;
    task.progress = Math.round((doneCount / task.subtasks.length) * 100);
    if (task.progress === 100) {
      task.completed = true;
      task.status = 'completed';
    } else if (task.completed) {
      task.completed = false;
      task.status = 'in_progress';
    }
    task.updatedAt = new Date().toISOString();

    await this._writeRaw(tasks);
    return { task, subtask: sub };
  }

  async deleteSubtask(taskId, subtaskId) {
    const tasks = await this._readRaw();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return false;

    const initialLen = task.subtasks.length;
    task.subtasks = (task.subtasks || []).filter(s => s.id !== subtaskId);
    if (task.subtasks.length === initialLen) return false;

    if (task.subtasks.length > 0) {
      const doneCount = task.subtasks.filter(s => s.completed).length;
      task.progress = Math.round((doneCount / task.subtasks.length) * 100);
    } else {
      task.progress = task.completed ? 100 : 0;
    }
    task.updatedAt = new Date().toISOString();

    await this._writeRaw(tasks);
    return true;
  }

  async delete(id) {
    const tasks = await this._readRaw();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return false;

    // Remove from other tasks' dependencies
    tasks.forEach(t => {
      if (Array.isArray(t.dependencies)) {
        t.dependencies = t.dependencies.filter(depId => depId !== id);
      }
    });

    tasks.splice(index, 1);
    await this._writeRaw(tasks);
    return true;
  }

  async getStats() {
    const allTasks = await this._readRaw();
    const activeTasks = allTasks.filter(t => !t.archived);

    const total = activeTasks.length;
    const completed = activeTasks.filter(t => t.completed || t.status === 'completed').length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = activeTasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;

    // Status breakdown
    const statusBreakdown = {
      todo: activeTasks.filter(t => t.status === 'todo').length,
      in_progress: activeTasks.filter(t => t.status === 'in_progress').length,
      review: activeTasks.filter(t => t.status === 'review').length,
      completed: activeTasks.filter(t => t.status === 'completed').length,
      archived: allTasks.filter(t => t.archived).length
    };

    // Priority breakdown
    const priorityBreakdown = {
      critical: activeTasks.filter(t => t.priority.toLowerCase() === 'critical').length,
      high: activeTasks.filter(t => t.priority.toLowerCase() === 'high').length,
      medium: activeTasks.filter(t => t.priority.toLowerCase() === 'medium').length,
      low: activeTasks.filter(t => t.priority.toLowerCase() === 'low').length
    };

    // Category breakdown
    const categories = {};
    for (const task of activeTasks) {
      const cat = task.category || 'General';
      if (!categories[cat]) categories[cat] = { count: 0, completed: 0 };
      categories[cat].count += 1;
      if (task.completed) categories[cat].completed += 1;
    }

    // Convert categories to backward-compatible format for existing tests, plus extended info
    const categoriesSimple = {};
    for (const [k, v] of Object.entries(categories)) {
      categoriesSimple[k] = v.count;
    }

    // Weekly Productivity: Last 7 days breakdown
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      const createdCount = allTasks.filter(t => t.createdAt && t.createdAt.startsWith(dayStr)).length;
      const completedCount = allTasks.filter(t => t.completed && t.updatedAt && t.updatedAt.startsWith(dayStr)).length;

      weeklyData.push({
        date: dayStr,
        label: dayLabel,
        created: createdCount,
        completed: completedCount
      });
    }

    // Monthly Productivity (Last 30 days)
    let last30DaysCompleted = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    allTasks.forEach(t => {
      if (t.completed && t.updatedAt >= thirtyDaysAgo) {
        last30DaysCompleted++;
      }
    });

    // Recent activity feed
    const activityFeed = [...allTasks]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        updatedAt: t.updatedAt || t.createdAt,
        type: t.completed ? 'completed' : (t.status === 'in_progress' ? 'progress' : 'updated')
      }));

    // Notifications
    const notifications = [];
    activeTasks.forEach(t => {
      if (!t.completed && t.dueDate) {
        if (t.dueDate < todayStr) {
          notifications.push({
            id: `overdue-${t.id}`,
            taskId: t.id,
            title: `Task Overdue: ${t.title}`,
            type: 'urgent',
            timestamp: t.updatedAt || t.createdAt,
            message: `Was due on ${t.dueDate}`
          });
        } else if (t.dueDate === todayStr) {
          notifications.push({
            id: `due-today-${t.id}`,
            taskId: t.id,
            title: `Due Today: ${t.title}`,
            type: 'warning',
            timestamp: t.updatedAt || t.createdAt,
            message: 'Deadline is today!'
          });
        }
      }
    });

    return {
      total,
      completed,
      pending,
      overdue,
      completionRate,
      statusBreakdown,
      priorityBreakdown,
      categories: categoriesSimple,
      categoryDetails: categories,
      weeklyData,
      monthlyCompleted: last30DaysCompleted,
      activityFeed,
      notifications
    };
  }

  async importData(importedTasks) {
    if (!Array.isArray(importedTasks)) {
      throw new Error('Import data must be an array of tasks');
    }
    const sanitized = importedTasks.map(t => this._normalizeTask(t));
    await this._writeRaw(sanitized);
    return sanitized.length;
  }
}

export const taskStorage = new TaskStorage();
