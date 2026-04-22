import type {
  ActiveLibraryGroupOverview,
  LibraryBrowseState,
  ActiveLibrarySubgroupShelf,
  LibraryGroupBy,
  LibraryGroupSegment,
  LibraryShelfBook,
  LibraryTrailLanding
} from './types';

export const getLibraryGroupLabel = (
  book: LibraryShelfBook,
  groupBy: 'none' | LibraryGroupBy
) => {
  if (groupBy === 'author') return book.author?.trim() || '未知作者';
  if (groupBy === 'collection') return book.collection?.trim() || '未归类';
  if (groupBy === 'format') return book.format?.trim().toUpperCase() || '未知格式';
  return '';
};

export const filterBooksByLibraryGroupScope = (
  books: LibraryShelfBook[],
  groupBy: 'none' | LibraryGroupBy,
  scope: string
) => {
  if (groupBy === 'none' || !scope) return books;
  return books.filter((book) => getLibraryGroupLabel(book, groupBy) === scope);
};

const countDistinctLibraryValues = (values: Array<string | undefined | null>) =>
  new Set(values.map((value) => value?.trim()).filter(Boolean)).size;

const summarizeLibraryValueCounts = (
  values: Array<string | undefined | null>,
  limit = 3
) =>
  Array.from(
    values
      .map((value) => value?.trim())
      .filter((value): value is string => !!value)
      .reduce((counts, value) => {
        counts.set(value, (counts.get(value) ?? 0) + 1);
        return counts;
      }, new Map<string, number>())
      .entries()
  )
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0], 'zh-CN');
    })
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));

const countByLabel = (labels: string[]) =>
  labels.reduce((counts, label) => {
    const normalized = label.trim();
    if (!normalized) return counts;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

export const getActiveLibraryGroupOverview = (
  books: LibraryShelfBook[],
  groupBy: 'none' | LibraryGroupBy,
  scope: string
): ActiveLibraryGroupOverview | null => {
  if (!scope || groupBy === 'none') return null;

  const totalBooks = books.length;
  const readingCount = books.filter((book) => book.readingStatusLabel === '在读').length;
  const finishedCount = books.filter((book) => book.readingStatusLabel === '已读完').length;
  const unstartedCount = books.filter((book) => book.readingStatusLabel === '未开始').length;
  const authorCount = countDistinctLibraryValues(books.map((book) => book.author));
  const collectionCount = countDistinctLibraryValues(books.map((book) => book.collection));
  const formatCount = countDistinctLibraryValues(books.map((book) => book.format));

  if (groupBy === 'author') {
    const topCollections = summarizeLibraryValueCounts(books.map((book) => book.collection));
    const topFormats = summarizeLibraryValueCounts(books.map((book) => book.format));
    return {
      eyebrow: '当前作者组',
      title: scope,
      summary: `这组共有 ${totalBooks} 本书，分布在 ${collectionCount} 个归类里，覆盖 ${formatCount} 种阅读格式。`,
      metrics: [
        { label: '在读', value: `${readingCount} 本` },
        { label: '已读完', value: `${finishedCount} 本` },
        { label: '未开始', value: `${unstartedCount} 本` }
      ],
      pivots: [
        {
          title: '常见归类',
          items: topCollections.map((entry) => ({
            label: `${entry.count} 本`,
            value: entry.value,
            groupBy: 'collection' as const
          }))
        },
        {
          title: '常见格式',
          items: topFormats.map((entry) => ({
            label: `${entry.count} 本`,
            value: entry.value,
            groupBy: 'format' as const
          }))
        }
      ]
    };
  }

  if (groupBy === 'collection') {
    const topAuthors = summarizeLibraryValueCounts(books.map((book) => book.author));
    const topFormats = summarizeLibraryValueCounts(books.map((book) => book.format));
    return {
      eyebrow: '当前归类组',
      title: scope,
      summary: `这组共有 ${totalBooks} 本书，来自 ${authorCount} 位作者，覆盖 ${formatCount} 种阅读格式。`,
      metrics: [
        { label: '作者', value: `${authorCount} 位` },
        { label: '在读', value: `${readingCount} 本` },
        { label: '已读完', value: `${finishedCount} 本` }
      ],
      pivots: [
        {
          title: '常见作者',
          items: topAuthors.map((entry) => ({
            label: `${entry.count} 本`,
            value: entry.value,
            groupBy: 'author' as const
          }))
        },
        {
          title: '常见格式',
          items: topFormats.map((entry) => ({
            label: `${entry.count} 本`,
            value: entry.value,
            groupBy: 'format' as const
          }))
        }
      ]
    };
  }

  const topAuthors = summarizeLibraryValueCounts(books.map((book) => book.author));
  const topCollections = summarizeLibraryValueCounts(books.map((book) => book.collection));
  return {
    eyebrow: '当前格式组',
    title: scope,
    summary: `这组共有 ${totalBooks} 本书，来自 ${authorCount} 位作者，分布在 ${collectionCount} 个归类里。`,
    metrics: [
      { label: '作者', value: `${authorCount} 位` },
      { label: '归类', value: `${collectionCount} 组` },
      { label: '在读', value: `${readingCount} 本` }
    ],
    pivots: [
      {
        title: '常见作者',
        items: topAuthors.map((entry) => ({
          label: `${entry.count} 本`,
          value: entry.value,
          groupBy: 'author' as const
        }))
      },
      {
        title: '常见归类',
        items: topCollections.map((entry) => ({
          label: `${entry.count} 本`,
          value: entry.value,
          groupBy: 'collection' as const
        }))
      }
    ]
  };
};

export const getActiveLibrarySubgroupShelves = (
  books: LibraryShelfBook[],
  groupBy: 'none' | LibraryGroupBy,
  scope: string
): ActiveLibrarySubgroupShelf[] => {
  if (!scope || groupBy === 'none') return [];

  const candidates: ActiveLibrarySubgroupShelf[] =
    groupBy === 'author'
      ? [
          {
            title: '按归类继续看',
            description: `在 ${scope} 这一组里，先按归类拆开后再继续浏览。`,
            groupBy: 'collection'
          },
          {
            title: '按格式继续看',
            description: `在 ${scope} 这一组里，按阅读格式重新组织书架。`,
            groupBy: 'format'
          }
        ]
      : groupBy === 'collection'
        ? [
            {
              title: '按作者继续看',
              description: `在 ${scope} 这一组里，先看有哪些作者，再决定继续进入谁的书架。`,
              groupBy: 'author'
            },
            {
              title: '按格式继续看',
              description: `在 ${scope} 这一组里，按阅读格式重新组织书架。`,
              groupBy: 'format'
            }
          ]
        : [
            {
              title: '按作者继续看',
              description: `在 ${scope} 这一组里，先看作者分布，再继续进入具体书架。`,
              groupBy: 'author'
            },
            {
              title: '按归类继续看',
              description: `在 ${scope} 这一组里，沿着书架归类继续下钻。`,
              groupBy: 'collection'
            }
          ];

  return candidates.filter((section) => {
    return countDistinctLibraryValues(
      books.map((book) => getLibraryGroupLabel(book, section.groupBy))
    ) > 1;
  });
};

export const getScopedLibraryBooksForTrail = (
  books: LibraryShelfBook[],
  trail: LibraryGroupSegment[]
) =>
  trail.reduce((currentBooks, segment) => {
    return filterBooksByLibraryGroupScope(currentBooks, segment.groupBy, segment.label);
  }, books);

export const getLibrarySiblingGroups = (
  books: LibraryShelfBook[],
  trail: LibraryGroupSegment[],
  groupBy: LibraryGroupBy,
  activeLabel: string,
  limit = 6
) =>
  Array.from(
    countByLabel(
      getScopedLibraryBooksForTrail(books, trail).map((book) =>
        getLibraryGroupLabel(book, groupBy)
      )
    ).entries()
  )
    .filter(([label]) => label !== activeLabel)
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0], 'zh-CN');
    })
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));

export const getLibraryTrailLandings = (
  books: LibraryShelfBook[],
  trail: LibraryGroupSegment[]
): LibraryTrailLanding[] =>
  trail
    .map((segment, index) => {
      const scopedBooks = getScopedLibraryBooksForTrail(books, trail.slice(0, index + 1));
      const overview = getActiveLibraryGroupOverview(scopedBooks, segment.groupBy, segment.label);
      if (!overview) return null;
      return {
        index,
        eyebrow: `第 ${index + 1} 层 · ${overview.eyebrow}`,
        title: overview.title,
        summary: overview.summary,
        metrics: overview.metrics,
        scopedBooks,
        subgroupShelves: getActiveLibrarySubgroupShelves(
          scopedBooks,
          segment.groupBy,
          segment.label
        ),
        siblingGroups: getLibrarySiblingGroups(
          books,
          trail.slice(0, index),
          segment.groupBy,
          segment.label
        )
      };
    })
    .filter((entry): entry is LibraryTrailLanding => entry !== null);

export const getLibraryGroupScopeDescription = (
  groupBy: 'none' | LibraryGroupBy,
  scope: string,
  count: number
) => {
  if (!scope) return '';
  if (groupBy === 'author') return `${scope} · ${count} 本`;
  if (groupBy === 'collection') return `归类 ${scope} · ${count} 本`;
  if (groupBy === 'format') return `格式 ${scope} · ${count} 本`;
  return '';
};

export const normalizeLibraryGroupByParam = (value: string | null): 'none' | LibraryGroupBy => {
  if (value === 'author' || value === 'collection' || value === 'format') return value;
  return 'none';
};

export const parseLibraryBrowseTrailParam = (value: string | null): LibraryGroupSegment[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const groupBy = 'groupBy' in entry ? entry.groupBy : '';
      const label = 'label' in entry ? entry.label : '';
      if (
        (groupBy === 'author' || groupBy === 'collection' || groupBy === 'format') &&
        typeof label === 'string' &&
        label.trim()
      ) {
        return [{ groupBy, label: label.trim() }];
      }
      return [];
    });
  } catch {
    return [];
  }
};

export const serializeLibraryBrowseTrailParam = (trail: LibraryGroupSegment[]) =>
  trail.length > 0 ? JSON.stringify(trail) : '';

export const getLibraryBrowseStateFromUrl = (url: URL): LibraryBrowseState => ({
  groupBy: normalizeLibraryGroupByParam(url.searchParams.get('groupBy')),
  groupScope: url.searchParams.get('group')?.trim() ?? '',
  trail: parseLibraryBrowseTrailParam(url.searchParams.get('trail'))
});

export const buildLibraryBrowseHref = (url: URL, state: LibraryBrowseState) => {
  const nextUrl = new URL(url);
  if (state.groupBy === 'none') {
    nextUrl.searchParams.delete('groupBy');
    nextUrl.searchParams.delete('group');
    nextUrl.searchParams.delete('trail');
  } else {
    nextUrl.searchParams.set('groupBy', state.groupBy);
    if (state.groupScope) {
      nextUrl.searchParams.set('group', state.groupScope);
    } else {
      nextUrl.searchParams.delete('group');
    }
    const serializedTrail = serializeLibraryBrowseTrailParam(state.trail);
    if (serializedTrail) {
      nextUrl.searchParams.set('trail', serializedTrail);
    } else {
      nextUrl.searchParams.delete('trail');
    }
  }
  return `${nextUrl.pathname}${nextUrl.search}`;
};

export const getLibraryEnterBrowseState = (
  current: LibraryBrowseState,
  nextGroupBy: LibraryGroupBy,
  nextLabel: string
): LibraryBrowseState => {
  if (!current.groupScope || current.groupBy === 'none') {
    return {
      groupBy: nextGroupBy,
      groupScope: nextLabel,
      trail: []
    };
  }

  if (current.groupBy === nextGroupBy && current.groupScope === nextLabel) {
    return current;
  }

  return {
    groupBy: nextGroupBy,
    groupScope: nextLabel,
    trail: [
      ...current.trail,
      {
        groupBy: current.groupBy,
        label: current.groupScope
      }
    ]
  };
};

export const getLibraryExitBrowseState = (current: LibraryBrowseState): LibraryBrowseState => {
  const previousSegment = current.trail.at(-1);
  if (!previousSegment) {
    return {
      groupBy: current.groupBy,
      groupScope: '',
      trail: []
    };
  }

  return {
    groupBy: previousSegment.groupBy,
    groupScope: previousSegment.label,
    trail: current.trail.slice(0, -1)
  };
};

export const getLibraryJumpTrailState = (
  current: LibraryBrowseState,
  index: number
): LibraryBrowseState | null => {
  const targetSegment = current.trail[index];
  if (!targetSegment) return null;
  return {
    groupBy: targetSegment.groupBy,
    groupScope: targetSegment.label,
    trail: current.trail.slice(0, index)
  };
};

export const getLibraryEnterFromTrailState = (
  current: LibraryBrowseState,
  trailIndex: number,
  nextGroupBy: LibraryGroupBy,
  nextLabel: string
): LibraryBrowseState | null => {
  const targetSegment = current.trail[trailIndex];
  if (!targetSegment) return null;
  return {
    groupBy: nextGroupBy,
    groupScope: nextLabel,
    trail: [...current.trail.slice(0, trailIndex + 1)]
  };
};

export const getLibrarySiblingBrowseState = (
  nextGroupBy: LibraryGroupBy,
  nextLabel: string,
  trail: LibraryGroupSegment[]
): LibraryBrowseState => ({
  groupBy: nextGroupBy,
  groupScope: nextLabel,
  trail
});
