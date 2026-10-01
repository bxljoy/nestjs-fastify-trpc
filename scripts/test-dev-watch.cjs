// Exercise the real dev command in a disposable copy, never edit the working source.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const { createServer } = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

async function main() {
  // Process-group cleanup below is POSIX-specific.
  assert.notEqual(process.platform, 'win32', 'Run this smoke check on macOS or Linux');
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(3000, '127.0.0.1', () => {
      probe.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const root = path.resolve(__dirname, '..');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'budget-review-watch-'));
  let child;
  let output = '';
  let spawnError;
  let exited;

  async function waitFor(check, label) {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`Dev command exited while waiting for ${label}\n${output}`);
      }
      if (await check()) return;
      await delay(100);
    }
    throw new Error(`Timed out waiting for ${label}\n${output}`);
  }

  async function healthIs(expected) {
    try {
      const response = await fetch('http://127.0.0.1:3000/health', {
        signal: AbortSignal.timeout(500),
      });
      return response.status === 200 && (await response.json()).status === expected;
    } catch {
      return false;
    }
  }

  try {
    for (const file of ['package.json', 'pnpm-workspace.yaml', 'apps/api/package.json',
      'apps/api/tsconfig.json', 'apps/api/tsconfig.build.json', 'apps/api/src']) {
      await fs.cp(path.join(root, file), path.join(temporary, file), { recursive: true });
    }
    // This file is added with the implementation; absence is valid in the RED run.
    const cliConfig = 'apps/api/nest-cli.json';
    try {
      await fs.copyFile(path.join(root, cliConfig), path.join(temporary, cliConfig));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await fs.symlink(path.join(root, 'apps/api/node_modules'),
      path.join(temporary, 'apps/api/node_modules'), 'dir');

    child = spawn('pnpm', ['dev'], {
      cwd: temporary,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
        // The fixture reuses already-installed dependencies, and must not install
        // through its node_modules symlink into the real working directory.
        pnpm_config_verify_deps_before_run: 'false',
      },
    });
    exited = new Promise((resolve) => child.once('exit', resolve));
    child.once('error', (error) => { spawnError = error; });
    const collect = (chunk) => { output = (output + chunk.toString()).slice(-30000); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    await waitFor(() => healthIs('ok'), 'initial HTTP response');
    const servicePath = path.join(temporary, 'apps/api/src/health/health.service.ts');
    const original = await fs.readFile(servicePath, 'utf8');
    assert.ok(original.includes("'ok'"), 'Expected a liveness literal to mutate');
    // Change both the literal type and value so the temporary change typechecks.
    await fs.writeFile(servicePath, original.replaceAll("'ok'", "'watch-updated'"));
    await waitFor(() => healthIs('watch-updated'), 'automatic rebuild and restart');
    await fs.writeFile(servicePath, original);
    await waitFor(() => healthIs('ok'), 'restart after restoring the source');
  } finally {
    if (child?.pid) {
      const signalGroup = (signal) => {
        try { process.kill(-child.pid, signal); }
        catch (error) { if (error.code !== 'ESRCH') throw error; }
      };
      signalGroup('SIGTERM');
      const stopped = await Promise.race([
        exited.then(() => true),
        delay(3000).then(() => false),
      ]);
      if (!stopped) signalGroup('SIGKILL');
    }
    await fs.rm(temporary, { recursive: true, force: true });
  }
  // The dev command must leave its HTTP port free after group shutdown.
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(3000, '127.0.0.1', () => {
      probe.close((error) => (error ? reject(error) : resolve()));
    });
  });
  console.log('PASS: pnpm dev starts, recompiles, restarts, and cleans up');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
