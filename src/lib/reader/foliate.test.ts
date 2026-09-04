import assert from 'node:assert/strict';
import test from 'node:test';

import { extractPdfFileMetadata, normalizePdfFileMetadata } from './pdfMetadata.js';

test('PDF metadata normalization prefers author and maps localized, array, and language values', () => {
  assert.deepEqual(
    normalizePdfFileMetadata({
      title: { 'zh-CN': 'Zheng Yi Lun', en: 'A Theory of Justice' },
      author: [{ name: 'John Rawls' }],
      creator: 'Fallback creator',
      description: { en: 'Justice as fairness.' },
      language: ['en-US', 'fr'],
      publisher: { en: 'Harvard University Press' }
    }),
    {
      title: 'Zheng Yi Lun',
      author: 'John Rawls',
      description: 'Justice as fairness.',
      language: 'en-US',
      publisher: 'Harvard University Press'
    }
  );
});

test('PDF metadata normalization falls back to creator and omits empty values', () => {
  assert.deepEqual(
    normalizePdfFileMetadata({
      title: '  ',
      author: '  ',
      creator: [{ name: 'Creator fallback' }],
      description: [],
      language: ['  ', 'de'],
      publisher: null
    }),
    {
      author: 'Creator fallback',
      language: 'de'
    }
  );
});

test('PDF metadata extraction normalizes the temporary book and always destroys it', async () => {
  let destroyCalls = 0;
  const metadata = await extractPdfFileMetadata(new Blob(['pdf fixture']), {
    loadBook: async () => ({
      metadata: {
        title: 'A Theory of Justice',
        author: 'John Rawls',
        description: 'A political philosophy classic.',
        language: ['en'],
        publisher: 'Belknap Press'
      },
      destroy: () => {
        destroyCalls += 1;
      }
    })
  });

  assert.deepEqual(metadata, {
    title: 'A Theory of Justice',
    author: 'John Rawls',
    description: 'A political philosophy classic.',
    language: 'en',
    publisher: 'Belknap Press'
  });
  assert.equal(destroyCalls, 1);
});
