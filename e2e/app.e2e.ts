import { statSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('br1 desktop app', () => {
  const startupAssociatedBookPath = process.env.BR1_TEST_ASSOCIATED_FILE_PATH ?? '';
  const appDataRoot = join(homedir(), 'Library/Application Support', 'com.tauri-app.br1');
  const readerSearchRoot = join(appDataRoot, 'reader-search');
  const staticSamplesRoot = join(process.cwd(), 'static', 'samples');

  const readerSearchCacheComponentKey = (value: string) => createHash('sha256').update(value).digest('hex');

  const buildReaderSearchCacheBookKey = async (filePath: string) => {
    const metadata = await stat(filePath);
    return `${filePath}:${metadata.size}:${Math.trunc(metadata.mtimeMs)}`;
  };

  const readerSearchCacheFilePath = (bookKey: string, cacheKey: string) =>
    join(
      readerSearchRoot,
      readerSearchCacheComponentKey(bookKey),
      `${readerSearchCacheComponentKey(cacheKey)}.json`
    );

  const clearReaderSearchCacheOnDisk = async (bookKey: string) => {
    await rm(join(readerSearchRoot, readerSearchCacheComponentKey(bookKey)), { recursive: true, force: true });
  };

  const loadLibraryRecordOnDisk = async (filePath: string) => {
    const libraryFile = join(appDataRoot, 'library', 'library.json');
    const raw = await readFile(libraryFile, 'utf8');
    const records = JSON.parse(raw) as Array<{
      title?: string;
      author?: string;
      progress?: string;
      status?: string;
      coverPath?: string | null;
      cover_path?: string | null;
      description?: string | null;
      language?: string | null;
      publisher?: string | null;
      collection?: string | null;
      filePath?: string;
      file_path?: string;
      progressFraction?: number | null;
      progressLocation?: string | null;
      lastOpenedAt?: number | null;
    }>;

    return (
      records.find((record) => (record.filePath ?? record.file_path ?? '') === filePath) ?? null
    );
  };

  const pathExists = async (filePath: string) => {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const loadLibraryRecordBySourcePathOnDisk = async (sourcePath: string) => {
    const libraryFile = join(appDataRoot, 'library', 'library.json');
    const raw = await readFile(libraryFile, 'utf8');
    const records = JSON.parse(raw) as Array<{
      title?: string;
      author?: string;
      progress?: string;
      status?: string;
      coverPath?: string | null;
      cover_path?: string | null;
      description?: string | null;
      language?: string | null;
      publisher?: string | null;
      filePath?: string;
      file_path?: string;
      sourcePath?: string;
      source_path?: string;
      progressFraction?: number | null;
      progressLocation?: string | null;
      lastOpenedAt?: number | null;
    }>;

    return (
      records.find((record) => (record.sourcePath ?? record.source_path ?? '') === sourcePath) ?? null
    );
  };

  const loadLibraryCoverDataUrl = async (coverPath: string) => {
    const result = await browser.executeAsync((path, done) => {
      const tauriInternals = (window as typeof window & {
        __TAURI_INTERNALS__?: {
          invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      }).__TAURI_INTERNALS__;

      if (typeof tauriInternals?.invoke !== 'function') {
        done('');
        return;
      }

      tauriInternals
        .invoke('load_library_cover_data_urls', {
          coverPaths: [path]
        })
        .then((result) => {
          done(Array.isArray(result) ? (result[0] ?? '') : '');
        })
        .catch(() => done(''));
    }, coverPath);

    return typeof result === 'string' ? result : '';
  };

  const readLibraryProgressBadgeForTitle = async (title: string) =>
    browser.execute((expectedTitle) => {
      const rows = Array.from(document.querySelectorAll('.continue-shelf .row, .shelf .book-card, .bookshelf .book-card, .bookshelf .book-list-row'));
      for (const row of rows) {
        const text = row.textContent ?? '';
        if (!text.includes(expectedTitle)) continue;
        const progressBadge = row.querySelector('.progress-pill, .meta-pill');
        const value = progressBadge?.textContent?.trim() ?? '';
        if (value) return value;
      }
      return '';
    }, title);

  const loadLibraryRecordsOnDisk = async () => {
    const libraryFile = join(appDataRoot, 'library', 'library.json');
    const raw = await readFile(libraryFile, 'utf8');
    return JSON.parse(raw) as Array<{
      title?: string;
      filePath?: string;
      file_path?: string;
      progressFraction?: number | null;
      progressLocation?: string | null;
      lastOpenedAt?: number | null;
    }>;
  };

  const updateLibraryRecordOnDiskByTitle = async (
    title: string,
    updater: (record: Record<string, unknown>) => Record<string, unknown>
  ) => {
    const libraryFile = join(appDataRoot, 'library', 'library.json');
    const raw = await readFile(libraryFile, 'utf8');
    const records = JSON.parse(raw) as Array<Record<string, unknown>>;
    const index = records.findIndex((record) => (record.title as string | undefined) === title);
    if (index < 0) {
      throw new Error(`expected to find library record for ${title}`);
    }

    records[index] = updater(records[index]!);
    await writeFile(libraryFile, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  };

  const readerNotesFilePath = (bookKey: string) => {
    const safeKey = createHash('sha256').update(bookKey).digest('hex');
    return join(appDataRoot, 'reader-notes', `${safeKey}.json`);
  };

  const readerHighlightsWorkspaceFilePath = (bookKey: string) => {
    const safeKey = createHash('sha256').update(bookKey).digest('hex');
    return join(appDataRoot, 'reader-highlights-workspace', `${safeKey}.json`);
  };

  const loadReaderNotesOnDisk = async (bookKey: string) => {
    const notesFile = readerNotesFilePath(bookKey);
    const raw = await readFile(notesFile, 'utf8');
    const parsed = JSON.parse(raw) as {
      notes?: Array<{
        id?: string;
        kind?: string;
        cfi?: string;
        text?: string;
        note?: string;
      }>;
    };
    return parsed.notes ?? [];
  };

  const clearReaderHighlightsWorkspaceStateOnDisk = async (bookKey: string) => {
    await rm(readerHighlightsWorkspaceFilePath(bookKey), { force: true });
  };

  const clickAnnotationKindFilter = async (label: '全部类型' | '高亮' | '笔记') => {
    await browser.execute((targetLabel) => {
      const container = document.querySelector('[aria-label="annotation kind filter controls"]');
      if (!(container instanceof HTMLElement)) {
        throw new Error('expected annotation kind filter controls to exist');
      }

      const buttons = Array.from(container.querySelectorAll('button'));
      const target = buttons.find((button) => button.textContent?.trim() === targetLabel);
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error(`expected to find annotation kind filter button: ${targetLabel}`);
      }

      target.click();
    }, label);
  };

  const clickReaderSidebarTab = async (label: '目录' | '搜索' | '书签' | '高亮' | '笔记') => {
    await browser.execute((targetLabel) => {
      const tablist = document.querySelector('[role="tablist"][aria-label="reader sidebar tabs"]');
      if (!(tablist instanceof HTMLElement)) {
        throw new Error('expected reader sidebar tabs to exist');
      }

      const tabs = Array.from(tablist.querySelectorAll('button[role="tab"]'));
      const target = tabs.find((button) => button.textContent?.trim() === targetLabel);
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error(`expected to find reader sidebar tab: ${targetLabel}`);
      }

      target.click();
    }, label);
  };

  const bulkDeleteVisibleHighlightsInWorkspace = async () => {
    await browser.execute(() => {
      window.confirm = () => true;
      const panel = document.querySelector('[aria-label="highlights panel preview"]');
      if (!(panel instanceof HTMLElement)) {
        throw new Error('expected highlights panel preview to exist');
      }

      const buttons = Array.from(panel.querySelectorAll('button'));
      const target = buttons.find((button) => button.textContent?.trim() === '删除当前视图高亮');
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected highlights bulk delete button to exist');
      }

      target.click();
    });
  };

  const deleteSelectedHighlightsInWorkspace = async () => {
    await browser.execute(() => {
      window.confirm = () => true;
      const panel = document.querySelector('[aria-label="highlights panel preview"]');
      if (!(panel instanceof HTMLElement)) {
        throw new Error('expected highlights panel preview to exist');
      }

      const buttons = Array.from(panel.querySelectorAll('button'));
      const target = buttons.find((button) => button.textContent?.trim() === '删除选中高亮');
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected highlights selected-delete button to exist');
      }

      target.click();
    });
  };

  const invertVisibleHighlightsSelectionInWorkspace = async () => {
    await browser.execute(() => {
      const panel = document.querySelector('[aria-label="highlights panel preview"]');
      if (!(panel instanceof HTMLElement)) {
        throw new Error('expected highlights panel preview to exist');
      }

      const buttons = Array.from(panel.querySelectorAll('button'));
      const target = buttons.find((button) => button.textContent?.trim() === '反选当前视图高亮');
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected highlights invert-selection button to exist');
      }

      target.click();
    });
  };

  const clickHighlightGroupAction = async (
    label: '选中本组高亮' | '清空本组选择' | '反选本组高亮' | '删除本组高亮'
  ) => {
    await browser.execute((targetLabel) => {
      const panel = document.querySelector('[aria-label="highlights panel preview"]');
      if (!(panel instanceof HTMLElement)) {
        throw new Error('expected highlights panel preview to exist');
      }

      const buttons = Array.from(panel.querySelectorAll('button'));
      const target = buttons.find((button) => button.textContent?.trim() === targetLabel);
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error(`expected highlight group action button to exist: ${targetLabel}`);
      }

      target.click();
    }, label);
  };

  const clickHighlightsSortControl = async (label: '最近添加' | '最早添加') => {
    await browser.execute((targetLabel) => {
      const controls = document.querySelector('[aria-label="highlights sort controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights sort controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === targetLabel
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error(`expected the highlights sort button to exist: ${targetLabel}`);
      }
      target.click();
    }, label);
  };

  const toggleFirstHighlightSelection = async () => {
    await browser.execute(() => {
      const firstToggle = document.querySelector('.highlight-selection-toggle');
      if (!(firstToggle instanceof HTMLButtonElement)) {
        throw new Error('expected the first highlight selection toggle to exist');
      }
      firstToggle.click();
    });
  };

  const sampleLibraryFormats = [
    {
      fileName: 'sample-book.fb2',
      format: 'FB2',
      expectedLabel: 'FB2',
      expectedLayout: 'PAGINATED',
      title: 'Sample FB2 Book'
    },
    {
      fileName: 'sample-book.mobi',
      format: 'MOBI',
      expectedLabel: 'MOBI',
      expectedLayout: 'PAGINATED',
      title: 'Sample MOBI Book'
    },
    {
      fileName: 'sample-book.azw3',
      format: 'AZW3',
      expectedLabel: 'AZW3',
      expectedLayout: 'PAGINATED',
      title: 'Sample AZW3 Book'
    },
    {
      fileName: 'sample-comic.cbz',
      format: 'CBZ',
      expectedLabel: 'CBZ',
      expectedLayout: 'FIXED',
      title: 'Sample CBZ Book'
    },
    {
      fileName: 'sample-book.txt',
      format: 'TXT',
      expectedLabel: 'TXT',
      expectedLayout: 'SCROLL',
      title: 'sample-book'
    }
  ] as const;

  const importDesktopLibraryBooks = async (sourcePaths: string[]) => {
    const imported = await browser.executeAsync((filePaths, done) => {
      const tauriInternals = (window as typeof window & {
        __TAURI_INTERNALS__?: {
          invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      }).__TAURI_INTERNALS__;

      if (typeof tauriInternals?.invoke !== 'function') {
        done({
          ok: false,
          error: 'expected window.__TAURI_INTERNALS__.invoke to exist in the desktop webview'
        });
        return;
      }

      tauriInternals
        .invoke('import_library_books', {
          filePaths
        })
        .then((result) => {
          if (!Array.isArray(result)) {
            done({
              ok: false,
              error: `expected import_library_books to return an array, received ${JSON.stringify(result)}`
            });
            return;
          }

          done({
            ok: true,
            result
          });
        })
        .catch((error) => {
          done({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          });
        });
    }, sourcePaths);

    if (!imported?.ok || !Array.isArray(imported.result)) {
      throw new Error(imported?.error ?? 'expected import_library_books to return a result array');
    }

    return imported.result.map((record) => ({
      title: record.title,
      format: record.format,
      filePath: record.filePath ?? record.file_path ?? '',
      sourcePath: record.sourcePath ?? record.source_path ?? ''
    }));
  };

  const importDesktopSampleLibraryBooks = async () => {
    const sourcePaths = sampleLibraryFormats.map((sample) => join(staticSamplesRoot, sample.fileName));
    return importDesktopLibraryBooks(sourcePaths);
  };

  const removeDesktopLibraryBook = async (filePath: string) => {
    const result = await browser.executeAsync((path, done) => {
      const tauriInternals = (window as typeof window & {
        __TAURI_INTERNALS__?: {
          invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      }).__TAURI_INTERNALS__;

      if (typeof tauriInternals?.invoke !== 'function') {
        done({
          ok: false,
          error: 'expected window.__TAURI_INTERNALS__.invoke to exist in the desktop webview'
        });
        return;
      }

      tauriInternals
        .invoke('remove_library_book', {
          filePath: path
        })
        .then(() => {
          done({ ok: true });
        })
        .catch((error) => {
          done({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          });
        });
    }, filePath);

    if (!result?.ok) {
      throw new Error(result?.error ?? 'expected remove_library_book to succeed');
    }
  };

  const updateDesktopLibraryBookMetadata = async (
    recordId: string,
    metadata: {
      title: string;
      author: string;
      description?: string | null;
      language?: string | null;
      publisher?: string | null;
    }
  ) => {
    const result = await browser.executeAsync(([id, nextMetadata], done) => {
      const tauriInternals = (window as typeof window & {
        __TAURI_INTERNALS__?: {
          invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      }).__TAURI_INTERNALS__;

      if (typeof tauriInternals?.invoke !== 'function') {
        done({
          ok: false,
          error: 'expected window.__TAURI_INTERNALS__.invoke to exist in the desktop webview'
        });
        return;
      }

      tauriInternals
        .invoke('update_library_book_metadata', {
          recordId: id,
          title: nextMetadata.title,
          author: nextMetadata.author,
          description: nextMetadata.description ?? '',
          language: nextMetadata.language ?? '',
          publisher: nextMetadata.publisher ?? '',
          collection: nextMetadata.collection ?? ''
        })
        .then(() => {
          done({ ok: true });
        })
        .catch((error) => {
          done({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          });
        });
    }, [recordId, metadata] as const);

    if (!result?.ok) {
      throw new Error(result?.error ?? 'expected update_library_book_metadata to succeed');
    }
  };

  const previewDesktopLibraryRepairCandidate = async (
    filePath: string,
    expectedFormat: string,
    expectedTitle: string,
    expectedAuthor: string,
    expectedSourcePath?: string
  ) => {
    const result = await browser.executeAsync((args, done) => {
      const tauriInternals = (window as typeof window & {
        __TAURI_INTERNALS__?: {
          invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      }).__TAURI_INTERNALS__;

      if (typeof tauriInternals?.invoke !== 'function') {
        done({
          ok: false,
          error: 'expected window.__TAURI_INTERNALS__.invoke to exist in the desktop webview'
        });
        return;
      }

      tauriInternals
        .invoke('preview_library_repair_candidate', args)
        .then((preview) => {
          done({ ok: true, preview });
        })
        .catch((error) => {
          done({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          });
        });
    }, { filePath, expectedFormat, expectedTitle, expectedAuthor, expectedSourcePath });

    if (!result?.ok || !result.preview) {
      throw new Error(result?.error ?? 'expected preview_library_repair_candidate to succeed');
    }

    return result.preview as {
      filePath: string;
      fileName: string;
      format: string;
      title: string;
      author: string;
      byteSize?: number | null;
      sha256?: string | null;
      formatMatches: boolean;
      titleMatches: boolean;
      authorMatches: boolean;
      sourcePathMatches: boolean;
      sourceHashMatches: boolean;
      fileExists: boolean;
    };
  };

  const queueAssociatedBookOpenRequests = async (filePaths: string[]) => {
    const result = await browser.executeAsync((paths, done) => {
      const tauriInternals = (window as typeof window & {
        __TAURI_INTERNALS__?: {
          invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      }).__TAURI_INTERNALS__;

      if (typeof tauriInternals?.invoke !== 'function') {
        done({
          ok: false,
          error: 'expected window.__TAURI_INTERNALS__.invoke to exist in the desktop webview'
        });
        return;
      }

      tauriInternals
        .invoke('queue_associated_book_open_requests', {
          filePaths: paths
        })
        .then((count) => {
          done({ ok: true, count });
        })
        .catch((error) => {
          done({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          });
        });
    }, filePaths);

    if (!result?.ok) {
      throw new Error(result?.error ?? 'expected queue_associated_book_open_requests to succeed');
    }

    return result.count as number;
  };

  const nudgeReaderForward = async () => {
    const details = await readReaderDetails();
    if (details.formatLabel === 'TXT') {
      const nextButton = await $('[aria-label="Next page"]');
      await nextButton.waitForDisplayed({ timeout: 10000 });
      await nextButton.click();
      await browser.pause(200);
      return (await readReaderDetails()).progressFraction;
    }

    return browser.execute(async () => {
      const view = document.querySelector('foliate-view') as
        | (HTMLElement & {
            next?: () => Promise<void>;
            lastLocation?: { fraction?: number };
          })
        | null;

      if (view?.next) {
        await view.next();
        return view.lastLocation?.fraction ?? null;
      }

      const plainTextSurface = document.querySelector('.plain-text-surface') as HTMLElement | null;
      const progressInput = document.querySelector(
        '[aria-label="reader progress preview"] input[type="range"]'
      ) as HTMLInputElement | null;
      if (!plainTextSurface || !progressInput) return null;

      const nextValue = Math.min(100, Number(progressInput.value || '0') + 35);
      progressInput.value = String(nextValue);
      progressInput.dispatchEvent(new Event('input', { bubbles: true }));
      progressInput.dispatchEvent(new Event('change', { bubbles: true }));
      return nextValue / 100;
    });
  };

  const advanceReaderBeyond = async (
    openedDetails: Awaited<ReturnType<typeof readReaderDetails>>,
    description: string
  ) => {
    const openedFraction = openedDetails.progressFraction ?? 0;
    const openedCfi = openedDetails.cfi ?? '';
    const openedLocationLabel = openedDetails.locationLabel ?? '';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await nudgeReaderForward();
      await browser.pause(250);

      const details = await readReaderDetails();
      if (details.stageError) {
        throw new Error(details.stageError);
      }

      const moved =
        (details.progressFraction ?? 0) > openedFraction ||
        (!!details.cfi && details.cfi !== openedCfi) ||
        (!!details.locationLabel &&
          details.locationLabel !== 'Opening book' &&
          details.locationLabel !== openedLocationLabel);

      if (moved) {
        return details;
      }
    }

    const finalDetails = await readReaderDetails();
    throw new Error(
      `expected ${description} to advance beyond its initial reader state\nOpened details: ${JSON.stringify(
        openedDetails
      )}\nCurrent reader: ${JSON.stringify(finalDetails)}`
    );
  };

  const seedReaderSearchCacheOnDisk = async (
    bookKey: string,
    cacheKey: string,
    results: Array<{
      cfi: string;
      label: string;
      excerpt: { pre: string; match: string; post: string };
    }>
  ) => {
    const cacheFile = readerSearchCacheFilePath(bookKey, cacheKey);
    await mkdir(join(readerSearchRoot, readerSearchCacheComponentKey(bookKey)), { recursive: true });
    const now = Date.now();
    await writeFile(
      cacheFile,
      JSON.stringify({
        schemaVersion: 1,
        savedAt: now,
        lastAccessedAt: now,
        expiresAt: now + 1000 * 60 * 60 * 24 * 7,
        results
      }),
      'utf8'
    );
  };

  const loadReaderSearchCacheOnDisk = async (bookKey: string, cacheKey: string) => {
    const cacheFile = readerSearchCacheFilePath(bookKey, cacheKey);
    const raw = await readFile(cacheFile, 'utf8');
    return JSON.parse(raw) as {
      schemaVersion: number;
      savedAt: number;
      lastAccessedAt: number;
      expiresAt: number;
      results: Array<{
        cfi: string;
        label: string;
        excerpt: { pre: string; match: string; post: string };
      }>;
    };
  };

  const switchToLibraryWindow = async () => {
    let libraryHandle = '';

    await browser.waitUntil(async () => {
      const handles = await browser.getWindowHandles();

      for (const handle of handles) {
        try {
          await browser.switchToWindow(handle);
          const libraryPage = await $('.library-page');
          if (await libraryPage.isExisting()) {
            libraryHandle = handle;
            return true;
          }
        } catch {
          continue;
        }
      }

      return false;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected at least one library window to remain open'
    });

    return libraryHandle;
  };

  const openReaderFromBook = async (book: WebdriverIO.Element) => {
    const initialHandles = await browser.getWindowHandles();
    await book.click();

    await browser.waitUntil(async () => {
      const handles = await browser.getWindowHandles();
      return handles.length > initialHandles.length;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected a reader window to open after clicking a library book'
    });

    const nextHandles = await browser.getWindowHandles();
    const readerHandle = nextHandles.find((handle) => !initialHandles.includes(handle));
    expect(readerHandle).toBeTruthy();

    await browser.switchToWindow(readerHandle!);
    return readerHandle!;
  };

  const recoverLibraryWindow = async (preferredHandle: string) => {
    const handles = await browser.getWindowHandles();
    if (!handles.length) {
      throw new Error('expected at least one desktop window handle to remain available');
    }

    const nextHandle = handles.includes(preferredHandle) ? preferredHandle : handles[0]!;
    await browser.switchToWindow(nextHandle);
    return nextHandle;
  };

  const cleanupReaderAttempt = async (libraryHandle: string) => {
    const handles = await browser.getWindowHandles().catch(() => [] as string[]);
    if (!handles.length) return;

    const currentHandle = await browser.getWindowHandle().catch(() => null);
    const shouldCloseCurrentReader =
      !!currentHandle && currentHandle !== libraryHandle && handles.includes(currentHandle) && handles.length > 1;

    if (shouldCloseCurrentReader) {
      try {
        await browser.closeWindow();
      } catch {
        // ignore already-closed window cleanup
      }
    }

    await recoverLibraryWindow(libraryHandle);
  };

  const listOpenableBookHrefs = async () =>
    browser.execute(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((node) => node.getAttribute('href'))
        .filter((value): value is string => !!value)
        .filter((value) => {
          const target = new URL(value, window.location.origin);
          return target.pathname === '/reader' && ['asset', 'library-file'].includes(target.searchParams.get('source') ?? '');
        })
    );

  const findBookElementByHref = async (href: string) => {
    const escapedHref = href.replace(/"/g, '\\"');
    const book = await $(`a[href="${escapedHref}"]`);
    return (await book.isExisting()) ? book : null;
  };

  const openReaderFromHref = async (href: string) => {
    const libraryHandle = await switchToLibraryWindow();
    const book = await findBookElementByHref(href);
    if (book) {
      const readerHandle = await openReaderFromBook(book);
      return { libraryHandle, readerHandle };
    }

    throw new Error(`expected to find a library book link for href: ${href}`);
  };

  const openReaderFromLibraryPath = async (filePath: string, libraryHandle?: string) => {
    if (libraryHandle) {
      await browser.switchToWindow(libraryHandle);
    }
    const resolvedLibraryHandle = libraryHandle ?? (await switchToLibraryWindow());
    let href: string | null = null;
    await browser.waitUntil(async () => {
      href = await readLibraryHrefForPath(filePath);
      return !!href;
    }, {
      timeout: 15000,
      timeoutMsg: `expected to find a library reader href for path ${filePath}`
    });

    const book = href ? await findBookElementByHref(href) : null;
    if (!book) {
      throw new Error(`expected to find a library book for path ${filePath}`);
    }
    const readerHandle = await openReaderFromBook(book);
    return { libraryHandle: resolvedLibraryHandle, readerHandle };
  };

  const findOpenableBook = async (
    predicate: (href: string) => boolean,
    description: string
  ): Promise<WebdriverIO.Element> => {
    await switchToLibraryWindow();
    let hrefs: string[] = [];
    await browser.waitUntil(async () => {
      hrefs = await listOpenableBookHrefs();
      return hrefs.some((href) => predicate(href));
    }, {
      timeout: 15000,
      timeoutMsg: `expected to find an openable library book for ${description}`
    });

    for (const href of hrefs) {
      if (predicate(href)) {
        const book = await findBookElementByHref(href);
        if (book) {
          return book;
        }
      }
    }

    throw new Error(`expected to find an openable library book for ${description}`);
  };

  const findStableEpubBook = async () =>
    findOpenableBook(
      (href) => {
        const target = new URL(href, 'http://localhost');
        const path = target.searchParams.get('path') ?? '';
        return /\.epub($|\?)/i.test(path) || path.toLowerCase().endsWith('.epub');
      },
      'a stable epub-backed reader regression'
    );

  const readLibraryWorkflowSections = async () =>
    browser.execute(() => {
      const readSectionPaths = (sectionLabel: string) => {
        const section = document.querySelector(`[aria-label="${sectionLabel}"]`);
        if (!section) return [] as string[];

        return Array.from(section.querySelectorAll('a[href]'))
          .map((node) => node.getAttribute('href') ?? '')
          .map((href) => {
            const target = new URL(href, window.location.origin);
            return target.searchParams.get('path') ?? '';
          })
          .filter(Boolean);
      };

      return {
        continueReading: readSectionPaths('继续阅读'),
        recentReading: readSectionPaths('最近阅读'),
        shelf: readSectionPaths('你的书库')
      };
    });

  const readLibraryHrefForPath = async (path: string) =>
    browser.execute((targetPath) => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const match = links.find((node) => {
        const href = node.getAttribute('href');
        if (!href) return false;
        const target = new URL(href, window.location.origin);
        return (target.searchParams.get('path') ?? '') === targetPath;
      });

      return match?.getAttribute('href') ?? null;
    }, path);

  const toggleLibraryDetailsForTitle = async (title: string) => {
    await browser.execute((expectedTitle) => {
      const rows = Array.from(
        document.querySelectorAll('.continue-shelf .row, .shelf .book-card, .bookshelf .book-card, .bookshelf .book-list-row')
      );
      const row = rows.find((candidate) => (candidate.textContent ?? '').includes(expectedTitle));
      if (!(row instanceof HTMLElement)) {
        throw new Error(`expected to find a library row for ${expectedTitle}`);
      }

      const detailButton = Array.from(row.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '详情'
      );
      if (!(detailButton instanceof HTMLButtonElement)) {
        throw new Error(`expected to find a details button for ${expectedTitle}`);
      }

      detailButton.click();
    }, title);
  };

  const clickLibraryRowActionForTitle = async (title: string, expectedLabel: string) => {
    await browser.execute(
      ([expectedTitle, targetLabel]) => {
        const rows = Array.from(
          document.querySelectorAll('.continue-shelf .row, .shelf .book-card, .bookshelf .book-card, .bookshelf .book-list-row')
        );
        const row = rows.find((candidate) => (candidate.textContent ?? '').includes(expectedTitle));
        if (!(row instanceof HTMLElement)) {
          throw new Error(`expected to find a library row for ${expectedTitle}`);
        }

        const button = Array.from(row.querySelectorAll('button')).find(
          (candidate) => candidate.textContent?.trim() === targetLabel
        );
        if (!(button instanceof HTMLButtonElement)) {
          throw new Error(`expected to find row action "${targetLabel}" for ${expectedTitle}`);
        }

        button.click();
      },
      [title, expectedLabel] as const
    );
  };

  const readLibraryEntryStateForTitle = async (title: string) =>
    browser.execute((expectedTitle) => {
      const rows = Array.from(
        document.querySelectorAll('.continue-shelf .row, .shelf .book-card, .bookshelf .book-card, .bookshelf .book-list-row')
      );
      const row = rows.find((candidate) => (candidate.textContent ?? '').includes(expectedTitle));
      if (!(row instanceof HTMLElement)) {
        return null;
      }

      const text = row.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const container = row.closest('[aria-label]');
      return {
        text,
        sectionLabel: container?.getAttribute('aria-label') ?? '',
        hasReaderHref: !!row.querySelector('a[href*="/reader?"]'),
        hasImportButton: Array.from(row.querySelectorAll('button')).some(
          (button) => button.textContent?.trim() === '重新导入'
        ),
        hasRepairAction: Array.from(row.querySelectorAll('button')).some((button) => {
          const label = button.textContent?.trim() ?? '';
          return ['重新导入', '修复副本', '重新关联', '重新同步', '复核并重关联', '先复核再重关联'].includes(label);
        }),
        hasSourceButton: Array.from(row.querySelectorAll('button')).some(
          (button) => button.textContent?.trim() === '原文件'
        )
      };
    }, title);

  const clickLibrarySectionHeaderAction = async (sectionLabel: string, expectedLabelPrefix: string) => {
    await browser.execute(
      ([targetSectionLabel, targetLabelPrefix]) => {
        const section = document.querySelector(`[aria-label="${targetSectionLabel}"]`)?.closest('.continue-shelf');
        if (!(section instanceof HTMLElement)) {
          throw new Error(`expected to find library section: ${targetSectionLabel}`);
        }

        const button = Array.from(section.querySelectorAll('button')).find((candidate) =>
          candidate.textContent?.trim().startsWith(targetLabelPrefix)
        );
        if (!(button instanceof HTMLButtonElement)) {
          throw new Error(`expected to find section header action starting with: ${targetLabelPrefix}`);
        }

        button.click();
      },
      [sectionLabel, expectedLabelPrefix] as const
    );
  };

  const readLibrarySectionHeaderActionLabels = async (sectionLabel: string) =>
    browser.execute((targetSectionLabel) => {
      const section = document.querySelector(`[aria-label="${targetSectionLabel}"]`)?.closest('.continue-shelf');
      if (!(section instanceof HTMLElement)) {
        return [] as string[];
      }

      return Array.from(section.querySelectorAll('header button')).map(
        (button) => button.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      );
    }, sectionLabel);

  const readReadestMigrationSurface = async () =>
    browser.execute(() => {
      const banner = document.querySelector('[aria-label="readest migration"]');
      const notice = document.querySelector('.library-notice');
      const compatibleTexts = Array.from(document.querySelectorAll('.book-card, .reading-card'))
        .map((node) => node.textContent ?? '')
        .filter((text) => text.includes('Readest 兼容') || text.includes('兼容 Readest 本地藏书'));

      return {
        bannerText: banner?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        noticeText: notice?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        compatibleCardCount: compatibleTexts.length
      };
    });

  const hasUsableReaderState = (details: Awaited<ReturnType<typeof readReaderDetails>>) =>
    !!details.title &&
    details.title !== 'Bridge Reader' &&
    details.locationLabel !== 'Not opened' &&
    details.locationLabel !== 'Opening book' &&
    (!!details.chapterHref || !!details.cfi);

  const openUsableShelfEpubFromLibrary = async () => {
    const libraryHandle = await switchToLibraryWindow();
    const shelfBooks = await $$('[aria-label="你的书库"] [aria-label^="Open "][aria-label$=" in reader"]');

    for (const shelfBook of shelfBooks) {
      const href = await shelfBook.getAttribute('href');
      if (!href) continue;

      const target = new URL(href, 'http://localhost');
      const path = target.searchParams.get('path') ?? '';
      const location = target.searchParams.get('location') ?? '';
      const fraction = Number(target.searchParams.get('fraction') ?? '0');
      if (!(/\.epub($|\?)/i.test(path) || path.toLowerCase().endsWith('.epub'))) continue;
      if (location) continue;
      if (Number.isFinite(fraction) && fraction > 0) continue;

      await openReaderFromBook(shelfBook);

      try {
        await browser.waitUntil(async () => {
          const details = await readReaderDetails();
          if (details.stageError) {
            throw new Error(details.stageError);
          }

          return hasUsableReaderState(details);
        }, {
          timeout: 15000,
          timeoutMsg: 'expected a shelf EPUB to expose usable reader state before validating return-to-library flow'
        });

        return { libraryHandle, path, href };
      } catch {
        await browser.closeWindow();
        await browser.switchToWindow(libraryHandle);
      }
    }

    throw new Error('expected to find a shelf EPUB with usable reader state in your library section');
  };

  const openUsableShelfPdfFromLibrary = async () => {
    const libraryHandle = await switchToLibraryWindow();
    const shelfPdfPaths = (await loadLibraryRecordsOnDisk())
      .map((record) => ({
        title: record.title ?? '',
        path: record.filePath ?? record.file_path ?? '',
        fraction: record.progressFraction ?? 0,
        location: record.progressLocation ?? '',
        size: (() => {
          try {
            return statSync(record.filePath ?? record.file_path ?? '').size;
          } catch {
            return Number.POSITIVE_INFINITY;
          }
        })()
      }))
      .filter((record) => record.path.toLowerCase().endsWith('.pdf'))
      .sort((left, right) => {
        const leftPenalty = /reader sample/i.test(left.title) ? 1 : 0;
        const rightPenalty = /reader sample/i.test(right.title) ? 1 : 0;
        const leftStartedPenalty =
          left.location || (Number.isFinite(left.fraction) && left.fraction > 0) ? 1 : 0;
        const rightStartedPenalty =
          right.location || (Number.isFinite(right.fraction) && right.fraction > 0) ? 1 : 0;
        return (
          leftPenalty - rightPenalty ||
          leftStartedPenalty - rightStartedPenalty ||
          left.size - right.size
        );
      })
      .slice(0, 5);

    for (const candidate of shelfPdfPaths) {
      const href = await readLibraryHrefForPath(candidate.path);
      if (!href) continue;

      try {
        await openReaderFromLibraryPath(candidate.path, libraryHandle);

        await browser.waitUntil(async () => {
          const details = await readReaderDetails();
          if (details.stageError) {
            throw new Error(details.stageError);
          }

          return (
            !!details.title &&
            details.formatLabel === 'PDF' &&
            details.locationLabel !== 'Opening book'
          );
        }, {
          timeout: 20000,
          timeoutMsg: 'expected a shelf PDF to expose visible reader metadata before seeding restore flow'
        });

        let details = await readReaderDetails();
        if ((details.progressFraction ?? 0) <= 0 && details.progressLabel === '0%') {
          await nudgeReaderForward();
          await browser.waitUntil(async () => {
            details = await readReaderDetails();
            if (details.stageError) {
              throw new Error(details.stageError);
            }

            return (details.progressFraction ?? 0) > 0 || details.progressLabel !== '0%';
          }, {
            timeout: 15000,
            timeoutMsg: 'expected a shelf PDF to move beyond the starting page before validating restore flow'
          });
        }

        return { libraryHandle, path: candidate.path, href };
      } catch {
        await cleanupReaderAttempt(libraryHandle);
      }
    }

    throw new Error('expected to find a shelf PDF that can seed restorable PDF progress in your library section');
  };

  const openRestorableReaderBook = async () => {
    const libraryHandle = await switchToLibraryWindow();
    const hrefs = await listOpenableBookHrefs();

    for (const href of hrefs) {
      const target = new URL(href, 'http://localhost');
      const path = target.searchParams.get('path') ?? '';
      const location = target.searchParams.get('location') ?? '';
      if (!location) continue;
      if (!(/\.epub($|\?)/i.test(path) || path.toLowerCase().endsWith('.epub'))) continue;

      const book = await findBookElementByHref(href);
      if (!book) continue;

      await openReaderFromBook(book);

      try {
        await browser.waitUntil(async () => {
          const details = await readReaderDetails();
          if (details.stageError) {
            throw new Error(details.stageError);
          }
          return !!details.title && !!details.cfi && !!details.chapterHref;
        }, {
          timeout: 20000,
          timeoutMsg: 'expected a restorable EPUB library book to reopen with a valid restored reader location'
        });

        return {
          libraryHandle,
          href,
          expectedLocation: location,
          details: await readReaderDetails()
        };
      } catch {
        await browser.closeWindow();
        await browser.switchToWindow(libraryHandle);
      }
    }

    const seeded = await openUsableShelfEpubFromLibrary();

    try {
      await browser.waitUntil(async () => {
        const record = await loadLibraryRecordOnDisk(seeded.path);
        return !!record?.progressLocation;
      }, {
        timeout: 15000,
        timeoutMsg: 'expected opening a shelf EPUB to persist a restore location to library.json'
      });

      await browser.closeWindow();
      await browser.switchToWindow(seeded.libraryHandle);

      let restorableHref: string | null = null;
      await browser.waitUntil(async () => {
        restorableHref = await readLibraryHrefForPath(seeded.path);
        if (!restorableHref) return false;
        const target = new URL(restorableHref, 'http://localhost');
        return !!target.searchParams.get('location');
      }, {
        timeout: 15000,
        timeoutMsg: 'expected the library surface to expose a stored restore location after seeding an EPUB'
      });

      const book = await findBookElementByHref(restorableHref!);
      if (!book) {
        throw new Error(`expected to find a seeded EPUB library book for href ${restorableHref}`);
      }

      await openReaderFromBook(book);

      await browser.waitUntil(async () => {
        const details = await readReaderDetails();
        if (details.stageError) {
          throw new Error(details.stageError);
        }
        return !!details.title && !!details.cfi && !!details.chapterHref;
      }, {
        timeout: 20000,
        timeoutMsg: 'expected a seeded EPUB library book to reopen with a valid restored reader location'
      });

      const expectedLocation = new URL(restorableHref!, 'http://localhost').searchParams.get('location') ?? '';

      return {
        libraryHandle: seeded.libraryHandle,
        href: restorableHref!,
        expectedLocation,
        details: await readReaderDetails()
      };
    } catch (error) {
      await cleanupReaderAttempt(seeded.libraryHandle);
      throw new Error(
        `failed to reopen the seeded PDF restore flow for ${seeded.path}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const openRestorablePdfBook = async () => {
    const seeded = await openUsableShelfPdfFromLibrary();

    try {
      await browser.waitUntil(async () => {
        const record = await loadLibraryRecordOnDisk(seeded.path);
        return !!record?.progressLocation || ((record?.progressFraction ?? 0) > 0);
      }, {
        timeout: 15000,
        timeoutMsg: 'expected opening a shelf PDF to persist a restore location or fraction to library.json'
      });

      const seededRecord = await loadLibraryRecordOnDisk(seeded.path);

      await browser.closeWindow();
      await browser.switchToWindow(seeded.libraryHandle);
      await browser.refresh();
      await $('.library-page').waitForDisplayed({ timeout: 10000 });

      let restorableHref: string | null = null;
      await browser.waitUntil(async () => {
        restorableHref = await readLibraryHrefForPath(seeded.path);
        if (!restorableHref) return false;
        const target = new URL(restorableHref, 'http://localhost');
        const location = target.searchParams.get('location') ?? '';
        const fraction = Number(target.searchParams.get('fraction') ?? '0');
        return !!location || (Number.isFinite(fraction) && fraction > 0);
      }, {
        timeout: 15000,
        timeoutMsg: 'expected the library surface to expose stored restore progress after seeding a PDF'
      });

      await openReaderFromLibraryPath(seeded.path, seeded.libraryHandle);

      await browser.waitUntil(async () => {
        const details = await readReaderDetails();
        if (details.stageError) {
          throw new Error(details.stageError);
        }
        return (
          !!details.title &&
          details.formatLabel === 'PDF' &&
          ((details.progressFraction ?? 0) > 0 || details.locationLabel !== 'Not opened')
        );
      }, {
        timeout: 20000,
        timeoutMsg: 'expected a seeded PDF library book to reopen with visible reader progress metadata'
      });

      const target = new URL(restorableHref!, 'http://localhost');

      return {
        libraryHandle: seeded.libraryHandle,
        href: restorableHref!,
        path: seeded.path,
        expectedLocation: target.searchParams.get('location') ?? '',
        expectedFraction: Number(target.searchParams.get('fraction') ?? '0'),
        persistedLocation: seededRecord?.progressLocation ?? '',
        details: await readReaderDetails()
      };
    } catch (error) {
      await cleanupReaderAttempt(seeded.libraryHandle);
      throw new Error(
        `failed to reopen the seeded PDF restore flow for ${seeded.path}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const readReaderDetails = async () =>
    browser.execute(() => {
      const view = document.querySelector('foliate-view') as
        | (HTMLElement & {
            book?: { metadata?: { title?: unknown } };
            lastLocation?: {
              cfi?: string;
              total?: number;
              location?: { total?: number };
              tocItem?: { label?: string; href?: string };
            };
          })
        | null;
      const headerTitle = document.querySelector('.reader-head .title-row strong')?.textContent?.trim() ?? null;

      const footer = document.querySelector('[aria-label="reader footer controls preview"]');
      const footerMeta = Array.from(footer?.querySelectorAll('.footer-meta span') ?? []).map((node) =>
        node.textContent?.trim() ?? ''
      );
      const formatLabel = footerMeta[1] ?? null;
      const locationLabel = footerMeta[0] ?? null;
      const progressLabel =
        footer?.querySelector('.progress-strip span')?.textContent?.trim() ?? null;
      const derivedProgressFraction =
        progressLabel && progressLabel.endsWith('%')
          ? Number(progressLabel.slice(0, -1)) / 100
          : null;
      const derivedLineTotal = (() => {
        if (!locationLabel?.startsWith('Line ')) return null;
        const match = locationLabel.match(/^Line\s+\d+\s+\/\s+(\d+)$/i);
        if (!match) return null;
        return Number(match[1]);
      })();
      const titleValue = view?.book?.metadata?.title;
      const title =
        typeof titleValue === 'string'
          ? titleValue
          : titleValue && typeof titleValue === 'object' && 'en' in titleValue
            ? String((titleValue as Record<string, unknown>).en ?? '')
            : formatLabel === 'TXT'
              ? headerTitle
              : view
                ? null
                : headerTitle;

      return {
        title,
        cfi: view?.lastLocation?.cfi ?? null,
        progressFraction: view?.lastLocation?.fraction ?? derivedProgressFraction,
        chapterLabel: view?.lastLocation?.tocItem?.label ?? null,
        chapterHref: view?.lastLocation?.tocItem?.href ?? null,
        total: view?.lastLocation?.location?.total ?? view?.lastLocation?.total ?? derivedLineTotal,
        progressLabel,
        locationLabel,
        formatLabel,
        layoutLabel: footerMeta[2] ?? null,
        stageError: document.querySelector('.stage-error')?.textContent?.trim() ?? null
      };
    });

  const openUsableReaderBook = async (options?: { requireCfi?: boolean }) => {
    const requireCfi = options?.requireCfi ?? false;
    const libraryHandle = await switchToLibraryWindow();
    const hrefs = await listOpenableBookHrefs();

    for (const href of hrefs) {
      const book = await findBookElementByHref(href);
      if (!book) continue;

      const target = new URL(href, 'http://localhost');
      const path = target.searchParams.get('path') ?? '';
      if (!(/\.epub($|\?)/i.test(path) || path.toLowerCase().endsWith('.epub'))) continue;

      await openReaderFromBook(book);

      try {
        await browser.waitUntil(async () => {
          const details = await readReaderDetails();
          if (details.stageError) {
            throw new Error(details.stageError);
          }
          return !!details.title && !!details.total && (!requireCfi || !!details.cfi);
        }, {
          timeout: 15000,
          timeoutMsg: `expected an epub-backed library book to expose metadata${requireCfi ? ' and a valid CFI' : ''}`
        });

        return {
          libraryHandle,
          href,
          details: await readReaderDetails()
        };
      } catch {
        await browser.closeWindow();
        await browser.switchToWindow(libraryHandle);
      }
    }

    throw new Error(`expected to find an EPUB library book with readable metadata${requireCfi ? ' and CFI' : ''}`);
  };

  const switchReaderToNotesTab = async () => {
    const notesTab = await $('//button[@role="tab" and normalize-space()="笔记"]');
    await notesTab.waitForDisplayed({ timeout: 10000 });
    await notesTab.click();
  };

  const clearAllReaderNotes = async () => {
    await browser.execute(() => {
      window.confirm = () => true;
    });
    await switchReaderToNotesTab();
    await clickAnnotationKindFilter('全部类型');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const deleteButtons = await $$('.note-action.danger');
      if (!deleteButtons.length) break;
      await deleteButtons[0].click();
      await browser.pause(150);
    }

    await browser.waitUntil(async () => {
      const deleteButtons = await $$('.note-action.danger');
      return deleteButtons.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the reader notes list to be empty before seeding legacy notes'
    });
  };

  const readCurrentReaderLocation = async () => {
    const details = await readReaderDetails();
    return {
      cfi: details.cfi,
      chapterLabel: details.chapterLabel,
      chapterHref: details.chapterHref
    };
  };

  const selectPlainTextInReader = async (needle: string) => {
    await browser.execute((targetText) => {
      const pre = document.querySelector('.plain-text-paper pre');
      if (!pre || !pre.firstChild) throw new Error('expected the plain text reading surface to exist');
      const textNode = pre.firstChild;
      const raw = textNode.textContent ?? '';
      const start = raw.indexOf(targetText);
      if (start < 0) throw new Error(`expected the TXT fixture to contain "${targetText}"`);

      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + targetText.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, needle);
  };

  const selectVisibleFoliateTextInReader = async (segmentIndex = 0, excludedTexts: string[] = []) => {
    let lastError = 'expected a visible foliate text node to select';

    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const selected = await browser.execute((targetSegmentIndex, ignoredTexts) => {
          const view = document.querySelector('foliate-view') as
            | (HTMLElement & {
                renderer?: {
                  getContents?: () => Array<{ doc: Document; index?: number }>;
                };
                shadowRoot?: ShadowRoot | null;
              })
            | null;
          const paginator = view?.shadowRoot?.querySelector('foliate-paginator') as
            | (HTMLElement & { shadowRoot?: ShadowRoot | null })
            | null;
          const paginatorContainer = paginator?.shadowRoot?.querySelector('#container') as HTMLElement | null;
          const frames = Array.from(paginator?.shadowRoot?.querySelectorAll('iframe') ?? []) as HTMLIFrameElement[];

          const ignoredSet = new Set(
            ignoredTexts.map((text) => text.replace(/\s+/g, ' ').trim()).filter(Boolean)
          );

          const selectFirstSubstantialText = (frameDocument: Document, frameWindow: Window) => {
            const walker = frameDocument.createTreeWalker(frameDocument.body, NodeFilter.SHOW_TEXT, {
              acceptNode(node) {
                return node.textContent && node.textContent.trim().length > 8
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_SKIP;
              }
            });

            let node: Node | null = null;
            while ((node = walker.nextNode())) {
              const raw = node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
              if (raw.length < 8) continue;
              if (
                Array.from(ignoredSet).some(
                  (ignoredText) => raw.includes(ignoredText) || ignoredText.includes(raw)
                )
              ) {
                continue;
              }

              const selectionLength = Math.min(Math.max(24, Math.floor(raw.length / 2)), 72);
              const nodeText = node.textContent ?? '';
              const firstNonWhitespace = nodeText.search(/\S/);
              const startOffset =
                firstNonWhitespace < 0
                  ? -1
                  : Math.min(
                      nodeText.length - 1,
                      firstNonWhitespace +
                        targetSegmentIndex * Math.max(12, Math.floor(selectionLength / 2))
                    );
              if (startOffset < 0) continue;
              const endOffset = Math.min(nodeText.length, startOffset + selectionLength);
              if (endOffset <= startOffset) continue;

              const selectionRange = frameDocument.createRange();
              selectionRange.setStart(node, startOffset);
              selectionRange.setEnd(node, endOffset);

              const selection = frameWindow.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(selectionRange);
              frameDocument.dispatchEvent(new Event('selectionchange'));
              return selection?.toString().replace(/\s+/g, ' ').trim() ?? raw.slice(0, selectionLength);
            }

            return '';
          };

          for (const frame of frames) {
            const frameDocument = frame.contentDocument;
            const frameWindow = frame.contentWindow;
            if (!frameDocument?.body || !frameWindow) continue;

            const frameRect = frame.getBoundingClientRect();
            const containerRect = paginatorContainer?.getBoundingClientRect() ?? null;
            const visibleLeft = containerRect ? Math.max(frameRect.left, containerRect.left) : frameRect.left;
            const visibleRight = containerRect ? Math.min(frameRect.right, containerRect.right) : frameRect.right;
            const visibleTop = containerRect ? Math.max(frameRect.top, containerRect.top) : frameRect.top;
            const visibleBottom = containerRect ? Math.min(frameRect.bottom, containerRect.bottom) : frameRect.bottom;
            const visibleWidth = visibleRight - visibleLeft;
            const visibleHeight = visibleBottom - visibleTop;

            if (visibleWidth < 24 || visibleHeight < 10) continue;

            const selected = selectFirstSubstantialText(frameDocument, frameWindow);
            if (selected) return selected;
          }

          const rendererDocs = view?.renderer?.getContents?.() ?? [];
          for (const entry of rendererDocs) {
            const frameDocument = entry.doc;
            const frameWindow = frameDocument.defaultView;
            if (!frameDocument?.body || !frameWindow) continue;
            const selected = selectFirstSubstantialText(frameDocument, frameWindow);
            if (selected) return selected;
          }

          throw new Error('expected a visible foliate text node to select');
        }, segmentIndex, excludedTexts);

        await browser.waitUntil(async () => {
          const diagnostics = await browser.execute(() => {
            const selectionText = document.querySelector('.selection-card p')?.textContent?.trim() ?? '';
            const actions = Array.from(
              document.querySelectorAll('.secondary-note-action, .primary-note-action')
            ).map((button) => ({
              text: (button as HTMLButtonElement).textContent?.trim() ?? '',
              disabled: (button as HTMLButtonElement).disabled
            }));

            return { selectionText, actions };
          });

          const hasSelectionPreview = diagnostics.selectionText.includes(selected.slice(0, 20));
          const hasEnabledAction = diagnostics.actions.some((action) => !action.disabled);
          return hasSelectionPreview && hasEnabledAction;
        }, {
          timeout: 1500,
          interval: 100,
          timeoutMsg: `expected notes workspace to accept the selected foliate text: ${selected}`
        });

        return selected;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        await browser.pause(250);
      }
    }

    throw new Error(lastError);
  };

  const readReaderGeometry = () =>
    browser.execute(() => {
      const stage = document.querySelector('.reader-stage');
      const sidebar = document.querySelector('.reader-sidebar');
      const workspace = document.querySelector('.workspace');
      const shell = document.querySelector('.reader-shell');
      const canvas = document.querySelector('.canvas');
      const viewport = document.querySelector('.viewport-shell');
      const engineHost = document.querySelector('.engine-host');
      const engineStage = document.querySelector('.engine-stage');
      const view = document.querySelector('foliate-view') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null;
      const paginator = view?.shadowRoot?.querySelector('foliate-paginator') as HTMLElement | null;
      const paginatorContainer = paginator?.shadowRoot?.querySelector('#container') as HTMLElement | null;
      const frames = Array.from(
        paginator?.shadowRoot?.querySelectorAll('iframe') ?? []
      ) as HTMLIFrameElement[];
      const frame = frames[0] ?? null;
      const rendered = frame ?? paginator ?? view;

      const rectOf = (node: Element | null) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom
        };
      };

      const firstVisibleTextRect = (() => {
        const toGlobalRect = (
          rect: DOMRect | { left: number; top: number; right: number; bottom: number; width: number; height: number },
          visibleLeft: number,
          visibleTop: number,
          extra: Record<string, unknown> = {}
        ) => ({
          left: visibleLeft + rect.left,
          top: visibleTop + rect.top,
          width: rect.width,
          height: rect.height,
          right: visibleLeft + rect.right,
          bottom: visibleTop + rect.bottom,
          ...extra
        });

        for (const currentFrame of frames) {
          const frameWindow = currentFrame.contentWindow ?? null;
          const frameDocument = currentFrame.contentDocument ?? null;
          const frameRect = currentFrame.getBoundingClientRect();
          const containerRect = paginatorContainer?.getBoundingClientRect() ?? null;
          if (!frameDocument || !frameWindow) continue;

          const visibleLeft = containerRect ? Math.max(frameRect.left, containerRect.left) : frameRect.left;
          const visibleRight = containerRect ? Math.min(frameRect.right, containerRect.right) : frameRect.right;
          const visibleTop = containerRect ? Math.max(frameRect.top, containerRect.top) : frameRect.top;
          const visibleBottom = containerRect ? Math.min(frameRect.bottom, containerRect.bottom) : frameRect.bottom;
          const visibleWidth = visibleRight - visibleLeft;
          const visibleHeight = visibleBottom - visibleTop;

          if (visibleWidth < 24 || visibleHeight < 10) {
            continue;
          }

          const walker = frameDocument.createTreeWalker(frameDocument.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              return node.textContent && node.textContent.trim().length > 8
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP;
            }
          });

          let node: Node | null = null;
          while ((node = walker.nextNode())) {
            const range = frameDocument.createRange();
            range.selectNodeContents(node);

            for (const rect of Array.from(range.getClientRects())) {
              if (
                rect.width < 24 ||
                rect.height < 10 ||
                rect.right <= 0 ||
                rect.left >= visibleWidth ||
                rect.bottom <= 0 ||
                rect.top >= visibleHeight
              ) {
                continue;
              }

              return toGlobalRect(rect, visibleLeft, visibleTop, {
                text: node.textContent?.trim().slice(0, 80) ?? ''
              });
            }
          }

          for (const element of Array.from(frameDocument.querySelectorAll('img, svg, canvas, video, image'))) {
            if (!(element instanceof Element)) continue;
            const rect = element.getBoundingClientRect();
            if (
              rect.width < 48 ||
              rect.height < 48 ||
              rect.right <= 0 ||
              rect.left >= visibleWidth ||
              rect.bottom <= 0 ||
              rect.top >= visibleHeight
            ) {
              continue;
            }

            return toGlobalRect(rect, visibleLeft, visibleTop, {
              text: '',
              kind: element.tagName.toLowerCase()
            });
          }
        }

        return null;
      })();

      const firstVisibleContentRect =
        firstVisibleTextRect ??
        (() => {
          const toGlobalRect = (
            rect: DOMRect | { left: number; top: number; right: number; bottom: number; width: number; height: number },
            visibleLeft: number,
            visibleTop: number
          ) => ({
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            visibleLeft,
            visibleTop
          });

          for (const currentFrame of frames) {
            const frameDocument = currentFrame.contentDocument ?? null;
            const frameRect = currentFrame.getBoundingClientRect();
            const containerRect = paginatorContainer?.getBoundingClientRect() ?? null;
            if (!frameDocument) continue;

            const visibleLeft = containerRect ? Math.max(frameRect.left, containerRect.left) : frameRect.left;
            const visibleTop = containerRect ? Math.max(frameRect.top, containerRect.top) : frameRect.top;
            const visibleRight = containerRect ? Math.min(frameRect.right, containerRect.right) : frameRect.right;
            const visibleBottom = containerRect ? Math.min(frameRect.bottom, containerRect.bottom) : frameRect.bottom;

            const graphicCandidates = Array.from(
              frameDocument.querySelectorAll('img, svg, canvas, video, picture img')
            ) as HTMLElement[];

            for (const candidate of graphicCandidates) {
              const candidateRect = candidate.getBoundingClientRect();
              if (candidateRect.width < 80 || candidateRect.height < 80) continue;

              const globalRect = toGlobalRect(
                {
                  left: frameRect.left + candidateRect.left,
                  top: frameRect.top + candidateRect.top,
                  right: frameRect.left + candidateRect.right,
                  bottom: frameRect.top + candidateRect.bottom,
                  width: candidateRect.width,
                  height: candidateRect.height
                },
                visibleLeft,
                visibleTop
              );

              if (
                globalRect.right <= visibleLeft ||
                globalRect.left >= visibleRight ||
                globalRect.bottom <= visibleTop ||
                globalRect.top >= visibleBottom
              ) {
                continue;
              }

              return globalRect;
            }
          }

          return null;
        })();

      return {
        stage: rectOf(stage),
        sidebar: rectOf(sidebar),
        workspace: rectOf(workspace),
        shell: rectOf(shell),
        canvas: rectOf(canvas),
        viewport: rectOf(viewport),
        engineHost: rectOf(engineHost),
        engineStage: rectOf(engineStage),
        foliateView: rectOf(view),
        paginator: rectOf(paginator),
        paginatorContainer: rectOf(paginatorContainer),
        frame: rectOf(frame),
        rendered: rectOf(rendered),
        firstVisibleTextRect,
        firstVisibleContentRect,
        workspaceColumns: workspace ? getComputedStyle(workspace).gridTemplateColumns : null
      };
    });

  const readReaderChromeGeometry = () =>
    browser.execute(() => {
      const canvas = document.querySelector('.canvas');
      const headerFrame = document.querySelector('.reader-head-frame');
      const footerFrame = document.querySelector('.footer-frame');

      const rectOf = (node: Element | null) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom
        };
      };

      return {
        canvas: rectOf(canvas),
        headerFrame: rectOf(headerFrame),
        footerFrame: rectOf(footerFrame)
      };
    });

  const setReaderViewWidthMode = async (mode: 'focus' | 'standard' | 'wide') => {
    const moreActions = await $('.reader-head-frame [aria-label="More actions"]');
    await moreActions.waitForDisplayed({ timeout: 10000 });
    await browser.execute(() => {
      const button = document.querySelector('.reader-head-frame [aria-label="More actions"]');
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('expected reader header more-actions button to exist');
      }
      button.click();
    });

    const labels = {
      focus: '专注',
      standard: '标准',
      wide: '宽阔'
    } as const;

    const option = await $(`//button[@role="menuitemradio" and normalize-space()="${labels[mode]}"]`);
    await option.waitForDisplayed({ timeout: 10000 });
    await option.click();
  };

  const selectReaderMenuSetting = async (
    groupLabel:
      | 'reader flow mode'
      | 'reader font family'
      | 'reader font scale'
      | 'reader line height'
      | 'reader page margins',
    optionLabel: string
  ) => {
    const moreActions = await $('.reader-head-frame [aria-label="More actions"]');
    await moreActions.waitForDisplayed({ timeout: 10000 });
    await browser.execute(() => {
      const button = document.querySelector('.reader-head-frame [aria-label="More actions"]');
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('expected reader header more-actions button to exist');
      }
      button.click();
    });

    const menuGroup = await $(`.reader-head-frame .header-menu [role="group"][aria-label="${groupLabel}"]`);
    await menuGroup.waitForDisplayed({ timeout: 10000 });

    await browser.execute(
      ({ targetGroupLabel, targetOptionLabel }) => {
        const groups = Array.from(
          document.querySelectorAll('.reader-head-frame .header-menu [role="group"][aria-label]')
        );
        const group = groups.find(
          (candidate) => candidate.getAttribute('aria-label') === targetGroupLabel
        );
        if (!(group instanceof HTMLElement)) {
          throw new Error(`expected reader settings group to exist: ${targetGroupLabel}`);
        }

        const option = Array.from(group.querySelectorAll('button[role="menuitemradio"]')).find(
          (candidate) => candidate.textContent?.trim() === targetOptionLabel
        );
        if (!(option instanceof HTMLButtonElement)) {
          throw new Error(`expected reader settings option to exist: ${targetOptionLabel}`);
        }

        option.click();
      },
      { targetGroupLabel: groupLabel, targetOptionLabel: optionLabel }
    );
  };

  const readDesktopRendererSettings = async () =>
    browser.execute(() => {
      const view = document.querySelector('foliate-view') as {
        renderer?: {
          getAttribute?: (name: string) => string | null;
          getContents?: () => Array<{ doc?: Document }>;
        };
      } | null;
      const renderer = view?.renderer;
      const doc = renderer?.getContents?.()?.[0]?.doc;
      const body = doc?.body;
      const styles = body ? getComputedStyle(body) : null;

      return {
        flow: renderer?.getAttribute?.('flow') ?? '',
        marginLeft: renderer?.getAttribute?.('margin-left') ?? '',
        fontFamily: styles?.fontFamily ?? '',
        fontSize: styles?.fontSize ?? '',
        lineHeightPx: Number.parseFloat(styles?.lineHeight ?? '0')
      };
    });

  const readPlainTextReaderSettings = async () =>
    browser.execute(() => {
      const surface = document.querySelector('.plain-text-surface');
      const paper = document.querySelector('.plain-text-paper');
      const pre = document.querySelector('.plain-text-paper pre');
      const surfaceStyles = surface ? getComputedStyle(surface) : null;
      const paperStyles = paper ? getComputedStyle(paper) : null;
      const preStyles = pre ? getComputedStyle(pre) : null;

      return {
        surfacePadding: surfaceStyles?.padding ?? '',
        paperWidth: paperStyles?.width ?? '',
        fontFamily: preStyles?.fontFamily ?? '',
        fontSize: preStyles?.fontSize ?? '',
        lineHeightPx: Number.parseFloat(preStyles?.lineHeight ?? '0')
      };
    });

  const readFixedLayoutReaderSettings = async () =>
    browser.execute(() => {
      const host = document.querySelector('[data-role="reader-engine-host"]') as HTMLElement | null;
      const view = document.querySelector('foliate-view') as {
        renderer?: {
          getAttribute?: (name: string) => string | null;
        };
      } | null;
      const renderer = view?.renderer;
      const styles = host ? getComputedStyle(host) : null;
      const stored = (() => {
        try {
          return JSON.parse(localStorage.getItem('br1.reader.settings') ?? '{}') as Record<string, unknown>;
        } catch {
          return {};
        }
      })();

      return {
        flow: renderer?.getAttribute?.('flow') ?? '',
        marginLeft: renderer?.getAttribute?.('margin-left') ?? '',
        maxInlineSize: renderer?.getAttribute?.('max-inline-size') ?? '',
        hostThemePreset: host?.dataset.themePreset ?? '',
        hostViewWidthMode: host?.dataset.viewWidthMode ?? '',
        surfaceTone: styles?.getPropertyValue('--reader-surface-tone').trim() ?? '',
        inlineWidth: styles?.getPropertyValue('--reader-inline-width').trim() ?? '',
        chromeTopInset: styles?.getPropertyValue('--reader-chrome-top-inset').trim() ?? '',
        stored
      };
    });

  const waitForDesktopReaderToHydrate = async (expectedFormatLabel?: string) => {
    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      if (details.stageError) {
        throw new Error(details.stageError);
      }

      if (expectedFormatLabel && details.formatLabel !== expectedFormatLabel) {
        return false;
      }

      return hasUsableReaderState(details);
    }, {
      timeout: 20000,
      timeoutMsg: `expected the desktop reader to hydrate${expectedFormatLabel ? ` for ${expectedFormatLabel}` : ''} before continuing`
    });
  };

  const switchReaderToSearchTab = async () => {
    const searchTab = await $('//button[@role="tab" and normalize-space()="搜索"]');
    await searchTab.waitForDisplayed({ timeout: 10000 });
    await searchTab.click();
  };

  const reopenReaderWithLegacyNote = async (seed: {
    text: string;
    note: string;
    chapterLabelFallback: string;
  }) => {
    const { libraryHandle, href } = await openUsableReaderBook({ requireCfi: true });

    const target = new URL(href!, 'http://localhost');
    const bookKey =
      target.searchParams.get('path') ||
      target.searchParams.get('url') ||
      target.searchParams.get('label') ||
      'default';
    const notesStorageKey = `br1.reader.notes:${bookKey}`;

    await clearAllReaderNotes();
    await browser.execute((key) => {
      localStorage.removeItem(key);
    }, notesStorageKey);

    await browser.waitUntil(async () => {
      const location = await readCurrentReaderLocation();
      return !!location.cfi;
    }, {
      timeout: 15000,
      timeoutMsg: 'expected the first book to expose a valid CFI before seeding legacy notes'
    });

    const location = await readCurrentReaderLocation();
    const legacyNote = {
      id: `legacy:${Date.now()}`,
      cfi: location.cfi!,
      text: seed.text,
      note: seed.note,
      chapterLabel: location.chapterLabel || seed.chapterLabelFallback,
      chapterHref: location.chapterHref || '',
      createdAt: Date.now()
    };

    await browser.execute(([key, note]) => {
      localStorage.setItem(key, JSON.stringify([note]));
    }, [notesStorageKey, legacyNote] as const);
    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);

    await openReaderFromLibraryPath(bookKey, libraryHandle);
    await switchReaderToNotesTab();

    await browser.waitUntil(async () => {
      const noteCards = await $$('.note-card');
      if (!noteCards.length) return false;
      const texts: string[] = [];
      for (const noteCard of noteCards) {
        texts.push(await noteCard.getText());
      }
      return texts.some((text) => text.includes(legacyNote.text) && text.includes(legacyNote.note));
    }, {
      timeout: 20000,
      timeoutMsg: 'expected the migrated legacy note to appear in the notes panel after reopening the book'
    });

    await browser.waitUntil(async () => {
      const raw = await browser.execute((key) => localStorage.getItem(key), notesStorageKey);
      return raw === null;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the legacy browser notes key to be removed after host migration'
    });

    return { libraryHandle, notesStorageKey, legacyNote, href, bookKey };
  };

  it('shows the library route by default', async () => {
    const url = await browser.getUrl();
    expect(url).toMatch(/library|localhost/);
  });

  it('renders the library surface', async () => {
    const library = await $('.library-page');
    await library.waitForDisplayed({ timeout: 15000 });
    expect(await library.isDisplayed()).toBe(true);
  });

  it('shows the library search input', async () => {
    const searchInput = await $('[aria-label="Search books"]');
    await searchInput.waitForDisplayed({ timeout: 10000 });
    expect(await searchInput.isDisplayed()).toBe(true);
  });

  it('shows the bookshelf with at least one openable book', async () => {
    const shelf = await $('[aria-label="你的书库"]');
    await shelf.waitForExist({ timeout: 10000 });
    expect(await shelf.isExisting()).toBe(true);

    const openableBooks = await $$('[aria-label^="Open "][aria-label$=" in reader"]');
    expect(openableBooks.length).toBeGreaterThan(0);

    await browser.execute(() => {
      const shelf = document.querySelector('[aria-label="你的书库"]');
      if (!(shelf instanceof HTMLElement)) {
        throw new Error('expected library shelf to exist');
      }
      const detailButton = Array.from(shelf.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '详情'
      );
      if (!(detailButton instanceof HTMLButtonElement)) {
        throw new Error('expected a shelf metadata details button to exist');
      }
      detailButton.click();
    });
    await browser.waitUntil(async () => {
      const panels = await $$('[aria-label^="Library metadata for "]');
      if (!panels.length) return false;
      const text = await panels[0]!.getText();
      return (
        text.includes('标题') &&
        text.includes('作者') &&
        text.includes('格式') &&
        text.includes('进度') &&
        text.includes('来源')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the main library shelf to expose a metadata detail panel'
    });
  });

  it('edits shelf metadata and collection without changing the library file', async () => {
    const nextTitle = `Edited Metadata ${Date.now()}`;
    const nextAuthor = 'Bridge Librarian';
    const nextLanguage = 'zh-Hans';
    const nextPublisher = 'Bridge Metadata Desk';
    const nextCollection = 'Readest Parity Shelf';
    const nextDescription = 'Edited in the br1 shelf metadata panel.';
    let targetPath = '';
    let displayTitle = '';
    let originalTitle = '';
    let originalAuthor = '';
    let originalDescription: string | null = null;
    let originalLanguage: string | null = null;
    let originalPublisher: string | null = null;
    let originalCollection: string | null = null;

    try {
      await switchToLibraryWindow();
      await browser.refresh();
      const shelf = await $('[aria-label="你的书库"]');
      await shelf.waitForExist({ timeout: 10000 });

      const target = await browser.execute(() => {
        const libraryShelf = document.querySelector('[aria-label="你的书库"]');
        if (!(libraryShelf instanceof HTMLElement)) return null;
        const link = libraryShelf.querySelector<HTMLAnchorElement>('.book-card a[href*="/reader?"]');
        if (!link) return null;
        const href = link.getAttribute('href') ?? '';
        const url = new URL(href, window.location.origin);
        const path = url.searchParams.get('path') ?? '';
        const title = link.querySelector('strong')?.textContent?.trim() ?? '';
        const author = Array.from(link.querySelectorAll('.meta span, .list-copy span'))
          .map((node) => node.textContent?.trim() ?? '')
          .find((value) => value && value !== title) ?? '';
        return { path, title, author };
      });
      expect(target?.path).toBeTruthy();
      targetPath = target!.path;
      displayTitle = target!.title;
      const originalRecord = await loadLibraryRecordOnDisk(targetPath);
      expect(originalRecord).toBeTruthy();
      originalTitle = originalRecord!.title ?? target!.title;
      originalAuthor = originalRecord!.author ?? target!.author;
      originalDescription = originalRecord!.description ?? null;
      originalLanguage = originalRecord!.language ?? null;
      originalPublisher = originalRecord!.publisher ?? null;
      originalCollection = originalRecord!.collection ?? null;

      await toggleLibraryDetailsForTitle(displayTitle);
      await browser.waitUntil(async () => {
        return browser.execute((title) => {
          const panels = Array.from(document.querySelectorAll('[aria-label^="Library metadata for "]'));
          return panels.some((panel) => panel.textContent?.includes(title));
        }, displayTitle);
      }, {
        timeout: 10000,
        timeoutMsg: 'expected to expand metadata panel for the editable shelf book'
      });

      const openedEditor = await browser.execute((initialTitle) => {
        const libraryShelf = document.querySelector('[aria-label="你的书库"]');
        if (!(libraryShelf instanceof HTMLElement)) return false;
        const card = Array.from(libraryShelf.querySelectorAll('.book-card')).find((candidate) => {
          return candidate.textContent?.includes(initialTitle);
        });
        if (!(card instanceof HTMLElement)) return false;
        const editButton = Array.from(card.querySelectorAll('button')).find(
          (button) => button.textContent?.trim() === '编辑元数据'
        );
        if (!(editButton instanceof HTMLButtonElement)) return false;
        editButton.click();
        return true;
      }, displayTitle);
      expect(openedEditor).toBe(true);

      await browser.waitUntil(async () => {
        return browser.execute((initialTitle) => {
          const libraryShelf = document.querySelector('[aria-label="你的书库"]');
          if (!(libraryShelf instanceof HTMLElement)) return false;
          const card = Array.from(libraryShelf.querySelectorAll('.book-card')).find((candidate) => {
            return candidate.textContent?.includes(initialTitle);
          });
          if (!(card instanceof HTMLElement)) return false;
          return (
            !!card.querySelector('input[aria-label="Edit book title"]') &&
            (card.textContent ?? '').includes('不会移动文件、重置阅读进度或覆盖恢复定位')
          );
        }, displayTitle);
      }, {
        timeout: 10000,
        timeoutMsg: 'expected shelf metadata editor inputs to appear'
      });

      const edited = await browser.execute(
        ([initialTitle, title, author, language, publisher, collection, description]) => {
          const libraryShelf = document.querySelector('[aria-label="你的书库"]');
          if (!(libraryShelf instanceof HTMLElement)) return false;
          const card = Array.from(libraryShelf.querySelectorAll('.book-card')).find((candidate) => {
            return candidate.textContent?.includes(initialTitle);
          });
          if (!(card instanceof HTMLElement)) return false;
          const titleInput = card.querySelector<HTMLInputElement>('input[aria-label="Edit book title"]');
          const authorInput = card.querySelector<HTMLInputElement>('input[aria-label="Edit book author"]');
          const languageInput = card.querySelector<HTMLInputElement>('input[aria-label="Edit book language"]');
          const publisherInput = card.querySelector<HTMLInputElement>('input[aria-label="Edit book publisher"]');
          const collectionInput = card.querySelector<HTMLInputElement>('input[aria-label="Edit book collection"]');
          const descriptionInput = card.querySelector<HTMLTextAreaElement>('textarea[aria-label="Edit book description"]');
          if (
            !titleInput ||
            !authorInput ||
            !languageInput ||
            !publisherInput ||
            !collectionInput ||
            !descriptionInput
          ) return false;
          titleInput.value = title;
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          authorInput.value = author;
          authorInput.dispatchEvent(new Event('input', { bubbles: true }));
          languageInput.value = language;
          languageInput.dispatchEvent(new Event('input', { bubbles: true }));
          publisherInput.value = publisher;
          publisherInput.dispatchEvent(new Event('input', { bubbles: true }));
          collectionInput.value = collection;
          collectionInput.dispatchEvent(new Event('input', { bubbles: true }));
          descriptionInput.value = description;
          descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));

          const saveButton = Array.from(card.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === '保存元数据'
          );
          if (!(saveButton instanceof HTMLButtonElement)) return false;
          saveButton.click();
          return true;
        },
        [
          displayTitle,
          nextTitle,
          nextAuthor,
          nextLanguage,
          nextPublisher,
          nextCollection,
          nextDescription
        ] as const
      );
      expect(edited).toBe(true);

      await browser.waitUntil(async () => {
        const record = await loadLibraryRecordOnDisk(targetPath);
        const noticeText = await browser.execute(() => {
          return document.querySelector('.library-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        });
        const shelfText = await $('[aria-label="你的书库"]').getText();
        return (
          record?.title === nextTitle &&
          record?.author === nextAuthor &&
          record?.language === nextLanguage &&
          record?.publisher === nextPublisher &&
          record?.collection === nextCollection &&
          record?.description === nextDescription &&
          (record.filePath ?? record.file_path) === targetPath &&
          noticeText.includes(`已更新“${nextTitle}”的书库元数据`) &&
          shelfText.includes(nextTitle) &&
          shelfText.includes(nextAuthor)
        );
      }, {
        timeout: 10000,
        timeoutMsg: 'expected editing shelf metadata to persist title and author without changing the stored file path'
      });
    } finally {
      if (targetPath && originalTitle && originalAuthor) {
        await updateDesktopLibraryBookMetadata(targetPath, {
          title: originalTitle,
          author: originalAuthor,
          description: originalDescription,
          language: originalLanguage,
          publisher: originalPublisher,
          collection: originalCollection
        });
      }
    }
  });

  it('removes an imported shelf book without deleting the original source file and can undo the removal', async () => {
    const removableSource = join(appDataRoot, `br1-removable-library-${Date.now()}.txt`);
    await copyFile(join(staticSamplesRoot, 'sample-book.txt'), removableSource);
    const [importedBook] = await importDesktopLibraryBooks([removableSource]);
    expect(importedBook?.filePath).toBeTruthy();
    expect(importedBook?.sourcePath).toBe(removableSource);

    await switchToLibraryWindow();
    await browser.refresh();
    const shelf = await $('[aria-label="你的书库"]');
    await shelf.waitForExist({ timeout: 10000 });

    const clickedDetails = await browser.execute((title) => {
      const libraryShelf = document.querySelector('[aria-label="你的书库"]');
      if (!(libraryShelf instanceof HTMLElement)) return false;

      const card = Array.from(libraryShelf.querySelectorAll('.book-card')).find((candidate) =>
        candidate.textContent?.includes(title)
      );
      if (!(card instanceof HTMLElement)) return false;

      const detailButton = Array.from(card.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '详情'
      );
      if (!(detailButton instanceof HTMLButtonElement)) return false;
      detailButton.click();
      return true;
    }, importedBook!.title);
    expect(clickedDetails).toBe(true);

    await browser.waitUntil(async () => {
      const panels = await $$('[aria-label^="Library metadata for "]');
      for (const panel of panels) {
        const text = await panel.getText();
        if (
          text.includes(importedBook!.title) &&
          text.includes('打开原文件') &&
          text.includes('从书库移除')
        ) return true;
      }
      return false;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the imported book metadata panel to expose source-open and remove actions'
    });

    const clickedRemove = await browser.execute((title) => {
      const libraryShelf = document.querySelector('[aria-label="你的书库"]');
      if (!(libraryShelf instanceof HTMLElement)) return false;

      const card = Array.from(libraryShelf.querySelectorAll('.book-card')).find((candidate) =>
        candidate.textContent?.includes(title)
      );
      if (!(card instanceof HTMLElement)) return false;

      const removeButton = Array.from(card.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '从书库移除'
      );
      if (!(removeButton instanceof HTMLButtonElement)) return false;

      window.confirm = () => true;
      removeButton.click();
      return true;
    }, importedBook!.title);
    expect(clickedRemove).toBe(true);

    await browser.waitUntil(async () => {
      const notice = await $('.library-notice');
      if (!(await notice.isExisting())) return false;
      const text = await notice.getText();
      return text.includes('已从书库移除') && text.includes('撤销移除');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected removing a shelf book to show an undoable library notice'
    });

    await browser.waitUntil(async () => {
      return (await loadLibraryRecordOnDisk(importedBook!.filePath)) === null;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the removed book record to leave library.json'
    });

    expect(await pathExists(removableSource)).toBe(true);
    expect(await pathExists(importedBook!.filePath)).toBe(false);

    const undoButton = await $('button=撤销移除');
    await undoButton.waitForDisplayed({ timeout: 10000 });
    await undoButton.click();

    await browser.waitUntil(async () => {
      const restoredRecord = await loadLibraryRecordOnDisk(importedBook!.filePath);
      return !!restoredRecord && (await pathExists(importedBook!.filePath));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected undoing a library removal to restore the record and br1-managed copy'
    });

    await removeDesktopLibraryBook(importedBook!.filePath);
    await rm(removableSource, { force: true });
  });

  it('removes a continue-reading book from its workflow detail panel', async () => {
    const removableSource = join(appDataRoot, `br1-continue-removable-${Date.now()}.txt`);
    await copyFile(join(staticSamplesRoot, 'sample-book.txt'), removableSource);
    const [importedBook] = await importDesktopLibraryBooks([removableSource]);
    expect(importedBook?.filePath).toBeTruthy();

    await updateLibraryRecordOnDiskByTitle(importedBook!.title, (record) => ({
      ...record,
      progress: '上次读到 44%',
      status: '继续阅读',
      progressFraction: 0.44,
      progressLocation: 'TXT-continue-remove-44',
      lastOpenedAt: Date.now()
    }));

    await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    await browser.waitUntil(async () => {
      const state = await readLibraryEntryStateForTitle(importedBook!.title);
      return !!state && state.sectionLabel === '继续阅读' && state.hasReaderHref;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the temporary TXT book to appear in the continue-reading workflow'
    });

    await toggleLibraryDetailsForTitle(importedBook!.title);
    await browser.waitUntil(async () => {
      const state = await readLibraryEntryStateForTitle(importedBook!.title);
      return !!state && state.text.includes('从书库移除') && state.text.includes('TXT-continue-remove-44');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected continue-reading details to expose a remove action and restore locator'
    });

    const clickedRemove = await browser.execute((title) => {
      const rows = Array.from(document.querySelectorAll('.continue-shelf .row'));
      const row = rows.find((candidate) => (candidate.textContent ?? '').includes(title));
      if (!(row instanceof HTMLElement)) return false;

      const removeButton = Array.from(row.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '从书库移除'
      );
      if (!(removeButton instanceof HTMLButtonElement)) return false;

      window.confirm = () => true;
      removeButton.click();
      return true;
    }, importedBook!.title);
    expect(clickedRemove).toBe(true);

    await browser.waitUntil(async () => {
      const notice = await $('.library-notice');
      if (!(await notice.isExisting())) return false;
      return (await notice.getText()).includes('已从书库移除');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected removing a continue-reading book to show a library notice'
    });

    await browser.waitUntil(async () => {
      return (await loadLibraryRecordOnDisk(importedBook!.filePath)) === null;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the removed continue-reading record to leave library.json'
    });

    expect(await pathExists(removableSource)).toBe(true);
    expect(await pathExists(importedBook!.filePath)).toBe(false);
    await rm(removableSource, { force: true });
  });

  it('can execute JavaScript inside the desktop webview', async () => {
    const readyState = await browser.execute(() => document.readyState);
    expect(readyState).toBe('complete');
  });

  it('opens a startup associated book argument in a separate reader window', async function () {
    if (!startupAssociatedBookPath) {
      this.skip();
      return;
    }

    const expectedReaderWindow = async () => {
      const handles = await browser.getWindowHandles();
      const urls: Array<{ handle: string; url: string }> = [];
      for (const handle of handles) {
        await browser.switchToWindow(handle);
        urls.push({ handle, url: await browser.getUrl() });
      }

      const matched = urls.find(({ url }) => {
        const parsed = new URL(url, 'http://localhost');
        return (
          parsed.searchParams.get('mode') === 'window' &&
          parsed.searchParams.get('source') === 'library-file' &&
          parsed.searchParams.get('path') === startupAssociatedBookPath
        );
      });

      return {
        handles,
        urls,
        matchedHandle: matched?.handle ?? null
      };
    };

    let startupState = await expectedReaderWindow();

    await browser.waitUntil(async () => {
      startupState = await expectedReaderWindow();
      return !!startupState.matchedHandle;
    }, {
      timeout: 15000,
      timeoutMsg: `expected a startup associated book argument to open a reader window\nStartup state: ${JSON.stringify(startupState)}`
    });

    expect(startupState.matchedHandle).toBeTruthy();
    await browser.switchToWindow(startupState.matchedHandle!);

    const readerShell = await $('.reader-shell');
    await readerShell.waitForDisplayed({ timeout: 10000 });

    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      if (details.stageError) {
        throw new Error(details.stageError);
      }
      return details.title === 'Bridge Reader Sample FB2' && details.formatLabel === 'FB2';
    }, {
      timeout: 20000,
      timeoutMsg: 'expected the startup associated FB2 argument to open in a reader window with readable metadata'
    });

    const readerUrl = new URL(await browser.getUrl());
    expect(readerUrl.searchParams.get('mode')).toBe('window');
    expect(readerUrl.searchParams.get('source')).toBe('library-file');
    expect(readerUrl.searchParams.get('path')).toBe(startupAssociatedBookPath);

    const remainingHandles = await browser.getWindowHandles();
    if (remainingHandles.length > 1) {
      await browser.closeWindow();
      const fallbackHandle = remainingHandles.find((handle) => handle !== startupState.matchedHandle) ?? remainingHandles[0];
      await browser.switchToWindow(fallbackHandle!);
    }
  });

  it('opens the first library book in a separate reader window', async () => {
    await switchToLibraryWindow();

    const [firstBook] = await $$('[aria-label^="Open "][aria-label$=" in reader"]');
    expect(firstBook).toBeTruthy();
    const expectedHref = await firstBook.getAttribute('href');
    expect(expectedHref).toBeTruthy();
    const expectedTarget = new URL(expectedHref!, 'http://localhost');
    expect(expectedTarget.searchParams.get('source')).toBe('library-file');
    expect(expectedTarget.searchParams.get('path')).toBeTruthy();

    const initialHandles = await browser.getWindowHandles();
    await firstBook.click();

    await browser.waitUntil(async () => {
      const handles = await browser.getWindowHandles();
      return handles.length > initialHandles.length;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected a reader window to open after clicking the first book'
    });

    const nextHandles = await browser.getWindowHandles();
    const readerHandle = nextHandles.find((handle) => !initialHandles.includes(handle));
    expect(readerHandle).toBeTruthy();

    await browser.switchToWindow(readerHandle!);

    const readerShell = await $('.reader-shell');
    await readerShell.waitForDisplayed({ timeout: 10000 });
    expect(await readerShell.isDisplayed()).toBe(true);

    const readerChrome = await $('[aria-label="reader window chrome"]');
    await readerChrome.waitForExist({ timeout: 10000 });
    expect(await readerChrome.isExisting()).toBe(true);

    const readerUrl = await browser.getUrl();
    const openedTarget = new URL(readerUrl, 'http://localhost');
    expect(openedTarget.pathname).toBe(expectedTarget.pathname);
    expect(openedTarget.searchParams.get('mode')).toBe('window');
    expect(openedTarget.searchParams.get('source')).toBe('library-file');
    expect(openedTarget.searchParams.get('path')).toBe(expectedTarget.searchParams.get('path'));

    const readerStage = await $('[aria-label="reader stage"]');
    await readerStage.waitForDisplayed({ timeout: 10000 });
    expect(await readerStage.isDisplayed()).toBe(true);
  });

  it('normalizes associated book requests before opening a separate reader window', async () => {
    const libraryHandle = await switchToLibraryWindow();
    const handlesBeforeQueue = await browser.getWindowHandles();
    const fb2Path = join(staticSamplesRoot, 'sample-book.fb2');
    const fb2FileUrl = new URL(`file://${fb2Path}`).toString();

    const queuedCount = await queueAssociatedBookOpenRequests([
      fb2Path,
      `  "${fb2Path}"  `,
      `file://localhost${fb2Path}`,
      fb2FileUrl
    ]);
    expect(queuedCount).toBe(1);

    await browser.waitUntil(async () => {
      const handles = await browser.getWindowHandles();
      return handles.length > handlesBeforeQueue.length;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected an associated book open request to create a reader window'
    });

    const handlesAfterQueue = await browser.getWindowHandles();
    const readerHandle = handlesAfterQueue.find((handle) => !handlesBeforeQueue.includes(handle));
    expect(readerHandle).toBeTruthy();

    await browser.switchToWindow(readerHandle!);

    const readerShell = await $('.reader-shell');
    await readerShell.waitForDisplayed({ timeout: 10000 });

    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      if (details.stageError) {
        throw new Error(details.stageError);
      }
      return details.title === 'Bridge Reader Sample FB2' && details.formatLabel === 'FB2';
    }, {
      timeout: 20000,
      timeoutMsg: 'expected the associated FB2 request to open in a reader window with readable metadata'
    });

    const readerUrl = new URL(await browser.getUrl());
    expect(readerUrl.searchParams.get('mode')).toBe('window');
    expect(readerUrl.searchParams.get('source')).toBe('library-file');
    expect(readerUrl.searchParams.get('path')).toBe(fb2Path);

    const handlesAfterOpen = await browser.getWindowHandles();
    expect(handlesAfterOpen.filter((handle) => !handlesBeforeQueue.includes(handle))).toHaveLength(1);

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
  });

  it('loads metadata after opening the first library book', async () => {
    const { details } = await openUsableReaderBook();

    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      return !details.stageError && typeof details.total === 'number' && details.total > 0;
    }, {
      timeout: 15000,
      timeoutMsg: 'expected the first book to load without a stage error and expose location state'
    });

    expect(details.title).toBeTruthy();
  });

  it('keeps the rendered book page inside the reader stage instead of the sidebar column', async () => {
    await openUsableReaderBook();

    let geometry = await readReaderGeometry();

    await browser.waitUntil(async () => {
      geometry = await readReaderGeometry();
      const rendered = geometry.paginatorContainer ?? geometry.rendered;
      const firstVisibleContentRect = geometry.firstVisibleTextRect ?? geometry.firstVisibleContentRect;
      if (!geometry.stage || !geometry.sidebar || !rendered || !firstVisibleContentRect) return false;

      return (
        rendered.left >= geometry.stage.left - 4 &&
        rendered.left >= geometry.sidebar.right - 4 &&
        rendered.top <= geometry.stage.top + geometry.stage.height * 0.25 &&
        rendered.width >= geometry.stage.width * 0.25 &&
        rendered.height >= geometry.stage.height * 0.25 &&
        firstVisibleContentRect.left >= geometry.stage.left + geometry.stage.width * 0.08 &&
        firstVisibleContentRect.right <= geometry.stage.right - geometry.stage.width * 0.08 &&
        firstVisibleContentRect.top >= geometry.stage.top &&
        firstVisibleContentRect.top <= geometry.stage.top + geometry.stage.height * 0.72 &&
        firstVisibleContentRect.width >= Math.max(120, geometry.stage.width * 0.14)
      );
    }, {
      timeout: 20000,
      timeoutMsg:
        'expected the rendered book page and its first visible text block to stay inside the reader stage instead of collapsing toward the sidebar or lower-left corner'
    }).catch(async (error) => {
      geometry = await readReaderGeometry();
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nGeometry: ${JSON.stringify(geometry)}`
      );
    });
  });

  it('restores a library-file epub into a visible reading position inside the reader stage', async () => {
    const { expectedLocation } = await openRestorableReaderBook();

    let geometry = await readReaderGeometry();

    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      geometry = await readReaderGeometry();
      const rendered = geometry.paginatorContainer ?? geometry.rendered;
      const firstVisibleContentRect = geometry.firstVisibleTextRect ?? geometry.firstVisibleContentRect;

      if (details.stageError) {
        throw new Error(details.stageError);
      }

      if (!geometry.stage || !geometry.sidebar || !rendered || !firstVisibleContentRect) return false;
      if (!!expectedLocation && !details.cfi) return false;

      return (
        rendered.left >= geometry.stage.left - 4 &&
        rendered.right <= geometry.stage.right + 4 &&
        rendered.width >= geometry.stage.width * 0.2 &&
        firstVisibleContentRect.left >= geometry.stage.left + geometry.stage.width * 0.04 &&
        firstVisibleContentRect.right <= geometry.stage.right - geometry.stage.width * 0.04 &&
        firstVisibleContentRect.top >= geometry.stage.top &&
        firstVisibleContentRect.bottom <= geometry.stage.bottom
      );
    }, {
      timeout: 20000,
      timeoutMsg:
        'expected a restorable library-file EPUB to reopen at a valid reading position with visible text inside the reader stage'
    }).catch(async (error) => {
      const details = await readReaderDetails();
      geometry = await readReaderGeometry();
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nReader: ${JSON.stringify(details)}\nGeometry: ${JSON.stringify(geometry)}`
      );
    });
  });

  it('changes the visible epub reading column width when the view width mode changes', async () => {
    await openUsableReaderBook();

    await browser.waitUntil(async () => {
      const geometry = await readReaderGeometry();
      return !!geometry.paginatorContainer?.width;
    }, {
      timeout: 15000,
      timeoutMsg: 'expected the EPUB reader to expose a paginator container before testing width modes'
    });

    await setReaderViewWidthMode('focus');
    let focusGeometry = await readReaderGeometry();
    let focusChrome = await readReaderChromeGeometry();
    await browser.waitUntil(async () => {
      focusGeometry = await readReaderGeometry();
      focusChrome = await readReaderChromeGeometry();
      return !!focusGeometry.paginatorContainer?.width && !!focusChrome.headerFrame?.width && !!focusChrome.footerFrame?.width;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected focus mode to keep a visible paginator container'
    });

    await setReaderViewWidthMode('wide');
    let wideGeometry = await readReaderGeometry();
    let wideChrome = await readReaderChromeGeometry();
    await browser.waitUntil(async () => {
      wideGeometry = await readReaderGeometry();
      wideChrome = await readReaderChromeGeometry();
      return !!wideGeometry.paginatorContainer?.width && !!wideChrome.headerFrame?.width && !!wideChrome.footerFrame?.width;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected wide mode to keep a visible paginator container'
    });

    expect(focusGeometry.paginatorContainer).toBeTruthy();
    expect(wideGeometry.paginatorContainer).toBeTruthy();
    expect(wideGeometry.paginatorContainer.width).toBeGreaterThan(focusGeometry.paginatorContainer.width + 40);
    expect(focusChrome.canvas).toBeTruthy();
    expect(focusChrome.headerFrame).toBeTruthy();
    expect(focusChrome.footerFrame).toBeTruthy();
    expect(wideChrome.canvas).toBeTruthy();
    expect(wideChrome.headerFrame).toBeTruthy();
    expect(wideChrome.footerFrame).toBeTruthy();
    expect(focusGeometry.sidebar).toBeTruthy();
    expect(wideGeometry.sidebar).toBeTruthy();
    expect(Math.abs(focusChrome.headerFrame.width - focusChrome.canvas.width)).toBeLessThanOrEqual(40);
    expect(Math.abs(focusChrome.footerFrame.width - focusChrome.canvas.width)).toBeLessThanOrEqual(40);
    expect(Math.abs(wideChrome.headerFrame.width - wideChrome.canvas.width)).toBeLessThanOrEqual(40);
    expect(Math.abs(wideChrome.footerFrame.width - wideChrome.canvas.width)).toBeLessThanOrEqual(40);
    expect(focusChrome.canvas.left - focusGeometry.sidebar.right).toBeGreaterThanOrEqual(12);
    expect(wideChrome.canvas.left - wideGeometry.sidebar.right).toBeGreaterThanOrEqual(12);
  });

  it('opens FB2, MOBI, AZW3, CBZ, and TXT library-file samples in separate reader windows', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();

    await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    for (const sample of sampleLibraryFormats) {
      const sourcePath = join(staticSamplesRoot, sample.fileName);
      const importedBook = importedBooks.find((book) => book.sourcePath === sourcePath);
      expect(importedBook).toBeTruthy();
      expect(importedBook?.filePath).toBeTruthy();

      const { libraryHandle } = await openReaderFromLibraryPath(importedBook!.filePath);

      try {
        await browser.waitUntil(async () => {
          const details = await readReaderDetails();
          if (details.stageError) {
            throw new Error(details.stageError);
          }

          return (
            !!details.title &&
            details.formatLabel === sample.expectedLabel &&
            details.layoutLabel === sample.expectedLayout &&
            details.locationLabel !== 'Opening book'
          );
        }, {
          timeout: 20000,
          timeoutMsg: `expected ${sample.format} library-file sample to open in a desktop reader window`
        });

        const details = await readReaderDetails();
        expect(details.formatLabel).toBe(sample.expectedLabel);
        expect(details.layoutLabel).toBe(sample.expectedLayout);
      } finally {
        await cleanupReaderAttempt(libraryHandle);
      }
    }
  });

  it('moves FB2, MOBI, AZW3, CBZ, and TXT imports into the library reading workflow after returning from reader', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();

    const libraryHandle = await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    for (const sample of sampleLibraryFormats) {
      const sourcePath = join(staticSamplesRoot, sample.fileName);
      const importedBook = importedBooks.find((book) => book.sourcePath === sourcePath);
      expect(importedBook).toBeTruthy();
      expect(importedBook?.filePath).toBeTruthy();

      const originalRecord = await loadLibraryRecordOnDisk(importedBook!.filePath);
      const originalOpenedAt = originalRecord?.lastOpenedAt ?? 0;
      let readerHref: string | null = null;
      await browser.waitUntil(async () => {
        readerHref = await readLibraryHrefForPath(importedBook!.filePath);
        return !!readerHref;
      }, {
        timeout: 15000,
        timeoutMsg: `expected ${sample.format} sample to expose a library reader href before validating workflow persistence`
      });

      const readerUrl = new URL(readerHref!, 'http://127.0.0.1:1420').toString();

      await browser.switchToWindow(libraryHandle);
      await browser.url(readerUrl);
      await $('.reader-stage').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const details = await readReaderDetails();
        if (details.stageError) {
          throw new Error(details.stageError);
        }

        return (
          !!details.title &&
          details.formatLabel === sample.expectedLabel &&
          details.layoutLabel === sample.expectedLayout &&
          details.locationLabel !== 'Opening book'
        );
      }, {
        timeout: 20000,
        timeoutMsg: `expected ${sample.format} sample to open before validating library workflow persistence`
      }).catch(async (error) => {
        const details = await readReaderDetails();
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nFormat: ${sample.format}\nReader URL: ${readerUrl}\nReader: ${JSON.stringify(
            details
          )}`
        );
      });

      const openedDetails = await readReaderDetails();
      await advanceReaderBeyond(openedDetails, `${sample.format} sample before validating persisted restore state`).catch(
        async (error) => {
          const details = await readReaderDetails();
          throw new Error(
            `${error instanceof Error ? error.message : String(error)}\nFormat: ${sample.format}\nReader URL: ${readerUrl}\nCurrent reader: ${JSON.stringify(
              details
            )}`
          );
        }
      );

      const goToLibraryButton = await $('[aria-label="Go to library"]');
      await goToLibraryButton.waitForDisplayed({ timeout: 10000 });
      await goToLibraryButton.click();

      await browser.switchToWindow(libraryHandle);
      await $('.library-page').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const updatedRecord = await loadLibraryRecordOnDisk(importedBook!.filePath);
        if (!updatedRecord) return false;
        return (updatedRecord.lastOpenedAt ?? 0) > originalOpenedAt;
      }, {
        timeout: 30000,
        timeoutMsg: `expected returning from ${sample.format} reader to persist a newer lastOpenedAt`
      });

      await browser.refresh();

      await browser.waitUntil(async () => {
        const sections = await readLibraryWorkflowSections();
        const updatedRecord = await loadLibraryRecordOnDisk(importedBook!.filePath);
        const refreshedHref = await readLibraryHrefForPath(importedBook!.filePath);
        const restoreTarget = refreshedHref ? new URL(refreshedHref, 'http://localhost') : null;
        const hasPersistedRestoreSignal =
          !!updatedRecord &&
          (((updatedRecord.progressFraction ?? 0) > 0) || !!updatedRecord.progressLocation);
        const hasReaderHrefRestoreSignal =
          !!restoreTarget &&
          (!!restoreTarget.searchParams.get('location') ||
            Number(restoreTarget.searchParams.get('fraction') ?? '0') > 0);

        return (
          (sections.continueReading.includes(importedBook!.filePath) ||
            sections.recentReading.includes(importedBook!.filePath)) &&
          !sections.shelf.includes(importedBook!.filePath) &&
          hasPersistedRestoreSignal &&
          hasReaderHrefRestoreSignal
        );
      }, {
        timeout: 30000,
        timeoutMsg: `expected ${sample.format} to persist restore progress and move from shelf into continue/recent reading after returning from reader`
      }).catch(async (error) => {
        const updatedRecord = await loadLibraryRecordOnDisk(importedBook!.filePath);
        const sections = await readLibraryWorkflowSections();
        const refreshedHref = await readLibraryHrefForPath(importedBook!.filePath);
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nFormat: ${sample.format}\nFile path: ${
            importedBook!.filePath
          }\nPersisted record: ${JSON.stringify(updatedRecord)}\nReader href: ${refreshedHref}\nSections: ${JSON.stringify(
            sections
          )}`
        );
      });
    }
  });

  it('surfaces library recovery actions when original files or library copies disappear', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();

    const sourcePath = join(staticSamplesRoot, 'sample-book.txt');
    const importedBook = importedBooks.find((book) => book.sourcePath === sourcePath);
    expect(importedBook).toBeTruthy();
    expect(importedBook?.filePath).toBeTruthy();

    const libraryHandle = await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    let readerHref: string | null = null;
    await browser.waitUntil(async () => {
      readerHref = await readLibraryHrefForPath(importedBook!.filePath);
      return !!readerHref;
    }, {
      timeout: 15000,
      timeoutMsg: 'expected the TXT sample to expose a reader href before seeding a recovery regression'
    });

    const readerUrl = new URL(readerHref!, 'http://127.0.0.1:1420').toString();

    await browser.switchToWindow(libraryHandle);
    await browser.url(readerUrl);
    await $('.reader-stage').waitForDisplayed({ timeout: 10000 });
    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      if (details.stageError) {
        throw new Error(details.stageError);
      }

      return (
        !!details.title &&
        details.formatLabel === 'TXT' &&
        details.layoutLabel === 'SCROLL' &&
        details.locationLabel !== 'Opening book'
      );
    }, {
      timeout: 20000,
      timeoutMsg: 'expected the TXT sample to open before returning it into the reading workflow'
    });

    const goToLibraryButton = await $('[aria-label="Go to library"]');
    await goToLibraryButton.waitForDisplayed({ timeout: 10000 });
    await goToLibraryButton.click();

    await browser.switchToWindow(libraryHandle);
    await $('.library-page').waitForDisplayed({ timeout: 10000 });
    await browser.waitUntil(async () => {
      const sections = await readLibraryWorkflowSections();
      return (
        sections.continueReading.includes(importedBook!.filePath) ||
        sections.recentReading.includes(importedBook!.filePath)
      );
    }, {
      timeout: 30000,
      timeoutMsg: 'expected the TXT sample to return into the continue/recent workflow before validating library recovery states'
    });

    const originalRecord = await loadLibraryRecordOnDisk(importedBook!.filePath);
    expect(originalRecord).toBeTruthy();

    try {
      await updateLibraryRecordOnDiskByTitle(importedBook!.title, (record) => ({
        ...record,
        sourcePath: join(appDataRoot, 'missing-source.txt')
      }));

      await browser.refresh();
      await $('.library-page').waitForDisplayed({ timeout: 10000 });
      await toggleLibraryDetailsForTitle(importedBook!.title);
      await browser.waitUntil(async () => {
        const state = await readLibraryEntryStateForTitle(importedBook!.title);
        return !!state &&
          (state.sectionLabel === '继续阅读' || state.sectionLabel === '最近阅读') &&
          state.hasReaderHref &&
          state.hasImportButton &&
          !state.hasSourceButton &&
          state.text.includes('原文件缺失，可继续使用书库副本');
      }, {
        timeout: 10000,
        timeoutMsg: 'expected the library workflow to surface a recoverable missing-source state while keeping the reader entry'
      });

      await updateLibraryRecordOnDiskByTitle(importedBook!.title, (record) => ({
        ...record,
        filePath: join(appDataRoot, 'missing-library-copy.txt'),
        sourcePath: originalRecord?.sourcePath ?? sourcePath
      }));

      await browser.refresh();
      await $('.library-page').waitForDisplayed({ timeout: 10000 });
      await toggleLibraryDetailsForTitle(importedBook!.title);
      await browser.waitUntil(async () => {
        const state = await readLibraryEntryStateForTitle(importedBook!.title);
        return !!state &&
          (state.sectionLabel === '继续阅读' || state.sectionLabel === '最近阅读') &&
          !state.hasReaderHref &&
          state.hasImportButton &&
          !state.hasSourceButton &&
          state.text.includes('需修复');
      }, {
        timeout: 10000,
        timeoutMsg: 'expected the library workflow to disable reading and surface recovery when the stored library copy disappears'
      });
    } finally {
      await updateLibraryRecordOnDiskByTitle(importedBook!.title, () => originalRecord as Record<string, unknown>);
      await browser.refresh();
      await $('.library-page').waitForDisplayed({ timeout: 10000 });
    }
  });

  it('repairs a broken local library record by reimporting the same source file without duplicating it', async function () {
    this.timeout(120000);
    const sourcePath = join(staticSamplesRoot, 'sample-book.txt');
    const [importedBook] = await importDesktopLibraryBooks([sourcePath]);
    expect(importedBook).toBeTruthy();
    expect(importedBook?.filePath).toBeTruthy();

    const originalRecord = await loadLibraryRecordOnDisk(importedBook!.filePath);
    expect(originalRecord).toBeTruthy();

    try {
      await updateLibraryRecordOnDiskByTitle(importedBook!.title, (record) => ({
        ...record,
        progress: '上次读到 41%',
        status: '继续阅读',
        progressFraction: 0.41,
        progressLocation: 'TXT-restore-41',
        filePath: join(appDataRoot, 'missing-repair-copy.txt'),
        sourcePath
      }));

      await switchToLibraryWindow();
      await browser.refresh();
      await $('.library-page').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const state = await readLibraryEntryStateForTitle(importedBook!.title);
        return !!state && state.sectionLabel === '待修复书籍' && state.hasRepairAction && !state.hasReaderHref;
      }, {
        timeout: 10000,
        timeoutMsg: 'expected the broken TXT record to move into the repair queue before reimporting it'
      }).catch(async (error) => {
        const state = await readLibraryEntryStateForTitle(importedBook!.title);
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nLibrary state: ${JSON.stringify(state)}`
        );
      });

      await clickLibraryRowActionForTitle(importedBook!.title, '修复副本');
      await $('.library-page').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const state = await readLibraryEntryStateForTitle(importedBook!.title);
        const noticeText = await browser.execute(() => {
          return document.querySelector('.library-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        });
        return (
          !!state &&
          state.sectionLabel !== '待修复书籍' &&
          state.hasReaderHref &&
          !state.hasImportButton &&
          noticeText.includes(`已从原文件重建“${importedBook!.title}”的书库副本`)
        );
      }, {
        timeout: 10000,
        timeoutMsg: 'expected the row-level repair action to rebuild the TXT copy and return it to the normal reading workflow'
      });

      const records = await loadLibraryRecordsOnDisk();
      const matchingRecords = records.filter((record) => {
        const recordPath = (record.filePath ?? record.file_path ?? '') as string;
        return (
          (record.title ?? '') === importedBook!.title &&
          /\.txt$/i.test(recordPath)
        );
      });
      expect(matchingRecords).toHaveLength(1);
      expect(matchingRecords[0]?.progressFraction).toBe(0.41);
      expect(matchingRecords[0]?.progressLocation).toBe('TXT-restore-41');
      expect(matchingRecords[0]?.filePath).not.toContain('missing-repair-copy');
    } finally {
      await updateLibraryRecordOnDiskByTitle(importedBook!.title, () => originalRecord as Record<string, unknown>);
    }
  });

  it('bulk repairs eligible broken library copies while leaving manual relink items in the repair queue', async function () {
    this.timeout(120000);
    const txtSourcePath = join(staticSamplesRoot, 'sample-book.txt');
    const cbzSourcePath = join(staticSamplesRoot, 'sample-comic.cbz');
    const [txtBook, cbzBook] = await importDesktopLibraryBooks([txtSourcePath, cbzSourcePath]);
    expect(txtBook?.filePath).toBeTruthy();
    expect(cbzBook?.filePath).toBeTruthy();

    const originalTxtRecord = await loadLibraryRecordOnDisk(txtBook!.filePath);
    const originalCbzRecord = await loadLibraryRecordOnDisk(cbzBook!.filePath);
    expect(originalTxtRecord).toBeTruthy();
    expect(originalCbzRecord).toBeTruthy();

    try {
      await updateLibraryRecordOnDiskByTitle(txtBook!.title, (record) => ({
        ...record,
        progress: '上次读到 33%',
        status: '继续阅读',
        progressFraction: 0.33,
        progressLocation: 'TXT-bulk-repair-33',
        filePath: join(appDataRoot, 'missing-bulk-repair-copy.txt'),
        sourcePath: txtSourcePath
      }));
      await updateLibraryRecordOnDiskByTitle(cbzBook!.title, (record) => ({
        ...record,
        progress: '上次读到 57%',
        status: '继续阅读',
        progressFraction: 0.57,
        progressLocation: 'CBZ-manual-repair-57',
        filePath: join(appDataRoot, 'missing-manual-repair-copy.cbz'),
        sourcePath: join(appDataRoot, 'missing-original-source.cbz')
      }));

      await switchToLibraryWindow();
      await browser.refresh();
      await $('.library-page').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const txtState = await readLibraryEntryStateForTitle(txtBook!.title);
        const cbzState = await readLibraryEntryStateForTitle(cbzBook!.title);
        return (
          !!txtState &&
          !!cbzState &&
          txtState.sectionLabel === '待修复书籍' &&
          cbzState.sectionLabel === '待修复书籍' &&
          txtState.hasRepairAction &&
          cbzState.hasRepairAction &&
          !txtState.hasReaderHref &&
          !cbzState.hasReaderHref
        );
      }, {
        timeout: 10000,
        timeoutMsg: 'expected both broken books to enter the repair queue before running the bulk repair action'
      }).catch(async (error) => {
        const txtState = await readLibraryEntryStateForTitle(txtBook!.title);
        const cbzState = await readLibraryEntryStateForTitle(cbzBook!.title);
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nTXT state: ${JSON.stringify(txtState)}\nCBZ state: ${JSON.stringify(cbzState)}`
        );
      });

      await browser.waitUntil(async () => {
        const cbzState = await readLibraryEntryStateForTitle(cbzBook!.title);
        const repairSectionText = await browser.execute(() => {
          const section = document.querySelector('[aria-label="待修复书籍"]')?.closest('.continue-shelf');
          return section?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        });
        const headerStatusText = await browser.execute(() => {
          return document
            .querySelector('[aria-label="library status summary"]')
            ?.textContent
            ?.replace(/\s+/g, ' ')
            .trim() ?? '';
        });
        return (
          !!cbzState &&
          cbzState.text.includes('待复核') &&
          cbzState.text.includes('先复核再重关联') &&
          headerStatusText.includes('待修复 2 · 可批量 1 · 需复核 1') &&
          repairSectionText.includes('共 2 本待处理') &&
          repairSectionText.includes('1 本可批量修复副本') &&
          repairSectionText.includes('1 本需逐本复核重关联')
        );
      }, {
        timeout: 10000,
        timeoutMsg: 'expected the repair queue summary and manual-only row labels before bulk repair runs'
      });

      const mismatchedPreview = await previewDesktopLibraryRepairCandidate(
        txtSourcePath,
        'CBZ',
        cbzBook!.title,
        'Unknown author',
        cbzSourcePath
      );
      expect(mismatchedPreview.fileExists).toBe(true);
      expect(mismatchedPreview.format).toBe('TXT');
      expect(mismatchedPreview.title).toBe('sample-book');
      expect(mismatchedPreview.author).toBe('Unknown author');
      expect(mismatchedPreview.byteSize ?? 0).toBeGreaterThan(0);
      expect(mismatchedPreview.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(mismatchedPreview.formatMatches).toBe(false);
      expect(mismatchedPreview.titleMatches).toBe(false);
      expect(mismatchedPreview.authorMatches).toBe(true);
      expect(mismatchedPreview.sourcePathMatches).toBe(false);
      expect(mismatchedPreview.sourceHashMatches).toBe(false);

      const matchedPreview = await previewDesktopLibraryRepairCandidate(
        cbzSourcePath,
        'CBZ',
        cbzBook!.title,
        'Unknown author',
        cbzSourcePath
      );
      expect(matchedPreview.fileExists).toBe(true);
      expect(matchedPreview.format).toBe('CBZ');
      expect(matchedPreview.title).toBe(cbzBook!.title);
      expect(matchedPreview.byteSize ?? 0).toBeGreaterThan(0);
      expect(matchedPreview.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(matchedPreview.formatMatches).toBe(true);
      expect(matchedPreview.titleMatches).toBe(true);
      expect(matchedPreview.authorMatches).toBe(true);
      expect(matchedPreview.sourcePathMatches).toBe(true);
      expect(matchedPreview.sourceHashMatches).toBe(true);

      await browser.execute((expectedTitle) => {
        const rows = Array.from(document.querySelectorAll('.continue-shelf .row'));
        const row = rows.find((candidate) => (candidate.textContent ?? '').includes(expectedTitle));
        if (!(row instanceof HTMLElement)) {
          throw new Error(`expected to find a repair-queue row for ${expectedTitle}`);
        }

        const button = Array.from(row.querySelectorAll('button')).find(
          (candidate) => candidate.textContent?.trim() === '先复核再重关联'
        );
        if (!(button instanceof HTMLButtonElement)) {
          throw new Error(`expected the manual review button for ${expectedTitle}`);
        }

        button.click();
      }, cbzBook!.title);
      await browser.waitUntil(async () => {
        const state = await browser.execute((expectedTitle) => {
          const panel = document.querySelector(
            `.detail-panel[aria-label="Details for ${expectedTitle}"]`
          );
          return panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        }, cbzBook!.title);
        return (
          state.includes('这本书需要先核对当前记录，再选择替换文件') &&
          state.includes('逐本复核') &&
          state.includes('修复契约') &&
          state.includes('保留阅读状态、百分比进度和恢复定位') &&
          state.includes('不会新建重复书目') &&
          state.includes('当前没有检测到同类冲突') &&
          state.includes('替换文件预检') &&
          state.includes('格式、标题、作者、原路径和 SHA-256 指纹') &&
          state.includes('确认后选择替换文件')
        );
      }, {
        timeout: 10000,
        timeoutMsg: 'expected the manual-only repair row to open a review panel before exposing the replacement-file action'
      });

      await browser.waitUntil(async () => {
        const labels = await readLibrarySectionHeaderActionLabels('待修复书籍');
        return labels.some((label) => label.startsWith('批量修复副本'));
      }, {
        timeout: 10000,
        timeoutMsg: 'expected the repair queue to expose the bulk repair header action once an eligible book is present'
      }).catch(async (error) => {
        const labels = await readLibrarySectionHeaderActionLabels('待修复书籍');
        const txtState = await readLibraryEntryStateForTitle(txtBook!.title);
        const cbzState = await readLibraryEntryStateForTitle(cbzBook!.title);
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nHeader actions: ${JSON.stringify(labels)}\nTXT state: ${JSON.stringify(txtState)}\nCBZ state: ${JSON.stringify(cbzState)}`
        );
      });

      await clickLibrarySectionHeaderAction('待修复书籍', '批量修复副本');

      await browser.waitUntil(async () => {
        const noticeText = await $('.library-notice').getText();
        const txtState = await readLibraryEntryStateForTitle(txtBook!.title);
        const cbzState = await readLibraryEntryStateForTitle(cbzBook!.title);
        return (
          noticeText.includes('已批量重建 1 本书的书库副本') &&
          noticeText.includes('仍有 1 本需要手动重新关联或重新选择文件') &&
          !!txtState &&
          !!cbzState &&
          txtState.sectionLabel !== '待修复书籍' &&
          txtState.hasReaderHref &&
          !txtState.hasImportButton &&
          cbzState.sectionLabel === '待修复书籍' &&
          cbzState.hasRepairAction &&
          !cbzState.hasReaderHref
        );
      }, {
        timeout: 10000,
        timeoutMsg: 'expected bulk repair to restore only the eligible TXT record and keep the manual CBZ repair in the queue'
      });

      await browser.waitUntil(async () => {
        const repairSectionText = await browser.execute(() => {
          const section = document.querySelector('[aria-label="待修复书籍"]')?.closest('.continue-shelf');
          return section?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        });
        const headerStatusText = await browser.execute(() => {
          return document
            .querySelector('[aria-label="library status summary"]')
            ?.textContent
            ?.replace(/\s+/g, ' ')
            .trim() ?? '';
        });
        return (
          headerStatusText.includes('待修复 1 · 可批量 0 · 需复核 1') &&
          repairSectionText.includes('已批量重建 1 本书的书库副本，仍有 1 本需要手动重新关联或重新选择文件。') &&
          repairSectionText.includes('共 1 本待处理') &&
          repairSectionText.includes('0 本可批量修复副本') &&
          repairSectionText.includes('1 本需逐本复核重关联')
        );
      }, {
        timeout: 10000,
        timeoutMsg: 'expected the repair queue summary to update after bulk repair completes'
      });

      const records = await loadLibraryRecordsOnDisk();
      const repairedTxtRecords = records.filter((record) => {
        const recordPath = (record.filePath ?? record.file_path ?? '') as string;
        return (record.title ?? '') === txtBook!.title && /\.txt$/i.test(recordPath);
      });
      expect(repairedTxtRecords).toHaveLength(1);
      expect(repairedTxtRecords[0]?.progressFraction).toBe(0.33);
      expect(repairedTxtRecords[0]?.progressLocation).toBe('TXT-bulk-repair-33');
      expect(repairedTxtRecords[0]?.filePath).not.toContain('missing-bulk-repair-copy');

      const manualCbzRecord = await loadLibraryRecordBySourcePathOnDisk(join(appDataRoot, 'missing-original-source.cbz'));
      expect(manualCbzRecord?.progressFraction).toBe(0.57);
      expect(manualCbzRecord?.progressLocation).toBe('CBZ-manual-repair-57');
      expect(manualCbzRecord?.filePath).toContain('missing-manual-repair-copy');
    } finally {
      await updateLibraryRecordOnDiskByTitle(txtBook!.title, () => originalTxtRecord as Record<string, unknown>);
      await updateLibraryRecordOnDiskByTitle(cbzBook!.title, () => originalCbzRecord as Record<string, unknown>);
      await browser.refresh();
      await $('.library-page').waitForDisplayed({ timeout: 10000 });
    }
  });

  it('reopens FB2, MOBI, AZW3, CBZ, and TXT imports with stored restore progress', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();

    const libraryHandle = await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    for (const sample of sampleLibraryFormats) {
      const sourcePath = join(staticSamplesRoot, sample.fileName);
      const importedBook = importedBooks.find((book) => book.sourcePath === sourcePath);
      expect(importedBook).toBeTruthy();
      expect(importedBook?.filePath).toBeTruthy();

      let initialHref: string | null = null;
      await browser.waitUntil(async () => {
        initialHref = await readLibraryHrefForPath(importedBook!.filePath);
        return !!initialHref;
      }, {
        timeout: 15000,
        timeoutMsg: `expected ${sample.format} sample to expose an initial library reader href before seeding restore progress`
      });

      const initialReaderUrl = new URL(initialHref!, 'http://127.0.0.1:1420').toString();

      await browser.switchToWindow(libraryHandle);
      await browser.url(initialReaderUrl);
      await $('.reader-stage').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const details = await readReaderDetails();
        if (details.stageError) {
          throw new Error(details.stageError);
        }

        return (
          !!details.title &&
          details.formatLabel === sample.expectedLabel &&
          details.layoutLabel === sample.expectedLayout &&
          details.locationLabel !== 'Opening book'
        );
      }, {
        timeout: 20000,
        timeoutMsg: `expected ${sample.format} sample to open before seeding restore progress`
      });

      const openedDetails = await readReaderDetails();
      await advanceReaderBeyond(openedDetails, `${sample.format} sample before reopening it with restore progress`);

      const goToLibraryButton = await $('[aria-label="Go to library"]');
      await goToLibraryButton.waitForDisplayed({ timeout: 10000 });
      await goToLibraryButton.click();

      await browser.switchToWindow(libraryHandle);
      await $('.library-page').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const record = await loadLibraryRecordOnDisk(importedBook!.filePath);
        return !!record && (((record.progressFraction ?? 0) > 0) || !!record.progressLocation);
      }, {
        timeout: 30000,
        timeoutMsg: `expected ${sample.format} sample to persist restore progress before reopening it`
      });

      await browser.refresh();
      await $('.library-page').waitForDisplayed({ timeout: 10000 });

      let restorableHref: string | null = null;
      await browser.waitUntil(async () => {
        restorableHref = await readLibraryHrefForPath(importedBook!.filePath);
        if (!restorableHref) return false;
        const target = new URL(restorableHref, 'http://localhost');
        return !!target.searchParams.get('location') || Number(target.searchParams.get('fraction') ?? '0') > 0;
      }, {
        timeout: 30000,
        timeoutMsg: `expected ${sample.format} sample to expose a restorable library reader href after returning from reader`
      });

      const persistedRecord = await loadLibraryRecordOnDisk(importedBook!.filePath);
      expect(persistedRecord).toBeTruthy();
      expect(
        !!persistedRecord?.progressLocation || ((persistedRecord?.progressFraction ?? 0) > 0)
      ).toBe(true);

      const restorableTarget = new URL(restorableHref!, 'http://localhost');
      const expectedFraction = Number(restorableTarget.searchParams.get('fraction') ?? '0');
      const expectedLocation = restorableTarget.searchParams.get('location') ?? '';

      const { readerHandle } = await openReaderFromLibraryPath(importedBook!.filePath, libraryHandle);

      try {
        await browser.waitUntil(async () => {
          const details = await readReaderDetails();
          if (details.stageError) {
            throw new Error(details.stageError);
          }

          const restoredByFraction =
            expectedFraction > 0 &&
            typeof details.progressFraction === 'number' &&
            details.progressFraction >=
              Math.max(openedDetails.progressFraction ?? 0, expectedFraction - 0.05);
          const restoredByLocation =
            !!expectedLocation &&
            ((!!details.cfi && details.cfi !== (openedDetails.cfi ?? '')) ||
              (!!details.locationLabel &&
                details.locationLabel !== 'Opening book' &&
                details.locationLabel !== (openedDetails.locationLabel ?? '')));
          const restoredByVisibleState =
            !expectedLocation &&
            expectedFraction <= 0 &&
            !!details.locationLabel &&
            details.locationLabel !== 'Not opened' &&
            details.locationLabel !== 'Opening book' &&
            details.locationLabel !== (openedDetails.locationLabel ?? '');

          return (
            !!details.title &&
            details.formatLabel === sample.expectedLabel &&
            details.layoutLabel === sample.expectedLayout &&
            (restoredByFraction || restoredByLocation || restoredByVisibleState)
          );
        }, {
          timeout: 30000,
          timeoutMsg: `expected ${sample.format} sample to reopen with visible restore progress inside the reader stage`
        }).catch(async (error) => {
          const details = await readReaderDetails();
          throw new Error(
            `${error instanceof Error ? error.message : String(error)}\nFormat: ${sample.format}\nRestorable href: ${
              restorableHref ?? ''
            }\nPersisted record: ${JSON.stringify(persistedRecord)}\nOpened details: ${JSON.stringify(
              openedDetails
            )}\nCurrent reader: ${JSON.stringify(details)}`
          );
        });
      } finally {
        await browser.switchToWindow(readerHandle);
        await cleanupReaderAttempt(libraryHandle);
      }
    }
  });

  it('keeps cbz library metadata human-readable after reader round-trips', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();
    const cbzBook = importedBooks.find((book) => book.format === 'CBZ');
    expect(cbzBook).toBeTruthy();
    expect(cbzBook?.filePath).toBeTruthy();

    const libraryHandle = await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    let readerHref: string | null = null;
    await browser.waitUntil(async () => {
      readerHref = await readLibraryHrefForPath(cbzBook!.filePath);
      return !!readerHref;
    }, {
      timeout: 15000,
      timeoutMsg: 'expected the CBZ sample to expose a library reader href before validating metadata normalization'
    });

    const readerUrl = new URL(readerHref!, 'http://127.0.0.1:1420').toString();

    await browser.switchToWindow(libraryHandle);
    await browser.url(readerUrl);
    await $('.reader-stage').waitForDisplayed({ timeout: 10000 });

    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      if (details.stageError) {
        throw new Error(details.stageError);
      }
      return details.formatLabel === 'CBZ' && details.locationLabel !== 'Opening book';
    }, {
      timeout: 20000,
      timeoutMsg: 'expected the CBZ sample to open before validating metadata normalization'
    });

    const openedDetails = await readReaderDetails();
    await advanceReaderBeyond(openedDetails, 'CBZ sample before validating metadata normalization');

    const goToLibraryButton = await $('[aria-label="Go to library"]');
    await goToLibraryButton.waitForDisplayed({ timeout: 10000 });
    await goToLibraryButton.click();

    await browser.switchToWindow(libraryHandle);
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    await browser.waitUntil(async () => {
      const record = await loadLibraryRecordOnDisk(cbzBook!.filePath);
      if (!record) return false;
      const title = typeof record.title === 'string' ? record.title : '';
      const status = typeof record.status === 'string' ? record.status : '';
      return (
        title === 'Bridge Reader Sample Comic' &&
        !/^\d{10,}-/.test(title) &&
        !/\.(svg|png|jpg|jpeg|webp)$/i.test(status) &&
        (status === '已打开' || status === '继续阅读')
      );
    }, {
      timeout: 30000,
      timeoutMsg: 'expected CBZ library metadata to avoid stored filenames and internal page asset labels after returning from reader'
    }).catch(async (error) => {
      const record = await loadLibraryRecordOnDisk(cbzBook!.filePath);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nPersisted CBZ record: ${JSON.stringify(record)}`
      );
    });
  });

  it('imports cbz metadata from ComicInfo.xml before any reader round-trip', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();
    const cbzBook = importedBooks.find((entry) => entry.format === 'CBZ');
    expect(cbzBook).toBeTruthy();
    expect(cbzBook?.filePath).toBeTruthy();

    await browser.waitUntil(async () => {
      const record = await loadLibraryRecordOnDisk(cbzBook!.filePath);
      if (!record) return false;
      const coverPath = record.coverPath ?? record.cover_path ?? null;
      if (!coverPath) return false;
      const coverDataUrl = await loadLibraryCoverDataUrl(coverPath);
      return (
        record.title === 'Bridge Reader Sample Comic' &&
        record.author === 'Bridge Team' &&
        record.language === 'en' &&
        record.publisher === 'Bridge Reader Lab' &&
        typeof record.description === 'string' &&
        record.description.includes('Bridge Reader parity checks') &&
        coverDataUrl.startsWith('data:image/svg+xml;base64,')
      );
    }, {
      timeout: 15000,
      timeoutMsg:
        'expected the imported CBZ sample to expose title/author/language/publisher/description and a usable cover before opening it in the reader'
    }).catch(async (error) => {
      const record = await loadLibraryRecordOnDisk(cbzBook!.filePath);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nPersisted CBZ record: ${JSON.stringify(record)}`
      );
    });
  });

  it('keeps fb2 mobi and azw3 library statuses human-readable after reader round-trips', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();
    const expectedByFormat = new Map([
      ['FB2', { title: 'Bridge Reader Sample FB2', status: 'Chapter 1' }],
      ['MOBI', { title: 'libmobi ncx test', status: 'Test chapter 2' }],
      ['AZW3', { title: 'Around the World in 28 Languages', status: '继续阅读' }],
      ['TXT', { title: 'sample-book', status: 'Plain text' }]
    ]);

    const libraryHandle = await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    for (const format of ['FB2', 'MOBI', 'AZW3', 'TXT'] as const) {
      const book = importedBooks.find((entry) => entry.format === format);
      expect(book).toBeTruthy();
      expect(book?.filePath).toBeTruthy();
      const expected = expectedByFormat.get(format)!;

      let readerHref: string | null = null;
      await browser.waitUntil(async () => {
        readerHref = await readLibraryHrefForPath(book!.filePath);
        return !!readerHref;
      }, {
        timeout: 15000,
        timeoutMsg: `expected the ${format} sample to expose a library reader href before validating metadata normalization`
      });

      const readerUrl = new URL(readerHref!, 'http://127.0.0.1:1420').toString();

      await browser.switchToWindow(libraryHandle);
      await browser.url(readerUrl);
      await $('.reader-stage').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const details = await readReaderDetails();
        if (details.stageError) {
          throw new Error(details.stageError);
        }
        return details.formatLabel === format && details.locationLabel !== 'Opening book';
      }, {
        timeout: 20000,
        timeoutMsg: `expected the ${format} sample to open before validating metadata normalization`
      });

      const openedDetails = await readReaderDetails();
      await advanceReaderBeyond(openedDetails, `${format} sample before validating metadata normalization`);

      const goToLibraryButton = await $('[aria-label="Go to library"]');
      await goToLibraryButton.waitForDisplayed({ timeout: 10000 });
      await goToLibraryButton.click();

      await browser.switchToWindow(libraryHandle);
      await $('.library-page').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const record = await loadLibraryRecordOnDisk(book!.filePath);
        if (!record) return false;
        return record.title === expected.title && record.status === expected.status;
      }, {
        timeout: 30000,
        timeoutMsg: `expected ${format} library metadata to use human-readable title and status after returning from reader`
      }).catch(async (error) => {
        const record = await loadLibraryRecordOnDisk(book!.filePath);
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nFormat: ${format}\nPersisted record: ${JSON.stringify(
            record
          )}`
        );
      });
    }
  });

  it('keeps fb2 authors and tiny kindle progress labels human-readable after reader round-trips', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();
    const expectedByFormat = new Map([
      ['FB2', { title: 'Bridge Reader Sample FB2', author: 'Bridge Team', language: 'en' }],
      ['MOBI', { title: 'libmobi ncx test' }],
      ['AZW3', { title: 'Around the World in 28 Languages' }],
      ['TXT', { title: 'sample-book', author: 'Plain text source' }]
    ]);

    const libraryHandle = await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    for (const format of ['FB2', 'MOBI', 'AZW3', 'TXT'] as const) {
      const book = importedBooks.find((entry) => entry.format === format);
      expect(book).toBeTruthy();
      expect(book?.filePath).toBeTruthy();
      const expected = expectedByFormat.get(format)!;

      let readerHref: string | null = null;
      await browser.waitUntil(async () => {
        readerHref = await readLibraryHrefForPath(book!.filePath);
        return !!readerHref;
      }, {
        timeout: 15000,
        timeoutMsg: `expected the ${format} sample to expose a library reader href before validating author/progress normalization`
      });

      const readerUrl = new URL(readerHref!, 'http://127.0.0.1:1420').toString();

      await browser.switchToWindow(libraryHandle);
      await browser.url(readerUrl);
      await $('.reader-stage').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const details = await readReaderDetails();
        if (details.stageError) {
          throw new Error(details.stageError);
        }
        return details.formatLabel === format && details.locationLabel !== 'Opening book';
      }, {
        timeout: 20000,
        timeoutMsg: `expected the ${format} sample to open before validating author/progress normalization`
      });

      const openedDetails = await readReaderDetails();
      await advanceReaderBeyond(openedDetails, `${format} sample before validating author/progress normalization`);

      const goToLibraryButton = await $('[aria-label="Go to library"]');
      await goToLibraryButton.waitForDisplayed({ timeout: 10000 });
      await goToLibraryButton.click();

      await browser.switchToWindow(libraryHandle);
      await $('.library-page').waitForDisplayed({ timeout: 10000 });

      await browser.waitUntil(async () => {
        const record = await loadLibraryRecordOnDisk(book!.filePath);
        if (!record) return false;
        if (record.title !== expected.title) return false;
        if (format === 'FB2') {
          return record.author === expected.author && record.language === expected.language;
        }
        if (format === 'TXT') {
          return record.author === expected.author;
        }
        const progress = typeof record.progress === 'string' ? record.progress : '';
        return !!progress && progress !== '上次读到 0%';
      }, {
        timeout: 30000,
        timeoutMsg: `expected ${format} library metadata to keep human-readable author/progress after returning from reader`
      }).catch(async (error) => {
        const record = await loadLibraryRecordOnDisk(book!.filePath);
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nFormat: ${format}\nPersisted record: ${JSON.stringify(
            record
          )}`
        );
      });

      if (format === 'MOBI' || format === 'AZW3' || format === 'TXT') {
        await browser.waitUntil(async () => {
          const progressBadge = await readLibraryProgressBadgeForTitle(expected.title);
          return !!progressBadge && progressBadge !== '0%';
        }, {
          timeout: 10000,
          timeoutMsg: `expected ${format} library UI to avoid a rounded 0 percent progress badge after returning from reader`
        }).catch(async (error) => {
          const progressBadge = await readLibraryProgressBadgeForTitle(expected.title);
          throw new Error(
            `${error instanceof Error ? error.message : String(error)}\nFormat: ${format}\nLibrary progress badge: ${progressBadge}`
          );
        });
      }
    }
  });

  it('imports kindle-family metadata before any reader round-trip', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();
    const mobiBook = importedBooks.find((entry) => entry.format === 'MOBI');
    const azw3Book = importedBooks.find((entry) => entry.format === 'AZW3');
    expect(mobiBook).toBeTruthy();
    expect(mobiBook?.filePath).toBeTruthy();
    expect(azw3Book).toBeTruthy();
    expect(azw3Book?.filePath).toBeTruthy();

    await browser.waitUntil(async () => {
      const mobiRecord = await loadLibraryRecordOnDisk(mobiBook!.filePath);
      const record = await loadLibraryRecordOnDisk(azw3Book!.filePath);
      if (!mobiRecord || !record) return false;
      return (
        mobiRecord.title === 'sample-book' &&
        mobiRecord.author === 'Unknown author' &&
        mobiRecord.language === 'en' &&
        !mobiRecord.publisher &&
        !mobiRecord.description &&
        record.title === 'Around the World in 28 Languages' &&
        record.author === 'Infogrid Pacific' &&
        record.language === 'en' &&
        record.publisher === 'Infogrid Pacific' &&
        typeof record.description === 'string' &&
        record.description.includes('multiple languages')
      );
    }, {
      timeout: 15000,
      timeoutMsg:
        'expected MOBI to keep clean fallback metadata and AZW3 to expose rich container metadata before opening either book in the reader'
    }).catch(async (error) => {
      const mobiRecord = await loadLibraryRecordOnDisk(mobiBook!.filePath);
      const record = await loadLibraryRecordOnDisk(azw3Book!.filePath);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nPersisted MOBI record: ${JSON.stringify(
          mobiRecord
        )}\nPersisted AZW3 record: ${JSON.stringify(record)}`
      );
    });
  });

  it('imports fb2 metadata from the xml container before any reader round-trip', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();
    const fb2Book = importedBooks.find((entry) => entry.format === 'FB2');
    expect(fb2Book).toBeTruthy();
    expect(fb2Book?.filePath).toBeTruthy();

    await browser.waitUntil(async () => {
      const record = await loadLibraryRecordOnDisk(fb2Book!.filePath);
      if (!record) return false;
      return (
        record.title === 'Bridge Reader Sample FB2' &&
        record.author === 'Bridge Team' &&
        record.language === 'en' &&
        record.publisher === 'Bridge Reader Lab' &&
        typeof record.description === 'string' &&
        record.description.includes('Bridge Reader parity checks')
      );
    }, {
      timeout: 15000,
      timeoutMsg:
        'expected the imported FB2 sample to expose title/author/language/publisher/description before opening it in the reader'
    }).catch(async (error) => {
      const record = await loadLibraryRecordOnDisk(fb2Book!.filePath);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nPersisted FB2 record: ${JSON.stringify(record)}`
      );
    });
  });

  it('reopens a library-file pdf with restored progress inside the reader stage', async function () {
    this.timeout(120000);
    const { libraryHandle, path, expectedLocation, expectedFraction, persistedLocation } = await openRestorablePdfBook();
    expect(persistedLocation).toBeTruthy();
    expect(persistedLocation.startsWith('epubcfi(')).toBe(false);
    expect(persistedLocation.startsWith('Page ')).toBe(true);
    expect(persistedLocation.startsWith('Page 0 /')).toBe(false);

    let geometry = await readReaderGeometry();

    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      geometry = await readReaderGeometry();
      const rendered = geometry.rendered;

      if (details.stageError) {
        throw new Error(details.stageError);
      }

      if (!geometry.stage || !geometry.sidebar || !rendered) return false;
      if (!details.title || details.locationLabel === 'Opening book') return false;
      if (details.formatLabel !== 'PDF') return false;
      if (!details.locationLabel?.startsWith('Page ')) return false;
      if (details.locationLabel.startsWith('Page 0 /')) return false;

      const restoredByLocation = !!expectedLocation && details.cfi && details.cfi !== expectedLocation;
      const restoredByFraction =
        !expectedLocation &&
        typeof expectedFraction === 'number' &&
        expectedFraction > 0 &&
        typeof details.progressFraction === 'number' &&
        Math.abs(details.progressFraction - expectedFraction) > 0.0005;

      return (
        (
          restoredByLocation ||
          restoredByFraction ||
          (details.progressFraction ?? 0) > 0 ||
          details.locationLabel !== 'Not opened'
        ) &&
        rendered.left >= geometry.stage.left - 4 &&
        rendered.right <= geometry.stage.right + 4 &&
        rendered.top >= geometry.stage.top - 4 &&
        rendered.bottom <= geometry.stage.bottom + 4 &&
        rendered.width >= geometry.stage.width * 0.2 &&
        rendered.height >= geometry.stage.height * 0.25
      );
    }, {
      timeout: 20000,
      timeoutMsg:
        'expected a restorable library-file PDF to reopen with progress and a rendered surface inside the reader stage'
    }).catch(async (error) => {
      const details = await readReaderDetails();
      geometry = await readReaderGeometry();
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nReader: ${JSON.stringify(details)}\nGeometry: ${JSON.stringify(geometry)}`
      );
    });

    await selectReaderMenuSetting('reader flow mode', '滚动');
    await selectReaderMenuSetting('reader font family', '无衬线');
    await selectReaderMenuSetting('reader font scale', '大');
    await selectReaderMenuSetting('reader line height', '舒展');
    await selectReaderMenuSetting('reader page margins', '宽');
    await setReaderViewWidthMode('wide');

    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      const fixedLayoutState = await readFixedLayoutReaderSettings();
      return (
        details.formatLabel === 'PDF' &&
        details.layoutLabel === 'SCROLL' &&
        details.locationLabel?.startsWith('Page ') &&
        fixedLayoutState.flow === 'scrolled' &&
        fixedLayoutState.hostViewWidthMode === 'wide' &&
        fixedLayoutState.inlineWidth === '980px' &&
        fixedLayoutState.stored.flowMode === 'scrolled' &&
        fixedLayoutState.stored.fontFamily === 'sans' &&
        fixedLayoutState.stored.fontScale === 'lg' &&
        fixedLayoutState.stored.lineHeight === 'relaxed' &&
        fixedLayoutState.stored.pageMargins === 'wide' &&
        fixedLayoutState.stored.viewWidthMode === 'wide'
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the PDF reader to accept scroll/layout settings while preserving PDF page-location semantics'
    }).catch(async (error) => {
      const details = await readReaderDetails();
      const fixedLayoutState = await readFixedLayoutReaderSettings();
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nReader: ${JSON.stringify(details)}\nFixed layout state: ${JSON.stringify(
          fixedLayoutState
        )}`
      );
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });
    await openReaderFromLibraryPath(path, libraryHandle);

    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      const fixedLayoutState = await readFixedLayoutReaderSettings();
      return (
        details.formatLabel === 'PDF' &&
        details.layoutLabel === 'SCROLL' &&
        details.locationLabel?.startsWith('Page ') &&
        fixedLayoutState.flow === 'scrolled' &&
        fixedLayoutState.hostViewWidthMode === 'wide' &&
        fixedLayoutState.inlineWidth === '980px' &&
        fixedLayoutState.stored.flowMode === 'scrolled' &&
        fixedLayoutState.stored.fontFamily === 'sans' &&
        fixedLayoutState.stored.fontScale === 'lg' &&
        fixedLayoutState.stored.lineHeight === 'relaxed' &&
        fixedLayoutState.stored.pageMargins === 'wide' &&
        fixedLayoutState.stored.viewWidthMode === 'wide'
      );
    }, {
      timeout: 20000,
      timeoutMsg: 'expected the PDF fixed-layout reader to reopen with persisted settings and visible PDF state'
    }).catch(async (error) => {
      const details = await readReaderDetails();
      const fixedLayoutState = await readFixedLayoutReaderSettings();
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nReader: ${JSON.stringify(details)}\nFixed layout state: ${JSON.stringify(
          fixedLayoutState
        )}`
      );
    });
  });

  it('moves a newly opened shelf epub into the reading workflow after returning from reader', async () => {
    const { libraryHandle, path, href: originalHref } = await openUsableShelfEpubFromLibrary();
    const originalRecord = await loadLibraryRecordOnDisk(path);
    const originalOpenedAt = originalRecord?.lastOpenedAt ?? 0;

    const goToLibraryButton = await $('[aria-label="Go to library"]');
    await goToLibraryButton.waitForDisplayed({ timeout: 10000 });
    await goToLibraryButton.click();

    await browser.switchToWindow(libraryHandle);

    await browser.waitUntil(async () => {
      const updatedRecord = await loadLibraryRecordOnDisk(path);
      if (!updatedRecord) return false;

      return (
        (updatedRecord.lastOpenedAt ?? 0) > originalOpenedAt &&
        ((typeof updatedRecord.progressFraction === 'number' && updatedRecord.progressFraction > 0) ||
          !!updatedRecord.progressLocation)
      );
    }, {
      timeout: 30000,
      timeoutMsg:
        'expected returning from reader to persist a newer library reading-state record for the opened shelf EPUB'
    });

    await browser.refresh();

    await browser.waitUntil(async () => {
      const sections = await readLibraryWorkflowSections();
      const refreshedHref = await readLibraryHrefForPath(path);
      const inWorkflow =
        sections.continueReading.includes(path) || sections.recentReading.includes(path);
      const stillOnShelf = sections.shelf.includes(path);
      return (inWorkflow && !stillOnShelf) || (!!refreshedHref && refreshedHref !== originalHref);
    }, {
      timeout: 30000,
      timeoutMsg:
        'expected a shelf EPUB opened in reader to either move into the reading workflow or expose a refreshed reader href after returning to the library'
    }).catch(async (error) => {
      const sections = await readLibraryWorkflowSections();
      const refreshedHref = await readLibraryHrefForPath(path);
      const updatedRecord = await loadLibraryRecordOnDisk(path);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nPath: ${path}\nOriginal href: ${originalHref}\nRefreshed href: ${refreshedHref}\nPersisted record: ${JSON.stringify(updatedRecord)}\nSections: ${JSON.stringify(sections)}`
      );
    });
  });

  it('reports Readest migration outcomes through the library banner and notice flow', async () => {
    const libraryHandle = await switchToLibraryWindow();

    const migrationBanner = await $('[aria-label="readest migration"]');
    await migrationBanner.waitForDisplayed({ timeout: 15000 });

    const handlesBeforeClick = await browser.getWindowHandles();
    const migrationButton = await $('[aria-label="readest migration"] .migration-button');
    await migrationButton.waitForDisplayed({ timeout: 10000 });
    await migrationButton.click();

    await browser.waitUntil(async () => {
      const handles = await browser.getWindowHandles();
      return handles.length >= handlesBeforeClick.length;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the Readest migration flow to either stay in place or open a reader window'
    });

    await browser.switchToWindow(libraryHandle);

    await browser.waitUntil(async () => {
      const { noticeText } = await readReadestMigrationSurface();
      return (
        noticeText.includes('已同步') ||
        noticeText.includes('没有从 Readest 迁移到可用书籍') ||
        noticeText.includes('缺少本地文件')
      );
    }, {
      timeout: 30000,
      timeoutMsg: 'expected syncing the Readest library to produce an explicit migration result notice'
    });

    const migrationState = await readReadestMigrationSurface();
    expect(migrationState.bannerText).toContain('发现 Readest 书库');
    expect(
      migrationState.noticeText.includes('已同步') ||
        migrationState.noticeText.includes('没有从 Readest 迁移到可用书籍') ||
        migrationState.noticeText.includes('缺少本地文件')
    ).toBe(true);

    if (migrationState.noticeText.includes('已同步') || migrationState.bannerText.includes('已有')) {
      expect(migrationState.compatibleCardCount).toBeGreaterThan(0);
    }
  });

  it('migrates legacy browser notes into the host-side book store when reopening a book', async () => {
    const { libraryHandle, notesStorageKey, legacyNote, bookKey } = await reopenReaderWithLegacyNote({
      text: 'legacy migrated note text',
      note: 'legacy migrated note body',
      chapterLabelFallback: 'Legacy chapter'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await openReaderFromLibraryPath(bookKey, libraryHandle);
    await switchReaderToNotesTab();

    await browser.waitUntil(async () => {
      const noteCards = await $$('.note-card');
      if (!noteCards.length) return false;
      const texts: string[] = [];
      for (const noteCard of noteCards) {
        texts.push(await noteCard.getText());
      }
      return texts.some((text) => text.includes(legacyNote.note));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the migrated note to survive a second reopen after the legacy browser key was removed'
    });

    await clearAllReaderNotes();
    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await browser.execute((key) => {
      localStorage.removeItem(key);
    }, notesStorageKey);
  });

  it('focuses the matching sidebar note when a document highlight is activated', async () => {
    const { libraryHandle, legacyNote } = await reopenReaderWithLegacyNote({
      text: 'highlight focus text',
      note: 'highlight focus body',
      chapterLabelFallback: 'Highlight chapter'
    });

    const tocTab = await $('//button[@role="tab" and normalize-space()="目录"]');
    await tocTab.click();

    await browser.execute((cfi) => {
      const view = document.querySelector('foliate-view');
      view?.dispatchEvent(
        new CustomEvent('show-annotation', {
          detail: { value: `foliate-note:${cfi}` }
        })
      );
    }, legacyNote.cfi);

    await browser.waitUntil(async () => {
      const notesTab = await $('//button[@role="tab" and normalize-space()="笔记"]');
      const isSelected = (await notesTab.getAttribute('aria-selected')) === 'true';
      const activeNote = await $(`.note-card.active-note[data-note-cfi="${legacyNote.cfi.replace(/"/g, '\\"')}"]`);
      return isSelected && (await activeNote.isExisting());
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the annotation activation to switch to notes and focus the matching sidebar note'
    });

    await clearAllReaderNotes();
    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
  });

  it('persists note edits and deletions through the host-side store', async () => {
    const { libraryHandle, notesStorageKey, legacyNote, bookKey } = await reopenReaderWithLegacyNote({
      text: 'editable note text',
      note: 'editable note body',
      chapterLabelFallback: 'Editable chapter'
    });

    await browser.execute(() => {
      window.prompt = () => 'edited note body';
      window.confirm = () => true;
    });

    const editButton = await $('.note-action');
    await editButton.click();

    await browser.waitUntil(async () => {
      const noteBody = await $('.note-body');
      return (await noteBody.getText()) === 'edited note body';
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the edited note body to appear before reopening the reader'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await openReaderFromLibraryPath(bookKey, libraryHandle);
    await switchReaderToNotesTab();

    await browser.waitUntil(async () => {
      const noteBody = await $('.note-body');
      return (await noteBody.getText()) === 'edited note body';
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the edited note body to persist after reopening the book'
    });

    const deleteButton = await $('.note-action.danger');
    await deleteButton.click();

    await browser.waitUntil(async () => {
      const noteCards = await $$('.note-card');
      return noteCards.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the note list to be empty after deleting the edited note'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await openReaderFromLibraryPath(bookKey);
    await switchReaderToNotesTab();

    await browser.waitUntil(async () => {
      const noteCards = await $$('.note-card');
      return noteCards.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the deleted note to stay removed after reopening the book'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await browser.execute((key) => {
      localStorage.removeItem(key);
    }, notesStorageKey);
  });

  it('persists txt highlights and notes separately through the desktop reader store', async function () {
    this.timeout(120000);
    const importedBooks = await importDesktopSampleLibraryBooks();
    const txtBook = importedBooks.find((entry) => entry.format === 'TXT');
    expect(txtBook).toBeTruthy();
    expect(txtBook?.filePath).toBeTruthy();
    const refreshedTxtBook = await loadLibraryRecordBySourcePathOnDisk(txtBook!.sourcePath);
    let currentFilePath = (refreshedTxtBook?.filePath ?? refreshedTxtBook?.file_path ?? txtBook!.filePath) as string;

    const libraryHandle = await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    await openReaderFromLibraryPath(currentFilePath, libraryHandle);
    await switchReaderToNotesTab();
    await clearAllReaderNotes();
    await clearReaderHighlightsWorkspaceStateOnDisk(currentFilePath);

    await selectPlainTextInReader('plain text file exists');
    await browser.waitUntil(async () => {
      const selectionCard = await $('.selection-card p');
      return (await selectionCard.getText()).includes('plain text file exists');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT reader to expose the first selected text in the notes workspace'
    });

    const highlightButton = await $('//button[contains(@class, "secondary-note-action") and not(contains(@class, "danger-action"))]');
    await highlightButton.click();

    await browser.waitUntil(async () => {
      const cards = await $$('.note-card');
      if (!cards.length) return false;
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return texts.some((text) => text.includes('高亮') && text.includes('plain text file exists'));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT reader to persist a highlight entry in the desktop notes workspace'
    });

    await browser.execute(() => {
      const surface = document.querySelector('.plain-text-surface');
      if (!(surface instanceof HTMLElement)) {
        throw new Error('expected the TXT reader surface to exist');
      }
      const maxScroll = surface.scrollHeight - surface.clientHeight;
      if (maxScroll <= 0) {
        throw new Error('expected the TXT fixture to produce a scrollable desktop surface');
      }
      surface.scrollTop = maxScroll * 0.35;
      surface.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    await selectPlainTextInReader('The rest of this fixture just adds enough steady reading length');
    await browser.waitUntil(async () => {
      const selectionCard = await $('.selection-card p');
      return (await selectionCard.getText()).includes('The rest of this fixture just adds enough steady reading length');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT reader to expose the second selected text in the notes workspace'
    });

    await highlightButton.click();
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('0 笔记') &&
        cards.length === 2 &&
        texts.some((text) => text.includes('plain text file exists')) &&
        texts.some((text) => text.includes('The rest of this fixture just adds enough steady reading length'))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to show two persisted highlights before creating a note'
    });

    await selectPlainTextInReader('the book opens, the state moves, and the state comes back');
    await browser.waitUntil(async () => {
      const selectionCard = await $('.selection-card p');
      return (await selectionCard.getText()).includes('the book opens, the state moves, and the state comes back');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT reader to expose the third selected text in the notes workspace'
    });

    await browser.execute(() => {
      window.prompt = () => 'desktop txt note body';
    });

    const noteButton = await $('.primary-note-action');
    await noteButton.click();

    await browser.waitUntil(async () => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('1 笔记') &&
        cards.length === 3 &&
        texts.some((text) => text.includes('desktop txt note body')) &&
        texts.some((text) => text.includes('高亮') && text.includes('plain text file exists')) &&
        texts.some((text) => text.includes('高亮') && text.includes('The rest of this fixture just adds enough steady reading length'))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to show two highlights and one note'
    });

    await selectReaderMenuSetting('reader flow mode', '滚动');
    await selectReaderMenuSetting('reader font family', '无衬线');
    await selectReaderMenuSetting('reader font scale', '大');
    await selectReaderMenuSetting('reader line height', '舒展');
    await selectReaderMenuSetting('reader page margins', '宽');
    await browser.waitUntil(async () => {
      const footerText = await $('[aria-label="reader footer controls preview"]').getText();
      const plainTextState = await readPlainTextReaderSettings();
      return (
        footerText.includes('SCROLL') &&
        plainTextState.surfacePadding.includes('34px') &&
        plainTextState.fontSize === '22px' &&
        plainTextState.lineHeightPx > 42 &&
        plainTextState.fontFamily.includes('IBM Plex Sans')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop reader to apply layout settings to the plain-text surface before reopen'
    }).catch(async (error) => {
      const footerText = await $('[aria-label="reader footer controls preview"]').getText();
      const plainTextState = await readPlainTextReaderSettings();
      const settingsState = await browser.execute(() => ({
        stored: localStorage.getItem('br1.reader.settings'),
        checked: Array.from(
          document.querySelectorAll('.reader-head-frame .header-menu [role="menuitemradio"][aria-checked="true"]')
        ).map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      }));
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nFooter: ${footerText}\nPlain text state: ${JSON.stringify(
          plainTextState
        )}\nSettings state: ${JSON.stringify(settingsState)}`
      );
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    const reopenedTxtRecord = await loadLibraryRecordBySourcePathOnDisk(txtBook!.sourcePath);
    currentFilePath = (reopenedTxtRecord?.filePath ?? reopenedTxtRecord?.file_path ?? currentFilePath) as string;
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });
    await openReaderFromLibraryPath(currentFilePath, libraryHandle);
    await switchReaderToNotesTab();

    await browser.waitUntil(async () => {
      const footerText = await $('[aria-label="reader footer controls preview"]').getText();
      const plainTextState = await readPlainTextReaderSettings();
      return (
        footerText.includes('SCROLL') &&
        plainTextState.surfacePadding.includes('34px') &&
        plainTextState.fontSize === '22px' &&
        plainTextState.lineHeightPx > 42 &&
        plainTextState.fontFamily.includes('IBM Plex Sans')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop reader to reopen with persisted plain-text layout settings'
    }).catch(async (error) => {
      const footerText = await $('[aria-label="reader footer controls preview"]').getText();
      const plainTextState = await readPlainTextReaderSettings();
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nFooter: ${footerText}\nPlain text state: ${JSON.stringify(
          plainTextState
        )}`
      );
    });

    await browser.waitUntil(async () => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('1 笔记') &&
        cards.length === 3 &&
        texts.some((text) => text.includes('desktop txt note body')) &&
        texts.some((text) => text.includes('高亮') && text.includes('plain text file exists')) &&
        texts.some((text) => text.includes('高亮') && text.includes('The rest of this fixture just adds enough steady reading length'))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to persist both highlights and the note after reopen'
    });

    await clickAnnotationKindFilter('高亮');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }

      return (
        metaText.includes('仅看高亮') &&
        cards.length === 2 &&
        texts[0]?.includes('高亮') &&
        texts.some((text) => text.includes('plain text file exists')) &&
        texts.some((text) => text.includes('The rest of this fixture just adds enough steady reading length'))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to filter down to the persisted highlights only'
    });

    await clickAnnotationKindFilter('笔记');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }

      return (
        metaText.includes('仅看笔记') &&
        cards.length === 1 &&
        texts[0]?.includes('desktop txt note body') &&
        !texts[0]?.includes('高亮')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to filter down to the persisted note only'
    });

    await clickAnnotationKindFilter('全部类型');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      return metaText.includes('全部类型') && cards.length === 3;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to restore the full annotation list after clearing the kind filter'
    });

    await clickAnnotationKindFilter('笔记');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }

      return metaText.includes('仅看笔记') && cards.length === 1 && texts[0]?.includes('desktop txt note body');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to isolate the persisted note again before deleting it through the current-view action'
    });

    await browser.execute(() => {
      window.confirm = () => true;
    });
    const deleteVisibleNotesButton = await $('//button[contains(@class, "secondary-note-action") and normalize-space()="删除当前视图笔记"]');
    await deleteVisibleNotesButton.click();

    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      return metaText.includes('0 笔记') && cards.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to delete the currently filtered note view without touching highlights'
    });

    await clickAnnotationKindFilter('全部类型');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('0 笔记') &&
        cards.length === 2 &&
        texts.every((text) => text.includes('高亮')) &&
        texts.every((text) => !text.includes('desktop txt note body'))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to keep the two highlights after deleting the filtered note view'
    });

    await clickReaderSidebarTab('高亮');
    await browser.waitUntil(async () => {
      const panel = await $('[aria-label="highlights panel preview"]');
      if (!(await panel.isDisplayed())) return false;
      const panelText = await panel.getText();
      const cards = await $$('.highlight-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        panelText.includes('已保存 2 条高亮') &&
        panelText.includes('最近添加优先') &&
        cards.length === 2 &&
        texts[0]?.includes('高亮') &&
        texts[0]?.includes('The rest of this fixture just adds enough steady reading length') &&
        !texts[0]?.includes('desktop txt note body') &&
        texts.some((text) => text.includes('plain text file exists'))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to isolate and sort the persisted highlights ahead of the mixed notes list'
    }).catch(async (error) => {
      const panel = await $('[aria-label="highlights panel preview"]');
      const panelText = await panel.getText();
      const cards = await $$('.highlight-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nHighlights panel: ${panelText}\nHighlight cards: ${JSON.stringify(texts)}`
      );
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights sort controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights sort controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '最早添加'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the oldest highlights sort button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return panelText.includes('最早添加优先') && firstText.includes('plain text file exists');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to reorder highlights when sorting by oldest first'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights sort controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights sort controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '最近添加'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the recent highlights sort button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return (
        panelText.includes('最近添加优先') &&
        firstText.includes('The rest of this fixture just adds enough steady reading length')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to restore recent-first ordering'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights sort controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights sort controls to exist');
      }
      const oldest = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '最早添加'
      );
      if (!(oldest instanceof HTMLButtonElement)) {
        throw new Error('expected the oldest highlights sort button to exist');
      }
      oldest.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return panelText.includes('最早添加优先') && firstText.includes('plain text file exists');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to switch to oldest-first ordering before selecting a highlight'
    });
    await browser.execute(() => {
      const firstToggle = document.querySelector<HTMLButtonElement>('.highlight-selection-toggle');
      if (!(firstToggle instanceof HTMLButtonElement)) {
        throw new Error('expected the oldest highlight selection toggle to exist');
      }
      firstToggle.click();
    });
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        const toggleLabels = Array.from(document.querySelectorAll('.highlight-selection-toggle')).map((toggle) =>
          toggle.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        );
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          toggleLabels
        };
      });
      return (
        state.panelText.includes('已选 1 条') &&
        state.toggleLabels.filter((label) => label.includes('已选')).length === 1
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to select one oldest highlight'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '已选高亮'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the selected-only highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        const cards = Array.from(document.querySelectorAll('.highlight-card'));
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          cardCount: cards.length,
          firstText: cards[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('1 已选高亮') &&
        state.panelText.includes('最早添加优先') &&
        state.cardCount === 1 &&
        state.firstText.includes('plain text file exists')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to enter the selected-only view before closing the book'
    });

    await browser.execute(() => {
      window.prompt = () => 'Desktop TXT 重点高亮';
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.trim() === '保存当前选择集'
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('expected the save-current-selection button to exist');
      }
      button.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="saved highlight selections"]').getText();
      return panelText.includes('Desktop TXT 重点高亮') && panelText.includes('1 条高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to save the current selection set'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    const restoredTxtRecord = await loadLibraryRecordBySourcePathOnDisk(txtBook!.sourcePath);
    currentFilePath = (restoredTxtRecord?.filePath ?? restoredTxtRecord?.file_path ?? currentFilePath) as string;
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });
    await openReaderFromLibraryPath(currentFilePath, libraryHandle);
    await clickReaderSidebarTab('高亮');
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        const cards = Array.from(document.querySelectorAll('.highlight-card'));
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          cardCount: cards.length,
          firstText: cards[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('1 已选高亮') &&
        state.panelText.includes('最早添加优先') &&
        state.cardCount === 1 &&
        state.firstText.includes('plain text file exists')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to restore the selected-only view and ordering after reopening the book'
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="saved highlight selections"]').getText();
      return panelText.includes('Desktop TXT 重点高亮') && panelText.includes('1 条高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to restore the saved selection set after reopening the book'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '全部'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the all-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        const cards = Array.from(document.querySelectorAll('.highlight-card'));
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          cardCount: cards.length
        };
      });
      return (
        state.panelText.includes('已保存 2 条高亮') &&
        state.panelText.includes('最早添加优先') &&
        state.cardCount === 2
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to return to the all-highlights view before running group actions'
    });
    await browser.execute(() => {
      const clearButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.trim() === '清空选中'
      );
      if (!(clearButton instanceof HTMLButtonElement)) {
        throw new Error('expected the clear-selected-highlights button to exist');
      }
      clearButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      return panelText.includes('未选高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to clear the live selection before reapplying a saved set'
    });
    await browser.execute(() => {
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const applyButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '套用'
      );
      if (!(applyButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection apply button to exist');
      }
      applyButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return (
        panelText.includes('1 已选高亮') &&
        cards.length === 1 &&
        firstText.includes('plain text file exists')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to reapply a saved selection set'
    });
    await browser.execute(() => {
      window.confirm = () => true;
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const deleteButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '删除'
      );
      if (!(deleteButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection delete button to exist');
      }
      deleteButton.click();
    });
    await browser.waitUntil(async () => {
      const savedPanels = await $$('[aria-label="saved highlight selections"]');
      if (!savedPanels.length) return true;
      const panelText = await savedPanels[0].getText();
      return !panelText.includes('Desktop TXT 重点高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to delete the saved selection set'
    });
    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '全部'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the all-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      return panelText.includes('已保存 2 条高亮') && cards.length === 2;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to return to the all-highlights view after saved-set management'
    });

    await clickHighlightGroupAction('反选本组高亮');
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>('.highlight-selection-toggle'));
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstToggleText: toggles[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          secondToggleText: toggles[1]?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('已选 1 条') &&
        state.firstToggleText.includes('选中') &&
        state.secondToggleText.includes('已选')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to invert the current selection before deleting'
    });

    await deleteSelectedHighlightsInWorkspace();
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        panelText.includes('已保存 1 条高亮') &&
        panelText.includes('未选高亮') &&
        cards.length === 1 &&
        texts[0]?.includes('plain text file exists')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to delete only the inverted selection and keep the oldest highlight'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights sort controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights sort controls to exist');
      }
      const recent = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '最近添加'
      );
      if (!(recent instanceof HTMLButtonElement)) {
        throw new Error('expected the recent highlights sort button to exist');
      }
      recent.click();
    });

    await bulkDeleteVisibleHighlightsInWorkspace();
    await browser.waitUntil(async () => {
      const panel = await $('[aria-label="highlights panel preview"]');
      const panelText = await panel.getText();
      const cards = await $$('.highlight-card');
      return panelText.includes('还没有高亮') && cards.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop highlights workspace to clear the visible highlight after bulk delete'
    });

    await clickReaderSidebarTab('笔记');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      return (
        metaText.includes('0 高亮') &&
        metaText.includes('0 笔记') &&
        (await $$('.note-card')).length === 0
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the TXT desktop notes workspace to stay empty after deleting the filtered note and all remaining highlights'
    });

    await clearAllReaderNotes();
    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
  });

  it('persists epub highlights and notes separately through the desktop reader store', async function () {
    this.timeout(120000);
    const libraryHandle = await switchToLibraryWindow();
    const book = await findStableEpubBook();
    const href = await book.getAttribute('href');
    expect(href).toBeTruthy();
    const target = new URL(href!, 'http://localhost');
    const bookKey = target.searchParams.get('path') || '';
    const notesStorageKey = `br1.reader.notes:${bookKey}`;
    expect(bookKey).toBeTruthy();
    await clearReaderHighlightsWorkspaceStateOnDisk(bookKey);
    expect(book).toBeTruthy();
    await openReaderFromBook(book!);
    await browser.waitUntil(async () => {
      const details = await readReaderDetails();
      if (details.stageError) {
        throw new Error(details.stageError);
      }
      return !!details.title && !!details.total && !!details.cfi;
    }, {
      timeout: 15000,
      timeoutMsg: 'expected an epub-backed library book to expose metadata and a valid CFI'
    });
    const epubReaderTitle = (await readReaderDetails()).title;

    await switchReaderToNotesTab();
    await clearAllReaderNotes();

    const firstSelectionText = await selectVisibleFoliateTextInReader(0, [epubReaderTitle, '自序']);
    await browser.waitUntil(async () => {
      const selectionCard = await $('.selection-card p');
      return (await selectionCard.getText()).includes(firstSelectionText.slice(0, 20));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB reader to expose the first selected text in the notes workspace'
    });

    const highlightButton = await $('//button[contains(@class, "secondary-note-action") and not(contains(@class, "danger-action"))]');
    await highlightButton.click();

    await browser.waitUntil(async () => {
      const cards = await $$('.note-card');
      if (!cards.length) return false;
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return texts.some((text) => text.includes('高亮') && text.includes(firstSelectionText.slice(0, 20)));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB reader to persist a highlight entry in the desktop notes workspace'
    });

    const secondSelectionText = await selectVisibleFoliateTextInReader(1, [epubReaderTitle, '自序']);
    await browser.waitUntil(async () => {
      const selectionCard = await $('.selection-card p');
      return (await selectionCard.getText()).includes(secondSelectionText.slice(0, 20));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB reader to expose the second selected text in the notes workspace'
    });

    await highlightButton.click();

    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('0 笔记') &&
        cards.length === 2 &&
        texts.some((text) => text.includes(firstSelectionText.slice(0, 20))) &&
        texts.some((text) => text.includes(secondSelectionText.slice(0, 20)))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop notes workspace to show two highlights before creating a note'
    });

    const thirdSelectionText = await selectVisibleFoliateTextInReader(2, [epubReaderTitle, '自序']);
    await browser.waitUntil(async () => {
      const selectionCard = await $('.selection-card p');
      return (await selectionCard.getText()).includes(thirdSelectionText.slice(0, 20));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB reader to expose the third selected text in the notes workspace'
    });

    await browser.execute(() => {
      window.prompt = () => 'desktop epub note body';
    });

    const noteButton = await $('.primary-note-action');
    await noteButton.click();

    await browser.waitUntil(async () => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('1 笔记') &&
        cards.length === 3 &&
        texts.some((text) => text.includes('desktop epub note body')) &&
        texts.some((text) => text.includes('高亮') && text.includes(firstSelectionText.slice(0, 20))) &&
        texts.some((text) => text.includes('高亮') && text.includes(secondSelectionText.slice(0, 20)))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop notes workspace to show two highlights and one note'
    }).catch(async (error) => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nMeta: ${metaText}\nCards: ${JSON.stringify(
          texts
        )}\nFirst selection: ${firstSelectionText}\nSecond selection: ${secondSelectionText}\nThird selection: ${thirdSelectionText}`
      );
    });

    await browser.waitUntil(async () => {
      try {
        const persistedNotes = await loadReaderNotesOnDisk(notesStorageKey);
        return (
          persistedNotes.length === 3 &&
          persistedNotes.some(
            (note) =>
              note.kind === 'highlight' && (note.text ?? '').includes(firstSelectionText.slice(0, 20))
          ) &&
          persistedNotes.some(
            (note) =>
              note.kind === 'highlight' && (note.text ?? '').includes(secondSelectionText.slice(0, 20))
          ) &&
          persistedNotes.some((note) => note.kind === 'note' && note.note === 'desktop epub note body')
        );
      } catch {
        return false;
      }
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB reader notes store to persist both the highlight and the note before closing the window'
    }).catch(async (error) => {
      let persistedNotes: Awaited<ReturnType<typeof loadReaderNotesOnDisk>> = [];
      try {
        persistedNotes = await loadReaderNotesOnDisk(notesStorageKey);
      } catch {
        persistedNotes = [];
      }
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nPersisted notes: ${JSON.stringify(
          persistedNotes
        )}`
      );
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await openReaderFromLibraryPath(bookKey, libraryHandle);
    await switchReaderToNotesTab();

    await browser.waitUntil(async () => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('1 笔记') &&
        cards.length === 3 &&
        texts.some((text) => text.includes('desktop epub note body')) &&
        texts.some((text) => text.includes('高亮') && text.includes(firstSelectionText.slice(0, 20))) &&
        texts.some((text) => text.includes('高亮') && text.includes(secondSelectionText.slice(0, 20)))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop notes workspace to persist both highlights and the note after reopen'
    }).catch(async (error) => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nReopen meta: ${metaText}\nReopen cards: ${JSON.stringify(
          texts
        )}\nFirst selection: ${firstSelectionText}\nSecond selection: ${secondSelectionText}\nThird selection: ${thirdSelectionText}`
      );
    });

    await clickAnnotationKindFilter('高亮');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }

        return (
          metaText.includes('仅看高亮') &&
          cards.length === 2 &&
          texts.some((text) => text.includes(firstSelectionText.slice(0, 20))) &&
          texts.some((text) => text.includes(secondSelectionText.slice(0, 20)))
        );
      }, {
        timeout: 10000,
        timeoutMsg: 'expected the EPUB desktop notes workspace to filter down to the persisted highlights only'
      });

    await clickAnnotationKindFilter('笔记');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }

      return (
        metaText.includes('仅看笔记') &&
        cards.length === 1 &&
        texts[0]?.includes('desktop epub note body') &&
        !texts[0]?.includes('高亮')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop notes workspace to filter down to the persisted note only'
    });

    await clickAnnotationKindFilter('全部类型');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      return metaText.includes('全部类型') && cards.length === 3;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop notes workspace to restore the full annotation list after clearing the kind filter'
    });

    await clickReaderSidebarTab('高亮');
    await browser.waitUntil(async () => {
      const panel = await $('[aria-label="highlights panel preview"]');
      if (!(await panel.isDisplayed())) return false;
      const panelText = await panel.getText();
      const cards = await $$('.highlight-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        panelText.includes('已保存 2 条高亮') &&
        cards.length === 2 &&
        texts.some((text) => text.includes(firstSelectionText.slice(0, 20))) &&
        texts.some((text) => text.includes(secondSelectionText.slice(0, 20))) &&
        texts.every((text) => !text.includes('desktop epub note body'))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to isolate the persisted highlights from the mixed notes list'
    });

    await clickHighlightsSortControl('最早添加');
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return panelText.includes('最早添加优先') && firstText.includes(firstSelectionText.slice(0, 20));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to switch to oldest-first ordering before selecting a highlight'
    });

    await clickHighlightGroupAction('选中本组高亮');
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      return panelText.includes('已选 2 条');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to select every highlight in the current group'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '已选高亮'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the selected-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      return panelText.includes('2 已选高亮') && cards.length === 2;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to show the whole selected group inside the selected-only view'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '全部'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the all-highlights filter button to exist');
      }
      target.click();
    });
    await clickHighlightGroupAction('清空本组选择');
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      return panelText.includes('未选高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to clear the current group selection before continuing'
    });

    await toggleFirstHighlightSelection();
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        const firstToggle = document.querySelector('.highlight-selection-toggle');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstToggleText: firstToggle?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return state.panelText.includes('已选 1 条') && state.firstToggleText.includes('已选');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to select one oldest highlight'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '已选高亮'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the selected-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return (
        panelText.includes('1 已选高亮') &&
        cards.length === 1 &&
        firstText.includes(firstSelectionText.slice(0, 20))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to expose a selected-only view before inverting'
    });

    await browser.execute(() => {
      window.prompt = () => 'Desktop EPUB 重点高亮';
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.trim() === '保存当前选择集'
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('expected the save-current-selection button to exist');
      }
      button.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="saved highlight selections"]').getText();
      return panelText.includes('Desktop EPUB 重点高亮') && panelText.includes('1 条高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to save the current selection set'
    });
    await browser.execute(() => {
      window.prompt = () => 'Desktop EPUB 重命名高亮';
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const renameButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '重命名'
      );
      if (!(renameButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection rename button to exist');
      }
      renameButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="saved highlight selections"]').getText();
      return panelText.includes('Desktop EPUB 重命名高亮') && !panelText.includes('Desktop EPUB 重点高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to rename the saved selection set'
    });
    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '全部'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the all-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      return (
        panelText.includes('已保存 2 条高亮') &&
        panelText.includes('最早添加优先') &&
        cards.length === 2
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to return to the all-highlights view before seeding a second saved set'
    });
    await browser.execute(() => {
      const clearButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.trim() === '清空选中'
      );
      if (!(clearButton instanceof HTMLButtonElement)) {
        throw new Error('expected the clear-selected-highlights button to exist');
      }
      clearButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      return panelText.includes('未选高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to clear the live selection before seeding a second saved set'
    });
    await toggleFirstHighlightSelection();
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return state.panelText.includes('已选 1 条');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to select one highlight before saving a second set'
    });
    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '已选高亮'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the selected-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return (
        panelText.includes('1 已选高亮') &&
        cards.length === 1 &&
        firstText.includes(firstSelectionText.slice(0, 20))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to expose the selected highlight in selected-only view before saving a second set'
    });
    await browser.execute(() => {
      window.prompt = () => 'Desktop EPUB 第二高亮';
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.trim() === '保存当前选择集'
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('expected the save-current-selection button to exist');
      }
      button.click();
    });
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="saved highlight selections"]');
        const firstCard = panel?.querySelector('.saved-highlight-selection-card');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstCardText: firstCard?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('Desktop EPUB 重命名高亮') &&
        state.panelText.includes('Desktop EPUB 第二高亮') &&
        state.firstCardText.includes('Desktop EPUB 第二高亮')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to show the newest saved set first by default'
    });
    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="saved selection set sort controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected the saved selection set sort controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '最早保存'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the oldest-saved selection sort button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="saved highlight selections"]');
        const firstCard = panel?.querySelector('.saved-highlight-selection-card');
        return {
          firstCardText: firstCard?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return state.firstCardText.includes('Desktop EPUB 重命名高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to switch the saved set order to oldest-first'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await openReaderFromLibraryPath(bookKey, libraryHandle);
    await clickReaderSidebarTab('高亮');
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return (
        panelText.includes('1 已选高亮') &&
        panelText.includes('最早添加优先') &&
        cards.length === 1 &&
        firstText.includes(firstSelectionText.slice(0, 20))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to restore the selected-only view and ordering after reopening the book'
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="saved highlight selections"]').getText();
      const firstCardText = await browser.execute(() => {
        const firstCard = document.querySelector('[aria-label="saved highlight selections"] .saved-highlight-selection-card');
        return firstCard?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      });
      return (
        panelText.includes('Desktop EPUB 重命名高亮') &&
        panelText.includes('Desktop EPUB 第二高亮') &&
        panelText.includes('1 条高亮') &&
        firstCardText.includes('Desktop EPUB 重命名高亮')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to restore the saved selection sets and their oldest-first ordering after reopening the book'
    });

    await selectReaderMenuSetting('reader flow mode', '滚动');
    await selectReaderMenuSetting('reader font family', '无衬线');
    await selectReaderMenuSetting('reader font scale', '大');
    await selectReaderMenuSetting('reader line height', '舒展');
    await selectReaderMenuSetting('reader page margins', '宽');
    await browser.waitUntil(async () => {
      const footerText = await $('[aria-label="reader footer controls preview"]').getText();
      const rendererState = await readDesktopRendererSettings();
      return (
        footerText.includes('SCROLL') &&
        rendererState.flow === 'scrolled' &&
        rendererState.marginLeft === '44px' &&
        rendererState.fontSize === '22px' &&
        rendererState.lineHeightPx > 42 &&
        rendererState.fontFamily.includes('IBM Plex Sans')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop reader to apply the new layout settings before the reopen check'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await openReaderFromLibraryPath(bookKey, libraryHandle);
    await clickReaderSidebarTab('高亮');
    await browser.waitUntil(async () => {
      const footerText = await $('[aria-label="reader footer controls preview"]').getText();
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const rendererState = await readDesktopRendererSettings();
      return (
        footerText.includes('SCROLL') &&
        rendererState.flow === 'scrolled' &&
        rendererState.marginLeft === '44px' &&
        rendererState.fontSize === '22px' &&
        rendererState.lineHeightPx > 42 &&
        rendererState.fontFamily.includes('IBM Plex Sans') &&
        panelText.includes('1 已选高亮') &&
        panelText.includes('最早添加优先')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop reader to reopen with both the saved layout settings and the highlights workspace state'
    });

    await browser.execute(() => {
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const firstCard = savedPanel.querySelector('.saved-highlight-selection-card');
      if (!(firstCard instanceof HTMLElement)) {
        throw new Error('expected the first saved selection card to exist');
      }
      const exportButton = Array.from(firstCard.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '导出'
      );
      if (!(exportButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection export button to exist');
      }
      exportButton.click();
    });
    await browser.waitUntil(async () => {
      const exportState = await browser.execute(() => {
        const preview = document.querySelector('[aria-label="saved highlight selection export preview"]');
        const payload = preview?.querySelector('textarea');
        return {
          previewText: preview?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          payload: payload instanceof HTMLTextAreaElement ? payload.value : ''
        };
      });
      return (
        exportState.previewText.includes('Desktop EPUB 重命名高亮') &&
        exportState.payload.includes('"schemaVersion": 1') &&
        exportState.payload.includes('"formatLabel": "EPUB"') &&
        exportState.payload.includes('"highlights": [') &&
        exportState.payload.includes('"name": "Desktop EPUB 重命名高亮"')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to expose a structured export preview for the saved selection set'
    });
    const exportedSelectionPayload = await browser.execute(() => {
      const payload = document.querySelector('[aria-label="saved highlight selection export preview"] textarea');
      if (!(payload instanceof HTMLTextAreaElement)) {
        throw new Error('expected the saved selection export payload textarea to exist');
      }
      return payload.value;
    });
    const importedSelectionPayload = JSON.stringify({
      ...JSON.parse(exportedSelectionPayload),
      selectionSet: {
        ...JSON.parse(exportedSelectionPayload).selectionSet,
        selectedIds: ['missing-highlight-id'],
        importSource: {
          bookKey: 'imported-epub-book',
          bookTitle: 'Imported EPUB Source',
          formatLabel: 'EPUB',
          selectionName: 'Imported EPUB Selection',
          matchedCount: 1,
          totalCount: 2,
          unmatchedCount: 1,
          importedAt: 1710000000000,
          highlights: [
            ...JSON.parse(exportedSelectionPayload).highlights,
            {
              ...JSON.parse(exportedSelectionPayload).highlights[0],
              id: 'missing-imported-epub-highlight',
              cfi: 'epubcfi(/6/imported-missing)',
              text: 'missing desktop epub passage for unresolved drilldown',
              chapterHref: '/missing-imported-chapter.xhtml'
            }
          ]
        }
      },
      highlights: JSON.parse(exportedSelectionPayload).highlights.map((highlight: Record<string, unknown>) => ({
        ...highlight,
        cfi: 'epubcfi(/6/missing)',
        chapterHref: '/missing-chapter.xhtml'
      }))
    });
    const crossBookPreviewPayload = JSON.stringify({
      ...JSON.parse(exportedSelectionPayload),
      bookKey: 'other-book-key',
      bookTitle: 'Other EPUB Book',
      selectionSet: {
        ...JSON.parse(exportedSelectionPayload).selectionSet,
        selectedIds: ['missing-highlight-id']
      },
      highlights: JSON.parse(exportedSelectionPayload).highlights.map((highlight: Record<string, unknown>) => ({
        ...highlight,
        cfi: 'epubcfi(/6/missing)',
        chapterHref: '/missing-chapter.xhtml'
      }))
    });
    await browser.execute(() => {
      const preview = document.querySelector('[aria-label="saved highlight selection export preview"]');
      if (!(preview instanceof HTMLElement)) {
        throw new Error('expected the saved selection export preview to exist');
      }
      const closeButton = Array.from(preview.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '关闭'
      );
      if (!(closeButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection export preview close button to exist');
      }
      closeButton.click();
    });
    await browser.waitUntil(async () => {
      const previews = await $$('[aria-label="saved highlight selection export preview"]');
      return previews.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to close the saved selection export preview'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '全部'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the all-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      return (
        panelText.includes('已保存 2 条高亮') &&
        panelText.includes('最早添加优先') &&
        cards.length === 2
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to return to the all-highlights view before reapplying the saved set'
    });
    await browser.execute(() => {
      const clearButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.trim() === '清空选中'
      );
      if (!(clearButton instanceof HTMLButtonElement)) {
        throw new Error('expected the clear-selected-highlights button to exist');
      }
      clearButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      return panelText.includes('未选高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to clear the live selection before reapplying a saved set'
    });
    await browser.execute(() => {
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const applyButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '套用'
      );
      if (!(applyButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection apply button to exist');
      }
      applyButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return (
        panelText.includes('1 已选高亮') &&
        cards.length === 1 &&
        firstText.includes(firstSelectionText.slice(0, 20))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to reapply a saved selection set'
    });
    await browser.execute(() => {
      window.confirm = () => true;
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const deleteButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '删除'
      );
      if (!(deleteButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection delete button to exist');
      }
      deleteButton.click();
    });
    await browser.waitUntil(async () => {
      const savedPanels = await $$('[aria-label="saved highlight selections"]');
      if (!savedPanels.length) return true;
      const panelText = await savedPanels[0].getText();
      return !panelText.includes('Desktop EPUB 重命名高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to delete the saved selection set'
    });
    await browser.execute((payload) => {
      window.prompt = () => payload;
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const importButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '导入'
      );
      if (!(importButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection import button to exist');
      }
      importButton.click();
    }, importedSelectionPayload);
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="saved highlight selections"]');
        const firstCard = panel?.querySelector('.saved-highlight-selection-card');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstCardText: firstCard?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('已导入选择集：Desktop EPUB 重命名高亮') &&
        state.panelText.includes('Desktop EPUB 重命名高亮') &&
        state.firstCardText.includes('Desktop EPUB 重命名高亮') &&
        state.firstCardText.includes('跨书导入 · Imported EPUB Source / Imported EPUB Selection · 1/2')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to import the saved selection set back into the current book'
    });
    await browser.execute(() => {
      const firstCard = document.querySelector('[aria-label="saved highlight selections"] .saved-highlight-selection-card');
      if (!(firstCard instanceof HTMLElement)) {
        throw new Error('expected the first saved highlight selection card to exist');
      }
      const refreshButton = Array.from(firstCard.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '刷新映射'
      );
      if (!(refreshButton instanceof HTMLButtonElement)) {
        throw new Error('expected the refresh-cross-book-selection button to exist');
      }
      refreshButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="saved highlight selections"]').getText();
      return panelText.includes('已刷新跨书选择集：Desktop EPUB 重命名高亮（1/2）');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to refresh the imported foreign-book saved selection without requiring a reimport'
    });
    await browser.execute(() => {
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const refreshAllButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '刷新全部跨书映射'
      );
      if (!(refreshAllButton instanceof HTMLButtonElement)) {
        throw new Error('expected the bulk refresh-cross-book-selections button to exist');
      }
      refreshAllButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="saved highlight selections"]').getText();
      return panelText.includes('已刷新 1 组跨书选择集');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to bulk-refresh imported foreign-book saved selections'
    });
    await browser.waitUntil(async () => {
      const summaryText = await $('[aria-label="saved highlight selection refresh summary"]').getText();
      return (
        summaryText.includes('共处理 1 组跨书选择集') &&
        summaryText.includes('部分匹配：') &&
        summaryText.includes('Desktop EPUB 重命名高亮（1/2）')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to surface a structured partial-match summary after bulk refresh'
    });
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="saved highlight selections"]');
        const firstCard = panel?.querySelector('.saved-highlight-selection-card');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstCardText: firstCard?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('未命中 1 条，可刷新映射') &&
        state.firstCardText.includes('未映射片段') &&
        state.firstCardText.includes('missing desktop epub passage for unresolved drilldown')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop imported saved set to show unresolved highlight text after refresh'
    });
    await browser.execute((payload) => {
      window.prompt = () => payload;
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const importButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '导入'
      );
      if (!(importButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection import button to exist');
      }
      importButton.click();
    }, crossBookPreviewPayload);
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="saved highlight selections"]');
        const preview = document.querySelector('[aria-label="saved highlight selection import preview"]');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          previewText: preview?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('跨书预检：可映射 1/1 条高亮') &&
        state.previewText.includes('来源：Other EPUB Book · EPUB') &&
        state.previewText.includes('来源选择集：Desktop EPUB 重命名高亮') &&
        state.previewText.includes('当前书可映射 1 / 1 条高亮')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to show a cross-book compatibility preview instead of importing immediately'
    });
    await browser.execute(() => {
      const preview = document.querySelector('[aria-label="saved highlight selection import preview"]');
      if (!(preview instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selection import preview to exist');
      }
      const importButton = Array.from(preview.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '导入已匹配高亮'
      );
      if (!(importButton instanceof HTMLButtonElement)) {
        throw new Error('expected the import-matched-highlights button to exist');
      }
      importButton.click();
    });
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="saved highlight selections"]');
        const firstCard = panel?.querySelector('.saved-highlight-selection-card');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstCardText: firstCard?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('已导入跨书选择集：Desktop EPUB 重命名高亮 (2)（1/1）') &&
        state.firstCardText.includes('Desktop EPUB 重命名高亮 (2)') &&
        state.firstCardText.includes('跨书导入 · Other EPUB Book / Desktop EPUB 重命名高亮 · 1/1')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to import the matched subset from the foreign-book preview'
    });
    await browser.execute((payload) => {
      window.prompt = () => payload;
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const importButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '导入'
      );
      if (!(importButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection import button to exist');
      }
      importButton.click();
    }, crossBookPreviewPayload);
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="saved highlight selections"]');
        const preview = document.querySelector('[aria-label="saved highlight selection import preview"]');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          previewText: preview?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('跨书预检：可映射 1/1 条高亮') &&
        state.previewText.includes('来源：Other EPUB Book · EPUB') &&
        state.previewText.includes('来源选择集：Desktop EPUB 重命名高亮')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to reopen the same cross-book preview before testing update-in-place behavior'
    });
    await browser.execute(() => {
      const preview = document.querySelector('[aria-label="saved highlight selection import preview"]');
      if (!(preview instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selection import preview to exist');
      }
      const importButton = Array.from(preview.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '导入已匹配高亮'
      );
      if (!(importButton instanceof HTMLButtonElement)) {
        throw new Error('expected the import-matched-highlights button to exist');
      }
      importButton.click();
    });
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="saved highlight selections"]');
        const cards = Array.from(panel?.querySelectorAll('.saved-highlight-selection-card strong') ?? []).map(
          (node) => node.textContent?.trim() ?? ''
        );
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          cards
        };
      });
      return (
        state.panelText.includes('已更新跨书选择集：Desktop EPUB 重命名高亮 (2)（1/1）') &&
        state.cards.filter((name) => name === 'Desktop EPUB 重命名高亮 (2)').length === 1
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to update the existing foreign-book saved set instead of creating another duplicate'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '全部'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the all-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      return panelText.includes('全部章节') && cards.length === 2;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to restore the full view after leaving selected-only mode'
    });

    await invertVisibleHighlightsSelectionInWorkspace();
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>('.highlight-selection-toggle'));
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstToggleText: toggles[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          secondToggleText: toggles[1]?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('已选 1 条') &&
        state.firstToggleText.includes('选中') &&
        state.secondToggleText.includes('已选')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to invert the current group selection before deleting'
    });

    await deleteSelectedHighlightsInWorkspace();
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        panelText.includes('已保存 1 条高亮') &&
        panelText.includes('未选高亮') &&
        cards.length === 1 &&
        texts[0]?.includes(firstSelectionText.slice(0, 20))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to delete only the inverted selection and keep the oldest highlight'
    });

    await clickHighlightsSortControl('最近添加');

    await browser.execute(() => {
      window.confirm = () => true;
    });
    await clickHighlightGroupAction('删除本组高亮');
    await browser.waitUntil(async () => {
      const panel = await $('[aria-label="highlights panel preview"]');
      const panelText = await panel.getText();
      const cards = await $$('.highlight-card');
      return panelText.includes('还没有高亮') && cards.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop highlights workspace to clear the current group after deleting the whole highlight group'
    });

    await clickReaderSidebarTab('笔记');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('0 高亮') &&
        metaText.includes('1 笔记') &&
        cards.length === 1 &&
        texts[0]?.includes('desktop epub note body')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the EPUB desktop notes workspace to keep the persisted note after bulk highlight deletion'
    });

    await clearAllReaderNotes();
    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
  });

  it('persists MOBI and AZW3 highlights and notes separately through the desktop reader store', async function () {
    this.timeout(180000);
    const importedBooks = await importDesktopSampleLibraryBooks();
    const annotationSamples = sampleLibraryFormats.filter((sample) =>
      ['MOBI', 'AZW3'].includes(sample.format)
    );
    const libraryHandle = await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    for (const sample of annotationSamples) {
      const importedBook = importedBooks.find((entry) => entry.format === sample.format);
      if (!importedBook) {
        throw new Error(`expected an imported ${sample.format} desktop sample`);
      }
      if (!importedBook.filePath) {
        throw new Error(`expected ${sample.format} sample to expose a file path`);
      }

      const refreshedBook = await loadLibraryRecordBySourcePathOnDisk(importedBook.sourcePath);
      const currentFilePath = (refreshedBook?.filePath ?? refreshedBook?.file_path ?? importedBook.filePath) as string;
      await clearReaderHighlightsWorkspaceStateOnDisk(currentFilePath);

      await openReaderFromLibraryPath(currentFilePath, libraryHandle);
      await waitForDesktopReaderToHydrate(sample.format);
      await switchReaderToNotesTab();
      await clearAllReaderNotes();

      const firstSelectionText = await selectVisibleFoliateTextInReader();
      await browser.waitUntil(async () => {
        const selectionText = await browser.execute(() => {
          return document.querySelector('.selection-card p')?.textContent?.trim() ?? '';
        });
        return selectionText.includes(firstSelectionText.slice(0, 20));
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} reader to expose the first selected text in the notes workspace`
      }).catch(async (error) => {
        const diagnostics = await browser.execute(() => {
          const selectionText = document.querySelector('.selection-card p')?.textContent?.trim() ?? '';
          const metaText = document.querySelector('.notes-meta-row')?.textContent?.trim() ?? '';
          const buttons = Array.from(document.querySelectorAll('.secondary-note-action, .primary-note-action')).map(
            (button) => ({
              text: (button as HTMLButtonElement).textContent?.trim() ?? '',
              disabled: (button as HTMLButtonElement).disabled
            })
          );
          return { selectionText, metaText, buttons };
        });
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nFormat: ${sample.format}\nFirst selection: ${firstSelectionText}\nDiagnostics: ${JSON.stringify(
            diagnostics
          )}`
        );
      });

      const highlightButton = await $('//button[contains(@class, "secondary-note-action") and not(contains(@class, "danger-action"))]');
      await highlightButton.click();

      await browser.waitUntil(async () => {
        const cards = await $$('.note-card');
        if (!cards.length) return false;
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }
        return texts.some((text) => text.includes('高亮') && text.includes(firstSelectionText.slice(0, 20)));
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} reader to persist a highlight entry in the desktop notes workspace`
      });

      const secondSelectionText = await selectVisibleFoliateTextInReader(1);
      await browser.waitUntil(async () => {
        const selectionText = await browser.execute(() => {
          return document.querySelector('.selection-card p')?.textContent?.trim() ?? '';
        });
        return selectionText.includes(secondSelectionText.slice(0, 20));
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} reader to expose the second selected text in the notes workspace`
      });

      await highlightButton.click();

      await browser.waitUntil(async () => {
        const metaRow = await $('.notes-meta-row');
        const metaText = await metaRow.getText();
        const cards = await $$('.note-card');
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }
        return (
          metaText.includes('2 高亮') &&
          metaText.includes('0 笔记') &&
          cards.length === 2 &&
          texts.some((text) => text.includes(firstSelectionText.slice(0, 20))) &&
          texts.some((text) => text.includes(secondSelectionText.slice(0, 20)))
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop notes workspace to show two highlights before creating a note`
      });

      const thirdSelectionText = await selectVisibleFoliateTextInReader(2);
      await browser.waitUntil(async () => {
        const selectionText = await browser.execute(() => {
          return document.querySelector('.selection-card p')?.textContent?.trim() ?? '';
        });
        return selectionText.includes(thirdSelectionText.slice(0, 20));
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} reader to expose the third selected text in the notes workspace`
      });

      await browser.execute((formatLabel) => {
        window.prompt = () => `desktop ${formatLabel.toLowerCase()} note body`;
      }, sample.format);

      const noteButton = await $('.primary-note-action');
      await noteButton.click();

      await browser.waitUntil(async () => {
        const metaRow = await $('.notes-meta-row');
        const metaText = await metaRow.getText();
        const cards = await $$('.note-card');
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }
        return (
          metaText.includes('2 高亮') &&
          metaText.includes('1 笔记') &&
          cards.length === 3 &&
          texts.some((text) => text.includes(`desktop ${sample.format.toLowerCase()} note body`)) &&
          texts.some((text) => text.includes('高亮') && text.includes(firstSelectionText.slice(0, 20))) &&
          texts.some((text) => text.includes('高亮') && text.includes(secondSelectionText.slice(0, 20)))
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop notes workspace to show two highlights and one note`
      });

      const notesStorageKey = `br1.reader.notes:${currentFilePath}`;
      await browser.waitUntil(async () => {
        try {
          const persistedNotes = await loadReaderNotesOnDisk(notesStorageKey);
          return (
            persistedNotes.length === 3 &&
            persistedNotes.some(
              (note) =>
                note.kind === 'highlight' &&
                (note.text ?? '').includes(firstSelectionText.slice(0, 20))
            ) &&
            persistedNotes.some(
              (note) =>
                note.kind === 'highlight' &&
                (note.text ?? '').includes(secondSelectionText.slice(0, 20))
            ) &&
            persistedNotes.some(
              (note) =>
                note.kind === 'note' &&
                note.note === `desktop ${sample.format.toLowerCase()} note body`
            )
          );
        } catch {
          return false;
        }
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} reader notes store to persist both the highlight and the note before closing the window`
      });
      const persistedNotes = await loadReaderNotesOnDisk(notesStorageKey);
      const persistedHighlights = persistedNotes.filter((note) => note.kind === 'highlight');
      const persistedNote = persistedNotes.find((note) => note.kind === 'note');
      if (persistedHighlights.length !== 2 || persistedHighlights.some((note) => !note.text) || !persistedNote?.note) {
        throw new Error(`expected persisted ${sample.format} notes to include two highlights and a note body`);
      }

      await browser.closeWindow();
      await browser.switchToWindow(libraryHandle);
      await openReaderFromLibraryPath(currentFilePath, libraryHandle);
      await waitForDesktopReaderToHydrate(sample.format);
      await switchReaderToNotesTab();

      await browser.waitUntil(async () => {
        const metaRow = await $('.notes-meta-row');
        const metaText = await metaRow.getText();
        const cards = await $$('.note-card');
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }
        return (
          metaText.includes('2 高亮') &&
          metaText.includes('1 笔记') &&
          cards.length === 3 &&
          texts.some((text) => text.includes(persistedNote.note!)) &&
          texts.some(
            (text) =>
              text.includes('高亮') && text.includes(firstSelectionText.slice(0, 20))
          ) &&
          texts.some(
            (text) =>
              text.includes('高亮') && text.includes(secondSelectionText.slice(0, 20))
          )
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop notes workspace to persist both highlights and the note after reopen`
      }).catch(async (error) => {
        const metaRow = await $('.notes-meta-row');
        const metaText = await metaRow.getText();
        const cards = await $$('.note-card');
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nFormat: ${sample.format}\nReopen meta: ${metaText}\nReopen cards: ${JSON.stringify(
          texts
        )}\nPersisted notes: ${JSON.stringify(persistedNotes)}`
        );
      });

      await clickAnnotationKindFilter('高亮');
      await browser.waitUntil(async () => {
        const metaText = await $('.notes-meta-row').getText();
        const cards = await $$('.note-card');
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }

        return (
          metaText.includes('仅看高亮') &&
          cards.length === 2 &&
          texts.some((text) => text.includes(firstSelectionText.slice(0, 20))) &&
          texts.some((text) => text.includes(secondSelectionText.slice(0, 20)))
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop notes workspace to filter down to the persisted highlights only`
      });

      await clickAnnotationKindFilter('笔记');
      await browser.waitUntil(async () => {
        const metaText = await $('.notes-meta-row').getText();
        const cards = await $$('.note-card');
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }

        return (
          metaText.includes('仅看笔记') &&
          cards.length === 1 &&
          texts[0]?.includes(`desktop ${sample.format.toLowerCase()} note body`) &&
          !texts[0]?.includes('高亮')
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop notes workspace to filter down to the persisted note only`
      });

      await clickAnnotationKindFilter('全部类型');
      await browser.waitUntil(async () => {
        const metaText = await $('.notes-meta-row').getText();
        const cards = await $$('.note-card');
        return metaText.includes('全部类型') && cards.length === 3;
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop notes workspace to restore the full annotation list after clearing the kind filter`
      });

      await clickReaderSidebarTab('高亮');
      await browser.waitUntil(async () => {
        const panel = await $('[aria-label="highlights panel preview"]');
        if (!(await panel.isDisplayed())) return false;
        const panelText = await panel.getText();
        const cards = await $$('.highlight-card');
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }
        return (
          panelText.includes('已保存 2 条高亮') &&
          cards.length === 2 &&
          texts.some((text) => text.includes(firstSelectionText.slice(0, 20))) &&
          texts.some((text) => text.includes(secondSelectionText.slice(0, 20))) &&
          texts.every((text) => !text.includes(persistedNote.note!))
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to isolate the persisted highlights from the mixed notes list`
      });

      await clickHighlightsSortControl('最早添加');
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="highlights panel preview"]').getText();
        const cards = await $$('.highlight-card');
        const firstText = cards.length ? await cards[0].getText() : '';
        return panelText.includes('最早添加优先') && firstText.includes(firstSelectionText.slice(0, 20));
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to switch to oldest-first ordering before selecting a highlight`
      });

      await toggleFirstHighlightSelection();
      await browser.waitUntil(async () => {
        const state = await browser.execute(() => {
          const panel = document.querySelector('[aria-label="highlights panel preview"]');
          const firstToggle = document.querySelector('.highlight-selection-toggle');
          return {
            panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            firstToggleText: firstToggle?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
          };
        });
        return state.panelText.includes('已选 1 条') && state.firstToggleText.includes('已选');
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to select one oldest highlight`
      });

      await browser.execute(() => {
        const controls = document.querySelector('[aria-label="highlights filter controls"]');
        if (!(controls instanceof HTMLElement)) {
          throw new Error('expected highlights filter controls to exist');
        }
        const target = Array.from(controls.querySelectorAll('button')).find(
          (button) => button.textContent?.trim() === '已选高亮'
        );
        if (!(target instanceof HTMLButtonElement)) {
          throw new Error('expected the selected-highlights filter button to exist');
        }
        target.click();
      });
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="highlights panel preview"]').getText();
        const cards = await $$('.highlight-card');
        const firstText = cards.length ? await cards[0].getText() : '';
        return (
          panelText.includes('1 已选高亮') &&
          cards.length === 1 &&
          firstText.includes(firstSelectionText.slice(0, 20))
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to expose a selected-only view before inverting`
      });

      await browser.execute((formatLabel) => {
        window.prompt = () => `Desktop ${formatLabel} 重点高亮`;
        const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
          (candidate) => candidate.textContent?.trim() === '保存当前选择集'
        );
        if (!(button instanceof HTMLButtonElement)) {
          throw new Error('expected the save-current-selection button to exist');
        }
        button.click();
      }, sample.format);
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="saved highlight selections"]').getText();
        return panelText.includes(`Desktop ${sample.format} 重点高亮`) && panelText.includes('1 条高亮');
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to save the current selection set`
      });

      await selectReaderMenuSetting('reader flow mode', '滚动');
      await selectReaderMenuSetting('reader font family', '无衬线');
      await selectReaderMenuSetting('reader font scale', '大');
      await selectReaderMenuSetting('reader line height', '舒展');
      await selectReaderMenuSetting('reader page margins', '宽');
      await browser.waitUntil(async () => {
        const footerText = await $('[aria-label="reader footer controls preview"]').getText();
        const rendererState = await readDesktopRendererSettings();
        return (
          footerText.includes('SCROLL') &&
          rendererState.flow === 'scrolled' &&
          rendererState.marginLeft === '44px' &&
          rendererState.fontSize === '22px' &&
          rendererState.lineHeightPx > 42 &&
          rendererState.fontFamily.includes('IBM Plex Sans')
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop reader to apply the new layout settings before the reopen check`
      });

      await browser.closeWindow();
      await browser.switchToWindow(libraryHandle);
      await openReaderFromLibraryPath(currentFilePath, libraryHandle);
      await waitForDesktopReaderToHydrate(sample.format);
      await clickReaderSidebarTab('高亮');
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="highlights panel preview"]').getText();
        const cards = await $$('.highlight-card');
        const firstText = cards.length ? await cards[0].getText() : '';
        return (
          panelText.includes('1 已选高亮') &&
          panelText.includes('最早添加优先') &&
          cards.length === 1 &&
          firstText.includes(firstSelectionText.slice(0, 20))
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to restore the selected-only view and ordering after reopening the book`
      });
      await browser.waitUntil(async () => {
        const footerText = await $('[aria-label="reader footer controls preview"]').getText();
        const panelText = await $('[aria-label="highlights panel preview"]').getText();
        const rendererState = await readDesktopRendererSettings();
        return (
          footerText.includes('SCROLL') &&
          rendererState.flow === 'scrolled' &&
          rendererState.marginLeft === '44px' &&
          rendererState.fontSize === '22px' &&
          rendererState.lineHeightPx > 42 &&
          rendererState.fontFamily.includes('IBM Plex Sans') &&
          panelText.includes('1 已选高亮') &&
          panelText.includes('最早添加优先')
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop reader to reopen with both the saved layout settings and the highlights workspace state`
      });
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="saved highlight selections"]').getText();
        return panelText.includes(`Desktop ${sample.format} 重点高亮`) && panelText.includes('1 条高亮');
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to restore the saved selection set after reopening the book`
      });

      await browser.execute(() => {
        const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
        if (!(savedPanel instanceof HTMLElement)) {
          throw new Error('expected the saved highlight selections panel to exist');
        }
        const firstCard = savedPanel.querySelector('.saved-highlight-selection-card');
        if (!(firstCard instanceof HTMLElement)) {
          throw new Error('expected the first saved selection card to exist');
        }
        const exportButton = Array.from(firstCard.querySelectorAll('button')).find(
          (candidate) => candidate.textContent?.trim() === '导出'
        );
        if (!(exportButton instanceof HTMLButtonElement)) {
          throw new Error('expected the saved selection export button to exist');
        }
        exportButton.click();
      });
      await browser.waitUntil(async () => {
        const exportState = await browser.execute(() => {
          const preview = document.querySelector('[aria-label="saved highlight selection export preview"]');
          const payload = preview?.querySelector('textarea');
          return {
            previewText: preview?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            payload: payload instanceof HTMLTextAreaElement ? payload.value : ''
          };
        });
        return (
          exportState.previewText.includes(`Desktop ${sample.format} 重点高亮`) &&
          exportState.payload.includes('"schemaVersion": 1') &&
          exportState.payload.includes(`"formatLabel": "${sample.format}"`) &&
          exportState.payload.includes('"highlights": [')
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to expose a structured export preview for the saved selection set`
      });
      const exportedSelectionPayload = await browser.execute(() => {
        const payload = document.querySelector('[aria-label="saved highlight selection export preview"] textarea');
        if (!(payload instanceof HTMLTextAreaElement)) {
          throw new Error('expected the saved selection export payload textarea to exist');
        }
        return payload.value;
      });
      const exportedSelection = JSON.parse(exportedSelectionPayload);
      const importedSelectionPayload = JSON.stringify({
        ...exportedSelection,
        selectionSet: {
          ...exportedSelection.selectionSet,
          selectedIds: ['missing-kindle-family-highlight-id'],
          importSource: {
            bookKey: `imported-${sample.format.toLowerCase()}-book`,
            bookTitle: `Imported ${sample.format} Source`,
            formatLabel: sample.format,
            selectionName: `Imported ${sample.format} Selection`,
            matchedCount: 1,
            totalCount: 2,
            unmatchedCount: 1,
            importedAt: 1710000000000,
            highlights: [
              ...exportedSelection.highlights,
              {
                ...exportedSelection.highlights[0],
                id: `missing-imported-${sample.format.toLowerCase()}-highlight`,
                cfi: 'epubcfi(/6/imported-missing)',
                text: `missing desktop ${sample.format.toLowerCase()} passage for unresolved drilldown`,
                chapterHref: '/missing-imported-chapter.xhtml'
              }
            ]
          }
        },
        highlights: exportedSelection.highlights.map((highlight: Record<string, unknown>) => ({
          ...highlight,
          cfi: 'epubcfi(/6/missing)',
          chapterHref: '/missing-chapter.xhtml'
        }))
      });
      await browser.execute(() => {
        const preview = document.querySelector('[aria-label="saved highlight selection export preview"]');
        if (!(preview instanceof HTMLElement)) {
          throw new Error('expected the saved selection export preview to exist');
        }
        const closeButton = Array.from(preview.querySelectorAll('button')).find(
          (candidate) => candidate.textContent?.trim() === '关闭'
        );
        if (!(closeButton instanceof HTMLButtonElement)) {
          throw new Error('expected the saved selection export preview close button to exist');
        }
        closeButton.click();
      });
      await browser.execute((payload) => {
        window.prompt = () => payload;
        const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
        if (!(savedPanel instanceof HTMLElement)) {
          throw new Error('expected the saved highlight selections panel to exist');
        }
        const importButton = Array.from(savedPanel.querySelectorAll('button')).find(
          (candidate) => candidate.textContent?.trim() === '导入'
        );
        if (!(importButton instanceof HTMLButtonElement)) {
          throw new Error('expected the saved selection import button to exist');
        }
        importButton.click();
      }, importedSelectionPayload);
      await browser.waitUntil(async () => {
        const state = await browser.execute(() => {
          const panel = document.querySelector('[aria-label="saved highlight selections"]');
          const firstCard = panel?.querySelector('.saved-highlight-selection-card');
          return {
            panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            firstCardText: firstCard?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
          };
        });
        return (
          state.panelText.includes(`已导入选择集：Desktop ${sample.format} 重点高亮`) &&
          state.firstCardText.includes(`跨书导入 · Imported ${sample.format} Source / Imported ${sample.format} Selection · 1/2`) &&
          state.firstCardText.includes('未映射片段') &&
          state.firstCardText.includes(`missing desktop ${sample.format.toLowerCase()} passage for unresolved drilldown`)
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop imported saved set to show unresolved highlight text after import`
      });
      await browser.execute(() => {
        window.confirm = () => true;
        const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
        const firstCard = savedPanel?.querySelector('.saved-highlight-selection-card');
        if (!(firstCard instanceof HTMLElement)) {
          throw new Error('expected the imported saved highlight selection card to exist');
        }
        const deleteButton = Array.from(firstCard.querySelectorAll('button')).find(
          (candidate) => candidate.textContent?.trim() === '删除'
        );
        if (!(deleteButton instanceof HTMLButtonElement)) {
          throw new Error('expected the imported saved selection delete button to exist');
        }
        deleteButton.click();
      });
      await browser.waitUntil(async () => {
        const cardTexts = await browser.execute(() =>
          Array.from(document.querySelectorAll('[aria-label="saved highlight selections"] .saved-highlight-selection-card')).map(
            (card) => card.textContent?.replace(/\s+/g, ' ').trim() ?? ''
          )
        );
        return (
          cardTexts.some((text) => text.includes(`Desktop ${sample.format} 重点高亮`)) &&
          cardTexts.every((text) => !text.includes(`Imported ${sample.format} Source`)) &&
          cardTexts.every((text) => !text.includes(`missing desktop ${sample.format.toLowerCase()} passage for unresolved drilldown`))
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to remove the temporary imported saved selection set`
      });

      await browser.execute(() => {
        const controls = document.querySelector('[aria-label="highlights filter controls"]');
        if (!(controls instanceof HTMLElement)) {
          throw new Error('expected highlights filter controls to exist');
        }
        const target = Array.from(controls.querySelectorAll('button')).find(
          (button) => button.textContent?.trim() === '全部'
        );
        if (!(target instanceof HTMLButtonElement)) {
          throw new Error('expected the all-highlights filter button to exist');
        }
        target.click();
      });
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="highlights panel preview"]').getText();
        const cards = await $$('.highlight-card');
        return panelText.includes('全部章节') && cards.length === 2;
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to return to the all-highlights view before reapplying the saved set`
      });

      await browser.execute(() => {
        const clearButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
          (candidate) => candidate.textContent?.trim() === '清空选中'
        );
        if (!(clearButton instanceof HTMLButtonElement)) {
          throw new Error('expected the clear-selected-highlights button to exist');
        }
        clearButton.click();
      });
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="highlights panel preview"]').getText();
        return panelText.includes('未选高亮');
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to clear the live selection before reapplying a saved set`
      });

      await browser.execute(() => {
        const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
        if (!(savedPanel instanceof HTMLElement)) {
          throw new Error('expected the saved highlight selections panel to exist');
        }
        const applyButton = Array.from(savedPanel.querySelectorAll('button')).find(
          (candidate) => candidate.textContent?.trim() === '套用'
        );
        if (!(applyButton instanceof HTMLButtonElement)) {
          throw new Error('expected the saved selection apply button to exist');
        }
        applyButton.click();
      });
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="highlights panel preview"]').getText();
        const cards = await $$('.highlight-card');
        const firstText = cards.length ? await cards[0].getText() : '';
        return (
          panelText.includes('1 已选高亮') &&
          cards.length === 1 &&
          firstText.includes(firstSelectionText.slice(0, 20))
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to reapply a saved selection set`
      });

      await browser.execute(() => {
        window.confirm = () => true;
        const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
        if (!(savedPanel instanceof HTMLElement)) {
          throw new Error('expected the saved highlight selections panel to exist');
        }
        const deleteButton = Array.from(savedPanel.querySelectorAll('button')).find(
          (candidate) => candidate.textContent?.trim() === '删除'
        );
        if (!(deleteButton instanceof HTMLButtonElement)) {
          throw new Error('expected the saved selection delete button to exist');
        }
        deleteButton.click();
      });
      await browser.waitUntil(async () => {
        const cardTexts = await browser.execute(() =>
          Array.from(document.querySelectorAll('[aria-label="saved highlight selections"] .saved-highlight-selection-card')).map(
            (card) => card.textContent?.replace(/\s+/g, ' ').trim() ?? ''
          )
        );
        return cardTexts.every((text) => !text.includes(`Desktop ${sample.format} 重点高亮`));
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to delete the saved selection set`
      });

      await browser.execute(() => {
        const controls = document.querySelector('[aria-label="highlights filter controls"]');
        if (!(controls instanceof HTMLElement)) {
          throw new Error('expected highlights filter controls to exist');
        }
        const target = Array.from(controls.querySelectorAll('button')).find(
          (button) => button.textContent?.trim() === '全部'
        );
        if (!(target instanceof HTMLButtonElement)) {
          throw new Error('expected the all-highlights filter button to exist');
        }
        target.click();
      });
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="highlights panel preview"]').getText();
        const cards = await $$('.highlight-card');
        return panelText.includes('全部章节') && cards.length === 2;
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to restore the full view after leaving selected-only mode`
      });

      await invertVisibleHighlightsSelectionInWorkspace();
      await browser.waitUntil(async () => {
        const state = await browser.execute(() => {
          const panel = document.querySelector('[aria-label="highlights panel preview"]');
          const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>('.highlight-selection-toggle'));
          return {
            panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            firstToggleText: toggles[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            secondToggleText: toggles[1]?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
          };
        });
        return (
          state.panelText.includes('已选 1 条') &&
          state.firstToggleText.includes('选中') &&
          state.secondToggleText.includes('已选')
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to invert the current selection before deleting`
      });

      await deleteSelectedHighlightsInWorkspace();
      await browser.waitUntil(async () => {
        const panelText = await $('[aria-label="highlights panel preview"]').getText();
        const cards = await $$('.highlight-card');
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }
        return (
          panelText.includes('已保存 1 条高亮') &&
          panelText.includes('未选高亮') &&
          cards.length === 1 &&
          texts[0]?.includes(firstSelectionText.slice(0, 20))
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to delete only the inverted selection and keep the oldest highlight`
      });

      await clickHighlightsSortControl('最近添加');

      await bulkDeleteVisibleHighlightsInWorkspace();
      await browser.waitUntil(async () => {
        const panel = await $('[aria-label="highlights panel preview"]');
        const panelText = await panel.getText();
        const cards = await $$('.highlight-card');
        return panelText.includes('还没有高亮') && cards.length === 0;
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop highlights workspace to clear the visible highlight after bulk delete`
      });

      await clickReaderSidebarTab('笔记');
      await browser.waitUntil(async () => {
        const metaText = await $('.notes-meta-row').getText();
        const cards = await $$('.note-card');
        const texts: string[] = [];
        for (const card of cards) {
          texts.push(await card.getText());
        }
        return (
          metaText.includes('0 高亮') &&
          metaText.includes('1 笔记') &&
          cards.length === 1 &&
          texts[0]?.includes(persistedNote.note!)
        );
      }, {
        timeout: 10000,
        timeoutMsg: `expected the ${sample.format} desktop notes workspace to keep the persisted note after bulk highlight deletion`
      });

      await clearAllReaderNotes();
      await browser.closeWindow();
      await browser.switchToWindow(libraryHandle);
    }
  });

  it('persists FB2 highlights and notes separately through the desktop reader store', async function () {
    this.timeout(180000);
    const importedBooks = await importDesktopSampleLibraryBooks();
    const importedBook = importedBooks.find((entry) => entry.format === 'FB2');
    if (!importedBook) {
      throw new Error('expected an imported FB2 desktop sample');
    }
    if (!importedBook.filePath) {
      throw new Error('expected the FB2 sample to expose a file path');
    }

    const refreshedBook = await loadLibraryRecordBySourcePathOnDisk(importedBook.sourcePath);
    let currentFilePath = (refreshedBook?.filePath ?? refreshedBook?.file_path ?? importedBook.filePath) as string;
    await clearReaderHighlightsWorkspaceStateOnDisk(currentFilePath);

    const libraryHandle = await switchToLibraryWindow();
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });

    await openReaderFromLibraryPath(currentFilePath, libraryHandle);
    await switchReaderToNotesTab();
    await clearAllReaderNotes();

    const fb2ReaderTitle = await browser.execute(() => {
      return document.querySelector('.book-card h2')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    });
    const firstSelectionText = await selectVisibleFoliateTextInReader(0, [fb2ReaderTitle, 'Chapter 1']);
    await browser.waitUntil(async () => {
      const selectionText = await browser.execute(() => {
        return document.querySelector('.selection-card p')?.textContent?.trim() ?? '';
      });
      return selectionText.includes(firstSelectionText.slice(0, 20));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 reader to expose the first selected text in the notes workspace'
    }).catch(async (error) => {
      const diagnostics = await browser.execute(() => {
        const selectionText = document.querySelector('.selection-card p')?.textContent?.trim() ?? '';
        const metaText = document.querySelector('.notes-meta-row')?.textContent?.trim() ?? '';
        const buttons = Array.from(document.querySelectorAll('.secondary-note-action, .primary-note-action')).map(
          (button) => ({
            text: (button as HTMLButtonElement).textContent?.trim() ?? '',
            disabled: (button as HTMLButtonElement).disabled
          })
        );
        return { selectionText, metaText, buttons };
      });
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nFirst selection: ${firstSelectionText}\nDiagnostics: ${JSON.stringify(
          diagnostics
        )}`
      );
    });

    const highlightButton = await $('//button[contains(@class, "secondary-note-action") and not(contains(@class, "danger-action"))]');
    await highlightButton.click();

    await browser.waitUntil(async () => {
      const cards = await $$('.note-card');
      if (!cards.length) return false;
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return texts.some((text) => text.includes('高亮') && text.includes(firstSelectionText.slice(0, 20)));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 reader to persist a highlight entry in the desktop notes workspace'
    });

    const secondSelectionText = await selectVisibleFoliateTextInReader(1, [fb2ReaderTitle, 'Chapter 1']);
    await browser.waitUntil(async () => {
      const selectionText = await browser.execute(() => {
        return document.querySelector('.selection-card p')?.textContent?.trim() ?? '';
      });
      return selectionText.includes(secondSelectionText.slice(0, 20));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 reader to expose the second selected text in the notes workspace'
    });

    await highlightButton.click();

    await browser.waitUntil(async () => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('0 笔记') &&
        cards.length === 2 &&
        texts.some((text) => text.includes(firstSelectionText.slice(0, 20))) &&
        texts.some((text) => text.includes(secondSelectionText.slice(0, 20)))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop notes workspace to show two highlights before creating a note'
    });

    const thirdSelectionText = await selectVisibleFoliateTextInReader(2, [fb2ReaderTitle, 'Chapter 1']);
    await browser.waitUntil(async () => {
      const selectionText = await browser.execute(() => {
        return document.querySelector('.selection-card p')?.textContent?.trim() ?? '';
      });
      return selectionText.includes(thirdSelectionText.slice(0, 20));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 reader to expose the third selected text in the notes workspace'
    });

    await browser.execute(() => {
      window.prompt = () => 'desktop fb2 note body';
    });

    const noteButton = await $('.primary-note-action');
    await noteButton.click();

    await browser.waitUntil(async () => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('1 笔记') &&
        cards.length === 3 &&
        texts.some((text) => text.includes('desktop fb2 note body')) &&
        texts.some((text) => text.includes('高亮') && text.includes(firstSelectionText.slice(0, 20))) &&
        texts.some((text) => text.includes('高亮') && text.includes(secondSelectionText.slice(0, 20)))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop notes workspace to show two highlights and one note'
    });

    const notesStorageKey = `br1.reader.notes:${currentFilePath}`;
    await browser.waitUntil(async () => {
      try {
        const persistedNotes = await loadReaderNotesOnDisk(notesStorageKey);
        return (
          persistedNotes.length === 3 &&
          persistedNotes.some(
            (note) =>
              note.kind === 'highlight' && (note.text ?? '').includes(firstSelectionText.slice(0, 20))
          ) &&
          persistedNotes.some(
            (note) =>
              note.kind === 'highlight' && (note.text ?? '').includes(secondSelectionText.slice(0, 20))
          ) &&
          persistedNotes.some((note) => note.kind === 'note' && note.note === 'desktop fb2 note body')
        );
      } catch {
        return false;
      }
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 reader notes store to persist both the highlight and the note before closing the window'
    });

    const persistedNotes = await loadReaderNotesOnDisk(notesStorageKey);
    const persistedHighlights = persistedNotes.filter((note) => note.kind === 'highlight');
    const persistedNote = persistedNotes.find((note) => note.kind === 'note');
    if (persistedHighlights.length !== 2 || persistedHighlights.some((note) => !note.text) || !persistedNote?.note) {
      throw new Error('expected persisted FB2 notes to include two highlights and one note body');
    }

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    const reopenedFb2Record = await loadLibraryRecordBySourcePathOnDisk(importedBook.sourcePath);
    currentFilePath = (reopenedFb2Record?.filePath ?? reopenedFb2Record?.file_path ?? currentFilePath) as string;
    await browser.refresh();
    await $('.library-page').waitForDisplayed({ timeout: 10000 });
    await openReaderFromLibraryPath(currentFilePath, libraryHandle);
    await switchReaderToNotesTab();

    await browser.waitUntil(async () => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('2 高亮') &&
        metaText.includes('1 笔记') &&
        cards.length === 3 &&
        texts.some((text) => text.includes(persistedNote.note!)) &&
        texts.some((text) => text.includes('高亮') && text.includes(firstSelectionText.slice(0, 20))) &&
        texts.some((text) => text.includes('高亮') && text.includes(secondSelectionText.slice(0, 20)))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop notes workspace to persist both highlights and the note after reopen'
    }).catch(async (error) => {
      const metaRow = await $('.notes-meta-row');
      const metaText = await metaRow.getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nReopen meta: ${metaText}\nReopen cards: ${JSON.stringify(
          texts
        )}\nPersisted notes: ${JSON.stringify(persistedNotes)}`
      );
    });

    await clickAnnotationKindFilter('高亮');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }

      return (
        metaText.includes('仅看高亮') &&
        cards.length === 2 &&
        texts.some((text) => text.includes(firstSelectionText.slice(0, 20))) &&
        texts.some((text) => text.includes(secondSelectionText.slice(0, 20)))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop notes workspace to filter down to the persisted highlights only'
    });

    await clickAnnotationKindFilter('笔记');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }

      return (
        metaText.includes('仅看笔记') &&
        cards.length === 1 &&
        texts[0]?.includes(persistedNote.note!) &&
        !texts[0]?.includes('高亮')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop notes workspace to filter down to the persisted note only'
    });

    await clickAnnotationKindFilter('全部类型');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      return metaText.includes('全部类型') && cards.length === 3;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop notes workspace to restore the full annotation list after clearing the kind filter'
    });

    await clickReaderSidebarTab('高亮');
    await browser.waitUntil(async () => {
      const panel = await $('[aria-label="highlights panel preview"]');
      if (!(await panel.isDisplayed())) return false;
      const panelText = await panel.getText();
      const cards = await $$('.highlight-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        panelText.includes('已保存 2 条高亮') &&
        cards.length === 2 &&
        texts.some((text) => text.includes(firstSelectionText.slice(0, 20))) &&
        texts.some((text) => text.includes(secondSelectionText.slice(0, 20))) &&
        texts.every((text) => !text.includes(persistedNote.note!))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to isolate the persisted highlights from the mixed notes list'
    });

    await clickHighlightsSortControl('最早添加');
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return panelText.includes('最早添加优先') && firstText.includes(firstSelectionText.slice(0, 20));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to switch to oldest-first ordering before selecting a highlight'
    });

    await toggleFirstHighlightSelection();
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        const firstToggle = document.querySelector('.highlight-selection-toggle');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstToggleText: firstToggle?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return state.panelText.includes('已选 1 条') && state.firstToggleText.includes('已选');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to select one oldest highlight'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '已选高亮'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the selected-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return (
        panelText.includes('1 已选高亮') &&
        cards.length === 1 &&
        firstText.includes(firstSelectionText.slice(0, 20))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to expose a selected-only view before inverting'
    });

    await browser.execute(() => {
      window.prompt = () => 'Desktop FB2 重点高亮';
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.trim() === '保存当前选择集'
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('expected the save-current-selection button to exist');
      }
      button.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="saved highlight selections"]').getText();
      return panelText.includes('Desktop FB2 重点高亮') && panelText.includes('1 条高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to save the current selection set'
    });

    await selectReaderMenuSetting('reader flow mode', '滚动');
    await selectReaderMenuSetting('reader font family', '无衬线');
    await selectReaderMenuSetting('reader font scale', '大');
    await selectReaderMenuSetting('reader line height', '舒展');
    await selectReaderMenuSetting('reader page margins', '宽');
    await browser.waitUntil(async () => {
      const footerText = await $('[aria-label="reader footer controls preview"]').getText();
      const rendererState = await readDesktopRendererSettings();
      return (
        footerText.includes('SCROLL') &&
        rendererState.flow === 'scrolled' &&
        rendererState.marginLeft === '44px' &&
        rendererState.fontSize === '22px' &&
        rendererState.lineHeightPx > 42 &&
        rendererState.fontFamily.includes('IBM Plex Sans')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop reader to apply the new layout settings before the reopen check'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await openReaderFromLibraryPath(currentFilePath, libraryHandle);
    await clickReaderSidebarTab('高亮');
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return (
        panelText.includes('1 已选高亮') &&
        panelText.includes('最早添加优先') &&
        cards.length === 1 &&
        firstText.includes(firstSelectionText.slice(0, 20))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to restore the selected-only view and ordering after reopening the book'
    });
    await browser.waitUntil(async () => {
      const footerText = await $('[aria-label="reader footer controls preview"]').getText();
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const rendererState = await readDesktopRendererSettings();
      return (
        footerText.includes('SCROLL') &&
        rendererState.flow === 'scrolled' &&
        rendererState.marginLeft === '44px' &&
        rendererState.fontSize === '22px' &&
        rendererState.lineHeightPx > 42 &&
        rendererState.fontFamily.includes('IBM Plex Sans') &&
        panelText.includes('1 已选高亮') &&
        panelText.includes('最早添加优先')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop reader to reopen with both the saved layout settings and the highlights workspace state'
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="saved highlight selections"]').getText();
      return panelText.includes('Desktop FB2 重点高亮') && panelText.includes('1 条高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to restore the saved selection set after reopening the book'
    });

    await browser.execute(() => {
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const firstCard = savedPanel.querySelector('.saved-highlight-selection-card');
      if (!(firstCard instanceof HTMLElement)) {
        throw new Error('expected the first saved selection card to exist');
      }
      const exportButton = Array.from(firstCard.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '导出'
      );
      if (!(exportButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection export button to exist');
      }
      exportButton.click();
    });
    await browser.waitUntil(async () => {
      const exportState = await browser.execute(() => {
        const preview = document.querySelector('[aria-label="saved highlight selection export preview"]');
        const payload = preview?.querySelector('textarea');
        return {
          previewText: preview?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          payload: payload instanceof HTMLTextAreaElement ? payload.value : ''
        };
      });
      return (
        exportState.previewText.includes('Desktop FB2 重点高亮') &&
        exportState.payload.includes('"schemaVersion": 1') &&
        exportState.payload.includes('"formatLabel": "FB2"') &&
        exportState.payload.includes('"highlights": [')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to expose a structured export preview for the saved selection set'
    });
    const fb2ExportedSelectionPayload = await browser.execute(() => {
      const payload = document.querySelector('[aria-label="saved highlight selection export preview"] textarea');
      if (!(payload instanceof HTMLTextAreaElement)) {
        throw new Error('expected the saved selection export payload textarea to exist');
      }
      return payload.value;
    });
    const fb2ImportedSelectionPayload = JSON.stringify({
      ...JSON.parse(fb2ExportedSelectionPayload),
      selectionSet: {
        ...JSON.parse(fb2ExportedSelectionPayload).selectionSet,
        selectedIds: ['missing-highlight-id'],
        importSource: {
          bookKey: 'imported-fb2-book',
          bookTitle: 'Imported FB2 Source',
          formatLabel: 'FB2',
          selectionName: 'Imported FB2 Selection',
          matchedCount: 1,
          totalCount: 2,
          unmatchedCount: 1,
          importedAt: 1710000000000,
          highlights: [
            ...JSON.parse(fb2ExportedSelectionPayload).highlights,
            {
              ...JSON.parse(fb2ExportedSelectionPayload).highlights[0],
              id: 'missing-imported-fb2-highlight',
              cfi: 'epubcfi(/6/imported-missing)',
              text: 'missing desktop fb2 passage for unresolved drilldown',
              chapterHref: '/missing-imported-chapter.xhtml'
            }
          ]
        }
      },
      highlights: JSON.parse(fb2ExportedSelectionPayload).highlights.map((highlight: Record<string, unknown>) => ({
        ...highlight,
        cfi: 'epubcfi(/6/missing)',
        chapterHref: '/missing-chapter.xhtml'
      }))
    });
    await browser.execute(() => {
      const preview = document.querySelector('[aria-label="saved highlight selection export preview"]');
      if (!(preview instanceof HTMLElement)) {
        throw new Error('expected the saved selection export preview to exist');
      }
      const closeButton = Array.from(preview.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '关闭'
      );
      if (!(closeButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection export preview close button to exist');
      }
      closeButton.click();
    });
    await browser.execute((payload) => {
      window.prompt = () => payload;
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const importButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '导入'
      );
      if (!(importButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection import button to exist');
      }
      importButton.click();
    }, fb2ImportedSelectionPayload);
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="saved highlight selections"]');
        const firstCard = panel?.querySelector('.saved-highlight-selection-card');
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstCardText: firstCard?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('已导入选择集：Desktop FB2 重点高亮') &&
        state.firstCardText.includes('跨书导入 · Imported FB2 Source / Imported FB2 Selection · 1/2') &&
        state.firstCardText.includes('未映射片段') &&
        state.firstCardText.includes('missing desktop fb2 passage for unresolved drilldown')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop imported saved set to show unresolved highlight text after import'
    });
    await browser.execute(() => {
      window.confirm = () => true;
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      const firstCard = savedPanel?.querySelector('.saved-highlight-selection-card');
      if (!(firstCard instanceof HTMLElement)) {
        throw new Error('expected the imported saved highlight selection card to exist');
      }
      const deleteButton = Array.from(firstCard.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '删除'
      );
      if (!(deleteButton instanceof HTMLButtonElement)) {
        throw new Error('expected the imported saved selection delete button to exist');
      }
      deleteButton.click();
    });
    await browser.waitUntil(async () => {
      const cardTexts = await browser.execute(() =>
        Array.from(document.querySelectorAll('[aria-label="saved highlight selections"] .saved-highlight-selection-card')).map(
          (card) => card.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        )
      );
      return (
        cardTexts.some((text) => text.includes('Desktop FB2 重点高亮')) &&
        cardTexts.every((text) => !text.includes('Imported FB2 Source')) &&
        cardTexts.every((text) => !text.includes('missing desktop fb2 passage for unresolved drilldown'))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to remove the temporary imported saved selection set'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '全部'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the all-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      return (
        panelText.includes('全部章节') &&
        panelText.includes('最早添加优先') &&
        cards.length === 2
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to return to the all-highlights view before reapplying the saved set'
    });
    await browser.execute(() => {
      const clearButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.trim() === '清空选中'
      );
      if (!(clearButton instanceof HTMLButtonElement)) {
        throw new Error('expected the clear-selected-highlights button to exist');
      }
      clearButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      return panelText.includes('未选高亮');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to clear the live selection before reapplying a saved set'
    });
    await browser.execute(() => {
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const applyButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '套用'
      );
      if (!(applyButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection apply button to exist');
      }
      applyButton.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const firstText = cards.length ? await cards[0].getText() : '';
      return (
        panelText.includes('1 已选高亮') &&
        cards.length === 1 &&
        firstText.includes(firstSelectionText.slice(0, 20))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to reapply a saved selection set'
    });
    await browser.execute(() => {
      window.confirm = () => true;
      const savedPanel = document.querySelector('[aria-label="saved highlight selections"]');
      if (!(savedPanel instanceof HTMLElement)) {
        throw new Error('expected the saved highlight selections panel to exist');
      }
      const deleteButton = Array.from(savedPanel.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === '删除'
      );
      if (!(deleteButton instanceof HTMLButtonElement)) {
        throw new Error('expected the saved selection delete button to exist');
      }
      deleteButton.click();
    });
    await browser.waitUntil(async () => {
      const cardTexts = await browser.execute(() =>
        Array.from(document.querySelectorAll('[aria-label="saved highlight selections"] .saved-highlight-selection-card')).map(
          (card) => card.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        )
      );
      return cardTexts.every((text) => !text.includes('Desktop FB2 重点高亮'));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to delete the saved selection set'
    });

    await browser.execute(() => {
      const controls = document.querySelector('[aria-label="highlights filter controls"]');
      if (!(controls instanceof HTMLElement)) {
        throw new Error('expected highlights filter controls to exist');
      }
      const target = Array.from(controls.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === '全部'
      );
      if (!(target instanceof HTMLButtonElement)) {
        throw new Error('expected the all-highlights filter button to exist');
      }
      target.click();
    });
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      return panelText.includes('全部章节') && cards.length === 2;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to restore the full view after leaving selected-only mode'
    });

    await invertVisibleHighlightsSelectionInWorkspace();
    await browser.waitUntil(async () => {
      const state = await browser.execute(() => {
        const panel = document.querySelector('[aria-label="highlights panel preview"]');
        const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>('.highlight-selection-toggle'));
        return {
          panelText: panel?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          firstToggleText: toggles[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          secondToggleText: toggles[1]?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        };
      });
      return (
        state.panelText.includes('已选 1 条') &&
        state.firstToggleText.includes('选中') &&
        state.secondToggleText.includes('已选')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to invert the current selection before deleting'
    });

    await deleteSelectedHighlightsInWorkspace();
    await browser.waitUntil(async () => {
      const panelText = await $('[aria-label="highlights panel preview"]').getText();
      const cards = await $$('.highlight-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        panelText.includes('已保存 1 条高亮') &&
        panelText.includes('未选高亮') &&
        cards.length === 1 &&
        texts[0]?.includes(firstSelectionText.slice(0, 20))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to delete only the inverted selection and keep the oldest highlight'
    });

    await clickHighlightsSortControl('最近添加');

    await bulkDeleteVisibleHighlightsInWorkspace();
    await browser.waitUntil(async () => {
      const panel = await $('[aria-label="highlights panel preview"]');
      const panelText = await panel.getText();
      const cards = await $$('.highlight-card');
      return panelText.includes('还没有高亮') && cards.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop highlights workspace to clear the visible highlight after bulk delete'
    });

    await clickReaderSidebarTab('笔记');
    await browser.waitUntil(async () => {
      const metaText = await $('.notes-meta-row').getText();
      const cards = await $$('.note-card');
      const texts: string[] = [];
      for (const card of cards) {
        texts.push(await card.getText());
      }
      return (
        metaText.includes('0 高亮') &&
        metaText.includes('1 笔记') &&
        cards.length === 1 &&
        texts[0]?.includes(persistedNote.note!)
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the FB2 desktop notes workspace to keep the persisted note after bulk highlight deletion'
    });

    await clearAllReaderNotes();
    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
  });

  it('restores search history, options, and disk cache after reopening the same book', async () => {
    const libraryHandle = await switchToLibraryWindow();
    const firstBook = await findStableEpubBook();

    const href = await firstBook.getAttribute('href');
    expect(href).toBeTruthy();

    const target = new URL(href!, 'http://localhost');
    const bookKey =
      target.searchParams.get('path') ||
      target.searchParams.get('url') ||
      target.searchParams.get('label') ||
      'default';
    const historyKey = `br1.reader.search.history:${bookKey}`;

    await openReaderFromBook(firstBook);
    const searchCacheBookKey = await buildReaderSearchCacheBookKey(bookKey);

    await browser.execute(([nextHistoryKey]) => {
      localStorage.removeItem(nextHistoryKey);
      localStorage.removeItem('br1.reader.search.config');
    }, [historyKey] as const);
    await clearReaderSearchCacheOnDisk(searchCacheBookKey);

    const query = 'reader-history-cache-regression';
    const emptyQuery = 'reader-history-empty-regression';
    const seededResults = [
      {
        cfi: 'epubcfi(/6/2[regression]!/4/2/6)',
        label: 'Regression Fixture',
        excerpt: {
          pre: 'Seeded search cache restored for ',
          match: query,
          post: ' after reopening the same desktop book.'
        }
      },
      {
        cfi: 'epubcfi(/6/4[regression]!/4/2/8)',
        label: 'Regression Fixture Follow-up',
        excerpt: {
          pre: 'Second cached result keeps ',
          match: query,
          post: ' navigation state honest after reopen.'
        }
      }
    ];

    const cacheKey = JSON.stringify({
      query,
      scope: 'book',
      matchCase: true,
      matchWholeWords: false,
      matchDiacritics: false,
      section: null
    });

    await browser.execute(([nextHistoryKey, nextQuery]) => {
      localStorage.setItem(nextHistoryKey, JSON.stringify([nextQuery]));
      localStorage.setItem(
        'br1.reader.search.config',
        JSON.stringify({
          scope: 'book',
          matchCase: true,
          matchWholeWords: false,
          matchDiacritics: false
        })
      );
    }, [historyKey, query] as const);
    await browser.execute(([nextHistoryKey, successfulQuery, zeroQuery]) => {
      localStorage.setItem(
        nextHistoryKey,
        JSON.stringify([
          {
            id: JSON.stringify([successfulQuery, 'book', true, false, false]),
            query: successfulQuery,
            config: {
              scope: 'book',
              matchCase: true,
              matchWholeWords: false,
              matchDiacritics: false
            },
            resultCount: 2,
            createdAt: Date.now()
          },
          {
            id: JSON.stringify([zeroQuery, 'section', false, true, false]),
            query: zeroQuery,
            config: {
              scope: 'section',
              matchCase: false,
              matchWholeWords: true,
              matchDiacritics: false
            },
            resultCount: 0,
            createdAt: Date.now() - 60_000
          }
        ])
      );
    }, [historyKey, query, emptyQuery] as const);
    await seedReaderSearchCacheOnDisk(searchCacheBookKey, cacheKey, seededResults);

    const persistedCache = await loadReaderSearchCacheOnDisk(searchCacheBookKey, cacheKey);
    expect(persistedCache.results).toHaveLength(2);

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await openReaderFromLibraryPath(bookKey, libraryHandle);
    await switchReaderToSearchTab();

    const restoredMatchCaseButton = await $('//button[contains(@class, "option-chip") and normalize-space()="区分大小写"]');
    await browser.waitUntil(async () => {
      const className = (await restoredMatchCaseButton.getAttribute('class')) ?? '';
      return className.includes('active');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the match-case search option to persist after reopening the same book'
    });

    const reopenedSearchInput = await $('input[type="search"]');
    await reopenedSearchInput.clearValue();

    await browser.waitUntil(async () => {
      const cacheStatus = await $('[aria-label="search cache status"]');
      if (!(await cacheStatus.isDisplayed())) return false;
      const text = await cacheStatus.getText();
      return (
        text.includes('当前书搜索缓存已启用') &&
        text.includes('2 条历史 · 1 条有命中 · 1 条无命中') &&
        text.includes('缓存标识：') &&
        text.includes(query) &&
        text.includes('2 条 · 全书')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the reader search tab to show current-book cache visibility after reopening'
    });

    await browser.waitUntil(async () => {
      const historyChips = await $$('.history-chip');
      const labels = [];
      for (const chip of historyChips) {
        labels.push(await chip.getText());
      }
      return labels.some((label) => label.includes(query)) && labels.some((label) => label.includes(emptyQuery));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the saved result and empty queries to appear in the reader search history after reopening the book'
    });

    const emptyOnlyFilter = await $('//button[contains(@class, "history-filter-chip") and contains(normalize-space(), "无命中")]');
    await emptyOnlyFilter.click();
    await browser.waitUntil(async () => {
      const historyChips = await $$('.history-chip');
      if (historyChips.length !== 1) return false;
      const text = await historyChips[0]!.getText();
      return text.includes(emptyQuery) && !text.includes(query);
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the empty-only search-history filter to isolate zero-result queries after reopening the book'
    });

    const emptyHistoryDelete = await $(`//button[@aria-label="删除搜索记录 ${emptyQuery}"]`);
    await emptyHistoryDelete.click();
    await browser.waitUntil(async () => {
      const historyChips = await $$('.history-chip');
      return historyChips.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected deleting the zero-result history entry to clear the empty-only search-history view'
    });

    const resultOnlyFilter = await $('//button[contains(@class, "history-filter-chip") and contains(normalize-space(), "有命中")]');
    await resultOnlyFilter.click();
    await browser.waitUntil(async () => {
      const historyChips = await $$('.history-chip');
      if (historyChips.length !== 1) return false;
      const text = await historyChips[0]!.getText();
      return text.includes(query) && text.includes('2 条命中');
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the results-only search-history filter to keep the cached regression query visible after deleting the empty entry'
    });

    const historyChip = await $(`//button[contains(@class, "history-chip") and contains(., "${query}")]`);
    await historyChip.click();

    await browser.waitUntil(async () => {
      const value = await reopenedSearchInput.getValue();
      return value === query;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected replaying a saved search-history entry to restore the query field after reopening the book'
    });

    await browser.waitUntil(async () => {
      const results = await $$('.search-result');
      if (!results.length) return false;
      const texts = [];
      for (const result of results) {
        texts.push(await result.getText());
      }
      return (
        texts.some((text) => text.includes('Regression Fixture') && text.includes(query)) &&
        texts.some((text) => text.includes('Regression Fixture Follow-up') && text.includes(query))
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected replaying a saved history query to restore cached search results'
    }).catch(async (error) => {
      const currentValue = await reopenedSearchInput.getValue();
      const results = await $$('.search-result');
      const texts: string[] = [];
      for (const result of results) {
        texts.push(await result.getText());
      }
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nSearch value: ${currentValue}\nResults: ${JSON.stringify(texts)}`
      );
    });

    await browser.waitUntil(async () => {
      const navigation = await $('[aria-label="search result navigation"]');
      if (!(await navigation.isDisplayed())) return false;
      const text = await navigation.getText();
      const previous = await $('//div[@aria-label="search result navigation"]//button[normalize-space()="上一条"]');
      const next = await $('//div[@aria-label="search result navigation"]//button[normalize-space()="下一条"]');
      return (
        text.includes('1 / 2') &&
        (await previous.getAttribute('disabled')) !== null &&
        (await next.getAttribute('disabled')) === null
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected cached search results to expose a multi-result navigator at the first result'
    });

    const nextSearchResult = await $('//div[@aria-label="search result navigation"]//button[normalize-space()="下一条"]');
    await nextSearchResult.click();
    await browser.waitUntil(async () => {
      const navigation = await $('[aria-label="search result navigation"]');
      const text = await navigation.getText();
      const previous = await $('//div[@aria-label="search result navigation"]//button[normalize-space()="上一条"]');
      const next = await $('//div[@aria-label="search result navigation"]//button[normalize-space()="下一条"]');
      return (
        text.includes('2 / 2') &&
        (await previous.getAttribute('disabled')) === null &&
        (await next.getAttribute('disabled')) !== null
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected next search-result navigation to move to the final cached result'
    });

    const previousSearchResult = await $('//div[@aria-label="search result navigation"]//button[normalize-space()="上一条"]');
    await previousSearchResult.click();
    await browser.waitUntil(async () => {
      const navigation = await $('[aria-label="search result navigation"]');
      const text = await navigation.getText();
      const previous = await $('//div[@aria-label="search result navigation"]//button[normalize-space()="上一条"]');
      const next = await $('//div[@aria-label="search result navigation"]//button[normalize-space()="下一条"]');
      return (
        text.includes('1 / 2') &&
        (await previous.getAttribute('disabled')) !== null &&
        (await next.getAttribute('disabled')) === null
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected previous search-result navigation to return to the first cached result'
    });

    await reopenedSearchInput.clearValue();
    await browser.waitUntil(async () => {
      const cacheStatus = await $('[aria-label="search cache status"]');
      if (!(await cacheStatus.isDisplayed())) return false;
      const text = await cacheStatus.getText();
      return (
        text.includes('当前书搜索缓存已启用') &&
        text.includes('缓存标识：') &&
        text.includes('清空缓存')
      );
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the search cache status panel to return before clearing the current-book cache'
    });

    const cacheQueryEntry = await $(`//ul[@aria-label="search cache query entries"]//button[contains(., "${query}")]`);
    await cacheQueryEntry.click();
    await browser.waitUntil(async () => {
      const value = await reopenedSearchInput.getValue();
      return value === query;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected clicking a cache query entry to replay the cached search'
    });
    await reopenedSearchInput.clearValue();

    const clearCacheButton = await $('//section[@aria-label="search cache status"]//button[normalize-space()="清空缓存"]');
    await clearCacheButton.click();
    await browser.waitUntil(async () => {
      const notices = await $$('.search-notice');
      for (const notice of notices) {
        const text = await notice.getText();
        if (text.includes('已清空当前书的搜索缓存')) return true;
      }
      return false;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected clearing the current-book search cache to show a user-facing notice'
    });
    await browser.waitUntil(async () => {
      try {
        await loadReaderSearchCacheOnDisk(searchCacheBookKey, cacheKey);
        return false;
      } catch {
        return true;
      }
    }, {
      timeout: 10000,
      timeoutMsg: 'expected clearing the current-book search cache to remove the seeded disk cache entry'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await browser.execute(([nextHistoryKey]) => {
      localStorage.removeItem(nextHistoryKey);
      localStorage.removeItem('br1.reader.search.config');
    }, [historyKey] as const);
    await clearReaderSearchCacheOnDisk(searchCacheBookKey);
  });
});
