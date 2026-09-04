import { expect, test } from '@playwright/test';
import path from 'node:path';

const foliateRoot = path.resolve(process.cwd(), '../foliate-js');
const foliateViewUrl = `/@fs/${foliateRoot}/view.js`;
const zipWriterUrl = `/@fs/${foliateRoot}/node_modules/@zip.js/zip.js/index.js`;

test('opens a malformed-header EPUB and reads its case-mismatched chapter', async ({ page }) => {
  await page.goto('/library');

  const chapterText = await page.evaluate(
    async ({ foliateViewUrl, zipWriterUrl }) => {
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
      await writer.add(
        'OPS/content.opf',
        new TextReader(`<?xml version="1.0" encoding="UTF-8"?>
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
</package>`)
      );
      await writer.add(
        'OPS/text/chapter.xhtml',
        new TextReader(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body><p>Case-folded chapter content</p></body>
</html>`)
      );

      const bytes = new Uint8Array(await (await writer.close()).arrayBuffer());
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04)
        throw new Error('fixture must begin with a standard ZIP local header');
      bytes[3] = 0x02;

      const { makeBook } = await import(foliateViewUrl);
      const book = await makeBook(
        new File([bytes], 'malformed-case-mismatch.epub', { type: 'application/epub+zip' })
      );
      try {
        const section = book.sections?.[0];
        if (!section) throw new Error('fixture EPUB must expose a chapter');
        const document = await section.createDocument();
        return document.body.textContent ?? '';
      } finally {
        book.destroy?.();
      }
    },
    { foliateViewUrl, zipWriterUrl }
  );

  await expect(chapterText).toContain('Case-folded chapter content');
});
