#!/usr/bin/env node
/**
 * Plan Management REST API Server
 *
 * A lightweight HTTP server for managing plan execution via REST API.
 * Uses Node.js built-in http module to avoid external dependencies.
 *
 * Usage:
 *   node scripts/api-server.js [--port PORT] [--host HOST]
 *
 * Endpoints:
 *   GET  /api/plans                    - List all plans with status
 *   GET  /api/plans/:name              - Get plan details
 *   POST /api/plans/:name/start        - Start orchestrator
 *   POST /api/plans/:name/stop         - Stop orchestrator
 *   GET  /api/plans/:name/status       - Get plan status
 *   GET  /api/plans/:name/logs         - Stream orchestrator logs
 *   GET  /api/resources                - Get resource status
 *   GET  /api/worktrees                - List worktrees
 *
 * WebSocket:
 *   WS   /ws/plans/:name               - Real-time plan status updates
 *   WS   /ws/all                       - All plans aggregate updates
 *
 * Configuration:
 *   Port and host can be configured in .claude/git-workflow.json:
 *   {
 *     "api": {
 *       "enabled": true,
 *       "port": 3100,
 *       "host": "localhost"
 *     }
 *   }
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const url = require('url');

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_PORT = 3100;
const DEFAULT_HOST = 'localhost';

/**
 * Load API configuration from git-workflow.json
 */
function loadConfig() {
  const configPath = path.join(process.cwd(), '.claude', 'git-workflow.json');
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      return config.api || {};
    }
  } catch (error) {
    console.error(`Warning: Could not load config: ${error.message}`);
  }
  return {};
}

// =============================================================================
// Imports from existing libraries
// =============================================================================

const planStatus = require('./lib/plan-status.js');
const worktreeUtils = require('./lib/worktree-utils.js');

// =============================================================================
// API Handlers
// =============================================================================

/**
 * GET /api/plans - List all plans with status
 *
 * Task 11.2: Implement /api/plans endpoint
 */
async function handleListPlans(req, res, query) {
  try {
    const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();
    const plansDir = path.join(repoRoot, 'docs', 'plans');

    // Get all plan files
    const planFiles = [];
    if (fs.existsSync(plansDir)) {
      const files = fs.readdirSync(plansDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          planFiles.push({
            name: file.replace('.md', ''),
            path: path.join('docs', 'plans', file)
          });
        }
      }
    }

    // Get status for each plan
    const plans = [];
    let runningCount = 0;
    let completedCount = 0;
    let pendingCount = 0;

    for (const planFile of planFiles) {
      const status = planStatus.loadStatus(planFile.path);
      const summary = status ? status.summary : null;

      // Check if orchestrator is running
      let orchestratorRunning = false;
      let orchestratorPid = null;

      try {
        const registryPath = path.join(repoRoot, '.claude', 'orchestrator-registry.json');
        if (fs.existsSync(registryPath)) {
          const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
          const instance = registry.instances?.find(i => i.plan === planFile.name);
          if (instance && instance.status === 'running') {
            orchestratorRunning = true;
            orchestratorPid = instance.pid;
          }
        }
      } catch (error) {
        // Registry not available
      }

      // Check worktree
      const worktrees = worktreeUtils.listWorktrees();
      const worktree = worktrees.find(wt => wt.branch === `plan/${planFile.name}`);

      // Determine status
      let planStatusStr = 'pending';
      if (summary) {
        if (summary.completed === summary.totalTasks && summary.totalTasks > 0) {
          planStatusStr = 'completed';
          completedCount++;
        } else if (summary.completed > 0 || summary.in_progress > 0) {
          planStatusStr = 'in_progress';
          if (orchestratorRunning) runningCount++;
        } else {
          pendingCount++;
        }
      } else {
        pendingCount++;
      }

      // Apply filters
      if (query.status && planStatusStr !== query.status) continue;
      if (query.worktree === 'true' && !worktree) continue;
      if (query.worktree === 'false' && worktree) continue;

      plans.push({
        name: planFile.name,
        path: planFile.path,
        title: status?.planName || planFile.name,
        status: planStatusStr,
        progress: summary ? {
          total: summary.totalTasks || 0,
          completed: summary.completed || 0,
          pending: summary.pending || 0,
          failed: summary.failed || 0,
          percentage: summary.totalTasks > 0
            ? Math.round((summary.completed / summary.totalTasks) * 100)
            : 0
        } : null,
        currentPhase: status?.currentPhase || null,
        worktree: worktree ? {
          active: true,
          path: worktree.path
        } : null,
        orchestrator: orchestratorRunning ? {
          running: true,
          pid: orchestratorPid
        } : null,
        lastUpdatedAt: status?.lastUpdatedAt || null
      });
    }

    sendJSON(res, 200, {
      plans,
      summary: {
        totalPlans: plans.length,
        running: runningCount,
        pending: pendingCount,
        completed: completedCount
      }
    });
  } catch (error) {
    sendError(res, 500, error.message, 'INTERNAL_ERROR');
  }
}

/**
 * GET /api/plans/:name - Get detailed plan status
 */
async function handleGetPlan(req, res, planName) {
  try {
    const planPath = `docs/plans/${planName}.md`;
    const status = planStatus.loadStatus(planPath);

    if (!status) {
      return sendError(res, 404, `Plan not found: ${planName}`, 'PLAN_NOT_FOUND');
    }

    const summary = status.summary || {};
    const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();

    // Check orchestrator status
    let orchestratorInfo = null;
    try {
      const registryPath = path.join(repoRoot, '.claude', 'orchestrator-registry.json');
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const instance = registry.instances?.find(i => i.plan === planName);
        if (instance && instance.status === 'running') {
          orchestratorInfo = {
            running: true,
            pid: instance.pid,
            startedAt: instance.started_at,
            mode: instance.mode || 'batch'
          };
        }
      }
    } catch (error) {
      // Registry not available
    }

    // Check worktree
    const worktrees = worktreeUtils.listWorktrees();
    const worktree = worktrees.find(wt => wt.branch === `plan/${planName}`);

    // Group tasks by phase
    const phaseMap = new Map();
    for (const task of status.tasks || []) {
      const phaseName = task.phase || 'Unknown Phase';
      if (!phaseMap.has(phaseName)) {
        const match = phaseName.match(/Phase\s+(\d+)/);
        phaseMap.set(phaseName, {
          number: match ? parseInt(match[1]) : 0,
          name: phaseName.replace(/^Phase\s+\d+:\s*/, ''),
          total: 0,
          completed: 0
        });
      }
      const phase = phaseMap.get(phaseName);
      phase.total++;
      if (task.status === 'completed') phase.completed++;
    }

    const phases = Array.from(phaseMap.values())
      .sort((a, b) => a.number - b.number)
      .map(p => ({
        ...p,
        percentage: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
      }));

    // Get recent activity
    const recentActivity = (status.tasks || [])
      .filter(t => t.completedAt || t.startedAt || t.failedAt)
      .map(t => ({
        timestamp: t.completedAt || t.failedAt || t.startedAt,
        taskId: t.id,
        action: t.status,
        description: t.description
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    // Determine status
    let planStatusStr = 'pending';
    if (summary.completed === summary.totalTasks && summary.totalTasks > 0) {
      planStatusStr = 'completed';
    } else if (summary.completed > 0 || summary.in_progress > 0) {
      planStatusStr = 'in_progress';
    }

    sendJSON(res, 200, {
      name: planName,
      path: planPath,
      title: status.planName || planName,
      status: planStatusStr,
      progress: {
        total: summary.totalTasks || 0,
        completed: summary.completed || 0,
        pending: summary.pending || 0,
        in_progress: summary.in_progress || 0,
        failed: summary.failed || 0,
        skipped: summary.skipped || 0,
        percentage: summary.totalTasks > 0
          ? Math.round((summary.completed / summary.totalTasks) * 100)
          : 0
      },
      phases,
      currentPhase: status.currentPhase || null,
      recentActivity,
      worktree: worktree ? {
        active: true,
        path: worktree.path,
        branch: worktree.branch
      } : null,
      orchestrator: orchestratorInfo,
      lastUpdatedAt: status.lastUpdatedAt
    });
  } catch (error) {
    sendError(res, 500, error.message, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/plans/:name/start - Start orchestrator for plan
 *
 * Task 11.3: Implement /api/plans/:name/start endpoint
 */
async function handleStartPlan(req, res, planName, body) {
  try {
    const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();
    const planPath = `docs/plans/${planName}.md`;

    // Verify plan exists
    const absolutePlanPath = path.join(repoRoot, planPath);
    if (!fs.existsSync(absolutePlanPath)) {
      return sendError(res, 404, `Plan not found: ${planName}`, 'PLAN_NOT_FOUND');
    }

    // Check if orchestrator already running
    try {
      const registryPath = path.join(repoRoot, '.claude', 'orchestrator-registry.json');
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const instance = registry.instances?.find(i => i.plan === planName && i.status === 'running');
        if (instance) {
          return sendError(res, 409, 'Plan already has running orchestrator', 'ORCHESTRATOR_ALREADY_RUNNING', {
            existingPid: instance.pid
          });
        }
      }
    } catch (error) {
      // Registry not available, continue
    }

    // Build orchestrator command
    const orchestratorPath = path.join(repoRoot, 'scripts', 'plan_orchestrator.py');
    const args = ['--plan', planPath];

    // Parse options from body
    const mode = body.mode || 'batch';
    if (mode === 'continuous') {
      args.push('--continuous');
    }

    if (body.tasks && Array.isArray(body.tasks) && body.tasks.length > 0) {
      args.push('--tasks', body.tasks.join(','));
    }

    if (body.autonomous) {
      args.push('--autonomous');
    }

    if (body.daemon !== false) {
      args.push('--daemon');
    }

    // Start orchestrator
    const logFile = path.join(repoRoot, `orchestrator-${planName}.log`);
    const child = spawn('python3', [orchestratorPath, ...args], {
      cwd: repoRoot,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Write output to log file
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);

    child.unref();

    // Wait a moment to check if it started successfully
    await new Promise(resolve => setTimeout(resolve, 500));

    sendJSON(res, 200, {
      success: true,
      message: `Orchestrator started for plan ${planName}`,
      orchestrator: {
        pid: child.pid,
        logFile: logFile,
        startedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    sendError(res, 500, error.message, 'START_FAILED');
  }
}

/**
 * POST /api/plans/:name/stop - Stop orchestrator for plan
 *
 * Task 11.4: Implement /api/plans/:name/stop endpoint
 */
async function handleStopPlan(req, res, planName, body) {
  try {
    const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();

    // Find running orchestrator
    const registryPath = path.join(repoRoot, '.claude', 'orchestrator-registry.json');
    let instance = null;

    try {
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        instance = registry.instances?.find(i => i.plan === planName && i.status === 'running');
      }
    } catch (error) {
      // Registry not available
    }

    if (!instance) {
      return sendError(res, 404, 'No running orchestrator found for plan', 'ORCHESTRATOR_NOT_RUNNING');
    }

    const pid = instance.pid;
    const force = body.force || false;
    const signal = force ? 'SIGKILL' : 'SIGTERM';

    // Send signal to process
    try {
      process.kill(pid, signal);
    } catch (killError) {
      if (killError.code === 'ESRCH') {
        // Process already dead, clean up registry
        try {
          const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
          registry.instances = registry.instances.filter(i => i.pid !== pid);
          fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
        } catch (e) {
          // Ignore cleanup errors
        }

        return sendJSON(res, 200, {
          success: true,
          message: `Orchestrator was already stopped for plan ${planName}`,
          orchestrator: {
            pid,
            stoppedAt: new Date().toISOString(),
            exitCode: null
          }
        });
      }
      throw killError;
    }

    // Wait for process to stop (with timeout)
    const timeout = (body.timeout || 30) * 1000;
    const startTime = Date.now();
    let stopped = false;

    while (Date.now() - startTime < timeout) {
      try {
        process.kill(pid, 0); // Check if still running
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        if (error.code === 'ESRCH') {
          stopped = true;
          break;
        }
        throw error;
      }
    }

    // Force kill if still running after timeout
    if (!stopped && !force) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (e) {
        // Ignore errors
      }
    }

    // Update registry
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const idx = registry.instances.findIndex(i => i.pid === pid);
      if (idx >= 0) {
        registry.instances[idx].status = 'stopped';
        registry.instances[idx].stopped_at = new Date().toISOString();
        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    sendJSON(res, 200, {
      success: true,
      message: `Orchestrator stopped for plan ${planName}`,
      orchestrator: {
        pid,
        stoppedAt: new Date().toISOString(),
        forced: force || !stopped
      }
    });
  } catch (error) {
    sendError(res, 500, error.message, 'STOP_FAILED');
  }
}

/**
 * GET /api/plans/:name/logs - Stream orchestrator logs
 *
 * Task 11.6: Implement /api/plans/:name/logs endpoint
 *
 * Query parameters:
 *   - follow: boolean (default: false) - Keep connection open and stream new lines
 *   - lines: number (default: 100) - Number of lines to return (from end)
 *   - since: ISO timestamp - Only return logs after this time
 */
async function handleGetPlanLogs(req, res, planName, query) {
  try {
    const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();
    const logFile = path.join(repoRoot, `orchestrator-${planName}.log`);

    // Check if log file exists
    if (!fs.existsSync(logFile)) {
      return sendError(res, 404, `No logs found for plan: ${planName}`, 'LOGS_NOT_FOUND');
    }

    const follow = query.follow === 'true';
    const lines = parseInt(query.lines) || 100;
    const since = query.since ? new Date(query.since) : null;

    if (follow) {
      // Streaming mode: keep connection open and tail the file
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial logs
      const initialLogs = await readLastLines(logFile, lines, since);
      for (const line of initialLogs) {
        res.write(`data: ${JSON.stringify({ type: 'log', content: line })}\n\n`);
      }

      // Watch for new content
      let lastSize = fs.statSync(logFile).size;
      const watcher = fs.watchFile(logFile, { interval: 1000 }, async (curr, prev) => {
        if (curr.size > lastSize) {
          // Read new content
          const newContent = await readFromPosition(logFile, lastSize, curr.size);
          for (const line of newContent.split('\n').filter(l => l.trim())) {
            res.write(`data: ${JSON.stringify({ type: 'log', content: line })}\n\n`);
          }
          lastSize = curr.size;
        } else if (curr.size < lastSize) {
          // File was truncated/rotated
          lastSize = 0;
        }
      });

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
      }, 30000);

      // Clean up on client disconnect
      req.on('close', () => {
        fs.unwatchFile(logFile);
        clearInterval(heartbeat);
      });

    } else {
      // Non-streaming mode: return last N lines
      const logLines = await readLastLines(logFile, lines, since);

      sendJSON(res, 200, {
        plan: planName,
        logFile: logFile,
        lineCount: logLines.length,
        logs: logLines
      });
    }
  } catch (error) {
    sendError(res, 500, error.message, 'INTERNAL_ERROR');
  }
}

/**
 * Read last N lines from a file, optionally filtering by timestamp
 */
async function readLastLines(filePath, numLines, sinceDate) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        reject(err);
        return;
      }

      let lines = content.split('\n').filter(line => line.trim());

      // Filter by date if specified
      if (sinceDate) {
        lines = lines.filter(line => {
          // Try to extract timestamp from log line
          // Common formats: [2024-12-26T10:00:00] or 2024-12-26 10:00:00
          const isoMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          const spaceMatch = line.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

          if (isoMatch) {
            return new Date(isoMatch[0]) >= sinceDate;
          } else if (spaceMatch) {
            return new Date(spaceMatch[0].replace(' ', 'T')) >= sinceDate;
          }
          return true; // Include lines without timestamps
        });
      }

      // Take last N lines
      const result = lines.slice(-numLines);
      resolve(result);
    });
  });
}

/**
 * Read file content from a specific position
 */
async function readFromPosition(filePath, start, end) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start, end });
    let content = '';
    stream.on('data', chunk => content += chunk);
    stream.on('end', () => resolve(content));
    stream.on('error', reject);
  });
}

/**
 * GET /api/plans/:name/status - Get real-time plan status
 */
async function handleGetPlanStatus(req, res, planName) {
  try {
    const planPath = `docs/plans/${planName}.md`;
    const status = planStatus.loadStatus(planPath);

    if (!status) {
      return sendError(res, 404, `Plan not found: ${planName}`, 'PLAN_NOT_FOUND');
    }

    const summary = status.summary || {};
    const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();

    // Check orchestrator status
    let orchestratorInfo = null;
    try {
      const registryPath = path.join(repoRoot, '.claude', 'orchestrator-registry.json');
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const instance = registry.instances?.find(i => i.plan === planName && i.status === 'running');
        if (instance) {
          orchestratorInfo = {
            running: true,
            pid: instance.pid
          };
        }
      }
    } catch (error) {
      // Registry not available
    }

    // Find current task
    const currentTask = (status.tasks || []).find(t => t.status === 'in_progress');

    // Determine status
    let planStatusStr = 'pending';
    if (summary.completed === summary.totalTasks && summary.totalTasks > 0) {
      planStatusStr = 'completed';
    } else if (summary.completed > 0 || summary.in_progress > 0) {
      planStatusStr = 'in_progress';
    }

    sendJSON(res, 200, {
      name: planName,
      status: planStatusStr,
      progress: {
        total: summary.totalTasks || 0,
        completed: summary.completed || 0,
        percentage: summary.totalTasks > 0
          ? Math.round((summary.completed / summary.totalTasks) * 100)
          : 0
      },
      currentTask: currentTask ? {
        id: currentTask.id,
        description: currentTask.description,
        status: currentTask.status,
        startedAt: currentTask.startedAt
      } : null,
      orchestrator: orchestratorInfo,
      lastUpdatedAt: status.lastUpdatedAt
    });
  } catch (error) {
    sendError(res, 500, error.message, 'INTERNAL_ERROR');
  }
}

/**
 * GET /api/resources - Get resource status
 */
async function handleGetResources(req, res) {
  try {
    const resourceCheck = worktreeUtils.checkResourcesGracefully({});
    const config = worktreeUtils.getResourceConfig();
    const staleWorktrees = worktreeUtils.getStaleWorktrees();
    const abandonedWorktrees = worktreeUtils.getAbandonedWorktrees();

    sendJSON(res, 200, {
      limits: {
        concurrentWorktrees: {
          current: resourceCheck.checks.concurrentLimit.current,
          max: resourceCheck.checks.concurrentLimit.max,
          canCreate: resourceCheck.checks.concurrentLimit.passed
        },
        diskSpace: {
          availableMB: resourceCheck.checks.diskSpace.availableMB,
          requiredMB: resourceCheck.checks.diskSpace.requiredMB,
          sufficient: resourceCheck.checks.diskSpace.passed
        }
      },
      worktrees: {
        total: config.currentState.activeWorktrees,
        stale: staleWorktrees.length,
        abandoned: abandonedWorktrees.length
      },
      warnings: resourceCheck.checks.warnings,
      canCreateWorktree: resourceCheck.canCreate
    });
  } catch (error) {
    sendError(res, 500, error.message, 'INTERNAL_ERROR');
  }
}

/**
 * GET /api/worktrees - List all worktrees
 */
async function handleListWorktrees(req, res) {
  try {
    const worktrees = worktreeUtils.listWorktrees();
    const config = worktreeUtils.loadGitWorkflowConfig();
    const staleWorktrees = worktreeUtils.getStaleWorktrees();
    const abandonedWorktrees = worktreeUtils.getAbandonedWorktrees();

    const planWorktrees = worktrees
      .filter(wt => wt.branch && wt.branch.startsWith('plan/'))
      .map(wt => {
        const planName = wt.branch.replace('plan/', '');
        const ageInfo = worktreeUtils.getWorktreeAge(wt.path);

        return {
          name: `plan-${planName}`,
          path: wt.path,
          branch: wt.branch,
          planName,
          status: 'active',
          age: {
            days: ageInfo.ageDays,
            isStale: ageInfo.isStale
          }
        };
      });

    sendJSON(res, 200, {
      worktrees: planWorktrees,
      summary: {
        total: planWorktrees.length,
        active: planWorktrees.length,
        stale: staleWorktrees.length,
        abandoned: abandonedWorktrees.length
      }
    });
  } catch (error) {
    sendError(res, 500, error.message, 'INTERNAL_ERROR');
  }
}

// =============================================================================
// WebSocket Support (Task 11.7)
// =============================================================================

/**
 * WebSocket client connections registry
 */
const wsClients = {
  // Map of planName -> Set of WebSocket connections
  plans: new Map(),
  // Set of WebSocket connections subscribed to all plans
  all: new Set()
};

/**
 * Status file watchers for each plan
 */
const statusWatchers = new Map();

/**
 * Handle WebSocket upgrade request
 */
function handleWebSocketUpgrade(req, socket, head) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Match /ws/plans/:name or /ws/all
  let planName = null;
  let subscribeAll = false;

  const planMatch = pathname.match(/^\/ws\/plans\/([^/]+)$/);
  if (planMatch) {
    planName = decodeURIComponent(planMatch[1]);
  } else if (pathname === '/ws/all') {
    subscribeAll = true;
  } else {
    socket.destroy();
    return;
  }

  // Perform WebSocket handshake
  const wsKey = req.headers['sec-websocket-key'];
  if (!wsKey) {
    socket.destroy();
    return;
  }

  const acceptKey = generateWebSocketAcceptKey(wsKey);
  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '',
    ''
  ].join('\r\n');

  socket.write(responseHeaders);

  // Create WebSocket wrapper
  const ws = createWebSocketWrapper(socket);

  // Register client
  if (subscribeAll) {
    wsClients.all.add(ws);
    ws.planName = null;
    startAllPlansWatcher();
  } else {
    if (!wsClients.plans.has(planName)) {
      wsClients.plans.set(planName, new Set());
    }
    wsClients.plans.get(planName).add(ws);
    ws.planName = planName;
    startPlanWatcher(planName);
  }

  // Send initial status
  if (subscribeAll) {
    sendAllPlansStatus(ws);
  } else {
    sendPlanStatus(ws, planName);
  }

  // Handle close
  ws.on('close', () => {
    if (subscribeAll) {
      wsClients.all.delete(ws);
    } else {
      const clients = wsClients.plans.get(planName);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          stopPlanWatcher(planName);
        }
      }
    }
  });

  // Send heartbeat every 30 seconds
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === 1) {  // OPEN
      ws.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
    }
  }, 30000);

  ws.on('close', () => clearInterval(heartbeatInterval));
}

/**
 * Generate WebSocket accept key for handshake
 */
function generateWebSocketAcceptKey(key) {
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return crypto
    .createHash('sha1')
    .update(key + GUID)
    .digest('base64');
}

/**
 * Create a simple WebSocket wrapper around a raw socket
 */
function createWebSocketWrapper(socket) {
  const ws = {
    socket,
    readyState: 1, // OPEN
    listeners: { close: [], message: [] },

    send(data) {
      if (this.readyState !== 1) return;
      const payload = Buffer.from(data);
      const frame = createWebSocketFrame(payload);
      try {
        this.socket.write(frame);
      } catch (e) {
        this.close();
      }
    },

    close() {
      if (this.readyState === 3) return; // CLOSED
      this.readyState = 3;
      try {
        // Send close frame
        const closeFrame = Buffer.from([0x88, 0x00]);
        this.socket.write(closeFrame);
        this.socket.end();
      } catch (e) {
        // Ignore errors during close
      }
      this.listeners.close.forEach(fn => fn());
    },

    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }
  };

  socket.on('data', (data) => {
    try {
      const frame = parseWebSocketFrame(data);
      if (frame.opcode === 0x08) {
        // Close frame
        ws.close();
      } else if (frame.opcode === 0x09) {
        // Ping - respond with pong
        const pongFrame = Buffer.from([0x8A, 0x00]);
        socket.write(pongFrame);
      } else if (frame.opcode === 0x01 || frame.opcode === 0x02) {
        // Text or binary data
        ws.listeners.message.forEach(fn => fn(frame.payload.toString()));
      }
    } catch (e) {
      // Invalid frame, close connection
      ws.close();
    }
  });

  socket.on('close', () => {
    ws.readyState = 3;
    ws.listeners.close.forEach(fn => fn());
  });

  socket.on('error', () => {
    ws.close();
  });

  return ws;
}

/**
 * Create a WebSocket frame for sending data
 */
function createWebSocketFrame(payload) {
  const payloadLength = payload.length;
  let header;

  if (payloadLength <= 125) {
    header = Buffer.from([0x81, payloadLength]);
  } else if (payloadLength <= 65535) {
    header = Buffer.from([0x81, 126, (payloadLength >> 8) & 0xFF, payloadLength & 0xFF]);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    // Write 64-bit length (we only use lower 32 bits)
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(payloadLength, 6);
  }

  return Buffer.concat([header, payload]);
}

/**
 * Parse incoming WebSocket frame
 */
function parseWebSocketFrame(data) {
  if (data.length < 2) {
    throw new Error('Frame too short');
  }

  const firstByte = data[0];
  const secondByte = data[1];
  const opcode = firstByte & 0x0F;
  const masked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7F;
  let offset = 2;

  if (payloadLength === 126) {
    payloadLength = data.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    payloadLength = data.readUInt32BE(6); // Simplified: only read lower 32 bits
    offset = 10;
  }

  let payload;
  if (masked) {
    const mask = data.slice(offset, offset + 4);
    offset += 4;
    const maskedPayload = data.slice(offset, offset + payloadLength);
    payload = Buffer.alloc(payloadLength);
    for (let i = 0; i < payloadLength; i++) {
      payload[i] = maskedPayload[i] ^ mask[i % 4];
    }
  } else {
    payload = data.slice(offset, offset + payloadLength);
  }

  return { opcode, payload };
}

/**
 * Start watching a plan's status.json for changes
 */
function startPlanWatcher(planName) {
  if (statusWatchers.has(planName)) return;

  const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();
  const statusPath = path.join(repoRoot, 'docs', 'plan-outputs', planName, 'status.json');

  if (!fs.existsSync(statusPath)) return;

  const watcher = fs.watchFile(statusPath, { interval: 1000 }, () => {
    broadcastPlanUpdate(planName);
  });

  statusWatchers.set(planName, watcher);
}

/**
 * Stop watching a plan's status.json
 */
function stopPlanWatcher(planName) {
  if (!statusWatchers.has(planName)) return;

  const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();
  const statusPath = path.join(repoRoot, 'docs', 'plan-outputs', planName, 'status.json');

  fs.unwatchFile(statusPath);
  statusWatchers.delete(planName);
}

/**
 * Start watching all plans (aggregate view)
 */
let allPlansWatcher = null;
function startAllPlansWatcher() {
  if (allPlansWatcher) return;

  const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();
  const outputsDir = path.join(repoRoot, 'docs', 'plan-outputs');

  if (!fs.existsSync(outputsDir)) return;

  // Watch the outputs directory for any changes
  allPlansWatcher = fs.watch(outputsDir, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('status.json')) {
      broadcastAllPlansUpdate();
    }
  });
}

/**
 * Broadcast plan status update to all subscribed clients
 */
function broadcastPlanUpdate(planName) {
  const clients = wsClients.plans.get(planName);
  if (!clients || clients.size === 0) return;

  for (const ws of clients) {
    sendPlanStatus(ws, planName);
  }

  // Also update all-plans subscribers
  broadcastAllPlansUpdate();
}

/**
 * Broadcast all plans update
 */
function broadcastAllPlansUpdate() {
  if (wsClients.all.size === 0) return;

  for (const ws of wsClients.all) {
    sendAllPlansStatus(ws);
  }
}

/**
 * Send plan status to a WebSocket client
 */
function sendPlanStatus(ws, planName) {
  const planPath = `docs/plans/${planName}.md`;
  const status = planStatus.loadStatus(planPath);

  if (!status) {
    ws.send(JSON.stringify({
      type: 'error',
      error: `Plan not found: ${planName}`,
      code: 'PLAN_NOT_FOUND'
    }));
    return;
  }

  const summary = status.summary || {};
  const currentTask = (status.tasks || []).find(t => t.status === 'in_progress');

  // Determine status string
  let planStatusStr = 'pending';
  if (summary.completed === summary.totalTasks && summary.totalTasks > 0) {
    planStatusStr = 'completed';
  } else if (summary.completed > 0 || summary.in_progress > 0) {
    planStatusStr = 'in_progress';
  }

  ws.send(JSON.stringify({
    type: 'status',
    plan: planName,
    status: planStatusStr,
    progress: {
      total: summary.totalTasks || 0,
      completed: summary.completed || 0,
      pending: summary.pending || 0,
      in_progress: summary.in_progress || 0,
      failed: summary.failed || 0,
      percentage: summary.totalTasks > 0
        ? Math.round((summary.completed / summary.totalTasks) * 100)
        : 0
    },
    currentTask: currentTask ? {
      id: currentTask.id,
      description: currentTask.description,
      startedAt: currentTask.startedAt
    } : null,
    lastUpdatedAt: status.lastUpdatedAt,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Send all plans status to a WebSocket client
 */
function sendAllPlansStatus(ws) {
  const repoRoot = worktreeUtils.getRepoRoot() || process.cwd();
  const plansDir = path.join(repoRoot, 'docs', 'plans');
  const plans = [];
  let totalCompleted = 0;
  let totalPending = 0;
  let totalInProgress = 0;
  let totalFailed = 0;
  let totalTasks = 0;

  try {
    if (fs.existsSync(plansDir)) {
      const files = fs.readdirSync(plansDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const planName = file.replace('.md', '');
          const planPath = `docs/plans/${file}`;
          const status = planStatus.loadStatus(planPath);

          if (status && status.summary) {
            const summary = status.summary;
            totalCompleted += summary.completed || 0;
            totalPending += summary.pending || 0;
            totalInProgress += summary.in_progress || 0;
            totalFailed += summary.failed || 0;
            totalTasks += summary.totalTasks || 0;

            let planStatusStr = 'pending';
            if (summary.completed === summary.totalTasks && summary.totalTasks > 0) {
              planStatusStr = 'completed';
            } else if (summary.completed > 0 || summary.in_progress > 0) {
              planStatusStr = 'in_progress';
            }

            plans.push({
              name: planName,
              status: planStatusStr,
              progress: {
                total: summary.totalTasks || 0,
                completed: summary.completed || 0,
                percentage: summary.totalTasks > 0
                  ? Math.round((summary.completed / summary.totalTasks) * 100)
                  : 0
              }
            });
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }

  ws.send(JSON.stringify({
    type: 'all-plans',
    plans,
    aggregate: {
      totalPlans: plans.length,
      totalTasks,
      completed: totalCompleted,
      pending: totalPending,
      in_progress: totalInProgress,
      failed: totalFailed,
      percentage: totalTasks > 0
        ? Math.round((totalCompleted / totalTasks) * 100)
        : 0
    },
    timestamp: new Date().toISOString()
  }));
}

// =============================================================================
// HTTP Server Utilities
// =============================================================================

/**
 * Send JSON response
 */
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Send error response
 */
function sendError(res, statusCode, message, code, details = {}) {
  sendJSON(res, statusCode, {
    success: false,
    error: message,
    code,
    details
  });
}

/**
 * Parse JSON request body
 */
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Parse query string
 */
function parseQuery(queryString) {
  const query = {};
  if (queryString) {
    const params = new URLSearchParams(queryString);
    for (const [key, value] of params) {
      query[key] = value;
    }
  }
  return query;
}

// =============================================================================
// Router
// =============================================================================

/**
 * Route request to appropriate handler
 */
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query || {};
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  try {
    // API routes
    if (pathname === '/api/plans' && method === 'GET') {
      return handleListPlans(req, res, query);
    }

    if (pathname === '/api/resources' && method === 'GET') {
      return handleGetResources(req, res);
    }

    if (pathname === '/api/worktrees' && method === 'GET') {
      return handleListWorktrees(req, res);
    }

    // Plan-specific routes: /api/plans/:name/...
    const planMatch = pathname.match(/^\/api\/plans\/([^/]+)(\/(.+))?$/);
    if (planMatch) {
      const planName = decodeURIComponent(planMatch[1]);
      const action = planMatch[3] || '';

      if (method === 'GET' && !action) {
        return handleGetPlan(req, res, planName);
      }

      if (method === 'GET' && action === 'status') {
        return handleGetPlanStatus(req, res, planName);
      }

      if (method === 'GET' && action === 'logs') {
        return handleGetPlanLogs(req, res, planName, query);
      }

      if (method === 'POST' && action === 'start') {
        const body = await parseBody(req);
        return handleStartPlan(req, res, planName, body);
      }

      if (method === 'POST' && action === 'stop') {
        const body = await parseBody(req);
        return handleStopPlan(req, res, planName, body);
      }
    }

    // Health check
    if (pathname === '/health' && method === 'GET') {
      return sendJSON(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    }

    // 404 for unknown routes
    sendError(res, 404, `Not found: ${pathname}`, 'NOT_FOUND');
  } catch (error) {
    console.error(`Error handling ${method} ${pathname}:`, error);
    sendError(res, 500, error.message, 'INTERNAL_ERROR');
  }
}

// =============================================================================
// Server Startup
// =============================================================================

function startServer() {
  const config = loadConfig();
  const port = process.env.PORT || config.port || DEFAULT_PORT;
  const host = process.env.HOST || config.host || DEFAULT_HOST;

  const server = http.createServer(handleRequest);

  // Handle WebSocket upgrades
  server.on('upgrade', (req, socket, head) => {
    handleWebSocketUpgrade(req, socket, head);
  });

  server.listen(port, host, () => {
    console.log(`Plan Management API Server running at http://${host}:${port}`);
    console.log('');
    console.log('REST Endpoints:');
    console.log(`  GET  http://${host}:${port}/api/plans          - List all plans`);
    console.log(`  GET  http://${host}:${port}/api/plans/:name    - Get plan details`);
    console.log(`  GET  http://${host}:${port}/api/plans/:name/status - Get plan status`);
    console.log(`  GET  http://${host}:${port}/api/plans/:name/logs - Stream logs (?follow=true)`);
    console.log(`  POST http://${host}:${port}/api/plans/:name/start - Start orchestrator`);
    console.log(`  POST http://${host}:${port}/api/plans/:name/stop  - Stop orchestrator`);
    console.log(`  GET  http://${host}:${port}/api/resources      - Resource status`);
    console.log(`  GET  http://${host}:${port}/api/worktrees      - List worktrees`);
    console.log('');
    console.log('WebSocket Endpoints:');
    console.log(`  WS   ws://${host}:${port}/ws/plans/:name       - Real-time plan updates`);
    console.log(`  WS   ws://${host}:${port}/ws/all               - All plans aggregate updates`);
    console.log('');
    console.log('Press Ctrl+C to stop.');
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
}

// Start if run directly
if (require.main === module) {
  startServer();
}

// Export for testing
module.exports = {
  handleListPlans,
  handleGetPlan,
  handleStartPlan,
  handleStopPlan,
  handleGetPlanStatus,
  handleGetPlanLogs,
  handleGetResources,
  handleListWorktrees,
  handleWebSocketUpgrade,
  broadcastPlanUpdate,
  broadcastAllPlansUpdate,
  startServer
};
