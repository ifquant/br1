// Ownership: these tests pin pure workspace-mode decisions so route-level
// navigation can stay thin while URL override precedence remains explicit.

import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveReaderTranslatedTtsWorkspaceRequest } from './workspaceMode';
import type { ReaderRouteOpenState } from './route';

const createRouteOpenState = (
  overrides: Partial<ReaderRouteOpenState> = {}
): ReaderRouteOpenState => ({
  isWindowMode: false,
  pickerRequested: false,
  autoOpenKey: '',
  bookKey: '/books/sample.epub',
  target: null,
  workspaceMode: null,
  ttsReadAloudTextMode: null,
  translationTargetLanguage: null,
  translationProvider: null,
  translationHistoryEntryId: null,
  ...overrides
});

test('translated tts workspace request lets explicit route archive id beat selected archive state', () => {
  const request = resolveReaderTranslatedTtsWorkspaceRequest({
    routeOpenState: createRouteOpenState({
      workspaceMode: 'translation',
      translationHistoryEntryId: 'route-archive'
    }),
    translatedTtsSourceKind: 'archived-translation',
    selectedTranslationHistoryEntryId: 'selected-archive',
    currentTranslationTargetLanguage: 'en',
    currentTranslationProvider: 'yandex'
  });

  assert.equal(request.translatedOwner, 'archive');
  assert.equal(request.routeRequest.workspaceMode, 'tts');
  assert.equal(request.routeRequest.ttsReadAloudTextMode, 'translated');
  assert.equal(request.routeRequest.translationHistoryEntryId, 'route-archive');
});

test('translated tts workspace request falls back to selected archive when route archive is absent', () => {
  const request = resolveReaderTranslatedTtsWorkspaceRequest({
    routeOpenState: createRouteOpenState({
      workspaceMode: 'translation'
    }),
    translatedTtsSourceKind: 'archived-translation',
    selectedTranslationHistoryEntryId: 'selected-archive',
    currentTranslationTargetLanguage: 'zh',
    currentTranslationProvider: 'deepl'
  });

  assert.equal(request.translatedOwner, 'archive');
  assert.equal(request.routeRequest.workspaceMode, 'tts');
  assert.equal(request.routeRequest.ttsReadAloudTextMode, 'translated');
  assert.equal(request.routeRequest.translationHistoryEntryId, 'selected-archive');
});
