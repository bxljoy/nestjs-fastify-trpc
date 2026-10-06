const { spawnSync } = require('node:child_process');
const path = require('node:path');

const apiRoot = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  // Intentionally fixed to the disposable local test instance, never an inherited URL.
  DATABASE_URL: 'postgresql://budget_review_test:local_test_only@127.0.0.1:55433/budget_review_test',
};

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: apiRoot,
    env,
    stdio: 'inherit',
    timeout: 120000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
run([
  '--experimental-vm-modules', 'node_modules/jest/bin/jest.js',
  '--config', 'jest.integration.config.cjs', '--runInBand', '--detectOpenHandles',
  '--watchman=false',
]);
