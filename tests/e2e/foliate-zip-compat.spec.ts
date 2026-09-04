import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const foliateViewUrl = `/@fs/${foliateRoot}/view.js`;
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;

type EpubSection = {
  id: string | null;
  load: () => Promise<string>;
  createDocument: () => Promise<Document>;
};

const inspectEpub = (
  page: import('@playwright/test').Page,
  opf: string,
  entries: Array<{ filename: string; contents: string }>,
  corruptFirstHeader = false
) =>
  page.evaluate(
    async ({ foliateViewUrl, zipWriterUrl, opf, entries, corruptFirstHeader }) => {
      const { BlobWriter, TextReader, ZipWriter } = await import(zipWriterUrl);
      const writer = new ZipWriter(new BlobWriter());
      await writer.add('mimetype', new TextReader('application/epub+zip'), { level: 0 });
      await writer.add(
        'META-INF/container.xml',
        new TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)
      );
      await writer.add('OPS/content.opf', new TextReader(opf));
      for (const entry of entries) {
        await writer.add(entry.filename, new TextReader(entry.contents));
      }

      let archive = await writer.close();
      if (corruptFirstHeader) {
        const bytes = new Uint8Array(await archive.arrayBuffer());
        if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04)
          throw new Error('fixture must begin with a standard ZIP local header');
        bytes[3] = 0x02;
        archive = new Blob([bytes], { type: 'application/epub+zip' });
      }
      const { makeBook } = await import(foliateViewUrl);
      const book = await makeBook(
        new File([archive], 'archive-compatibility.epub', {
          type: 'application/epub+zip'
        })
      );
      try {
        const sections = (book.sections ?? []) as EpubSection[];
        const sectionSources = await Promise.all(sections.map((section) => section.load()));
        const sectionTexts = await Promise.all(
          sections.map(async (section) => {
            const document = await section.createDocument();
            return document.body?.textContent ?? document.documentElement?.textContent ?? '';
          })
        );
        const cover = await book.getCover();
        return {
          title: book.metadata.title,
          sectionIds: sections.map((section) => section.id),
          sectionSources,
          sectionTexts,
          cover: cover
            ? { type: cover.type, contents: await cover.text() }
            : null
        };
      } finally {
        book.destroy?.();
      }
    },
    { foliateViewUrl, zipWriterUrl, opf, entries, corruptFirstHeader }
  );

test('opens a malformed-header EPUB and reads its case-mismatched chapter', async ({ page }) => {
  await page.goto('/library');

  const result = await inspectEpub(
    page,
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">zip-compatibility</dc:identifier>
    <dc:title>ZIP compatibility</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="chapter" href="Text/Chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="chapter"/></spine>
</package>`,
    [
      {
        filename: 'OPS/text/chapter.xhtml',
        contents: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body><p>Case-folded chapter content</p></body>
 </html>`
      }
    ],
    true
  );

  await expect(result.sectionTexts[0]).toContain('Case-folded chapter content');
});

test('opens an OPF with a bare ampersand without changing valid entities', async ({ page }) => {
  await page.goto('/library');

  const result = await inspectEpub(
    page,
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">bare-ampersand</dc:identifier>
    <dc:title>Entity &amp;amp; &#38; &#x26;</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="Search_&_Rescue" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="Search_&_Rescue"/></spine>
</package>`,
    [
      {
        filename: 'OPS/chapter.xhtml',
        contents: '<html xmlns="http://www.w3.org/1999/xhtml"><body>bare ampersand chapter</body></html>'
      }
    ]
  );

  await expect(result.title).toBe('Entity &amp; & &');
  await expect(result.sectionTexts).toEqual(['bare ampersand chapter']);
});

test('decodes reserved entry characters without turning encoded slash or hash into separators', async ({ page }) => {
  await page.goto('/library');

  const result = await inspectEpub(
    page,
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">reserved-paths</dc:identifier>
    <dc:title>Reserved paths</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="amp" href="a%26b.xhtml" media-type="application/xhtml+xml"/>
    <item id="slash" href="a%2Fb.xhtml" media-type="application/xhtml+xml"/>
    <item id="hash" href="a%23b.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="amp"/><itemref idref="slash"/><itemref idref="hash"/></spine>
</package>`,
    [
      {
        filename: 'OPS/a&b.xhtml',
        contents: '<html xmlns="http://www.w3.org/1999/xhtml"><body>ampersand entry</body></html>'
      },
      {
        filename: 'OPS/a%2Fb.xhtml',
        contents: '<html xmlns="http://www.w3.org/1999/xhtml"><body>encoded slash entry</body></html>'
      },
      {
        filename: 'OPS/a/b.xhtml',
        contents: '<html xmlns="http://www.w3.org/1999/xhtml"><body>wrong slash entry</body></html>'
      },
      {
        filename: 'OPS/a%23b.xhtml',
        contents: '<html xmlns="http://www.w3.org/1999/xhtml"><body>encoded hash entry</body></html>'
      },
      {
        filename: 'OPS/a#b.xhtml',
        contents: '<html xmlns="http://www.w3.org/1999/xhtml"><body>wrong hash entry</body></html>'
      }
    ]
  );

  await expect(result.sectionTexts).toEqual([
    'ampersand entry',
    'encoded slash entry',
    'encoded hash entry'
  ]);
});

test('uses the first undeclared cover-named container entry with the SVG media type', async ({ page }) => {
  await page.goto('/library');

  const result = await inspectEpub(
    page,
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">undeclared-cover</dc:identifier>
    <dc:title>Undeclared cover</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="chapter"/></spine>
</package>`,
    [
      {
        filename: 'OPS/Images/couv.svg',
        contents: '<svg xmlns="http://www.w3.org/2000/svg"><title>first cover</title></svg>'
      },
      {
        filename: 'OPS/Images/cover.jpg',
        contents: 'later cover'
      },
      {
        filename: 'OPS/chapter.xhtml',
        contents: '<html xmlns="http://www.w3.org/1999/xhtml"><body>cover chapter</body></html>'
      }
    ]
  );

  await expect(result.cover).toEqual({
    type: 'image/svg+xml',
    contents: '<svg xmlns="http://www.w3.org/2000/svg"><title>first cover</title></svg>'
  });
});

test('ignores a manifest item without href instead of resolving it to OPS/null', async ({ page }) => {
  await page.goto('/library');

  const result = await inspectEpub(
    page,
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">missing-href</dc:identifier>
    <dc:title>Missing href</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
    <item id="script" href="chapter.js" media-type="application/javascript"/>
    <item id="missing" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="chapter"/><itemref idref="missing"/></spine>
</package>`,
    [
      {
        filename: 'OPS/chapter.xhtml',
        contents: '<html xmlns="http://www.w3.org/1999/xhtml"><head><script src="chapter.js"></script></head><body>valid chapter</body></html>'
      },
      {
        filename: 'OPS/chapter.js',
        contents: 'const fixtureScript = true;'
      },
      {
        filename: 'OPS/null',
        contents: '<html xmlns="http://www.w3.org/1999/xhtml"><body>unexpected null path</body></html>'
      }
    ]
  );

  await expect(result.sectionIds).toEqual(['OPS/chapter.xhtml']);
  await expect(result.sectionSources).toHaveLength(1);
  await expect(result.sectionSources[0]).toMatch(/^blob:/);
  await expect(result.sectionTexts).toEqual(['valid chapter']);
});
