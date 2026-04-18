import { statSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('br1 desktop app', () => {
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
    }
  ] as const;

  const importDesktopSampleLibraryBooks = async () => {
    const sourcePaths = sampleLibraryFormats.map((sample) => join(staticSamplesRoot, sample.fileName));
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

  const nudgeReaderForward = async () =>
    browser.execute(async () => {
      const view = document.querySelector('foliate-view') as
        | (HTMLElement & {
            next?: () => Promise<void>;
            lastLocation?: { fraction?: number };
          })
        | null;

      if (!view?.next) return view?.lastLocation?.fraction ?? null;
      await view.next();
      return view.lastLocation?.fraction ?? null;
    });

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
    const hrefs = await listOpenableBookHrefs();
    const book = await (async () => {
      for (const href of hrefs) {
        const target = new URL(href, 'http://localhost');
        if ((target.searchParams.get('path') ?? '') === filePath) {
          return findBookElementByHref(href);
        }
      }
      return null;
    })();
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
    const hrefs = await listOpenableBookHrefs();

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

      const titleValue = view?.book?.metadata?.title;
      const title =
        typeof titleValue === 'string'
          ? titleValue
          : titleValue && typeof titleValue === 'object' && 'en' in titleValue
            ? String((titleValue as Record<string, unknown>).en ?? '')
            : null;

      const footer = document.querySelector('[aria-label="reader footer controls preview"]');
      const footerMeta = Array.from(footer?.querySelectorAll('.footer-meta span') ?? []).map((node) =>
        node.textContent?.trim() ?? ''
      );
      const progressLabel =
        footer?.querySelector('.progress-strip span')?.textContent?.trim() ?? null;

      return {
        title,
        cfi: view?.lastLocation?.cfi ?? null,
        progressFraction: view?.lastLocation?.fraction ?? null,
        chapterLabel: view?.lastLocation?.tocItem?.label ?? null,
        chapterHref: view?.lastLocation?.tocItem?.href ?? null,
        total: view?.lastLocation?.location?.total ?? view?.lastLocation?.total ?? null,
        progressLabel,
        locationLabel: footerMeta[0] ?? null,
        formatLabel: footerMeta[1] ?? null,
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
    const moreActions = await $('[aria-label="More actions"]');
    await moreActions.waitForDisplayed({ timeout: 10000 });
    await moreActions.click();

    const labels = {
      focus: '专注',
      standard: '标准',
      wide: '宽阔'
    } as const;

    const option = await $(`//button[@role="menuitemradio" and normalize-space()="${labels[mode]}"]`);
    await option.waitForDisplayed({ timeout: 10000 });
    await option.click();
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
  });

  it('can execute JavaScript inside the desktop webview', async () => {
    const readyState = await browser.execute(() => document.readyState);
    expect(readyState).toBe('complete');
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

  it('opens FB2, MOBI, AZW3, and CBZ library-file samples in separate reader windows', async function () {
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

  it('moves FB2, MOBI, AZW3, and CBZ imports into the library reading workflow after returning from reader', async function () {
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

  it('reopens FB2, MOBI, AZW3, and CBZ imports with stored restore progress', async function () {
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

  it('reopens a library-file pdf with restored progress inside the reader stage', async function () {
    this.timeout(120000);
    const { expectedLocation, expectedFraction, persistedLocation } = await openRestorablePdfBook();
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
    const seededResults = [
      {
        cfi: 'epubcfi(/6/2[regression]!/4/2/6)',
        label: 'Regression Fixture',
        excerpt: {
          pre: 'Seeded search cache restored for ',
          match: query,
          post: ' after reopening the same desktop book.'
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
    await seedReaderSearchCacheOnDisk(searchCacheBookKey, cacheKey, seededResults);

    const persistedCache = await loadReaderSearchCacheOnDisk(searchCacheBookKey, cacheKey);
    expect(persistedCache.results).toHaveLength(1);

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
      const historyChips = await $$('.history-chip');
      const labels = [];
      for (const chip of historyChips) {
        labels.push(await chip.getText());
      }
      return labels.includes(query);
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the previous query to appear in the reader search history after reopening the book'
    });

    const historyChip = await $(`//button[contains(@class, "history-chip") and normalize-space()="${query}"]`);
    await historyChip.click();

    await browser.waitUntil(async () => {
      const results = await $$('.search-result');
      if (!results.length) return false;
      const texts = [];
      for (const result of results) {
        texts.push(await result.getText());
      }
      return texts.some((text) => text.includes('Regression Fixture') && text.includes(query));
    }, {
      timeout: 10000,
      timeoutMsg: 'expected replaying a saved history query to restore cached search results'
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
