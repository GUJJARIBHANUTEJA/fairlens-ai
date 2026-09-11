/**
 * FairLens — Unified Development Server Runner
 * Starts both FastAPI backend and React/Vite frontend with one command:
 *   npm run dev
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const RED = '\x1b[31m';

function log(label, color, text) {
  const lines = text.toString().split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length > 0) {
      console.log(`${color}${label}${RESET} ${line}`);
    }
  }
}

// 1. Detect Python executable
function detectPython() {
  const isWin = process.platform === 'win32';
  const localVenvs = [
    path.join(__dirname, '.venv', isWin ? 'Scripts/python.exe' : 'bin/python'),
    path.join(__dirname, 'venv', isWin ? 'Scripts/python.exe' : 'bin/python'),
  ];

  for (const venvPython of localVenvs) {
    if (fs.existsSync(venvPython)) {
      return venvPython;
    }
  }

  if (process.env.VIRTUAL_ENV) {
    const venvPython = path.join(
      process.env.VIRTUAL_ENV,
      isWin ? 'Scripts/python.exe' : 'bin/python'
    );
    if (fs.existsSync(venvPython)) {
      return venvPython;
    }
  }

  const fallbacks = isWin ? ['python', 'py', 'python3'] : ['python3', 'python'];
  for (const cmd of fallbacks) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch {
      // try next
    }
  }

  return isWin ? 'python' : 'python3';
}

// 2. Ensure frontend node_modules are installed
function ensureFrontendDependencies() {
  const frontendModules = path.join(__dirname, 'frontend', 'node_modules');
  if (!fs.existsSync(frontendModules)) {
    console.log(`${YELLOW}[setup] Installing frontend dependencies (node_modules not found)...${RESET}`);
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execSync(`${npmCmd} install`, {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
    });
  }
}

const pythonCmd = detectPython();
ensureFrontendDependencies();

console.log(`\n${CYAN}==============================================================${RESET}`);
console.log(`${BOLD}${MAGENTA}  FairLens — AI Fairness & Model Auditing${RESET}`);
console.log(`${CYAN}==============================================================${RESET}`);
console.log(`  ${GREEN}➜ Local Frontend:${RESET} http://localhost:3000`);
console.log(`  ${CYAN}➜ Backend API:${RESET}    http://localhost:8000`);
console.log(`  ${CYAN}➜ API Docs:${RESET}       http://localhost:8000/docs`);
console.log(`  ${YELLOW}➜ Python:${RESET}         ${pythonCmd}`);
console.log(`${CYAN}==============================================================${RESET}\n`);

const children = [];

function killChild(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGKILL');
    }
  } catch {
    // Process may have already exited
  }
}

function cleanup() {
  console.log(`\n${YELLOW}[FairLens] Shutting down all services...${RESET}`);
  for (const child of children) {
    killChild(child);
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  for (const child of children) {
    killChild(child);
  }
});

// Start FastAPI Backend
const backend = spawn(
  pythonCmd,
  ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'],
  {
    cwd: __dirname,
    shell: false,
  }
);
children.push(backend);

backend.stdout.on('data', (data) => log('[backend]', CYAN, data));
backend.stderr.on('data', (data) => log('[backend]', CYAN, data));
backend.on('close', (code) => {
  if (code !== null && code !== 0) {
    log('[backend]', RED, `Backend process exited with code ${code}`);
  }
});

// Start Vite Frontend
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  shell: process.platform === 'win32',
});
children.push(frontend);

frontend.stdout.on('data', (data) => log('[frontend]', GREEN, data));
frontend.stderr.on('data', (data) => log('[frontend]', GREEN, data));
frontend.on('close', (code) => {
  if (code !== null && code !== 0) {
    log('[frontend]', RED, `Frontend process exited with code ${code}`);
  }
});
