const path = require('path');
const { spawnSync } = require('child_process');

const [file, ...jestArgs] = process.argv.slice(2);

if (!file) {
  console.error(
    'Informe o arquivo do teste. Ex: npm run test:file -- document.service.spec.ts',
  );
  process.exit(1);
}

const isE2e = /(^|[\\/])tests[\\/]e2e[\\/]|\.e2e-spec\.ts$/i.test(file);
const jestCli = path.join(
  __dirname,
  '..',
  'node_modules',
  'jest',
  'bin',
  'jest.js',
);
const args = [];

if (isE2e)
  args.push('--config', path.join(__dirname, '..', 'jest.e2e.config.js'));
args.push('--runInBand', file, ...jestArgs);

const result = spawnSync(process.execPath, [jestCli, ...args], {
  stdio: 'inherit',
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
