// gRPC contract tooling. The contract is backend/proto; the front keeps a copy in proto/ and generates
// src/app/grpc/gen from it with buf + protoc-gen-es (never edit src/app/grpc/gen by hand).
//
//   node scripts/proto.mjs gen     copies ../backend/proto (if it is there) and regenerates src/app/grpc/gen
//   node scripts/proto.mjs check   fails if the copy or the generated code are not up to date
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PROTO = join(ROOT, 'proto');
const BACKEND_PROTO = join(ROOT, '..', 'backend', 'proto');
const GENERATED = join(ROOT, 'src', 'app', 'grpc', 'gen');
const BIN = join(ROOT, 'node_modules', '.bin');

const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function differences(expectedDir, actualDir) {
  if (!existsSync(actualDir)) return ['(no existe)'];
  const expected = new Map(files(expectedDir).map((f) => [relative(expectedDir, f), read(f)]));
  const actual = new Map(files(actualDir).map((f) => [relative(actualDir, f), read(f)]));
  const changed = [...expected].filter(([name, text]) => actual.get(name) !== text).map(([name]) => name);
  return [...changed, ...[...actual.keys()].filter((name) => !expected.has(name))];
}

/** buf generate, with output under `base` (the template writes to <base>/src/app/grpc/gen). */
function generate(base) {
  const buf = join(ROOT, 'node_modules', '@bufbuild', 'buf', 'bin', 'buf');
  execFileSync(process.execPath, [buf, 'generate', '--template', 'buf.gen.yaml', '--output', base], {
    cwd: ROOT,
    stdio: 'inherit',
    // protoc-gen-es is found in node_modules/.bin
    env: { ...process.env, PATH: `${BIN}${delimiter}${process.env.PATH}` },
  });
}

const command = process.argv[2];

if (command === 'gen') {
  if (existsSync(BACKEND_PROTO)) {
    rmSync(PROTO, { recursive: true, force: true });
    cpSync(BACKEND_PROTO, PROTO, { recursive: true });
    console.log('Contrato .proto copiado de ../backend/proto');
  } else {
    console.log('No está ../backend: se usa la copia de proto/');
  }
  generate(ROOT);
  console.log('Cliente gRPC generado en src/app/grpc/gen');
} else if (command === 'check') {
  const problems = [];
  if (existsSync(BACKEND_PROTO)) {
    const stale = differences(BACKEND_PROTO, PROTO);
    if (stale.length) problems.push(`proto/ no coincide con ../backend/proto: ${stale.join(', ')}`);
  }
  const temp = mkdtempSync(join(tmpdir(), 'proto-check-'));
  try {
    generate(temp);
    const stale = differences(join(temp, 'src', 'app', 'grpc', 'gen'), GENERATED);
    if (stale.length) problems.push(`src/app/grpc/gen está desactualizado: ${stale.join(', ')}`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  if (problems.length) {
    problems.forEach((p) => console.error(`✗ ${p}`));
    console.error('Corre npm run gen:proto y haz commit de los cambios.');
    process.exit(1);
  }
  console.log('✓ El contrato .proto y el cliente gRPC generado están al día');
} else {
  console.error('Uso: node scripts/proto.mjs gen | check');
  process.exit(2);
}
