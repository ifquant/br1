import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCatalogImportIntent,
  importCatalogEntryToLibrary,
  normalizeCatalogSourceSettingsInput,
  type CatalogEntry,
  type CatalogSource
} from './catalogs';

const fixtureSource: CatalogSource = {
  id: 'fixture-opds',
  kind: 'opds',
  title: 'Fixture OPDS',
  baseUrl: 'fixture://opds/root.xml',
  description: 'Fixture source',
  auth: {
    kind: 'none',
    label: 'No auth',
    configured: true,
    required: false
  },
  connectivity: {
    status: 'available',
    label: 'Fixture available',
    retryable: false
  },
  tags: ['fixture', 'opds'],
  createdAt: 1,
  updatedAt: 2
};

const fixtureEntry: CatalogEntry = {
  id: 'entry-1',
  sourceId: 'fixture-opds',
  title: 'Fixture Book',
  authors: [{ name: 'Fixture Author' }],
  categories: ['fiction'],
  links: [
    {
      rel: 'acquisition',
      href: 'fixture://opds/files/fixture-book.epub',
      mediaType: 'application/epub+zip',
      title: 'fixture-book.epub',
      supportsImport: true
    }
  ],
  availability: 'available'
};

test('normalizeCatalogSourceSettingsInput trims metadata and coerces no-auth flags', () => {
  const normalized = normalizeCatalogSourceSettingsInput({
    id: '  my-catalog  ',
    kind: 'calibreOpds',
    title: '  My Catalog  ',
    baseUrl: '  fixture://calibre/root.xml  ',
    description: '  demo source  ',
    authKind: 'none',
    authLabel: '  ignored  ',
    authConfigured: false,
    authRequired: true,
    tags: ['  calibre ', '', ' opds  ']
  });

  assert.deepEqual(normalized, {
    id: 'my-catalog',
    kind: 'calibreOpds',
    title: 'My Catalog',
    baseUrl: 'fixture://calibre/root.xml',
    description: 'demo source',
    authKind: 'none',
    authLabel: 'ignored',
    authConfigured: true,
    authRequired: false,
    tags: ['calibre', 'opds']
  });
});

test('createCatalogImportIntent returns ready intent when acquisition link exists', () => {
  const intent = createCatalogImportIntent(fixtureSource, fixtureEntry, 123);

  assert.equal(intent.status, 'ready');
  assert.equal(intent.sourceId, 'fixture-opds');
  assert.equal(intent.entryId, 'entry-1');
  assert.equal(intent.fileNameHint, 'fixture-book.epub');
  assert.equal(intent.mediaType, 'application/epub+zip');
  assert.equal(intent.acquisitionHref, 'fixture://opds/files/fixture-book.epub');
  assert.equal(intent.createdAt, 123);
});

test('createCatalogImportIntent returns blocked intent when entry has no importable link', () => {
  const blockedEntry: CatalogEntry = {
    ...fixtureEntry,
    id: 'entry-2',
    links: [
      {
        rel: 'alternate',
        href: 'fixture://opds/books/two',
        mediaType: 'text/html',
        supportsImport: false
      }
    ]
  };

  const intent = createCatalogImportIntent(fixtureSource, blockedEntry, 456);

  assert.equal(intent.status, 'blocked');
  assert.equal(intent.sourceId, 'fixture-opds');
  assert.equal(intent.entryId, 'entry-2');
  assert.match(intent.blockedReason || '', /does not expose an importable acquisition link/i);
  assert.equal(intent.createdAt, 456);
});

test('importCatalogEntryToLibrary returns blocked result outside desktop runtime', async () => {
  const result = await importCatalogEntryToLibrary({
    sourceId: 'fixture-opds',
    entryId: 'entry-1',
    pageHref: 'fixture://opds/root.xml'
  });

  assert.equal(result.status, 'blocked');
  assert.match(result.message, /desktop runtime/i);
  assert.equal(result.firstReaderHref, '');
});
