import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// EAS uploads this repository only. Commit the package archive alongside the lockfile.
const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = fileURLToPath(new URL('../../AssetMapping-Backend/', import.meta.url));
mkdirSync(new URL('../vendor/', import.meta.url), { recursive: true });
execFileSync('npm', ['run', 'build:types'], { cwd: backend, stdio: 'inherit' });
const packed = JSON.parse(
  execFileSync(
    'npm',
    ['pack', './packages/shared-types', '--pack-destination', `${frontend}/vendor`, '--json'],
    { cwd: backend, encoding: 'utf8' }
  )
);
const packageFile = new URL('../package.json', import.meta.url);
const manifest = JSON.parse(readFileSync(packageFile, 'utf8'));
manifest.dependencies['@assetmapping/shared-types'] = `file:vendor/${packed[0].filename}`;
writeFileSync(packageFile, JSON.stringify(manifest, null, 2) + '\n');
execFileSync('npm', ['install', '--package-lock-only'], { cwd: frontend, stdio: 'inherit' });
