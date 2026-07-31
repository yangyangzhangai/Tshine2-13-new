// DOC-DEPS: LLM.md -> docs/SEEDAY_DEV_SPEC.md -> docs/CURRENT_TASK.md
import { spawnSync } from 'node:child_process';
import { loadEnv } from 'vite';

const iosEnv = loadEnv('ios', process.cwd(), 'VITE_');
const rawApiBase = String(process.env.VITE_API_BASE || iosEnv.VITE_API_BASE || '').trim();

if (!rawApiBase) {
  console.error(
    '[build:ios] Missing VITE_API_BASE. Set it in .env.ios or the build environment.',
  );
  process.exit(1);
}

let normalizedApiBase = rawApiBase.replace(/\/+$/, '');

if (!/^https?:\/\//i.test(normalizedApiBase)) {
  console.error(
    `[build:ios] VITE_API_BASE must be an absolute URL, got: ${rawApiBase}`,
  );
  process.exit(1);
}

// Auto-append /api if the URL looks like a bare domain (no path component beyond /)
// e.g. https://seedayapp.com → https://seedayapp.com/api
const parsedUrl = new URL(normalizedApiBase);
if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
  normalizedApiBase = `${normalizedApiBase}/api`;
  console.warn(
    `[build:ios] VITE_API_BASE looks like a bare domain. Auto-appending /api → ${normalizedApiBase}`,
  );
}

function runStep(args, label, env) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', env });
  if (result.error) {
    console.error(`[build:ios] ${label} failed: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const buildEnv = {
  ...process.env,
  VITE_API_BASE: normalizedApiBase,
};

runStep(['run', 'build', '--', '--mode', 'ios'], 'Vite build', buildEnv);
runStep(['exec', '--', 'cap', 'copy', 'ios'], 'Capacitor copy', buildEnv);
