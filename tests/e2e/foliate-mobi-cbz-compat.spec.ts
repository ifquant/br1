import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const mobiUrl = `/@fs/${foliateRoot}/mobi.js`;
const comicBookUrl = `/@fs/${foliateRoot}/comic-book.js`;
const kf8Fixture = path.resolve(process.cwd(), 'tests/fixtures/repro-5918.azw3');

// Copied verbatim from Readest's repro-5918.azw3 fixture.
// SHA-256: 00c3ee3440bbfad6e0aab18931daa1c11f0f390ec02ce2df50b0e04dd37fd61c

test('repairs MOBI6 self-closing non-void tags before HTML parsing', async ({ page }) => {
  await page.goto('/library');

  const result = await page.evaluate(async ({ mobiUrl }) => {
    const module = await import(mobiUrl);
    const normalizeMobi6Markup = module.normalizeMobi6Markup as
      | ((markup: string) => string)
      | undefined;
    const source = '<html><body><a/><b>after a</b><div/><i>after div</i><span/><em>after span</em><p/><strong>after p</strong></body></html>';
    const document = new DOMParser().parseFromString(
      normalizeMobi6Markup?.(source) ?? source,
      'text/html'
    );

    return {
      normalizerType: typeof normalizeMobi6Markup,
      children: Array.from(document.body.children).map((element) => ({
        tag: element.tagName.toLowerCase(),
        text: element.textContent
      }))
    };
  }, { mobiUrl });

  expect(result.normalizerType).toBe('function');
  expect(result.children).toEqual([
    { tag: 'a', text: '' },
    { tag: 'b', text: 'after a' },
    { tag: 'div', text: '' },
    { tag: 'i', text: 'after div' },
    { tag: 'span', text: '' },
    { tag: 'em', text: 'after span' },
    { tag: 'p', text: '' },
    { tag: 'strong', text: 'after p' }
  ]);
});

test('orders split CBZ folders and numeric page names naturally', async ({ page }) => {
  await page.goto('/library');

  const order = await page.evaluate(async ({ comicBookUrl }) => {
    const { makeComicBook } = await import(comicBookUrl);
    const filenames = [
      'Chapter 0060 (10)/001.jpg',
      'Chapter 0060 (2)/002.jpg',
      'Chapter 0060 (2)/001.jpg',
      'Chapter 0060 (3)/001.jpg',
      'Chapter 0060/002.jpg',
      'Chapter 0060/001.jpg',
      'Chapter 0061/10.jpg',
      'Chapter 0061/2.jpg'
    ];
    const book = await makeComicBook({
      entries: filenames.map((filename) => ({ filename })),
      loadBlob: async () => new Blob(['page'], { type: 'image/jpeg' }),
      getSize: () => 1,
      getComment: async () => ''
    }, new File([], 'split-chapters.cbz'));

    return book.sections.map((section: { id: string }) => section.id);
  }, { comicBookUrl });

  expect(order).toEqual([
    'Chapter 0060/001.jpg',
    'Chapter 0060/002.jpg',
    'Chapter 0060 (2)/001.jpg',
    'Chapter 0060 (2)/002.jpg',
    'Chapter 0060 (3)/001.jpg',
    'Chapter 0060 (10)/001.jpg',
    'Chapter 0061/2.jpg',
    'Chapter 0061/10.jpg'
  ]);
});

test('keeps KF8 section text stable when overlapping range reads resolve out of order', async ({ page }) => {
  test.setTimeout(60_000);
  const fixtureBytes = Array.from(await readFile(kf8Fixture));
  await page.goto('/library');

  const result = await page.evaluate(async ({ mobiUrl, fixtureBytes }) => {
    const { MOBI } = await import(mobiUrl) as {
      MOBI: new (options: { unzlib: null }) => { open: (file: File) => Promise<{
        sections: Array<{ createDocument?: () => Promise<Document> }>;
      }> };
    };

    class JitteredFile extends File {
      bytes: Uint8Array;
      seed = 42;

      constructor(bytes: Uint8Array, name: string) {
        super([], name);
        this.bytes = bytes;
      }

      override get size() {
        return this.bytes.byteLength;
      }

      nextDelay() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return Math.floor((this.seed / 0x7fffffff) * 8);
      }

      override slice(start = 0, end = this.size): Blob {
        const bytes = this.bytes.slice(start, end);
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const delay = this.nextDelay();
        return {
          arrayBuffer: () => new Promise<ArrayBuffer>((resolve) => {
            setTimeout(() => resolve(buffer), delay);
          })
        } as Blob;
      }
    }

    const readSection = async (section: { createDocument?: () => Promise<Document> }) =>
      section.createDocument
        ? ((await section.createDocument()).documentElement.textContent ?? '')
        : '';
    const open = (file: File) => new MOBI({ unzlib: null }).open(file);
    const bytes = Uint8Array.from(fixtureBytes);
    const serialBook = await open(new File([bytes], 'repro-5918.azw3'));
    const expected: string[] = [];
    for (const section of serialBook.sections) expected.push(await readSection(section));

    const racedBook = await open(new JitteredFile(bytes, 'repro-5918.azw3'));
    const actual: string[] = [];
    for (let index = 0; index < racedBook.sections.length; index += 2) {
      actual.push(...await Promise.all(racedBook.sections.slice(index, index + 2).map(readSection)));
    }

    return { expected, actual };
  }, { mobiUrl, fixtureBytes });

  expect(result.expected.filter((text) => text.length > 500).length).toBeGreaterThan(5);
  expect(result.actual).toEqual(result.expected);
});
