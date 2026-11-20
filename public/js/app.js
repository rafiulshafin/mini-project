/**
 * TASKFLOW NEXT-GEN // CLIENT ARCHITECTURE v2.5
 * Interactive Kanban, Analytics (Chart.js), Calendar, Flowchart & Command Palette
 */

// Application State
const state = {
  tasks: [],
  archivedTasks: [],
  stats: {},
  currentView: 'kanban',
  filters: {
    status: 'all',
    priority: 'all',
    category: 'all',
    tag: 'all',
    search: '',
    sortBy: 'newest'
  },
  editingTaskId: null,
  modalSubtasks: [],
  calendarDate: new Date(),
  charts: {
    velocity: null,
    status: null,
    category: null,
    priority: null
  },
  draggedTaskId: null,
  paletteSelectedIndex: 0
};

// ==========================================================================
// DYNAMIC TAGS, AUDIO ENGINE, POMODORO & AI ENGINE
// ==========================================================================

function getTagColorClass(tag) {
  if (!tag) return 'badge-tag-neon-0';
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % 6;
  return `badge-tag-neon-${index}`;
}

const AudioEngine = {
  ctx: null,
  enabled: localStorage.getItem('taskflow_sound') !== 'false',

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('taskflow_sound', this.enabled ? 'true' : 'false');
    const soundIcon = document.getElementById('soundIcon');
    if (soundIcon) soundIcon.textContent = this.enabled ? '🔊' : '🔇';
    showToast(this.enabled ? 'Audio effects enabled' : 'Audio effects muted', 'info');
    if (this.enabled) this.playTone(523.25, 0.08, 'sine');
  },

  playTone(freq, duration = 0.12, type = 'sine') {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio not permitted or supported
    }
  },

  playComplete() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.18, 'triangle'), idx * 70);
    });
  },

  playCreate() {
    if (!this.enabled) return;
    this.playTone(587.33, 0.08, 'sine');
    setTimeout(() => this.playTone(880.00, 0.12, 'sine'), 60);
  },

  playPin() {
    if (!this.enabled) return;
    this.playTone(783.99, 0.16, 'triangle');
  },

  playTimerEnd() {
    if (!this.enabled) return;
    [440, 659.25, 880].forEach((freq) => this.playTone(freq, 0.6, 'sine'));
  }
};

const PomodoroEngine = {
  widget: null,
  display: null,
  progressFill: null,
  taskLabel: null,
  timerId: null,
  totalSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  isRunning: false,
  activeTaskTitle: 'General Sprint Focus',
  currentMode: 'focus',

  init() {
    this.widget = document.getElementById('pomodoroWidget');
    this.display = document.getElementById('pomodoroTimerDisplay');
    this.progressFill = document.getElementById('pomodoroProgressFill');
    this.taskLabel = document.getElementById('pomodoroTaskLabel');

    const toggleBtn = document.getElementById('pomodoroToggleBtn');
    const startBtn = document.getElementById('pomodoroStartBtn');
    const pauseBtn = document.getElementById('pomodoroPauseBtn');
    const resetBtn = document.getElementById('pomodoroResetBtn');
    const closeBtn = document.getElementById('pomodoroCloseBtn');
    const minimizeBtn = document.getElementById('pomodoroMinimizeBtn');

    if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleWidget());
    if (closeBtn) closeBtn.addEventListener('click', () => this.hideWidget());
    if (minimizeBtn) minimizeBtn.addEventListener('click', () => {
      const body = document.getElementById('pomodoroBody');
      if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    if (startBtn) startBtn.addEventListener('click', () => this.start());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

    document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const minutes = parseInt(e.target.dataset.minutes, 10) || 25;
        this.setMode(e.target.dataset.mode, minutes);
      });
    });

    this.updateDisplay();
  },

  setMode(mode, minutes) {
    this.pause();
    this.currentMode = mode;
    this.totalSeconds = minutes * 60;
    this.remainingSeconds = this.totalSeconds;
    this.updateDisplay();
  },

  toggleWidget() {
    if (!this.widget) return;
    this.widget.style.display = this.widget.style.display === 'none' ? 'block' : 'none';
  },

  hideWidget() {
    if (this.widget) this.widget.style.display = 'none';
  },

  showWidget() {
    if (this.widget) this.widget.style.display = 'block';
  },

  bindTask(taskTitle) {
    this.activeTaskTitle = taskTitle;
    if (this.taskLabel) {
      this.taskLabel.textContent = `Focusing on: ${taskTitle}`;
    }
    this.showWidget();
    this.reset();
    this.start();
    showToast(`⏱️ Focus sprint started for "${taskTitle}"`, 'info');
  },

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const startBtn = document.getElementById('pomodoroStartBtn');
    const pauseBtn = document.getElementById('pomodoroPauseBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';

    this.timerId = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateDisplay();
      } else {
        this.complete();
      }
    }, 1000);
  },

  pause() {
    this.isRunning = false;
    clearInterval(this.timerId);
    this.timerId = null;
    const startBtn = document.getElementById('pomodoroStartBtn');
    const pauseBtn = document.getElementById('pomodoroPauseBtn');
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (pauseBtn) pauseBtn.style.display = 'none';
  },

  reset() {
    this.pause();
    this.remainingSeconds = this.totalSeconds;
    this.updateDisplay();
  },

  complete() {
    this.pause();
    AudioEngine.playTimerEnd();
    showToast(`⏱️ ${this.currentMode === 'focus' ? 'Focus sprint completed!' : 'Break ended! Ready to focus?'}`, 'success');
  },

  updateDisplay() {
    const mins = Math.floor(this.remainingSeconds / 60).toString().padStart(2, '0');
    const secs = (this.remainingSeconds % 60).toString().padStart(2, '0');
    if (this.display) {
      this.display.textContent = `${mins}:${secs}`;
    }
    if (this.progressFill) {
      const pct = ((this.totalSeconds - this.remainingSeconds) / this.totalSeconds) * 100;
      this.progressFill.style.width = `${pct}%`;
    }
  }
};

const AIEngine = {
  getApiKey() {
    return localStorage.getItem('taskflow_gemini_key') || '';
  },

  setApiKey(key) {
    if (key) {
      localStorage.setItem('taskflow_gemini_key', key.trim());
    } else {
      localStorage.removeItem('taskflow_gemini_key');
    }
  },

  async request(endpoint, body = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const key = this.getApiKey();
    if (key) headers['x-gemini-key'] = key;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `AI Request Failed (${res.status})`);
    }

    return await res.json();
  },

  async polish(title, description) {
    return await this.request('/api/ai/polish', { title, description });
  },

  async breakdown(title, description) {
    return await this.request('/api/ai/breakdown', { title, description });
  },

  async summary() {
    return await this.request('/api/ai/summary', {});
  }
};

// DOM References
const viewPanels = {
  kanban: document.getElementById('kanbanView'),
  list: document.getElementById('listView'),
  analytics: document.getElementById('analyticsView'),
  calendar: document.getElementById('calendarView'),
  timeline: document.getElementById('timelineView'),
  workflow: document.getElementById('workflowView'),
  archived: document.getElementById('archivedView')
};

const viewModeTabs = document.getElementById('viewModeTabs');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const emptyStateMsg = document.getElementById('emptyStateMsg');

// Metrics DOM
const metricTotal = document.getElementById('metricTotal');
const metricPending = document.getElementById('metricPending');
const metricCompleted = document.getElementById('metricCompleted');
const metricRate = document.getElementById('metricRate');
const metricProgressBar = document.getElementById('metricProgressBar');
const metricOverdue = document.getElementById('metricOverdue');
const metricWeeklyDone = document.getElementById('metricWeeklyDone');

// Hero Telemetry
const kpiVelocity = document.getElementById('kpiVelocity');
const kpiOverdue = document.getElementById('kpiOverdue');
const kpiDueToday = document.getElementById('kpiDueToday');
const liveClock = document.getElementById('liveClock');

// Filters DOM
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const priorityFilter = document.getElementById('priorityFilter');
const categoryFilter = document.getElementById('categoryFilter');
const tagFilter = document.getElementById('tagFilter');
const sortBy = document.getElementById('sortBy');

// Modals
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const taskForm = document.getElementById('taskForm');
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescInput = document.getElementById('taskDescription');
const taskStatusInput = document.getElementById('taskStatus');
const taskPriorityInput = document.getElementById('taskPriority');
const taskCategoryInput = document.getElementById('taskCategory');
const taskDueDateInput = document.getElementById('taskDueDate');
const taskRecurringInput = document.getElementById('taskRecurring');
const taskTagsInput = document.getElementById('taskTagsInput');

const modalSubtaskList = document.getElementById('modalSubtaskList');
const newSubtaskTitle = document.getElementById('newSubtaskTitle');
const addSubtaskBtn = document.getElementById('addSubtaskBtn');
const subtaskProgressIndicator = document.getElementById('subtaskProgressIndicator');

const openNewTaskModalBtn = document.getElementById('openNewTaskModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

// Command Palette
const commandPaletteModal = document.getElementById('commandPaletteModal');
const globalSearchTrigger = document.getElementById('globalSearchTrigger');
const paletteInput = document.getElementById('paletteInput');
const paletteResults = document.getElementById('paletteResults');

// Confirm Dialog
const confirmModal = document.getElementById('confirmModal');
const confirmDialogTitle = document.getElementById('confirmDialogTitle');
const confirmDialogMessage = document.getElementById('confirmDialogMessage');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const confirmProceedBtn = document.getElementById('confirmProceedBtn');
let pendingConfirmCallback = null;

// Notification Bell
const notifBellBtn = document.getElementById('notifBellBtn');
const notifBadge = document.getElementById('notifBadge');
const notifDropdown = document.getElementById('notifDropdown');
const notifList = document.getElementById('notifList');
const clearNotifsBtn = document.getElementById('clearNotifsBtn');

// Toast & Theme
const toastContainer = document.getElementById('toastContainer');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');

// ==========================================================================
// 1. APPLICATION BOOTSTRAP
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLiveClock();
  initHeroParticles();
  setupEventListeners();
  loadData();
});

// ==========================================================================
// 2. THEME & LIVE CLOCK & PARTICLES
// ==========================================================================

function initTheme() {
  const saved = localStorage.getItem('taskflow_theme') || 'dark';
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('taskflow_theme', theme);
  if (themeIcon) {
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  // If analytics view is active, update chart theme
  if (state.currentView === 'analytics') {
    renderAnalyticsCharts();
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function initLiveClock() {
  function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    if (liveClock) {
      liveClock.textContent = `${timeStr} UTC`;
    }
  }
  updateClock();
  setInterval(updateClock, 1000);
}

// Lightweight Interactive Canvas Particle Mesh in Hero
function initHeroParticles() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height;
  let particles = [];
  const particleCount = 42;

  function resize() {
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.4 ? 'rgba(255, 26, 64, ' : 'rgba(249, 115, 22, '
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}0.65)`;
      ctx.fill();

      // Draw subtle connecting lines
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 26, 64, ${0.2 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(render);
  }
  render();
}

// ==========================================================================
// 3. DATA SYNCHRONIZATION & API CALLS
// ==========================================================================

async function fetchTasks() {
  const params = new URLSearchParams();
  if (state.filters.status !== 'all') params.append('status', state.filters.status);
  if (state.filters.priority !== 'all') params.append('priority', state.filters.priority);
  if (state.filters.category !== 'all') params.append('category', state.filters.category);
  if (state.filters.tag !== 'all') params.append('tag', state.filters.tag);
  if (state.filters.search.trim()) params.append('search', state.filters.search.trim());
  if (state.filters.sortBy) params.append('sortBy', state.filters.sortBy);

  const res = await fetch(`/api/tasks?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load active tasks');
  const json = await res.json();
  return json.data || [];
}

async function fetchArchivedTasks() {
  const res = await fetch('/api/tasks?includeArchived=true&status=archived');
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function fetchStats() {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to load statistics');
  const json = await res.json();
  return json.data || {};
}

async function loadData() {
  try {
    const [tasks, archived, stats] = await Promise.all([
      fetchTasks(),
      fetchArchivedTasks(),
      fetchStats()
    ]);

    state.tasks = tasks;
    state.archivedTasks = archived;
    state.stats = stats;

    renderMetrics();
    renderFilterDropdowns();
    renderCurrentView();
    renderNotifications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================================================
// 4. METRICS & TELEMETRY RENDERING
// ==========================================================================

function renderMetrics() {
  const {
    total = 0,
    pending = 0,
    completed = 0,
    overdue = 0,
    completionRate = 0,
    weeklyData = []
  } = state.stats;

  if (metricTotal) metricTotal.textContent = total;
  if (metricPending) metricPending.textContent = pending;
  if (metricCompleted) metricCompleted.textContent = completed;
  if (metricRate) metricRate.textContent = `${completionRate}%`;
  if (metricProgressBar) metricProgressBar.style.width = `${completionRate}%`;
  if (metricOverdue) metricOverdue.textContent = `${overdue} overdue items`;

  // Weekly completed count
  const weeklyTotal = weeklyData.reduce((acc, curr) => acc + (curr.completed || 0), 0);
  if (metricWeeklyDone) metricWeeklyDone.textContent = `${weeklyTotal} completed this week`;

  // Hero KPI updates
  if (kpiVelocity) {
    kpiVelocity.textContent = `${completionRate}%`;
  }
  if (kpiOverdue) {
    kpiOverdue.textContent = `${overdue} Overdue`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayCount = state.tasks.filter(t => !t.completed && t.dueDate === todayStr).length;
  if (kpiDueToday) {
    kpiDueToday.textContent = `${dueTodayCount} Due Today`;
  }

  // Archive badge counter
  const archiveBadge = document.getElementById('archiveCountBadge');
  if (archiveBadge) {
    archiveBadge.textContent = state.archivedTasks.length;
  }
}

function renderFilterDropdowns() {
  // Categories
  const categories = Object.keys(state.stats.categories || {});
  const currentCat = state.filters.category;
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = `${cat} (${state.stats.categories[cat]})`;
    if (cat === currentCat) opt.selected = true;
    categoryFilter.appendChild(opt);
  });

  // Tags Extraction
  const allTags = new Set();
  state.tasks.forEach(t => (t.tags || []).forEach(tg => allTags.add(tg)));
  const currentTag = state.filters.tag;
  tagFilter.innerHTML = '<option value="all">All Tags</option>';
  allTags.forEach(tg => {
    const opt = document.createElement('option');
    opt.value = tg;
    opt.textContent = `#${tg}`;
    if (tg === currentTag) opt.selected = true;
    tagFilter.appendChild(opt);
  });
}

// ==========================================================================
// 5. VIEW SWITCHER & RENDER DISPATCHER
// ==========================================================================

function switchView(viewName) {
  if (!viewPanels[viewName]) return;
  state.currentView = viewName;

  // Update active tab buttons
  viewModeTabs.querySelectorAll('.view-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Toggle view visibility
  Object.keys(viewPanels).forEach(key => {
    if (viewPanels[key]) {
      viewPanels[key].style.display = key === viewName ? 'block' : 'none';
    }
  });

  renderCurrentView();
}

function renderCurrentView() {
  switch (state.currentView) {
    case 'kanban':
      renderKanbanView();
      break;
    case 'list':
      renderListView();
      break;
    case 'analytics':
      renderAnalyticsCharts();
      break;
    case 'calendar':
      renderCalendarView();
      break;
    case 'timeline':
      renderTimelineView();
      break;
    case 'workflow':
      renderWorkflowView();
      break;
    case 'archived':
      renderArchivedView();
      break;
  }
}

// ==========================================================================
// 6. VIEW 1: KANBAN BOARD WITH DRAG & DROP
// ==========================================================================

function renderKanbanView() {
  const dropzones = {
    todo: document.getElementById('dropzoneTodo'),
    in_progress: document.getElementById('dropzoneProgress'),
    review: document.getElementById('dropzoneReview'),
    completed: document.getElementById('dropzoneCompleted')
  };

  const counters = {
    todo: document.getElementById('countTodo'),
    in_progress: document.getElementById('countProgress'),
    review: document.getElementById('countReview'),
    completed: document.getElementById('countCompleted')
  };

  // Clear dropzones
  Object.values(dropzones).forEach(dz => {
    if (dz) dz.innerHTML = '';
  });

  const columnBuckets = {
    todo: [],
    in_progress: [],
    review: [],
    completed: []
  };

  state.tasks.forEach(task => {
    let status = task.status || (task.completed ? 'completed' : 'todo');
    if (!columnBuckets[status]) status = 'todo';
    columnBuckets[status].push(task);
  });

  // Render cards into dropzones
  Object.keys(columnBuckets).forEach(status => {
    const list = columnBuckets[status];
    if (counters[status]) counters[status].textContent = list.length;

    const dz = dropzones[status];
    if (!dz) return;

    if (list.length === 0) {
      dz.innerHTML = `<div class="notif-empty" style="border: 1px dashed var(--border-subtle); border-radius: 8px;">No tasks in this lane</div>`;
      return;
    }

    list.forEach(task => {
      const card = createTaskCardElement(task);
      dz.appendChild(card);
    });
  });

  setupKanbanDropListeners();
}

function setupKanbanDropListeners() {
  const dropzones = document.querySelectorAll('.kanban-dropzone');
  dropzones.forEach(dz => {
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('drag-over');
    });

    dz.addEventListener('dragleave', () => {
      dz.classList.remove('drag-over');
    });

    dz.addEventListener('drop', async (e) => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain') || state.draggedTaskId;
      const targetStatus = dz.dataset.status;

      if (!taskId || !targetStatus) return;

      const task = state.tasks.find(t => t.id === taskId);
      if (task && task.status !== targetStatus) {
        try {
          const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus })
          });
          if (!res.ok) throw new Error('Status update failed');
          showToast(`Task moved to ${targetStatus.replace('_', ' ').toUpperCase()}`, 'info');
          await loadData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  });
}

// Reusable Task Card Element Builder
function createTaskCardElement(task) {
  const card = document.createElement('div');
  card.className = `task-card ${task.completed ? 'completed-card' : ''} ${task.pinned ? 'is-pinned' : ''}`;
  card.dataset.id = task.id;
  card.draggable = true;

  card.addEventListener('dragstart', (e) => {
    state.draggedTaskId = task.id;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', task.id);
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    state.draggedTaskId = null;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = !task.completed && task.dueDate && task.dueDate < todayStr;
  const priorityClass = `badge-priority-${(task.priority || 'medium').toLowerCase()}`;

  // Due Date Pill
  let dueHtml = '';
  if (task.dueDate) {
    dueHtml = `<span class="badge ${isOverdue ? 'badge-overdue' : 'badge-due'}">
      ${isOverdue ? '⚠️ Overdue' : '📅'} ${task.dueDate}
    </span>`;
  }

  // Tags Pills with dynamic colors
  const tagsHtml = (task.tags || [])
    .slice(0, 4)
    .map(t => `<span class="badge badge-tag ${getTagColorClass(t)}">#${escapeHtml(t)}</span>`)
    .join('');

  // Subtask Progress bar
  let subtasksProgressHtml = '';
  if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    const doneCount = task.subtasks.filter(s => s.completed).length;
    const pct = Math.round((doneCount / task.subtasks.length) * 100);
    subtasksProgressHtml = `
      <div class="task-progress-block">
        <div class="task-progress-label-row">
          <span>Subtasks (${doneCount}/${task.subtasks.length})</span>
          <span>${pct}%</span>
        </div>
        <div class="mini-progress-track">
          <div class="mini-progress-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="task-card-header">
      <div class="task-title-group">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} title="Mark as ${task.completed ? 'active' : 'completed'}">
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
      </div>
      <div class="task-header-actions">
        <button class="task-menu-btn pin-task-btn ${task.pinned ? 'is-active' : ''}" title="${task.pinned ? 'Unpin Task' : 'Pin Task to Top'}">📌</button>
        <button class="task-menu-btn edit-task-btn" title="Edit Task">✏️</button>
      </div>
    </div>

    ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
    ${subtasksProgressHtml}

    <div class="task-meta-row">
      <span class="badge ${priorityClass}">● ${escapeHtml(task.priority)}</span>
      <span class="badge badge-category">${escapeHtml(task.category || 'General')}</span>
      ${dueHtml}
      ${task.recurring && task.recurring !== 'none' ? `<span class="badge badge-recurring">🔁 ${task.recurring}</span>` : ''}
      ${tagsHtml}
    </div>

    <div class="card-quick-actions">
      <button class="action-icon-btn focus-timer-btn" title="Focus Timer (Pomodoro)">⏱️</button>
      <button class="action-icon-btn duplicate-btn" title="Duplicate Task">📋</button>
      <button class="action-icon-btn archive-btn" title="Archive Task">🗄️</button>
      <button class="action-icon-btn delete-btn" title="Delete Task">🗑️</button>
    </div>
  `;

  // Attach card interaction listeners
  const checkbox = card.querySelector('.task-checkbox');
  checkbox.addEventListener('change', () => handleToggleTask(task.id));

  const pinBtn = card.querySelector('.pin-task-btn');
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleTogglePin(task.id);
  });

  const focusBtn = card.querySelector('.focus-timer-btn');
  focusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    PomodoroEngine.bindTask(task.title);
  });

  const editBtn = card.querySelector('.edit-task-btn');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(task);
  });

  const dupBtn = card.querySelector('.duplicate-btn');
  dupBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDuplicateTask(task.id);
  });

  const archiveBtn = card.querySelector('.archive-btn');
  archiveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleToggleArchive(task.id);
  });

  const delBtn = card.querySelector('.delete-btn');
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDeleteTask(task.id, task.title);
  });

  return card;
}

// ==========================================================================
// 7. VIEW 2: TRADITIONAL LIST VIEW
// ==========================================================================

function renderListView() {
  const container = document.getElementById('taskList');
  if (!container) return;
  container.innerHTML = '';

  if (state.tasks.length === 0) {
    emptyState.style.display = 'flex';
    container.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  container.style.display = 'flex';

  const todayStr = new Date().toISOString().split('T')[0];

  state.tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-list-item ${task.pinned ? 'is-pinned' : ''}`;

    const isOverdue = !task.completed && task.dueDate && task.dueDate < todayStr;
    const priorityClass = `badge-priority-${(task.priority || 'medium').toLowerCase()}`;

    // Subtask rows
    let subtasksHtml = '';
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      subtasksHtml = `
        <div class="subtasks-accordion">
          ${task.subtasks.map(s => `
            <div class="subtask-row ${s.completed ? 'done' : ''}">
              <input type="checkbox" ${s.completed ? 'checked' : ''} onchange="handleToggleSubtask('${task.id}', '${s.id}')">
              <span>${escapeHtml(s.title)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    item.innerHTML = `
      <div class="list-item-left">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="list-item-content">
          <div class="list-title-row" style="display: flex; align-items: center; gap: 8px;">
            <h3 class="task-title ${task.completed ? 'line-through text-muted' : ''}">${escapeHtml(task.title)}</h3>
            ${task.pinned ? '<span class="pinned-badge">📌 Pinned</span>' : ''}
          </div>
          ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
          <div class="task-meta-row">
            <span class="badge ${priorityClass}">● ${escapeHtml(task.priority)}</span>
            <span class="badge badge-category">${escapeHtml(task.category || 'General')}</span>
            ${task.dueDate ? `<span class="badge ${isOverdue ? 'badge-overdue' : 'badge-due'}">📅 ${task.dueDate}</span>` : ''}
            <span class="badge badge-category">${task.status ? task.status.replace('_', ' ').toUpperCase() : 'TODO'}</span>
            ${(task.tags || []).map(t => `<span class="badge badge-tag ${getTagColorClass(t)}">#${escapeHtml(t)}</span>`).join('')}
          </div>
          ${subtasksHtml}
        </div>
      </div>
      <div class="list-item-right">
        <button class="action-icon-btn pin-btn ${task.pinned ? 'is-active' : ''}" title="${task.pinned ? 'Unpin' : 'Pin to top'}">📌</button>
        <button class="action-icon-btn focus-btn" title="Focus Timer">⏱️</button>
        <button class="action-icon-btn edit-btn" title="Edit">✏️</button>
        <button class="action-icon-btn dup-btn" title="Duplicate">📋</button>
        <button class="action-icon-btn arch-btn" title="Archive">🗄️</button>
        <button class="action-icon-btn del-btn" title="Delete">🗑️</button>
      </div>
    `;

    // Listeners
    item.querySelector('.task-checkbox').addEventListener('change', () => handleToggleTask(task.id));
    item.querySelector('.pin-btn').addEventListener('click', () => handleTogglePin(task.id));
    item.querySelector('.focus-btn').addEventListener('click', () => PomodoroEngine.bindTask(task.title));
    item.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task));
    item.querySelector('.dup-btn').addEventListener('click', () => handleDuplicateTask(task.id));
    item.querySelector('.arch-btn').addEventListener('click', () => handleToggleArchive(task.id));
    item.querySelector('.del-btn').addEventListener('click', () => handleDeleteTask(task.id, task.title));

    container.appendChild(item);
  });
}

// ==========================================================================
// 8. VIEW 3: INTERACTIVE CHARTS & AUDIT LOG (Chart.js)
// ==========================================================================

function renderAnalyticsCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded, analytics charts deferred.');
    return;
  }

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  // 1. Velocity Trend Chart (7-day activity)
  const velocityCanvas = document.getElementById('velocityChart');
  if (velocityCanvas) {
    if (state.charts.velocity) state.charts.velocity.destroy();

    const weekly = state.stats.weeklyData || [];
    const labels = weekly.map(w => w.label || w.date);
    const createdData = weekly.map(w => w.created || 0);
    const completedData = weekly.map(w => w.completed || 0);

    state.charts.velocity = new Chart(velocityCanvas, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Completed Tasks',
            data: completedData.length ? completedData : [2, 4, 3, 5, 4, 6, 8],
            borderColor: '#ff1a40',
            backgroundColor: 'rgba(255, 26, 64, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#ff1a40'
          },
          {
            label: 'Created Tasks',
            data: createdData.length ? createdData : [3, 2, 4, 3, 5, 2, 4],
            borderColor: '#06b6d4',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.35,
            pointBackgroundColor: '#06b6d4'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor } }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
  }

  // 2. Status Distribution Donut Chart
  const statusCanvas = document.getElementById('statusChart');
  if (statusCanvas) {
    if (state.charts.status) state.charts.status.destroy();

    const sb = state.stats.statusBreakdown || { todo: 1, in_progress: 1, review: 1, completed: 1 };
    state.charts.status = new Chart(statusCanvas, {
      type: 'doughnut',
      data: {
        labels: ['To Do', 'In Progress', 'In Review', 'Done'],
        datasets: [{
          data: [sb.todo || 0, sb.in_progress || 0, sb.review || 0, sb.completed || 0],
          backgroundColor: ['#06b6d4', '#f59e0b', '#a855f7', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor } }
        },
        cutout: '68%'
      }
    });
  }

  // 3. Category Breakdown Bar Chart
  const catCanvas = document.getElementById('categoryChart');
  if (catCanvas) {
    if (state.charts.category) state.charts.category.destroy();

    const cats = Object.keys(state.stats.categories || {});
    const counts = cats.map(c => state.stats.categories[c]);

    state.charts.category = new Chart(catCanvas, {
      type: 'bar',
      data: {
        labels: cats.length ? cats : ['General'],
        datasets: [{
          label: 'Total Tasks',
          data: counts.length ? counts : [1],
          backgroundColor: '#ff1a40',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
  }

  // 4. Priority Matrix Chart
  const prioCanvas = document.getElementById('priorityChart');
  if (prioCanvas) {
    if (state.charts.priority) state.charts.priority.destroy();

    const pb = state.stats.priorityBreakdown || { critical: 1, high: 2, medium: 3, low: 1 };
    state.charts.priority = new Chart(prioCanvas, {
      type: 'bar',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          label: 'Count',
          data: [pb.critical || 0, pb.high || 0, pb.medium || 0, pb.low || 0],
          backgroundColor: ['#ff1a40', '#f97316', '#eab308', '#10b981'],
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  // Activity Feed List Rendering
  const feedContainer = document.getElementById('activityFeedList');
  if (feedContainer) {
    const feed = state.stats.activityFeed || [];
    if (feed.length === 0) {
      feedContainer.innerHTML = '<div class="notif-empty">No recent changes recorded</div>';
    } else {
      feedContainer.innerHTML = feed.map(item => `
        <div class="activity-item">
          <div class="activity-item-left">
            <span class="activity-dot" style="background: ${item.type === 'completed' ? '#10b981' : '#ff1a40'}"></span>
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <span class="text-muted"> (${item.status.toUpperCase()} • ${item.priority})</span>
            </div>
          </div>
          <span class="activity-time">${new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      `).join('');
    }
  }
}

// ==========================================================================
// 9. VIEW 4: INTERACTIVE CALENDAR
// ==========================================================================

function renderCalendarView() {
  const title = document.getElementById('calendarMonthTitle');
  const grid = document.getElementById('calendarDaysGrid');
  if (!grid || !title) return;

  grid.innerHTML = '';
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();

  title.textContent = state.calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  const todayStr = new Date().toISOString().split('T')[0];

  // Previous month padding
  for (let i = firstDayIndex; i > 0; i--) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<span class="day-number">${prevLastDate - i + 1}</span>`;
    grid.appendChild(cell);
  }

  // Current month days
  for (let date = 1; date <= lastDate; date++) {
    const cell = document.createElement('div');
    const dateFormatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const isToday = dateFormatted === todayStr;

    cell.className = `calendar-day-cell ${isToday ? 'today' : ''}`;
    cell.innerHTML = `
      <div class="day-cell-top">
        <span class="day-number">${date}</span>
      </div>
      <div class="day-cell-tasks" id="cal-day-${dateFormatted}"></div>
    `;

    // Click cell to create task on that day
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.cal-task-pill')) return;
      openCreateModalWithDueDate(dateFormatted);
    });

    grid.appendChild(cell);
  }

  // Populate tasks in their respective date cells
  state.tasks.forEach(task => {
    if (!task.dueDate) return;
    const taskContainer = document.getElementById(`cal-day-${task.dueDate}`);
    if (taskContainer) {
      const pill = document.createElement('div');
      pill.className = 'cal-task-pill';
      pill.textContent = task.title;
      pill.title = `${task.title} (${task.priority})`;

      const prioColor = task.priority === 'Critical' ? '#ff1a40' : (task.priority === 'High' ? '#f59e0b' : '#10b981');
      pill.style.borderLeftColor = prioColor;

      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(task);
      });
      taskContainer.appendChild(pill);
    }
  });
}

// Calendar navigation listeners
const calPrevBtn = document.getElementById('calPrevBtn');
const calNextBtn = document.getElementById('calNextBtn');
const calTodayBtn = document.getElementById('calTodayBtn');

if (calPrevBtn) {
  calPrevBtn.addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    renderCalendarView();
  });
}
if (calNextBtn) {
  calNextBtn.addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    renderCalendarView();
  });
}
if (calTodayBtn) {
  calTodayBtn.addEventListener('click', () => {
    state.calendarDate = new Date();
    renderCalendarView();
  });
}

// ==========================================================================
// 10. VIEW 5: TIMELINE / GANTT VIEW
// ==========================================================================

function renderTimelineView() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;
  container.innerHTML = '';

  if (state.tasks.length === 0) {
    container.innerHTML = `<div class="notif-empty">No active tasks to display on timeline.</div>`;
    return;
  }

  state.tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const progress = task.progress || (task.completed ? 100 : 0);
    const startStr = task.createdAt ? task.createdAt.split('T')[0] : 'Created';
    const dueStr = task.dueDate || 'No Deadline';

    item.innerHTML = `
      <div class="timeline-item-header">
        <span class="timeline-item-title">${escapeHtml(task.title)}</span>
        <span class="timeline-item-dates">📅 ${startStr} → ${dueStr}</span>
      </div>
      <div class="timeline-bar-track">
        <div class="timeline-bar-fill" style="width: ${progress}%"></div>
      </div>
      <div class="task-progress-label-row">
        <span>Status: ${task.status.replace('_', ' ').toUpperCase()}</span>
        <span>${progress}% Complete</span>
      </div>
    `;
    item.addEventListener('click', () => openEditModal(task));
    container.appendChild(item);
  });
}

// ==========================================================================
// 11. VIEW 6: WORKFLOW FLOWCHART & DEPENDENCIES
// ==========================================================================

function renderWorkflowView() {
  const nodesContainer = document.getElementById('workflowNodes');
  const svg = document.getElementById('workflowSvg');
  if (!nodesContainer || !svg) return;

  nodesContainer.innerHTML = '';
  svg.innerHTML = '';

  const stages = [
    { key: 'todo', label: '1. TO DO' },
    { key: 'in_progress', label: '2. IN PROGRESS' },
    { key: 'review', label: '3. REVIEW' },
    { key: 'completed', label: '4. DONE' }
  ];

  stages.forEach(st => {
    const col = document.createElement('div');
    col.className = 'workflow-stage-col';
    col.innerHTML = `<div class="wf-col-title">${st.label}</div>`;

    const stageTasks = state.tasks.filter(t => (t.status || 'todo') === st.key);
    stageTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'workflow-node-card';
      card.dataset.id = task.id;

      const prioColor = task.priority === 'Critical' ? '#ff1a40' : (task.priority === 'High' ? '#f59e0b' : '#10b981');
      card.style.borderLeftColor = prioColor;

      card.innerHTML = `
        <div class="wf-node-title">${escapeHtml(task.title)}</div>
        <div class="wf-node-sub">${task.priority} • ${task.progress || 0}%</div>
      `;
      card.addEventListener('click', () => openEditModal(task));
      col.appendChild(card);
    });

    nodesContainer.appendChild(col);
  });
}

// ==========================================================================
// 12. VIEW 7: ARCHIVED VIEW
// ==========================================================================

function renderArchivedView() {
  const container = document.getElementById('archivedList');
  if (!container) return;
  container.innerHTML = '';

  if (state.archivedTasks.length === 0) {
    container.innerHTML = `<div class="notif-empty">The archive is currently empty.</div>`;
    return;
  }

  state.archivedTasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'task-list-item';
    item.innerHTML = `
      <div class="list-item-left">
        <div class="list-item-content">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <p class="task-desc">${escapeHtml(task.description || '')}</p>
        </div>
      </div>
      <div class="list-item-right">
        <button class="btn btn-secondary btn-sm restore-btn">Restore</button>
        <button class="action-icon-btn del-btn" title="Delete Permanently">🗑️</button>
      </div>
    `;

    item.querySelector('.restore-btn').addEventListener('click', () => handleToggleArchive(task.id));
    item.querySelector('.del-btn').addEventListener('click', () => handleDeleteTask(task.id, task.title));

    container.appendChild(item);
  });
}

// ==========================================================================
// 13. TASK CRUD & ACTIONS
// ==========================================================================

async function handleToggleTask(id) {
  try {
    const res = await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Status toggle failed');
    const json = await res.json();
    if (json.data && json.data.completed) {
      AudioEngine.playComplete();
    }
    showToast(json.message || 'Status updated', 'success');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleTogglePin(id) {
  try {
    const res = await fetch(`/api/tasks/${id}/pin`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Pin update failed');
    const json = await res.json();
    AudioEngine.playPin();
    showToast(json.message || 'Pin status updated', 'info');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDuplicateTask(id) {
  try {
    const res = await fetch(`/api/tasks/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to duplicate task');
    showToast('Task duplicated successfully', 'success');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleToggleArchive(id) {
  try {
    const res = await fetch(`/api/tasks/${id}/archive`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Archive toggle failed');
    const json = await res.json();
    showToast(json.message, 'info');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteTask(id, title) {
  showConfirm('Delete Task', `Are you sure you want to permanently delete "${title}"?`, async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      showToast('Task removed', 'info');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function handleToggleSubtask(taskId, subtaskId) {
  try {
    const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Subtask update failed');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================================================
// 14. MODAL MANAGEMENT (Create / Edit Task & Subtasks)
// ==========================================================================

function openCreateModal() {
  state.editingTaskId = null;
  state.modalSubtasks = [];

  modalTitle.textContent = 'Create New Task';
  taskIdInput.value = '';
  taskTitleInput.value = '';
  taskDescInput.value = '';
  taskStatusInput.value = 'todo';
  taskPriorityInput.value = 'Medium';
  taskCategoryInput.value = 'Engineering';
  taskDueDateInput.value = '';
  taskRecurringInput.value = 'none';
  taskTagsInput.value = '';
  const taskPinned = document.getElementById('taskPinned');
  if (taskPinned) taskPinned.checked = false;

  renderModalSubtasks();
  taskModal.style.display = 'flex';
  setTimeout(() => taskTitleInput.focus(), 60);
}

function openCreateModalWithStatus(status) {
  openCreateModal();
  taskStatusInput.value = status;
}

function openCreateModalWithDueDate(dateStr) {
  openCreateModal();
  taskDueDateInput.value = dateStr;
}

function openEditModal(task) {
  state.editingTaskId = task.id;
  state.modalSubtasks = JSON.parse(JSON.stringify(task.subtasks || []));

  modalTitle.textContent = 'Edit Task Specifications';
  taskIdInput.value = task.id;
  taskTitleInput.value = task.title;
  taskDescInput.value = task.description || '';
  taskStatusInput.value = task.status || (task.completed ? 'completed' : 'todo');
  taskPriorityInput.value = task.priority || 'Medium';
  taskCategoryInput.value = task.category || 'General';
  taskDueDateInput.value = task.dueDate || '';
  taskRecurringInput.value = task.recurring || 'none';
  taskTagsInput.value = (task.tags || []).join(', ');
  const taskPinned = document.getElementById('taskPinned');
  if (taskPinned) taskPinned.checked = Boolean(task.pinned);

  renderModalSubtasks();
  taskModal.style.display = 'flex';
  setTimeout(() => taskTitleInput.focus(), 60);
}

function closeModal() {
  taskModal.style.display = 'none';
  state.editingTaskId = null;
  state.modalSubtasks = [];
}

// Modal Subtask Operations
function renderModalSubtasks() {
  modalSubtaskList.innerHTML = '';
  const total = state.modalSubtasks.length;
  const done = state.modalSubtasks.filter(s => s.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  subtaskProgressIndicator.textContent = `${done} / ${total} Done (${pct}%)`;

  state.modalSubtasks.forEach((sub, idx) => {
    const item = document.createElement('div');
    item.className = 'modal-subtask-item';
    item.innerHTML = `
      <div class="modal-subtask-item-left">
        <input type="checkbox" ${sub.completed ? 'checked' : ''} data-index="${idx}">
        <span class="${sub.completed ? 'line-through text-muted' : ''}">${escapeHtml(sub.title)}</span>
      </div>
      <button type="button" class="action-icon-btn remove-sub-btn" data-index="${idx}">×</button>
    `;

    item.querySelector('input').addEventListener('change', (e) => {
      state.modalSubtasks[idx].completed = e.target.checked;
      renderModalSubtasks();
    });

    item.querySelector('.remove-sub-btn').addEventListener('click', () => {
      state.modalSubtasks.splice(idx, 1);
      renderModalSubtasks();
    });

    modalSubtaskList.appendChild(item);
  });
}

if (addSubtaskBtn && newSubtaskTitle) {
  addSubtaskBtn.addEventListener('click', () => {
    const val = newSubtaskTitle.value.trim();
    if (!val) return;
    state.modalSubtasks.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`,
      title: val,
      completed: false
    });
    newSubtaskTitle.value = '';
    renderModalSubtasks();
    newSubtaskTitle.focus();
  });

  newSubtaskTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtaskBtn.click();
    }
  });
}

// Submit Modal Form
async function handleFormSubmit(e) {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title) {
    showToast('Task title is required', 'error');
    return;
  }

  const tags = taskTagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const taskPinned = document.getElementById('taskPinned');
  const pinned = taskPinned ? taskPinned.checked : false;

  const payload = {
    title,
    description: taskDescInput.value.trim(),
    category: taskCategoryInput.value.trim() || 'General',
    priority: taskPriorityInput.value,
    status: taskStatusInput.value,
    dueDate: taskDueDateInput.value || null,
    recurring: taskRecurringInput.value,
    tags,
    subtasks: state.modalSubtasks,
    pinned
  };

  try {
    let res;
    if (state.editingTaskId) {
      res = await fetch(`/api/tasks/${state.editingTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save task');
    }

    if (state.editingTaskId) {
      showToast('Task updated', 'success');
    } else {
      AudioEngine.playCreate();
      showToast('Task created successfully', 'success');
    }
    closeModal();
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================================================
// 15. COMMAND PALETTE (Ctrl + K)
// ==========================================================================

function openCommandPalette() {
  commandPaletteModal.style.display = 'flex';
  paletteInput.value = '';
  renderPaletteResults('');
  setTimeout(() => paletteInput.focus(), 50);
}

function closeCommandPalette() {
  commandPaletteModal.style.display = 'none';
}

function renderPaletteResults(query) {
  paletteResults.innerHTML = '';
  const q = query.toLowerCase().trim();

  // Static commands list
  const commands = [
    { title: '＋ Create New Task', action: () => { closeCommandPalette(); openCreateModal(); } },
    { title: '✨ AI Executive Sprint Briefing', action: () => { closeCommandPalette(); loadAiSummary(); } },
    { title: '⏱️ Open Focus / Pomodoro Timer', action: () => { closeCommandPalette(); PomodoroEngine.toggleWidget(); } },
    { title: '📋 Switch to Kanban Board', action: () => { closeCommandPalette(); switchView('kanban'); } },
    { title: '📑 Switch to Task List', action: () => { closeCommandPalette(); switchView('list'); } },
    { title: '📊 Open Analytics & Charts', action: () => { closeCommandPalette(); switchView('analytics'); } },
    { title: '📅 Open Calendar', action: () => { closeCommandPalette(); switchView('calendar'); } },
    { title: '⏱️ Open Timeline View', action: () => { closeCommandPalette(); switchView('timeline'); } },
    { title: '🕸️ View Workflow Flowchart', action: () => { closeCommandPalette(); switchView('workflow'); } },
    { title: '📊 Export CSV Spreadsheet', action: () => { window.location.href = '/api/tasks/export/csv'; closeCommandPalette(); } },
    { title: '⬇ Export JSON Backup', action: () => { window.location.href = '/api/tasks/export'; closeCommandPalette(); } },
    { title: '🖨️ Print Tasks / PDF View', action: () => { closeCommandPalette(); setTimeout(() => window.print(), 200); } },
    { title: '🔊 Toggle Audio Sound Effects', action: () => { AudioEngine.toggle(); closeCommandPalette(); } },
    { title: '⚙️ AI Intelligence Settings', action: () => { closeCommandPalette(); document.getElementById('aiSettingsModal').style.display = 'flex'; } },
    { title: '☀️ / 🌙 Toggle Theme', action: () => { toggleTheme(); closeCommandPalette(); } }
  ];

  // Filter commands
  const matchedCommands = commands.filter(c => c.title.toLowerCase().includes(q));
  matchedCommands.forEach(cmd => {
    const item = document.createElement('div');
    item.className = 'palette-item';
    item.innerHTML = `
      <div class="palette-item-left">
        <span>⚡</span>
        <strong>${cmd.title}</strong>
      </div>
      <span class="palette-item-shortcut">Action</span>
    `;
    item.addEventListener('click', cmd.action);
    paletteResults.appendChild(item);
  });

  // Filter Tasks
  if (q) {
    const matchedTasks = state.tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.tags && t.tags.some(tg => tg.toLowerCase().includes(q)))
    );

    matchedTasks.slice(0, 5).forEach(task => {
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.innerHTML = `
        <div class="palette-item-left">
          <span>📌</span>
          <span>${escapeHtml(task.title)}</span>
        </div>
        <span class="palette-item-shortcut">${task.priority}</span>
      `;
      item.addEventListener('click', () => {
        closeCommandPalette();
        openEditModal(task);
      });
      paletteResults.appendChild(item);
    });
  }
}

if (paletteInput) {
  paletteInput.addEventListener('input', (e) => {
    renderPaletteResults(e.target.value);
  });
}

// ==========================================================================
// 16. NOTIFICATION SYSTEM
// ==========================================================================

function renderNotifications() {
  const notifs = state.stats.notifications || [];
  if (notifBadge) {
    if (notifs.length > 0) {
      notifBadge.style.display = 'flex';
      notifBadge.textContent = notifs.length;
    } else {
      notifBadge.style.display = 'none';
    }
  }

  if (notifList) {
    if (notifs.length === 0) {
      notifList.innerHTML = '<div class="notif-empty">No unread notifications</div>';
    } else {
      notifList.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.type === 'warning' ? 'notif-warning' : ''}">
          <div class="notif-title">${escapeHtml(n.title)}</div>
          <div class="notif-msg">${escapeHtml(n.message)}</div>
        </div>
      `).join('');
    }
  }
}

if (notifBellBtn) {
  notifBellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
  });
}

document.addEventListener('click', (e) => {
  if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBellBtn) {
    notifDropdown.style.display = 'none';
  }
});

if (clearNotifsBtn) {
  clearNotifsBtn.addEventListener('click', () => {
    if (state.stats) state.stats.notifications = [];
    renderNotifications();
    notifDropdown.style.display = 'none';
  });
}

// ==========================================================================
// 17. CUSTOM CONFIRMATION DIALOG
// ==========================================================================

function showConfirm(title, message, callback) {
  confirmDialogTitle.textContent = title;
  confirmDialogMessage.textContent = message;
  pendingConfirmCallback = callback;
  confirmModal.style.display = 'flex';
}

function closeConfirm() {
  confirmModal.style.display = 'none';
  pendingConfirmCallback = null;
}

if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirm);
if (confirmProceedBtn) {
  confirmProceedBtn.addEventListener('click', () => {
    if (pendingConfirmCallback) pendingConfirmCallback();
    closeConfirm();
  });
}

// ==========================================================================
// 18. EVENT LISTENERS SETUP
// ==========================================================================

function setupEventListeners() {
  // Theme Toggle
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  // View Mode Tabs
  if (viewModeTabs) {
    viewModeTabs.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
  }

  // Modals
  if (openNewTaskModalBtn) openNewTaskModalBtn.addEventListener('click', openCreateModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
  if (taskForm) taskForm.addEventListener('submit', handleFormSubmit);

  if (taskModal) {
    taskModal.addEventListener('click', (e) => {
      if (e.target === taskModal) closeModal();
    });
  }

  // Command Palette Trigger
  if (globalSearchTrigger) globalSearchTrigger.addEventListener('click', openCommandPalette);
  if (commandPaletteModal) {
    commandPaletteModal.addEventListener('click', (e) => {
      if (e.target === commandPaletteModal) closeCommandPalette();
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ctrl + K or Cmd + K -> Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    // Escape closes modals
    if (e.key === 'Escape') {
      const aiSummaryModal = document.getElementById('aiSummaryModal');
      const aiSettingsModal = document.getElementById('aiSettingsModal');
      if (commandPaletteModal && commandPaletteModal.style.display === 'flex') {
        closeCommandPalette();
      } else if (taskModal && taskModal.style.display === 'flex') {
        closeModal();
      } else if (confirmModal && confirmModal.style.display === 'flex') {
        closeConfirm();
      } else if (aiSummaryModal && aiSummaryModal.style.display === 'flex') {
        aiSummaryModal.style.display = 'none';
      } else if (aiSettingsModal && aiSettingsModal.style.display === 'flex') {
        aiSettingsModal.style.display = 'none';
      }
      return;
    }

    // Press 'N' to create new task when not in an input
    if (e.key.toLowerCase() === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openCreateModal();
    }
  });

  // Export & Import
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.location.href = '/api/tasks/export';
    });
  }

  if (importFile) {
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!Array.isArray(parsed)) throw new Error('File must be an array of task objects');

          const res = await fetch('/api/tasks/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          });

          if (!res.ok) throw new Error('Import failed');
          const result = await res.json();
          showToast(result.message || 'Tasks imported', 'success');
          await loadData();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          importFile.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  // Filters & Search
  if (priorityFilter) {
    priorityFilter.addEventListener('change', (e) => {
      state.filters.priority = e.target.value;
      loadData();
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      loadData();
    });
  }

  if (tagFilter) {
    tagFilter.addEventListener('change', (e) => {
      state.filters.tag = e.target.value;
      loadData();
    });
  }

  if (sortBy) {
    sortBy.addEventListener('change', (e) => {
      state.filters.sortBy = e.target.value;
      loadData();
    });
  }

  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const query = e.target.value;
      if (clearSearchBtn) clearSearchBtn.style.display = query ? 'block' : 'none';

      searchTimer = setTimeout(() => {
        state.filters.search = query;
        loadData();
      }, 250);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      state.filters.search = '';
      loadData();
    });
  }

  // Initialize Pomodoro Focus Engine
  PomodoroEngine.init();

  // Sound FX Toggle & Initial Icon
  const soundToggle = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  if (soundIcon) soundIcon.textContent = AudioEngine.enabled ? '🔊' : '🔇';
  if (soundToggle) soundToggle.addEventListener('click', () => AudioEngine.toggle());

  // Export CSV Spreadsheet & Print
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      window.location.href = '/api/tasks/export/csv';
    });
  }

  const printBtn = document.getElementById('printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // AI Polish Button
  const aiPolishBtn = document.getElementById('aiPolishBtn');
  if (aiPolishBtn) {
    aiPolishBtn.addEventListener('click', async () => {
      const title = taskTitleInput.value.trim();
      if (!title) {
        showToast('Please type a task title first to polish with AI', 'info');
        taskTitleInput.focus();
        return;
      }
      const origText = aiPolishBtn.textContent;
      aiPolishBtn.textContent = '✨ Polishing...';
      aiPolishBtn.disabled = true;
      try {
        const res = await AIEngine.polish(title, taskDescInput.value);
        if (res.data) {
          if (res.data.title) taskTitleInput.value = res.data.title;
          if (res.data.description) taskDescInput.value = res.data.description;
          if (res.data.priority) taskPriorityInput.value = res.data.priority;
          if (res.data.category) taskCategoryInput.value = res.data.category;
          if (Array.isArray(res.data.tags) && res.data.tags.length > 0) {
            taskTagsInput.value = res.data.tags.join(', ');
          }
          showToast(`✨ Task enhanced (${res.source === 'gemini-1.5-flash' ? 'Gemini AI' : 'Neural Engine'})`, 'success');
          AudioEngine.playCreate();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        aiPolishBtn.textContent = origText;
        aiPolishBtn.disabled = false;
      }
    });
  }

  // AI Subtasks Breakdown Button
  const aiBreakdownBtn = document.getElementById('aiBreakdownBtn');
  if (aiBreakdownBtn) {
    aiBreakdownBtn.addEventListener('click', async () => {
      const title = taskTitleInput.value.trim();
      if (!title) {
        showToast('Please type a task title first to break down', 'info');
        taskTitleInput.focus();
        return;
      }
      const origText = aiBreakdownBtn.textContent;
      aiBreakdownBtn.textContent = '✨ Generating...';
      aiBreakdownBtn.disabled = true;
      try {
        const res = await AIEngine.breakdown(title, taskDescInput.value);
        if (Array.isArray(res.subtasks) && res.subtasks.length > 0) {
          res.subtasks.forEach(s => {
            state.modalSubtasks.push({
              id: crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}-${Math.random()}`,
              title: s.title,
              completed: false
            });
          });
          renderModalSubtasks();
          showToast(`✨ Generated ${res.subtasks.length} subtasks (${res.source === 'gemini-1.5-flash' ? 'Gemini AI' : 'Neural Engine'})`, 'success');
          AudioEngine.playCreate();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        aiBreakdownBtn.textContent = origText;
        aiBreakdownBtn.disabled = false;
      }
    });
  }

  // AI Executive Sprint Briefing
  const aiSummaryBtn = document.getElementById('aiSummaryBtn');
  const aiSummaryModal = document.getElementById('aiSummaryModal');
  const closeAiSummaryBtn = document.getElementById('closeAiSummaryBtn');
  const closeAiSummaryBtn2 = document.getElementById('closeAiSummaryBtn2');
  const refreshAiSummaryBtn = document.getElementById('refreshAiSummaryBtn');

  if (aiSummaryBtn) aiSummaryBtn.addEventListener('click', loadAiSummary);
  if (refreshAiSummaryBtn) refreshAiSummaryBtn.addEventListener('click', loadAiSummary);
  if (closeAiSummaryBtn) closeAiSummaryBtn.addEventListener('click', () => { if (aiSummaryModal) aiSummaryModal.style.display = 'none'; });
  if (closeAiSummaryBtn2) closeAiSummaryBtn2.addEventListener('click', () => { if (aiSummaryModal) aiSummaryModal.style.display = 'none'; });
  if (aiSummaryModal) {
    aiSummaryModal.addEventListener('click', (e) => {
      if (e.target === aiSummaryModal) aiSummaryModal.style.display = 'none';
    });
  }

  // AI Settings Modal
  const aiSettingsBtn = document.getElementById('aiSettingsBtn');
  const aiSettingsModal = document.getElementById('aiSettingsModal');
  const closeAiSettingsBtn = document.getElementById('closeAiSettingsBtn');
  const saveAiSettingsBtn = document.getElementById('saveAiSettingsBtn');
  const clearAiKeyBtn = document.getElementById('clearAiKeyBtn');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');

  if (aiSettingsBtn && aiSettingsModal) {
    aiSettingsBtn.addEventListener('click', () => {
      if (geminiApiKeyInput) geminiApiKeyInput.value = AIEngine.getApiKey();
      aiSettingsModal.style.display = 'flex';
    });
  }

  if (closeAiSettingsBtn) {
    closeAiSettingsBtn.addEventListener('click', () => {
      if (aiSettingsModal) aiSettingsModal.style.display = 'none';
    });
  }

  if (aiSettingsModal) {
    aiSettingsModal.addEventListener('click', (e) => {
      if (e.target === aiSettingsModal) aiSettingsModal.style.display = 'none';
    });
  }

  if (saveAiSettingsBtn) {
    saveAiSettingsBtn.addEventListener('click', () => {
      const key = geminiApiKeyInput ? geminiApiKeyInput.value.trim() : '';
      AIEngine.setApiKey(key);
      showToast(key ? 'Gemini API Key saved in local storage' : 'Using neural fallback engine', 'success');
      if (aiSettingsModal) aiSettingsModal.style.display = 'none';
    });
  }

  if (clearAiKeyBtn) {
    clearAiKeyBtn.addEventListener('click', () => {
      AIEngine.setApiKey('');
      if (geminiApiKeyInput) geminiApiKeyInput.value = '';
      showToast('Gemini key cleared', 'info');
    });
  }
}

async function loadAiSummary() {
  const aiSummaryModal = document.getElementById('aiSummaryModal');
  const aiSummaryContent = document.getElementById('aiSummaryContent');
  if (!aiSummaryContent) return;

  aiSummaryContent.innerHTML = `
    <div class="ai-loading-state">
      <div class="ai-spinner"></div>
      <p>Analyzing sprint telemetry, board constraints, and critical bottlenecks...</p>
    </div>
  `;
  if (aiSummaryModal) aiSummaryModal.style.display = 'flex';

  try {
    const res = await AIEngine.summary();
    const data = res.data;
    const isOptimal = data.healthStatus === 'OPTIMAL';
    aiSummaryContent.innerHTML = `
      <div class="ai-briefing-headline">${escapeHtml(data.headline)}</div>
      <span class="ai-health-badge ${isOptimal ? 'ai-health-optimal' : 'ai-health-attention'}">
        ● SYSTEM STATUS: ${escapeHtml(data.healthStatus)}
      </span>
      <ul class="ai-briefing-highlights">
        ${(data.highlights || []).map(h => `<li>${escapeHtml(h)}</li>`).join('')}
      </ul>
      <div class="ai-recommendation-box">
        <strong>💡 Strategic Recommendation:</strong> ${escapeHtml(data.focusRecommendation)}
      </div>
      <div style="margin-top: 14px; font-size: 11px; color: var(--text-muted); text-align: right;">
        Engine: ${res.source === 'gemini-1.5-flash' ? 'Google Gemini 1.5 Flash' : 'TaskFlow Neural Engine'}
      </div>
    `;
    AudioEngine.playPin();
  } catch (err) {
    aiSummaryContent.innerHTML = `
      <div style="padding: 24px; color: #ff5577; text-align: center;">
        <p>⚠️ Failed to generate AI summary: ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

// ==========================================================================
// 19. UTILITIES
// ==========================================================================

function showToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '⚡' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
