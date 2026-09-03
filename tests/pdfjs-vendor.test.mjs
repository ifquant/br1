import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const wasmNames = (file, available) => new Set(
  [...file.matchAll(/[A-Za-z0-9_-]+\.wasm/g)]
    .map(([name]) => name)
    .filter(name => available.has(name))
);

test('PDF.js vendor setup copies every installed WASM runtime and build refreshes it first', () => {
  const setup = read('scripts', 'setup-pdfjs-vendor.mjs');
  const packageJson = JSON.parse(read('package.json'));

  assert.match(
    setup,
    /copyDirectory\(wasmRoot,\s*targetRoot\)/,
    'vendor setup must copy the full pdfjs-dist/wasm directory instead of a filename allowlist'
  );
  assert.doesNotMatch(setup, /const wasmFiles\s*=/, 'WASM runtime files must not be maintained as an allowlist');
  assert.match(
    packageJson.scripts.build,
    /^(?:pnpm )?setup-vendors\s*&&/,
    'production build must refresh the PDF.js vendor before Vite packages static assets'
  );
});

test('packaged PDF.js vendor contains every runtime WASM referenced by its worker', () => {
  const worker = read('static', 'vendor', 'pdfjs', 'pdf.worker.mjs');
  const installedWasm = new Set(
    fs.readdirSync(path.join(root, 'node_modules', 'pdfjs-dist', 'wasm')).filter(name => name.endsWith('.wasm'))
  );
  const referencedWasm = wasmNames(worker, installedWasm);

  // Synthetic Apache-2.0 fixture from Mozilla pdf.js test/pdfs.
  assert.match(
    read('static', 'samples', 'jbig2-symbol-offset.pdf'),
    /\/Filter\s*\/JBIG2Decode/,
    'runtime smoke fixture must continue to exercise the JBIG2 decoder'
  );
  assert.ok(referencedWasm.has('jbig2.wasm'), 'PDF.js worker must keep its scanned-document decoder');
  for (const name of referencedWasm) {
    assert.ok(installedWasm.has(name), `${name} must be supplied by the installed pdfjs-dist runtime`);
    assert.ok(fs.existsSync(path.join(root, 'static', 'vendor', 'pdfjs', name)), `${name} is missing from static vendor`);
  }
});
