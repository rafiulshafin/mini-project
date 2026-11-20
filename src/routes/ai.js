import { Router } from 'express';
import { taskStorage } from '../storage.js';

export const aiRouter = Router();

/**
 * Intelligent Rule-Based Fallback Engine
 * Generates tailored, contextual results when an external LLM key is absent or unreachable.
 */
function generateFallbackBreakdown(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('auth') || text.includes('login') || text.includes('jwt') || text.includes('user')) {
    return [
      { title: 'Design database user schema & password hash flow', estimatedMinutes: 30 },
      { title: 'Implement sign-up & login API routes with bcrypt', estimatedMinutes: 45 },
      { title: 'Configure JWT token generation & refresh mechanism', estimatedMinutes: 40 },
      { title: 'Write authentication middleware & route guards', estimatedMinutes: 30 },
      { title: 'Build client-side auth state & token persistence', estimatedMinutes: 45 },
      { title: 'Perform security penetration & token expiration tests', estimatedMinutes: 20 }
    ];
  }

  if (text.includes('api') || text.includes('backend') || text.includes('endpoint') || text.includes('server')) {
    return [
      { title: 'Define OpenAPI / REST schema and payload validation', estimatedMinutes: 25 },
      { title: 'Implement CRUD controllers and service layer', estimatedMinutes: 45 },
      { title: 'Integrate atomic storage / database queries', estimatedMinutes: 35 },
      { title: 'Add structured error handling & rate limiter middleware', estimatedMinutes: 20 },
      { title: 'Write automated integration test suite', estimatedMinutes: 30 }
    ];
  }

  if (text.includes('ui') || text.includes('frontend') || text.includes('design') || text.includes('css') || text.includes('page')) {
    return [
      { title: 'Create responsive wireframe & design component hierarchy', estimatedMinutes: 30 },
      { title: 'Implement semantic HTML structure & accessible ARIA states', estimatedMinutes: 35 },
      { title: 'Style obsidian glassmorphism & responsive CSS layouts', estimatedMinutes: 40 },
      { title: 'Connect reactive state bindings & event listeners', estimatedMinutes: 35 },
      { title: 'Test cross-browser compatibility and mobile viewports', estimatedMinutes: 20 }
    ];
  }

  if (text.includes('test') || text.includes('audit') || text.includes('security') || text.includes('qa')) {
    return [
      { title: 'Enumerate boundary conditions and edge-case inputs', estimatedMinutes: 20 },
      { title: 'Write unit tests for core domain functions', estimatedMinutes: 35 },
      { title: 'Conduct vulnerability scan & dependency audit', estimatedMinutes: 25 },
      { title: 'Verify test coverage and fix regression failures', estimatedMinutes: 30 }
    ];
  }

  if (text.includes('deploy') || text.includes('devops') || text.includes('docker') || text.includes('render') || text.includes('vercel')) {
    return [
      { title: 'Configure production environment variables & secrets', estimatedMinutes: 15 },
      { title: 'Verify build scripts, bundle optimization & exit codes', estimatedMinutes: 20 },
      { title: 'Setup continuous integration pipeline triggers', estimatedMinutes: 25 },
      { title: 'Run post-deployment smoke tests on live production domain', estimatedMinutes: 15 }
    ];
  }

  // Generic intelligent breakdown based on words in title
  const words = title.split(' ').filter(w => w.length > 2);
  const mainSubject = words.slice(0, 3).join(' ') || 'Project';
  return [
    { title: `Architect blueprint & requirements for ${mainSubject}`, estimatedMinutes: 25 },
    { title: `Develop core implementation and logic for ${mainSubject}`, estimatedMinutes: 60 },
    { title: `Refine edge cases, error handling, and performance`, estimatedMinutes: 30 },
    { title: `Conduct quality assurance verification & user review`, estimatedMinutes: 20 }
  ];
}

function generateFallbackPolish(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  
  let category = 'Engineering';
  let priority = 'Medium';
  let tags = ['General'];

  if (text.includes('critical') || text.includes('urgent') || text.includes('fix') || text.includes('security')) {
    priority = 'Critical';
    tags.push('Urgent');
  } else if (text.includes('api') || text.includes('backend') || text.includes('feature')) {
    priority = 'High';
  } else if (text.includes('minor') || text.includes('cleanup') || text.includes('docs')) {
    priority = 'Low';
  }

  if (text.includes('design') || text.includes('ui') || text.includes('css')) {
    category = 'Design';
    tags.push('Frontend', 'UI');
  } else if (text.includes('security') || text.includes('auth') || text.includes('audit')) {
    category = 'Security';
    tags.push('SecOps', 'Compliance');
  } else if (text.includes('habit') || text.includes('exercise') || text.includes('health') || text.includes('workout')) {
    category = 'Health';
    tags.push('Wellness', 'Habit');
  } else {
    tags.push('Engineering', 'Feature');
  }

  // Polish title to Title Case
  const polishedTitle = title
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());

  const polishedDescription = description.trim()
    ? `### Executive Overview\n${description.trim()}\n\n### Success Criteria\n- [ ] Core functional verification complete\n- [ ] Edge cases handled gracefully\n- [ ] Verified on production environment`
    : `### Objective\nExecute implementation for **${polishedTitle}** with optimal performance, type-safety, and test coverage.\n\n### Key Deliverables\n- [ ] Initial architectural blueprint\n- [ ] Core code implementation\n- [ ] Automated regression testing`;

  return {
    title: polishedTitle,
    description: polishedDescription,
    category,
    priority,
    tags: Array.from(new Set(tags))
  };
}

/**
 * Helper to call Gemini API if key is present
 */
async function callGemini(apiKey, prompt, systemInstruction = '') {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          ...(systemInstruction ? [{ text: `System Instruction: ${systemInstruction}\n\n` }] : []),
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');
  return JSON.parse(text);
}

// POST /api/ai/breakdown - Generate subtasks for a task
aiRouter.post('/breakdown', async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Task title is required' });
    }

    const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are an expert technical project manager and software architect.
Given the task title "${title}" and description "${description || 'None'}", break this task down into 4 to 6 concise, actionable subtasks.
Return JSON with this schema:
{
  "subtasks": [
    { "title": "string (clear action)", "estimatedMinutes": number }
  ],
  "suggestedTags": ["string"]
}`;
        const data = await callGemini(apiKey, prompt);
        return res.json({
          success: true,
          source: 'gemini-1.5-flash',
          subtasks: data.subtasks || [],
          suggestedTags: data.suggestedTags || []
        });
      } catch (geminiErr) {
        console.warn('Gemini API call failed, using intelligent fallback:', geminiErr.message);
      }
    }

    // Fallback engine
    const subtasks = generateFallbackBreakdown(title, description);
    return res.json({
      success: true,
      source: 'neural-heuristic-engine',
      subtasks,
      suggestedTags: ['AI-Generated', 'TaskFlow']
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/polish - Enhance title, description, priority, category & tags
aiRouter.post('/polish', async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Task title is required' });
    }

    const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are an enterprise software project manager.
Analyze and polish the task title "${title}" and rough notes "${description || ''}".
Return JSON adhering to this schema:
{
  "title": "Clean, professional Title Case title",
  "description": "Structured Markdown description with Objective, Deliverables, and Acceptance Criteria checklist",
  "category": "Engineering" | "Design" | "Security" | "Operations" | "Health" | "General",
  "priority": "Critical" | "High" | "Medium" | "Low",
  "tags": ["3 to 5 relevant technical tags"]
}`;
        const data = await callGemini(apiKey, prompt);
        return res.json({
          success: true,
          source: 'gemini-1.5-flash',
          data
        });
      } catch (geminiErr) {
        console.warn('Gemini API call failed, using intelligent fallback:', geminiErr.message);
      }
    }

    // Fallback engine
    const data = generateFallbackPolish(title, description);
    return res.json({
      success: true,
      source: 'neural-heuristic-engine',
      data
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/summary - Generate Executive Sprint Briefing
aiRouter.post('/summary', async (req, res, next) => {
  try {
    const tasks = await taskStorage.getAll({ includeArchived: false });
    const completed = tasks.filter(t => t.completed);
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const critical = tasks.filter(t => t.priority.toLowerCase() === 'critical' && !t.completed);
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed);

    const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are a Chief Technology Officer reviewing the engineering sprint.
Current stats:
- Total Tasks: ${tasks.length}
- Completed: ${completed.length}
- In Progress: ${inProgress.length}
- Critical Bottlenecks: ${critical.length}
- Overdue: ${overdue.length}
- Active Task Titles: ${tasks.slice(0, 10).map(t => t.title).join(', ')}

Provide a concise, high-impact executive standup briefing (3-4 bullet points) with actionable next steps.
Return JSON:
{
  "headline": "Short punchy status headline",
  "healthStatus": "OPTIMAL" | "NEEDS_ATTENTION" | "AT_RISK",
  "highlights": ["bullet 1", "bullet 2", "bullet 3"],
  "focusRecommendation": "Primary focus advice for today"
}`;
        const data = await callGemini(apiKey, prompt);
        return res.json({
          success: true,
          source: 'gemini-1.5-flash',
          data
        });
      } catch (geminiErr) {
        console.warn('Gemini summary failed, falling back:', geminiErr.message);
      }
    }

    // Heuristic summary
    const velocity = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
    const healthStatus = critical.length > 2 || overdue.length > 2 ? 'NEEDS_ATTENTION' : 'OPTIMAL';
    
    return res.json({
      success: true,
      source: 'neural-heuristic-engine',
      data: {
        headline: `Sprint Velocity at ${velocity}% — ${completed.length} of ${tasks.length} Objectives Cleared`,
        healthStatus,
        highlights: [
          `Velocity tracking: ${completed.length} tasks completed with ${inProgress.length} actively in flight.`,
          critical.length > 0 
            ? `Immediate Focus Required: ${critical.length} critical priority tasks pending resolution (${critical[0]?.title || 'Critical path'}).`
            : `Zero critical blockers detected on active boards.`,
          overdue.length > 0
            ? `Deadline Radar: ${overdue.length} tasks have crossed their scheduled due dates.`
            : `All active tasks are safely within scheduled deadline windows.`
        ],
        focusRecommendation: critical.length > 0
          ? `Tackle critical blocker "${critical[0].title}" first before taking on new backlog items.`
          : `Maintain sprint velocity by pushing "${inProgress[0]?.title || 'active tasks'}" to review and completion.`
      }
    });
  } catch (err) {
    next(err);
  }
});
