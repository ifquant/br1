import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import postcssNested from 'postcss-nested';

const appRoot = '/Users/dev/workspace2/hc_apps/br1';
const foliateRoot = '/Users/dev/workspace2/hc_apps/foliate-js';
const pdfjsDistRoot = path.join(appRoot, 'node_modules/pdfjs-dist');
const targetRoot = path.join(appRoot, 'static/vendor/pdfjs');

const buildFiles = [
  'pdf.min.mjs',
  'pdf.worker.min.mjs',
  'pdf.mjs',
  'pdf.mjs.map',
  'pdf.worker.mjs',
  'pdf.worker.mjs.map',
  'pdf.d.mts',
];
const wasmFiles = ['openjpeg.wasm', 'qcms_bg.wasm'];
const cssFiles = ['annotation_layer_builder.css', 'text_layer_builder.css'];
const assetDirs = ['cmaps', 'standard_fonts'];

const tasks = {
  prepare: preparePublicVendor,
  'copy-js': copyPdfjsJs,
  'copy-wasm': copyPdfjsWasm,
  'copy-fonts': copyPdfjsFonts,
  'copy-annotation-css': () => copyFlattenedCss('annotation_layer_builder.css'),
  'copy-text-css': () => copyFlattenedCss('text_layer_builder.css'),
  'copy-css': copyPdfjsCss,
  'copy-all': copyAllPdfjsAssets,
  'setup-pdfjs': setupPdfjs,
  'setup-vendors': setupPdfjs,
};

const taskName = process.argv[2] ?? 'setup-vendors';
const task = tasks[taskName];

if (!task) {
  console.error(`Unknown task: ${taskName}`);
  process.exit(1);
}

await task();

async function setupPdfjs() {
  preparePublicVendor();
  await copyAllPdfjsAssets();
}

async function copyAllPdfjsAssets() {
  copyPdfjsJs();
  copyPdfjsWasm();
  copyPdfjsFonts();
  await copyPdfjsCss();
}

function preparePublicVendor() {
  fs.rmSync(targetRoot, { recursive: true, force: true });
  fs.mkdirSync(targetRoot, { recursive: true });
}

function copyPdfjsJs() {
  const buildRoot = path.join(pdfjsDistRoot, 'legacy/build');
  for (const fileName of buildFiles) {
    copyFile(path.join(buildRoot, fileName), path.join(targetRoot, fileName));
  }
}

function copyPdfjsWasm() {
  const wasmRoot = path.join(pdfjsDistRoot, 'wasm');
  for (const fileName of wasmFiles) {
    copyFile(path.join(wasmRoot, fileName), path.join(targetRoot, fileName));
  }
}

function copyPdfjsFonts() {
  for (const dirName of assetDirs) {
    copyDirectory(
      path.join(pdfjsDistRoot, dirName),
      path.join(targetRoot, dirName),
    );
  }
}

async function copyPdfjsCss() {
  for (const fileName of cssFiles) {
    await copyFlattenedCss(fileName);
  }
}

async function copyFlattenedCss(fileName) {
  const sourcePath = path.join(foliateRoot, 'vendor/pdfjs', fileName);
  const targetPath = path.join(targetRoot, fileName);
  const sourceCss = fs.readFileSync(sourcePath, 'utf8');
  const result = await postcss([postcssNested]).process(sourceCss, {
    from: sourcePath,
    to: targetPath,
    map: false,
  });
  fs.writeFileSync(targetPath, result.css);
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
}

function copyFile(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}
