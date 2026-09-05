import assert from 'node:assert/strict';
import test from 'node:test';

import {
  READER_SHORTCUTS,
  assertReaderShortcutBindingsAreUnique,
  getReaderShortcutBindingLabel,
  resolveReaderKeyboardShortcut,
  resolveReaderMouseShortcut,
  type ReaderShortcutDefinition
} from './shortcuts.js';

const keyboardEvent = (
  key: string,
  modifiers: Partial<{
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
  }> = {}
) => ({
  key,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...modifiers
});

test('reader shortcut bindings stay conflict-free', () => {
  assert.doesNotThrow(() => assertReaderShortcutBindingsAreUnique(READER_SHORTCUTS));

  const duplicate: ReaderShortcutDefinition[] = [
    {
      action: 'toggle-bookmark',
      description: 'first',
      section: '通用',
      bindings: [{ kind: 'keyboard', key: '?', shift: true }]
    },
    {
      action: 'show-help',
      description: 'second',
      section: '通用',
      bindings: [{ kind: 'keyboard', key: '/', shift: true }]
    }
  ];

  assert.throws(
    () => assertReaderShortcutBindingsAreUnique(duplicate),
    /assigned to both toggle-bookmark and show-help/
  );
});

test('reader keyboard shortcuts require their exact modifiers', () => {
  assert.equal(
    resolveReaderKeyboardShortcut(keyboardEvent('b', { ctrlKey: true })),
    'toggle-bookmark'
  );
  assert.equal(
    resolveReaderKeyboardShortcut(keyboardEvent('B', { metaKey: true })),
    'toggle-bookmark'
  );
  assert.equal(
    resolveReaderKeyboardShortcut(keyboardEvent('?', { shiftKey: true })),
    'show-help'
  );
  assert.equal(
    resolveReaderKeyboardShortcut(keyboardEvent('/', { shiftKey: true })),
    'show-help'
  );
  assert.equal(
    resolveReaderKeyboardShortcut(keyboardEvent('p', { shiftKey: true })),
    'paragraph-focus'
  );
  assert.equal(
    resolveReaderKeyboardShortcut(keyboardEvent('r', { shiftKey: true })),
    'rsvp-lite'
  );
  assert.equal(resolveReaderKeyboardShortcut(keyboardEvent('b')), null);
});

test('reader navigation resolves keyboard arrows and mouse side buttons', () => {
  assert.equal(resolveReaderKeyboardShortcut(keyboardEvent('ArrowLeft')), 'previous-page');
  assert.equal(resolveReaderKeyboardShortcut(keyboardEvent('ArrowRight')), 'next-page');
  assert.equal(resolveReaderKeyboardShortcut(keyboardEvent('ArrowLeft'), true), 'next-page');
  assert.equal(resolveReaderKeyboardShortcut(keyboardEvent('ArrowRight'), true), 'previous-page');
  assert.equal(resolveReaderMouseShortcut(3), 'previous-page');
  assert.equal(resolveReaderMouseShortcut(4), 'next-page');
  assert.equal(resolveReaderMouseShortcut(2), null);
});

test('reader shortcut labels adapt the primary key by platform', () => {
  const bookmarkBinding = READER_SHORTCUTS.find(
    (shortcut) => shortcut.action === 'toggle-bookmark'
  )?.bindings[0];
  assert.ok(bookmarkBinding);
  assert.equal(getReaderShortcutBindingLabel(bookmarkBinding, false), 'Ctrl+B');
  assert.equal(getReaderShortcutBindingLabel(bookmarkBinding, true), 'Cmd+B');

  const previousBinding = READER_SHORTCUTS.find(
    (shortcut) => shortcut.action === 'previous-page'
  )?.bindings.find((binding) => binding.kind === 'keyboard');
  const nextBinding = READER_SHORTCUTS.find(
    (shortcut) => shortcut.action === 'next-page'
  )?.bindings.find((binding) => binding.kind === 'keyboard');
  assert.ok(previousBinding);
  assert.ok(nextBinding);
  assert.equal(getReaderShortcutBindingLabel(previousBinding, false, true), '→');
  assert.equal(getReaderShortcutBindingLabel(nextBinding, false, true), '←');
});
