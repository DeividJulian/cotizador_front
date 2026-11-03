// Contract-first tooling for the front. The contract is backend/openapi.json; the front keeps a copy in
// contract/openapi.json and generates src/app/api from it (never edit src/app/api by hand).
//
//   node scripts/api.mjs gen     copies the contract from ../backend (if it is there) and regenerates src/app/api
//   node scripts/api.mjs check   fails if the copy or the generated code are not up to date
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTRACT = join(ROOT, 'contract', 'openapi.json');
const BACKEND_CONTRACT = join(ROOT, '..', 'backend', 'openapi.json');
const GENERATED = join(ROOT, 'src', 'app', 'api');
const GENERATOR = join(ROOT, 'node_modules', 'ng-openapi-gen', 'lib', 'index.js');

const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

function generate(output) {
  execFileSync(process.execPath, [GENERATOR, '--config', join(ROOT, 'ng-openapi-gen.json'), '--output', output], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function differences(expectedDir, actualDir) {
  const expected = new Map(files(expectedDir).map((f) => [relative(expectedDir, f), read(f)]));
  const actual = new Map(files(actualDir).map((f) => [relative(actualDir, f), read(f)]));
  const changed = [...expected].filter(([name, text]) => actual.get(name) !== text).map(([name]) => name);
  const extra = [...actual.keys()].filter((name) => !expected.has(name));
  return [...changed, ...extra];
}

const command = process.argv[2];

if (command === 'gen') {
  if (existsSync(BACKEND_CONTRACT)) {
    writeFileSync(CONTRACT, read(BACKEND_CONTRACT));
    console.log('Contrato copiado de ../backend/openapi.json');
  } else {
    console.log('No está ../backend: se usa la copia de contract/openapi.json');
  }
  generate(GENERATED);
  console.log('Cliente y tipos generados en src/app/api');
} else if (command === 'check') {
  const problems = [];
  if (existsSync(BACKEND_CONTRACT) && read(BACKEND_CONTRACT) !== read(CONTRACT)) {
    problems.push('contract/openapi.json no coincide con ../backend/openapi.json');
  }
  const temp = mkdtempSync(join(tmpdir(), 'api-check-'));
  try {
    generate(temp);
    const stale = differences(temp, GENERATED);
    if (stale.length) problems.push(`src/app/api está desactualizado (${stale.length} archivos): ${stale.slice(0, 5).join(', ')}`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  if (problems.length) {
    problems.forEach((p) => console.error(`✗ ${p}`));
    console.error('Corre npm run gen:api y haz commit de los cambios.');
    process.exit(1);
  }
  console.log('✓ El contrato y el código generado están al día');
} else {
  console.error('Uso: node scripts/api.mjs gen | check');
  process.exit(2);
}
