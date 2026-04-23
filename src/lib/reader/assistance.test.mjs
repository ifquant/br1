import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeReaderAssistanceRequest } from './assistance.ts';

test('normalizeReaderAssistanceRequest trims lookup requests', () => {
  const request = normalizeReaderAssistanceRequest({
    kind: 'lookup',
    provider: 'wikipedia',
    term: '  Alpha   Beta  ',
    language: '  en-US  ',
    bookKey: '  demo-book  ',
    cfi: '  epubcfi(/6/2)  ',
    chapterLabel: '  Chapter 1  '
  });

  assert.deepEqual(request, {
    kind: 'lookup',
    provider: 'wikipedia',
    term: 'Alpha Beta',
    language: 'en-US',
    bookKey: 'demo-book',
    cfi: 'epubcfi(/6/2)',
    chapterLabel: 'Chapter 1'
  });
});

test('normalizeReaderAssistanceRequest trims translation requests and clears blank optional fields', () => {
  const request = normalizeReaderAssistanceRequest({
    kind: 'translation',
    provider: 'deepl',
    text: '  first line \n\n second line  ',
    sourceLanguage: '   ',
    targetLanguage: ' zh ',
    bookKey: '  demo-book  ',
    cfi: '   ',
    chapterLabel: '  Current Chapter  '
  });

  assert.deepEqual(request, {
    kind: 'translation',
    provider: 'deepl',
    text: 'first line second line',
    sourceLanguage: undefined,
    targetLanguage: 'zh',
    bookKey: 'demo-book',
    cfi: undefined,
    chapterLabel: 'Current Chapter'
  });
});
