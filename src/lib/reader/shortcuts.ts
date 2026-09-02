export type ReaderShortcutAction =
  | 'show-help'
  | 'toggle-bookmark'
  | 'paragraph-focus'
  | 'rsvp-lite'
  | 'previous-page'
  | 'next-page';

export type ReaderKeyboardShortcutBinding = {
  kind: 'keyboard';
  key: string;
  shift?: true;
  primary?: true;
};

export type ReaderMouseShortcutBinding = {
  kind: 'mouse';
  button: 3 | 4;
};

export type ReaderShortcutBinding =
  | ReaderKeyboardShortcutBinding
  | ReaderMouseShortcutBinding;

export type ReaderShortcutDefinition = {
  action: ReaderShortcutAction;
  description: string;
  section: '通用' | '导航' | '专注阅读';
  bindings: readonly ReaderShortcutBinding[];
};

export const READER_SHORTCUTS: readonly ReaderShortcutDefinition[] = [
  {
    action: 'show-help',
    description: '显示快捷键帮助',
    section: '通用',
    bindings: [{ kind: 'keyboard', key: '?', shift: true }]
  },
  {
    action: 'toggle-bookmark',
    description: '添加或移除书签',
    section: '通用',
    bindings: [{ kind: 'keyboard', key: 'b', primary: true }]
  },
  {
    action: 'previous-page',
    description: '上一页',
    section: '导航',
    bindings: [
      { kind: 'keyboard', key: 'ArrowLeft' },
      { kind: 'mouse', button: 3 }
    ]
  },
  {
    action: 'next-page',
    description: '下一页',
    section: '导航',
    bindings: [
      { kind: 'keyboard', key: 'ArrowRight' },
      { kind: 'mouse', button: 4 }
    ]
  },
  {
    action: 'paragraph-focus',
    description: '打开段落聚焦',
    section: '专注阅读',
    bindings: [{ kind: 'keyboard', key: 'p', shift: true }]
  },
  {
    action: 'rsvp-lite',
    description: '打开 RSVP-lite',
    section: '专注阅读',
    bindings: [{ kind: 'keyboard', key: 'r', shift: true }]
  }
];

const normalizeKey = (key: string, shift = false) => {
  const normalizedKey = key === '/' && shift ? '?' : key;
  return normalizedKey.length === 1 ? normalizedKey.toLowerCase() : normalizedKey;
};

const getBindingConflictKey = (binding: ReaderShortcutBinding) =>
  binding.kind === 'mouse'
    ? `mouse:${binding.button}`
    : `keyboard:${binding.primary ? 'primary+' : ''}${binding.shift ? 'shift+' : ''}${normalizeKey(binding.key, binding.shift)}`;

export const assertReaderShortcutBindingsAreUnique = (
  shortcuts: readonly ReaderShortcutDefinition[]
) => {
  const owners = new Map<string, ReaderShortcutAction>();
  for (const shortcut of shortcuts) {
    for (const binding of shortcut.bindings) {
      const conflictKey = getBindingConflictKey(binding);
      const existingOwner = owners.get(conflictKey);
      if (existingOwner) {
        throw new Error(
          `Reader shortcut ${conflictKey} is assigned to both ${existingOwner} and ${shortcut.action}`
        );
      }
      owners.set(conflictKey, shortcut.action);
    }
  }
};

assertReaderShortcutBindingsAreUnique(READER_SHORTCUTS);

type ReaderKeyboardShortcutEvent = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'
>;

export const resolveReaderKeyboardShortcut = (
  event: ReaderKeyboardShortcutEvent
): ReaderShortcutAction | null => {
  // Keyboard layouts differ on whether Shift+/ reports "/" or "?".
  const normalizedKey = normalizeKey(event.key, event.shiftKey);
  for (const shortcut of READER_SHORTCUTS) {
    for (const binding of shortcut.bindings) {
      if (
        binding.kind !== 'keyboard' ||
        normalizeKey(binding.key, binding.shift) !== normalizedKey
      ) {
        continue;
      }
      if (!!binding.shift !== event.shiftKey || event.altKey) continue;
      const hasPrimaryModifier = event.ctrlKey || event.metaKey;
      if (!!binding.primary !== hasPrimaryModifier) continue;
      return shortcut.action;
    }
  }
  return null;
};

export const resolveReaderMouseShortcut = (button: number): ReaderShortcutAction | null => {
  for (const shortcut of READER_SHORTCUTS) {
    if (shortcut.bindings.some((binding) => binding.kind === 'mouse' && binding.button === button)) {
      return shortcut.action;
    }
  }
  return null;
};

export const getReaderShortcutBindingLabel = (
  binding: ReaderShortcutBinding,
  isMac: boolean
) => {
  if (binding.kind === 'mouse') {
    return binding.button === 3 ? '鼠标后退键' : '鼠标前进键';
  }

  const parts: string[] = [];
  if (binding.primary) parts.push(isMac ? 'Cmd' : 'Ctrl');
  if (binding.shift) parts.push('Shift');
  const keyLabel =
    binding.key === 'ArrowLeft'
      ? '←'
      : binding.key === 'ArrowRight'
        ? '→'
        : binding.key.toUpperCase();
  parts.push(keyLabel);
  return parts.join('+');
};
