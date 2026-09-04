import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { bulkRepairDesktopLibraryBooks } from '../library/desktopMaintenance.js';
import {
  mergePdfMetadataOverride,
  preparePdfMetadataOverrides,
  type LibraryMetadataOverride
} from './pdfImportMetadata.js';
import type { PersistedLibraryBook } from './libraryPersistence.js';

type PersistedPdf = {
  id: string;
  title: string;
  author: string;
  format: string;
  description?: string | null;
  language?: string | null;
  publisher?: string | null;
  filePath: string;
  sourcePath?: string | null;
};

const existingPdf = (overrides: Partial<PersistedPdf> = {}): PersistedPdf => ({
  id: 'pdf-1',
  title: 'A Theory of Justice',
  author: 'John Rawls',
  format: 'PDF',
  description: 'Original description',
  language: 'en',
  publisher: 'Original publisher',
  filePath: '/library/pdf-1.pdf',
  sourcePath: '/imports/justice.pdf',
  ...overrides
});

const oldMetadata: LibraryMetadataOverride = {
  title: 'A Theory of Justice',
  author: 'John Rawls',
  description: 'Original description',
  language: 'en',
  publisher: 'Original publisher'
};

const refreshedMetadata: LibraryMetadataOverride = {
  title: 'A Theory of Justice (Revised)',
  author: 'John Rawls',
  description: 'Revised description',
  language: 'en-US',
  publisher: 'Belknap Press'
};

test('PDF metadata merge refreshes file-derived fields but preserves user edits', () => {
  assert.deepEqual(
    mergePdfMetadataOverride({
      persisted: existingPdf({
        title: 'Justice notes from my seminar',
        publisher: 'My shelf label'
      }),
      previousFileMetadata: oldMetadata,
      nextFileMetadata: refreshedMetadata
    }),
    {
      title: 'Justice notes from my seminar',
      author: 'John Rawls',
      description: 'Revised description',
      language: 'en-US',
      publisher: 'My shelf label'
    }
  );
});

test('PDF metadata merge adopts embedded metadata for first import and placeholder fields', () => {
  assert.deepEqual(
    mergePdfMetadataOverride({
      persisted: null,
      previousFileMetadata: null,
      nextFileMetadata: refreshedMetadata
    }),
    refreshedMetadata
  );
  assert.deepEqual(
    mergePdfMetadataOverride({
      persisted: existingPdf({
        title: 'justice',
        author: 'Unknown author',
        description: null,
        language: null,
        publisher: null
      }),
      previousFileMetadata: {
        title: oldMetadata.title,
        author: oldMetadata.author
      },
      nextFileMetadata: refreshedMetadata,
      sourceTitle: 'justice'
    }),
    refreshedMetadata
  );
});

test('PDF metadata merge preserves a user-cleared optional field on re-import', () => {
  const merged = mergePdfMetadataOverride({
    persisted: existingPdf({
      description: null,
      language: null,
      publisher: null
    }),
    previousFileMetadata: oldMetadata,
    nextFileMetadata: refreshedMetadata
  });

  // Missing keys serialize to Rust None, so the importer keeps the deliberate clears.
  assert.deepEqual(JSON.parse(JSON.stringify(merged)), {
    title: 'A Theory of Justice (Revised)',
    author: 'John Rawls'
  });
});

test('PDF metadata preparation stays aligned to paths, skips non-PDF files, and reads the old managed copy', async () => {
  const incoming = new Blob(['incoming']);
  const managed = new Blob(['managed']);
  const readPaths: string[] = [];
  const overrides = await preparePdfMetadataOverrides(
    ['/imports/justice.pdf', '/imports/notes.epub'],
    [existingPdf()],
    {
      readBookFile: async (path) => {
        readPaths.push(path);
        if (path === '/imports/justice.pdf') return incoming;
        if (path === '/library/pdf-1.pdf') return managed;
        throw new Error(`unexpected path ${path}`);
      },
      extractPdfMetadata: async (file) => file === incoming ? refreshedMetadata : oldMetadata,
      hashBookFile: async () => 'source-hash'
    }
  );

  assert.deepEqual(overrides, [{ ...refreshedMetadata, sourceSha256: 'source-hash' }, null]);
  assert.deepEqual(readPaths, ['/imports/justice.pdf', '/library/pdf-1.pdf']);
});

test('PDF metadata preparation keeps curated fields when repair re-links a record', async () => {
  const incoming = new Blob(['replacement']);
  const managed = new Blob(['managed']);
  const readPaths: string[] = [];
  const repairMetadata: LibraryMetadataOverride = {
    title: 'A Theory of Justice (replacement edition)',
    author: 'John Rawls (revised)',
    description: 'Replacement description',
    language: 'en-GB',
    publisher: 'Replacement publisher'
  };

  const overrides = await preparePdfMetadataOverrides(
    ['/repairs/justice-replacement.pdf'],
    [existingPdf({
      title: 'Justice notes from my seminar',
      publisher: 'My shelf label'
    })],
    {
      readBookFile: async (path) => {
        readPaths.push(path);
        if (path === '/repairs/justice-replacement.pdf') return incoming;
        if (path === '/library/pdf-1.pdf') return managed;
        throw new Error(`unexpected path ${path}`);
      },
      extractPdfMetadata: async (file) => file === incoming ? repairMetadata : oldMetadata,
      hashBookFile: async () => 'source-hash'
    },
    'pdf-1'
  );

  assert.deepEqual(overrides, [{
    title: 'Justice notes from my seminar',
    author: 'John Rawls (revised)',
    description: 'Replacement description',
    language: 'en-GB',
    publisher: 'My shelf label',
    sourceSha256: 'source-hash'
  }]);
  assert.deepEqual(readPaths, [
    '/repairs/justice-replacement.pdf',
    '/library/pdf-1.pdf'
  ]);
});

test('PDF repair reads the persisted source with its record id and keeps curated metadata when the managed copy is missing', async () => {
  const incoming = new Blob(['replacement']);
  const readCalls: Array<[string, string | undefined]> = [];
  const repairedMetadata: LibraryMetadataOverride = {
    title: 'Embedded replacement title',
    author: 'Embedded replacement author',
    description: 'Replacement description',
    language: 'en-GB',
    publisher: 'Replacement publisher'
  };

  const overrides = await preparePdfMetadataOverrides(
    ['/repairs/justice.pdf'],
    [existingPdf({
      title: 'justice',
      author: 'Unknown author',
      description: null,
      language: 'Curated language',
      publisher: 'Curated publisher',
      sourcePath: '/repairs/justice.pdf',
      filePath: '/library/missing-justice.pdf'
    })],
    {
      readBookFile: async (path, repairRecordId?: string) => {
        readCalls.push([path, repairRecordId]);
        if (path === '/repairs/justice.pdf') return incoming;
        if (path === '/library/missing-justice.pdf') {
          throw new Error('managed library copy is missing');
        }
        throw new Error(`unexpected path ${path}`);
      },
      extractPdfMetadata: async () => repairedMetadata,
      hashBookFile: async () => 'source-hash'
    },
    'pdf-1'
  );

  assert.deepEqual(readCalls, [
    ['/repairs/justice.pdf', 'pdf-1'],
    ['/library/missing-justice.pdf', 'pdf-1']
  ]);
  assert.deepEqual(overrides, [{
    title: 'Embedded replacement title',
    author: 'Embedded replacement author',
    language: 'Curated language',
    publisher: 'Curated publisher',
    sourceSha256: 'source-hash'
  }]);
});

test('PDF metadata preparation falls back to Rust import when either PDF cannot be parsed', async () => {
  const overrides = await preparePdfMetadataOverrides(['/imports/justice.pdf'], [existingPdf()], {
    readBookFile: async () => new Blob(['broken pdf']),
    extractPdfMetadata: async () => {
      throw new Error('PDF metadata unavailable');
    }
  });

  assert.deepEqual(overrides, [null]);
});

test('PDF metadata preparation binds an override to the exact incoming bytes it parsed', async () => {
  const incoming = new Blob(['incoming revision']);
  const expectedSourceSha256 = createHash('sha256').update('incoming revision').digest('hex');
  const overrides = await preparePdfMetadataOverrides(
    ['/imports/justice.pdf'],
    [],
    {
      readBookFile: async () => incoming,
      extractPdfMetadata: async (file) => {
        assert.equal(file, incoming, 'metadata must be parsed from the imported Blob');
        return refreshedMetadata;
      }
    }
  );

  const override = overrides[0] as (LibraryMetadataOverride & { sourceSha256?: string }) | null;
  assert.equal(override?.sourceSha256, expectedSourceSha256);
});

test('bulk PDF repair preserves the selected record identity when importing its source', async () => {
  const record: PersistedLibraryBook = {
    ...existingPdf(),
    importedAt: 1,
    progress: 'Chapter 3',
    status: 'Reading',
    progressFraction: 0.37,
    filePath: '/library/missing-justice.pdf',
    sourcePath: '/imports/justice.pdf',
    libraryFileExists: false,
    sourceFileExists: true
  };
  const importCalls: Array<{ filePaths: string[]; repairRecordId?: string }> = [];

  await bulkRepairDesktopLibraryBooks({
    eligibleRecords: [record],
    bulkRepairBusy: false,
    setBulkRepairBusy: () => {},
    setBulkRepairSummary: () => {},
    clearLibraryNotice: () => {},
    setLibraryNotice: () => {},
    importLibraryBooks: async (...args: unknown[]) => {
      const [filePaths, options] = args as [string[], { repairRecordId?: string } | undefined];
      importCalls.push({ filePaths, repairRecordId: options?.repairRecordId });
      return [record];
    },
    loadPersistedLibraryBooks: async () => [record],
    applyPersistedLibraryRecords: async () => {},
    getManualRepairCount: () => 0
  });

  assert.deepEqual(importCalls, [{
    filePaths: ['/imports/justice.pdf'],
    repairRecordId: 'pdf-1'
  }]);
});
