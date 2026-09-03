import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jbig2Fixture = path.join(root, 'static', 'samples', 'jbig2-symbol-offset.pdf');

const nextPort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(error => (error ? reject(error) : resolve(address.port)));
    });
  });

const waitForServer = async url => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Vite preview has not opened its listening socket yet.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`timed out waiting for packaged preview at ${url}`);
};

test('built frontend PDF runtime renders the JBIG2 fixture with visible pixels', { timeout: 60000 }, async t => {
  const fixtureContents = fs.readFileSync(jbig2Fixture, 'latin1');
  assert.match(fixtureContents, /\/Filter\s*\/JBIG2Decode/);

  const port = await nextPort();
  const origin = `http://127.0.0.1:${port}`;
  const preview = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: 'ignore'
  });
  t.after(() => preview.kill('SIGTERM'));
  await waitForServer(origin);

  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(
    `${origin}/reader?source=asset&url=%2Fsamples%2Fjbig2-symbol-offset.pdf&label=JBIG2%20fixture`
  );
  await page.getByLabel('reader stage').getByText(/^PDF$/).waitFor({ timeout: 15000 });

  const visiblePixels = await page.waitForFunction(() => {
    const view = document.querySelector('foliate-view');
    const contents = view?.renderer?.getContents?.() ?? [];
    for (const { doc } of contents) {
      const canvas = doc?.querySelector('#canvas canvas');
      const context = canvas?.getContext('2d', { willReadFrequently: true });
      if (!canvas || !context || canvas.width === 0 || canvas.height === 0) continue;
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      const stride = Math.max(4, Math.floor(data.length / 4096 / 4) * 4);
      let ink = 0;
      for (let index = 0; index < data.length; index += stride) {
        if (data[index + 3] > 0 && Math.min(data[index], data[index + 1], data[index + 2]) < 245) ink += 1;
      }
      if (ink > 0) return ink;
    }
    return 0;
  }, { timeout: 30000 });

  assert.ok(await visiblePixels.jsonValue(), 'expected decoded JBIG2 page canvas to contain non-white pixels');
});
