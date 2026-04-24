import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTINUE_READING_SECTION_LIMIT,
  RECENT_READING_SECTION_LIMIT,
  getContinueReadingBooks,
  getReadingWorkflowNotice,
  getRecentReadingBooks
} from './page';
import type { LibraryShelfBook } from './types';

const makeBook = (
  overrides: Partial<LibraryShelfBook> & Pick<LibraryShelfBook, 'title'>
): LibraryShelfBook => {
  const { title, ...rest } = overrides;

  return {
    title,
    author: rest.author ?? 'Author',
    format: rest.format ?? 'EPUB',
    progress: rest.progress ?? '未开始',
    status: rest.status ?? '样例书库',
    progressPercentLabel: rest.progressPercentLabel,
    readingStatusLabel: rest.readingStatusLabel,
    lastOpenedAt: rest.lastOpenedAt ?? null,
    ...rest
  };
};

test('getContinueReadingBooks keeps only in-progress books up to the section limit', () => {
  const books = [
    makeBook({
      title: 'Recent 1',
      progressPercentLabel: '12%',
      readingStatusLabel: '在读',
      lastOpenedAt: 40
    }),
    makeBook({
      title: 'Recent 2',
      progressPercentLabel: '48%',
      readingStatusLabel: '在读',
      lastOpenedAt: 30
    }),
    makeBook({
      title: 'Recent 3',
      progressPercentLabel: '76%',
      readingStatusLabel: '在读',
      lastOpenedAt: 20
    }),
    makeBook({
      title: 'Dropped',
      progressPercentLabel: '88%',
      readingStatusLabel: '在读',
      lastOpenedAt: 10
    }),
    makeBook({
      title: 'Finished',
      progressPercentLabel: '100%',
      readingStatusLabel: '已读完',
      lastOpenedAt: 50
    })
  ];

  const continueReading = getContinueReadingBooks(books);

  assert.equal(continueReading.length, CONTINUE_READING_SECTION_LIMIT);
  assert.deepEqual(
    continueReading.map((book) => book.title),
    ['Recent 1', 'Recent 2', 'Recent 3']
  );
});

test('getRecentReadingBooks excludes continue-reading titles and finished books', () => {
  const continueReading = [
    makeBook({
      title: 'Continue me',
      progressPercentLabel: '25%',
      readingStatusLabel: '在读',
      lastOpenedAt: 50
    })
  ];
  const books = [
    ...continueReading,
    makeBook({
      title: 'Recent unfinished',
      progressPercentLabel: '0%',
      readingStatusLabel: '未开始',
      lastOpenedAt: 40
    }),
    makeBook({
      title: 'Finished but opened',
      progressPercentLabel: '100%',
      readingStatusLabel: '已读完',
      lastOpenedAt: 35
    }),
    makeBook({
      title: 'No progress but opened',
      progressPercentLabel: undefined,
      readingStatusLabel: '未开始',
      lastOpenedAt: 30
    }),
    makeBook({
      title: 'Never opened',
      progressPercentLabel: '0%',
      readingStatusLabel: '未开始',
      lastOpenedAt: null
    })
  ];

  const recentReading = getRecentReadingBooks(books, continueReading);

  assert.deepEqual(
    recentReading.map((book) => book.title),
    ['Recent unfinished', 'No progress but opened']
  );
  assert.ok(recentReading.length <= RECENT_READING_SECTION_LIMIT);
});

test('getReadingWorkflowNotice explains the no-active-reading state once only finished books remain', () => {
  const notice = getReadingWorkflowNotice({
    groupedBrowseMode: false,
    searchActive: false,
    filterBy: 'all',
    collectionFilter: 'all',
    tagFilter: 'all',
    importedBooks: [
      makeBook({
        title: 'Finished book',
        progressPercentLabel: '100%',
        readingStatusLabel: '已读完',
        lastOpenedAt: 20
      }),
      makeBook({
        title: 'Never opened',
        progressPercentLabel: '0%',
        readingStatusLabel: '未开始',
        lastOpenedAt: null
      })
    ],
    filteredContinueReadingBooks: [],
    filteredRecentReadingBooks: []
  });

  assert.deepEqual(notice, {
    title: '最近没有在读书',
    message: '已读完的书仍保留在书库里；重新打开任意一本书后，继续阅读会重新出现。'
  });
});
