# ⚡ TASKFLOW PROTOCOL // v2.5 PRO
> An enterprise-grade, high-performance Task & Project Orchestration Platform built with **Node.js** and **Express**. Engineered with a dark obsidian & vibrant crimson design language, multi-view execution matrix (Kanban, List, Analytics, Calendar, Timeline, Workflow Flowchart), and instant keyboard-driven command palette.

[![Live Demo](https://img.shields.io/badge/Demo-Live%20on%20Vercel-ff1a40?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-10b981?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.21-06b6d4?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Tests](https://img.shields.io/badge/Tests-10%2F10%20Passing-brightgreen?style=for-the-badge&logo=githubactions&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)](LICENSE)

---

## 🌐 Live Deployment & Resume Links

- **Live Production URL:** [https://taskflow-protocol.vercel.app](https://taskflow-protocol.vercel.app) *(Deploy link instructions below)*
- **GitHub Repository:** `https://github.com/rafiulshafin/taskflow-protocol`
- **Target Role Portfolio Item:** Full-Stack Node.js Developer / Systems Engineer

---

## 📸 System Overview & UI Previews

```text
+---------------------------------------------------------------------------------------------------+
|  ⚡ TASKFLOW v2.5 PRO    [ ⌘ Command Palette / Search (Ctrl + K) ]    23:15:00 UTC   [+ New Task] |
+---------------------------------------------------------------------------------------------------+
|  [ VELOCITY: 94.8% ▲+12% ]       [ ACTIVE SPRINT: SPRINT 42 ]       [ DEADLINE RADAR: 0 ALERTS ]  |
+---------------------------------------------------------------------------------------------------+
|  [ 📋 Kanban Board ] [ 📑 Task List ] [ 📊 Analytics ] [ 📅 Calendar ] [ ⏱️ Timeline ] [ 🕸️ Flow ]|
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ TO DO (2) ]          [ IN PROGRESS (1) ]       [ IN REVIEW (1) ]         [ DONE (4) ]          |
|  +--------------------+ +-----------------------+ +-----------------------+ +-------------------+ |
|  | Build REST API     | | TaskFlow Next-Gen     | | Architecture Audit    | | Daily Cardio 30m  | |
|  | 🔴 Critical        | | 🟠 High Priority      | | 🟡 Medium Priority    | | 🟢 Low Priority   | |
|  | #Backend #NodeJS   | | #Platform #v2.5       | | #SecOps #Compliance   | | #Habit #Wellness  | |
|  | Due: 2026-11-25    | | Due: 2026-11-21       | | Due: 2026-11-24       | | Completed 100%    | |
|  +--------------------+ +-----------------------+ +-----------------------+ +-------------------+ |
+---------------------------------------------------------------------------------------------------+
```

---

## 🏗️ System Architecture & Workflow

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Presentation Layer (Desktop PWA & Web)"]
        UI["Obsidian & Crimson Glassmorphic UI"]
        KB["Kanban Engine (HTML5 Drag & Drop)"]
        CH["Analytics Engine (Chart.js 4.4)"]
        CAL["Interactive Monthly Calendar"]
        WF["Workflow Dependency Flowchart"]
        CP["Command Palette (Ctrl + K)"]
    end

    subgraph ServerLayer ["Node.js Express Backend Engine"]
        Router["Express REST Router"]
        Static["Static Asset Pipeline & Cache Control"]
        Logger["Structured Request Logger Middleware"]
        Errors["Centralized Error & 404 Handler"]
        VercelHandler["Vercel Serverless Function Bridge (/api)"]
    end

    subgraph DataLayer ["Resilient Storage Engine"]
        Storage["Atomic JSON Storage Engine (storage.js)"]
        LocalFile["Local DB: data/tasks.json (PC Persistent)"]
        VercelTemp["Cloud Temp DB: /tmp/tasks.json (Serverless Ephemeral)"]
        Backup["JSON Export / Import Pipeline"]
    end

    UI --> Router
    KB --> Router
    CH --> Router
    CAL --> Router
    WF --> Router
    CP --> Router

    Router --> Logger
    Router --> Errors
    Router --> Storage

    Storage --> LocalFile
    Storage --> VercelTemp
    Storage --> Backup
```

---

## 🗄️ Entity Relationship (ER) Data Model

```mermaid
erDiagram
    TASK {
        string id PK "UUID v4"
        string title "Required, non-empty"
        string description "Markdown/Notes"
        string category "Engineering, Design, etc."
        string priority "Critical | High | Medium | Low"
        string status "todo | in_progress | review | completed | archived"
        boolean completed "Boolean flag"
        int progress "0 to 100%"
        string recurring "none | daily | weekly | monthly"
        date dueDate "ISO Date (YYYY-MM-DD)"
        datetime createdAt "ISO Timestamp"
        datetime updatedAt "ISO Timestamp"
    }

    SUBTASK {
        string id PK "UUID v4"
        string taskId FK "Parent Task UUID"
        string title "Checklist Item"
        boolean completed "Checked status"
    }

    TAG {
        string name PK "Tag string identifier"
        string taskId FK "Parent Task UUID"
    }

    DEPENDENCY {
        string sourceId PK, FK "Dependent Task"
        string targetId PK, FK "Prerequisite Task"
    }

    TASK ||--o{ SUBTASK : contains
    TASK ||--o{ TAG : categorized_by
    TASK ||--o{ DEPENDENCY : requires
```

---

## 🔄 Project Lifecycle & Pull Request (PR) Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / User
    participant CLI as Terminal / VS Code
    participant Git as Git Version Control
    participant GitHub as Remote GitHub Repo
    participant Vercel as Vercel CI/CD Engine
    participant Prod as Live Production Web App

    Dev->>CLI: Develop features & run 'npm test'
    CLI->>Git: git add . && git commit -m "feat: upgrade TaskFlow"
    Git->>GitHub: git push origin main
    GitHub->>Vercel: Webhook Trigger (Deployment Event)
    Vercel->>Vercel: Build Serverless Function (api/index.js) & Bundle Static Assets
    Vercel->>Prod: Deploy to https://taskflow-protocol.vercel.app
    Prod-->>Dev: Live verification & Resume Link ready
```

---

## ✨ Core Features & Technical Highlights

### 1. 🌌 Futuristic Ambient Hero & HUD
- **Canvas Particle Physics:** Lightweight 60fps canvas particle mesh with interactive drifting nodes and connecting lines.
- **HUD System Bar:** Real-time UTC/Local digital clock, system latency pulse (`SYS_ACTIVE`), notification center, and theme switcher.
- **Productivity Telemetry:** Real-time velocity index, active sprint tracker, and deadline radar.

### 2. 🗂️ Multi-Dimensional Task Visualizations
- **📋 Kanban Board:** Full drag-and-drop workflow across 4 stages (`To Do`, `In Progress`, `In Review`, `Done`) with real-time backend synchronization.
- **📑 Traditional List View:** Detailed list view with expandable subtask checklists, status badges, priority markers, and quick actions.
- **📊 Interactive Analytics & Charts:** Powered by **Chart.js 4.4**:
  - *Task Completion & Velocity Trend* (7-day created vs completed tasks over time).
  - *Status Distribution* (doughnut chart showing workflow stages).
  - *Category Performance* (task throughput across categories).
  - *Priority Matrix* (distribution by urgency).
  - *Activity Stream* (live audit log of recent changes).
- **📅 Interactive Calendar:** Full monthly view showing scheduled deadlines as clickable badges, month navigation, and click-to-schedule day cells.
- **⏱️ Timeline / Gantt View:** Linear visual tracking of task spans, progress percentage, and upcoming deadlines.
- **🕸️ Workflow Flowchart:** Interactive node graph visually connecting pipeline stages and task dependencies.
- **🗄️ Archived Tasks View:** Cold archival storage with 1-click restoration.

### 3. 🎯 Advanced Task Management
- **Priorities:** `Critical` (🔴 neon glow), `High` (🟠), `Medium` (🟡), `Low` (🟢).
- **Subtasks & Progress Tracking:** Interactive checklist on cards and in the modal. Parent task progress (0%–100%) auto-calculates from completed subtasks.
- **Tags & Categories:** Support for multiple tags (`#api`, `#frontend`, `#security`) with instant filtering.
- **Recurring Tasks:** Native support for `Daily`, `Weekly`, `Monthly`, or `None`.
- **Duplicate & Archive:** 1-click task cloning and soft archival.

### 4. ⚡ Global Command Palette (`Ctrl + K` / `⌘K`)
- Instant fuzzy search across tasks, tags, and notes.
- Quick command actions: Switch viewports, create new tasks, toggle dark/light theme, export JSON backups.

---

## 🚀 Getting Started: How to Clone & Run

### Prerequisites
- **Node.js** v20.0.0 or higher
- **npm** v9.0.0 or higher
- **Git**

### Installation & Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/rafiulshafin/taskflow-protocol.git

# 2. Navigate to project root
cd taskflow-protocol

# 3. Install dependencies
npm install

# 4. Start the application
npm start
```

Open your browser at **[http://localhost:3000](http://localhost:3000)**.

### Development Mode (Auto-Reload on Change)
```bash
npm run dev
```

### Run Automated Tests
```bash
npm test
```
All **10/10** tests will execute using Node's built-in `node:test` runner.

---

## 🖥️ Running as a Desktop App on Windows

To run TaskFlow as a standalone desktop application (no browser address bar, exactly like YouTube/Spotify):

1. Double-click **`TaskFlow-App.bat`** (or use **`create-shortcut.vbs`** to generate a desktop icon).
2. It automatically starts the background server if not already running and launches in standalone app mode.

---

## ☁️ Deploying to Vercel (Resume Ready)

### Option 1: Via Vercel Dashboard (Easiest)
1. Push your repository to GitHub (instructions below).
2. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub.
3. Click **"Add New Project"** ➔ Select **`taskflow-protocol`**.
4. Leave root directory as `./` and click **"Deploy"**.
5. Vercel will build and assign you a live HTTPS link (e.g. `https://taskflow-protocol.vercel.app`) to put on your resume!

### Option 2: Via Vercel CLI
```bash
npx vercel
```
Follow the prompts to link and deploy in under 60 seconds.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check, system uptime, and Node version |
| `GET` | `/api/tasks` | List tasks (supports `status`, `priority`, `category`, `tag`, `search`, `sortBy`) |
| `GET` | `/api/tasks/:id` | Get details for a single task |
| `POST` | `/api/tasks` | Create task (`title`, `description`, `category`, `priority`, `dueDate`, `tags`, `subtasks`, `recurring`) |
| `PUT` | `/api/tasks/:id` | Update full task specifications |
| `PATCH` | `/api/tasks/:id/toggle` | Fast completion toggle |
| `POST` | `/api/tasks/:id/duplicate` | Clone task into a new instance |
| `PATCH` | `/api/tasks/:id/archive` | Toggle archival status |
| `POST` | `/api/tasks/:id/subtasks` | Add subtask checklist item |
| `PATCH` | `/api/tasks/:id/subtasks/:subtaskId` | Toggle subtask completed status |
| `DELETE` | `/api/tasks/:id/subtasks/:subtaskId` | Delete subtask item |
| `DELETE` | `/api/tasks/:id` | Delete task permanently |
| `GET` | `/api/tasks/export` | Download full database backup as JSON |
| `POST` | `/api/tasks/import` | Restore database backup |
| `GET` | `/api/stats` | Productivity telemetry, 7-day velocity, category breakdown, notifications |

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
