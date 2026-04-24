import assert from 'node:assert/strict';
import test from 'node:test';

import { XCFI, isKoReaderXPointer, normalizeProgressXPointer } from './xcfi.js';

test('XCFI extracts spine index from EPUB CFI values', () => {
  assert.equal(XCFI.extractSpineIndex('epubcfi(/6/2!/4/2)'), 0);
  assert.equal(XCFI.extractSpineIndex('epubcfi(/6/8!/4/2/6)'), 3);
});

test('XCFI extracts spine index from KOReader XPointers', () => {
  assert.equal(XCFI.extractSpineIndex('/body/DocFragment[1]/body/p[3]'), 0);
  assert.equal(XCFI.extractSpineIndex('/body/DocFragment[5]/body/section[2]/p/text().4'), 4);
});

test('KOReader XPointer helper only accepts CREngine locator roots', () => {
  assert.equal(isKoReaderXPointer('/body/DocFragment[2]/body/section[1]'), true);
  assert.equal(isKoReaderXPointer('epubcfi(/6/2!/4/2)'), false);
  assert.equal(isKoReaderXPointer('txt:0.500000'), false);
});

test('KOReader progress XPointer normalization trims unstable text offsets', () => {
  assert.equal(
    normalizeProgressXPointer('/body/DocFragment[2]/body/p/text().14'),
    '/body/DocFragment[2]/body/p'
  );
  assert.equal(
    normalizeProgressXPointer('/body/DocFragment[2]/body/p[3].18'),
    '/body/DocFragment[2]/body/p[3]'
  );
  assert.equal(
    normalizeProgressXPointer('/body/DocFragment[2]/body/section[4]/p[2]'),
    '/body/DocFragment[2]/body/section[4]/p[2]'
  );
});
