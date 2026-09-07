// Test setup is explicit here because sync and persistence bugs usually come
// from mixing local state, remote state, and retry metadata in the wrong order.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReaderParallelSessionFromRoute,
  updateReaderParallelPaneControlRequest
} from '../reader/parallel.js';
import { parseReaderRouteOpenState, toReaderOpenControlRequest } from '../reader/route.js';
import type { PersistedLibraryBook } from './libraryPersistence.js';
import { toLibraryReaderTarget } from './libraryPersistence.js';

const fixtureBook: PersistedLibraryBook = {
  id: 'book-1',
  title: 'Fixture',
  author: 'Reader',
  format: 'EPUB',
  description: null,
  language: 'en',
  publisher: null,
  collection: null,
  tags: [],
  progress: '55%',
  status: '阅读中',
  filePath: '/library/fixture.epub',
  coverPath: null,
  sourcePath: '/imports/fixture.epub',
  importedAt: 1700000000000,
  progressFraction: 0.55,
  progressLocation: 'epubcfi(/6/2!/4/2)',
  koreaderProgressLocation: null,
  lastOpenedAt: 1700000005000,
  libraryFileExists: true,
  sourceFileExists: true
};

test('library reader target prefers a synced KOReader CFI over stale progressLocation', () => {
  const target = toLibraryReaderTarget({
    ...fixtureBook,
    progressLocation: 'epubcfi(/6/2!/4/2)',
    koreaderProgressLocation: 'epubcfi(/6/8!/4/2)'
  });

  assert.equal(target.kind, 'library-file');
  if (target.kind !== 'library-file') {
    throw new Error('Expected a library-file target');
  }
  assert.equal(target.restoreLocation, 'epubcfi(/6/8!/4/2)');
  assert.match(target.href, /location=epubcfi%28%2F6%2F8%21%2F4%2F2%29/);
});

test('library reader target falls back to fraction when the synced KOReader locator is not directly restorable', () => {
  const target = toLibraryReaderTarget({
    ...fixtureBook,
    progressFraction: 0.72,
    progressLocation: 'epubcfi(/6/2!/4/2)',
    koreaderProgressLocation: '/body/DocFragment[9]/body/div/p[8]'
  });

  assert.equal(target.kind, 'library-file');
  if (target.kind !== 'library-file') {
    throw new Error('Expected a library-file target');
  }
  assert.equal(target.restoreLocation, undefined);
  assert.equal(target.restoreFraction, 0.72);
  assert.doesNotMatch(target.href, /location=/);
  assert.match(target.href, /fraction=0.72/);
});

test('library reader target carries the selected local progress origin through its route URL', () => {
  const target = toLibraryReaderTarget({
    ...fixtureBook,
    progressLocationOrigin: 'future-renderer-v9'
  });

  assert.equal(target.kind, 'library-file');
  if (target.kind !== 'library-file') throw new Error('Expected a library-file target');
  assert.equal(target.restoreLocationOrigin, 'future-renderer-v9');

  const parsed = parseReaderRouteOpenState(new URL(target.href, 'https://br1.test'));
  assert.equal(parsed.target?.kind, 'library-file');
  assert.equal(
    parsed.target?.kind === 'library-file' ? parsed.target.restoreLocationOrigin : undefined,
    'future-renderer-v9'
  );
  assert.match(parsed.autoOpenKey, /"future-renderer-v9"/);

  const empty = toLibraryReaderTarget({ ...fixtureBook, progressLocationOrigin: '' });
  const absent = toLibraryReaderTarget(fixtureBook);
  assert.equal(empty.kind, 'library-file');
  if (empty.kind !== 'library-file') throw new Error('Expected a library-file target');
  assert.equal(absent.kind, 'library-file');
  if (absent.kind !== 'library-file') throw new Error('Expected a library-file target');
  assert.equal(empty.restoreLocationOrigin, '');
  assert.equal(new URL(empty.href, 'https://br1.test').searchParams.has('locationOrigin'), true);
  assert.notEqual(
    parseReaderRouteOpenState(new URL(empty.href, 'https://br1.test')).autoOpenKey,
    parseReaderRouteOpenState(new URL(absent.href, 'https://br1.test')).autoOpenKey
  );
});

test('library reader target keeps KOReader precedence but treats its selected location as unknown', () => {
  const target = toLibraryReaderTarget({
    ...fixtureBook,
    progressLocationOrigin: 'br1-epub-rendered-v1',
    koreaderProgressLocation: 'epubcfi(/6/8!/4/2)'
  });

  assert.equal(target.kind, 'library-file');
  if (target.kind !== 'library-file') throw new Error('Expected a library-file target');
  assert.equal(target.restoreLocation, 'epubcfi(/6/8!/4/2)');
  assert.equal(target.restoreLocationOrigin, undefined);
  assert.doesNotMatch(target.href, /locationOrigin=/);
});

test('library reader restart and PDF targets suppress progress provenance', () => {
  const restart = toLibraryReaderTarget({
    ...fixtureBook,
    progressLocationOrigin: 'br1-epub-rendered-v1'
  }, { restart: true });
  const pdf = toLibraryReaderTarget({
    ...fixtureBook,
    format: 'PDF',
    progressLocation: 'Page 3 / 20',
    progressLocationOrigin: 'br1-epub-rendered-v1'
  });

  assert.equal(restart.kind, 'library-file');
  assert.equal(restart.restoreLocation, undefined);
  assert.equal(restart.restoreLocationOrigin, undefined);
  assert.doesNotMatch(restart.href, /location(?:Origin)?=/);
  assert.equal(pdf.kind, 'library-file');
  assert.equal(pdf.restoreLocationOrigin, undefined);
  assert.doesNotMatch(pdf.href, /locationOrigin=/);
});

test('parallel control reconstruction retains only an equivalent route target origin', () => {
  const target = toLibraryReaderTarget({
    ...fixtureBook,
    progressLocationOrigin: 'br1-epub-rendered-v1'
  });
  assert.equal(target.kind, 'library-file');
  if (target.kind !== 'library-file') throw new Error('Expected a library-file target');

  const routeState = parseReaderRouteOpenState(new URL(target.href, 'https://br1.test'));
  const session = createReaderParallelSessionFromRoute(routeState);
  assert.equal(session.panes.primary.openTarget?.kind, 'library-file');
  if (session.panes.primary.openTarget?.kind !== 'library-file') {
    throw new Error('Expected a primary library target');
  }
  assert.equal(session.panes.primary.openTarget.restoreLocationOrigin, 'br1-epub-rendered-v1');

  const request = toReaderOpenControlRequest(session.panes.primary.openTarget, 1);
  const echoed = updateReaderParallelPaneControlRequest(session, 'primary', request);
  assert.equal(echoed.panes.primary.openTarget?.kind, 'library-file');
  assert.equal(
    echoed.panes.primary.openTarget?.kind === 'library-file'
      ? echoed.panes.primary.openTarget.restoreLocationOrigin
      : undefined,
    'br1-epub-rendered-v1'
  );

  for (const changedRequest of [
    { ...request, path: '/library/other.epub' },
    { ...request, label: 'Other Fixture' },
    { ...request, restoreLocation: 'epubcfi(/6/4!/4/2)' },
    { ...request, restoreFraction: 0.72 }
  ]) {
    const changed = updateReaderParallelPaneControlRequest(session, 'primary', changedRequest);
    assert.equal(changed.panes.primary.openTarget?.kind, 'library-file');
    assert.equal(
      changed.panes.primary.openTarget?.kind === 'library-file'
        ? changed.panes.primary.openTarget.restoreLocationOrigin
        : undefined,
      undefined
    );
  }
});
