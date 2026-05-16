// These smoke tests intentionally keep fixtures explicit because br1's audit
// surface depends on current-book ownership, dedicated workspaces, and restore
// flows that are easy to hide behind ambient browser state.

import { expect, test, type Locator } from '@playwright/test';

const readerLayoutLabel = (layout: 'PAGINATED' | 'SCROLL' | 'FIXED') =>
  ({
    PAGINATED: '分页',
    SCROLL: '滚动',
    FIXED: '固定版式'
  })[layout];

const openLookupHistoryLane = async (notebook: Locator, expectedHistoryText?: string) => {
  const overview = notebook.getByLabel('本书 AI 记录摘要');
  await expect(overview).toBeVisible();
  const lookupEntry = overview
    .getByLabel('本书 AI 记录入口')
    .getByRole('button', { name: /^查找记录/ });
  await expect(lookupEntry).toBeVisible();

  const historyLane = notebook.getByLabel('最近求助');
  const historyHeading = historyLane.locator('.assist-history-head > strong');
  await expect
    .poll(
      async () => {
        const headingText = ((await historyHeading.textContent({ timeout: 100 }).catch(() => '')) ?? '').trim();
        const expectedRecordVisible = expectedHistoryText
          ? await historyLane
              .getByText(expectedHistoryText)
              .first()
              .isVisible({ timeout: 100 })
              .catch(() => false)
          : true;
        if (headingText === '本书查找记录' && expectedRecordVisible) return 'open';
        if (await lookupEntry.isVisible({ timeout: 100 }).catch(() => false)) {
          await lookupEntry.click({ timeout: 1000 }).catch(() => undefined);
        }
        return 'pending';
      },
      { timeout: 15000 }
    )
    .toBe('open');
  return historyLane;
};

const selectLastLookupHistoryRecord = async (historyLane: Locator) => {
  const historyRecordButton = historyLane.getByRole('button', { name: '查看记录' }).last();
  const activeRecord = historyLane.getByLabel('当前正在查看的 AI 记录');
  await expect
    .poll(
      async () => {
        if (await activeRecord.isVisible({ timeout: 100 }).catch(() => false)) return 'selected';
        if (await historyRecordButton.isVisible({ timeout: 100 }).catch(() => false)) {
          await historyRecordButton.click({ timeout: 1000 }).catch(() => undefined);
        }
        return 'pending';
      },
      { timeout: 15000 }
    )
    .toBe('selected');
  return activeRecord;
};

test('library renders the reading-first shell in web mode', async ({ page }) => {
  // Boundary: this anchors the product shell contract before narrower reader
  // flows run, so later failures are easier to classify as library vs reader.
  await page.goto('/library');

  const searchbox = page.getByRole('searchbox', { name: '搜索书籍' });

  await expect(searchbox).toHaveAttribute(
    'placeholder',
    /在 5 本书籍中搜索/i
  );
  await expect(page.getByRole('heading', { name: '继续阅读' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '你的书库' })).toBeVisible();
  await page.getByRole('button', { name: '筛选 更多' }).click();
  await expect(page.getByLabel('书库格式摘要')).toContainText('格式 2 种 · 主 EPUB 4 本');
  await expect(page.getByLabel('书库归类摘要')).toContainText('归类 3 组');
  await expect(page.getByLabel('书库标签摘要')).toContainText('标签 8 个 · 高频 政治哲学 2 本');
  await expect(page.getByLabel('书库封面摘要')).toContainText('封面 5 / 5 已设置');
  await expect(page.getByRole('button', { name: '全部', exact: true })).toContainText('5 本');
  await expect(page.getByRole('button', { name: '在读', exact: true })).toContainText('2 本');
  await expect(page.getByRole('button', { name: '未开始', exact: true })).toContainText('2 本');
  await expect(page.getByRole('button', { name: '已读完', exact: true })).toContainText('1 本');
  await expect(
    page.getByLabel('书库格式筛选').getByRole('button', { name: '全部格式 2 种' })
  ).toBeVisible();
  await expect(
    page.getByLabel('书库格式筛选').getByRole('button', { name: 'EPUB 4 本' })
  ).toBeVisible();
  await expect(
    page.getByLabel('书库格式筛选').getByRole('button', { name: 'PDF 1 本' })
  ).toBeVisible();
  await expect(
    page.getByLabel('书库归类筛选').getByRole('button', { name: '全部归类 3 组' })
  ).toBeVisible();
  await expect(
    page.getByLabel('书库标签筛选').getByRole('button', { name: '全部标签 8 个' })
  ).toBeVisible();
  await expect(
    page.getByLabel('书库归类筛选').getByRole('button', { name: '政治哲学 2 本' })
  ).toBeVisible();
  await expect(
    page.getByLabel('书库标签筛选').getByRole('button', { name: '正义论 1 本' })
  ).toBeVisible();
  await expect(
    page.getByLabel('书库标签筛选').getByRole('button', { name: '政治哲学 2 本' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /继续阅读《政治秩序与政治衰败》/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '导入书籍' })).toBeVisible();
  await expect(page.locator('input.import-input[type="file"]').first()).toHaveAttribute(
    'accept',
    '.epub,.pdf,.mobi,.azw3,.fb2,.cbz,.txt'
  );

  await page.getByRole('button', { name: '浏览选项' }).click();
  await page.getByRole('menuitemradio', { name: '书名' }).click();
  await expect(page.getByRole('heading', { name: '继续阅读' })).toBeVisible();

  await page.getByLabel('书库格式筛选').getByRole('button', { name: 'PDF 1 本' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toContainText('当前筛选：格式 PDF');
  await expect(page.getByRole('link', { name: /在阅读器打开《论法的精神》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /在阅读器打开《A Theory of Justice》/ })).toHaveCount(0);
  await expect(page.getByLabel('书库筛选摘要')).toContainText('筛选命中 1 / 5 本');
  await page.getByRole('button', { name: '移除书库筛选：格式 PDF' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toHaveCount(0);

  await page.getByRole('button', { name: '未开始' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toContainText('当前筛选：状态 未开始');
  await expect(page.getByRole('heading', { name: '继续阅读' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '最近阅读' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '筛选结果' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '你的书库' })).toHaveCount(0);
  await expect(page.getByLabel('书库筛选摘要')).toContainText('筛选命中 2 / 5 本');
  await page.getByRole('button', { name: '移除书库筛选：状态 未开始' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /继续阅读《政治秩序与政治衰败》/ })).toBeVisible();
  await page.getByRole('button', { name: '未开始' }).click();
  await expect(page.getByRole('link', { name: /在阅读器打开《A Theory of Justice》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /在阅读器打开《论法的精神》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /继续阅读《政治秩序与政治衰败》/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /继续阅读《胡雪岩》/ })).toHaveCount(0);
  await page
    .getByLabel('筛选结果')
    .locator('.book-card', { hasText: 'A Theory of Justice' })
    .getByRole('button', { name: '详情' })
    .click();
  const sampleMetadataPanel = page.getByLabel('《A Theory of Justice》的书库元数据');
  await expect(sampleMetadataPanel).toContainText('标题');
  await expect(sampleMetadataPanel).toContainText('A Theory of Justice');
  await expect(sampleMetadataPanel).toContainText('格式');
  await expect(sampleMetadataPanel).toContainText('EPUB');
  await expect(sampleMetadataPanel.getByRole('button', { name: '筛选 EPUB 格式' })).toBeVisible();
  await expect(sampleMetadataPanel).toContainText('状态');
  await expect(sampleMetadataPanel).toContainText('未开始');
  await expect(sampleMetadataPanel.getByRole('button', { name: '筛选 未开始 状态' })).toBeVisible();
  await expect(sampleMetadataPanel).toContainText('封面');
  await expect(sampleMetadataPanel).toContainText('已设置');
  await expect(sampleMetadataPanel).toContainText('书架归类');
  await expect(sampleMetadataPanel).toContainText('政治哲学');
  await expect(sampleMetadataPanel).toContainText('标签');
  await expect(sampleMetadataPanel.getByRole('button', { name: '筛选 正义论 标签' })).toBeVisible();
  await expect(
    sampleMetadataPanel.getByRole('button', { name: '筛选 政治哲学 标签' })
  ).toBeVisible();
  await expect(sampleMetadataPanel).toContainText('来源');
  await expect(sampleMetadataPanel).toContainText('样例书库');

  await sampleMetadataPanel.getByRole('button', { name: '筛选 EPUB 格式' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toContainText('当前筛选：格式 EPUB');
  await expect(page.getByRole('link', { name: /在阅读器打开《A Theory of Justice》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /在阅读器打开《胡雪岩》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /在阅读器打开《论法的精神》/ })).toHaveCount(0);
  await expect(page.getByLabel('书库筛选摘要')).toContainText('筛选命中 2 / 5 本');
  await page.getByRole('button', { name: '移除书库筛选：格式 EPUB' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toHaveCount(0);

  await sampleMetadataPanel.getByRole('button', { name: '筛选 未开始 状态' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toContainText('当前筛选：状态 未开始');
  await expect(page.getByRole('link', { name: /在阅读器打开《A Theory of Justice》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /在阅读器打开《论法的精神》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /继续阅读《政治秩序与政治衰败》/ })).toHaveCount(0);
  await expect(page.getByLabel('书库筛选摘要')).toContainText('筛选命中 2 / 5 本');
  await page.getByRole('button', { name: '移除书库筛选：状态 未开始' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toHaveCount(0);

  await sampleMetadataPanel.getByRole('button', { name: '筛选 政治哲学 归类' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toContainText('当前筛选：归类 政治哲学');
  await expect(page.getByRole('link', { name: /在阅读器打开《A Theory of Justice》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /在阅读器打开《论法的精神》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /在阅读器打开《政治秩序与政治衰败》/ })).toHaveCount(0);
  await expect(page.getByLabel('书库筛选摘要')).toContainText('筛选命中 2 / 5 本');
  await page
    .getByRole('button', { name: '移除书库筛选：归类 政治哲学' })
    .click();
  await expect(page.getByLabel('书库当前筛选详情')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /继续阅读《政治秩序与政治衰败》/ })).toBeVisible();
  await sampleMetadataPanel.getByRole('button', { name: '筛选 政治哲学 归类' }).click();
  await expect(page.getByLabel('书库筛选摘要')).toContainText('筛选命中 2 / 5 本');
  await page.getByRole('button', { name: '清除书库筛选' }).click();

  await sampleMetadataPanel.getByRole('button', { name: '筛选 正义论 标签' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toContainText('当前筛选：标签 正义论');
  await expect(page.getByRole('link', { name: /在阅读器打开《A Theory of Justice》/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /在阅读器打开《论法的精神》/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /在阅读器打开《政治秩序与政治衰败》/ })).toHaveCount(0);
  await expect(page.getByLabel('书库筛选摘要')).toContainText('筛选命中 1 / 5 本');
  await page.getByRole('button', { name: '移除书库筛选：标签 正义论' }).click();
  await expect(page.getByLabel('书库筛选摘要')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /继续阅读《政治秩序与政治衰败》/ })).toBeVisible();

  await page.getByRole('button', { name: '已读完' }).click();
  await expect(page.getByRole('heading', { name: '继续阅读' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '筛选结果' })).toBeVisible();
  await expect(page.getByRole('link', { name: /在阅读器打开《A Theory of Justice》/ })).toHaveCount(0);

  await page.getByRole('button', { name: '在读' }).click();
  await expect(page.getByRole('button', { name: '在读', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await searchbox.fill('does-not-exist');
  await expect(page.getByLabel('书库当前筛选详情')).toContainText(
    '当前筛选：搜索 does-not-exist / 状态 在读'
  );

  await expect(page.getByRole('heading', { name: '继续阅读' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '最近阅读' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '搜索结果' })).toBeVisible();
  await expect(page.getByLabel(/搜索无结果/)).toContainText(
    '搜索 does-not-exist / 状态 在读 当前没有匹配的书'
  );
  await expect(page.getByLabel(/搜索无结果/)).toContainText(
    '移除搜索条件后再调整当前筛选'
  );
  await expect(
    page
      .getByLabel(/搜索无结果/)
      .getByRole('button', { name: '移除空态筛选：搜索 does-not-exist' })
  ).toBeVisible();
  await expect(
    page
      .getByLabel(/搜索无结果/)
      .getByRole('button', { name: '移除空态筛选：状态 在读' })
  ).toBeVisible();
  await expect(page.getByLabel(/搜索无结果/).getByRole('button', { name: '清除筛选' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '你的书库' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /在阅读器打开《政治秩序与政治衰败》/ })).toHaveCount(0);
  await page
    .getByLabel(/搜索无结果/)
    .getByRole('button', { name: '移除空态筛选：搜索 does-not-exist' })
    .click();
  await expect(page.getByLabel('书库当前筛选详情')).toContainText('当前筛选：状态 在读');
  await expect(page.getByRole('heading', { name: '继续阅读' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '筛选结果' })).toBeVisible();

  await page.getByLabel('书库格式筛选').getByRole('button', { name: 'PDF 1 本' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toContainText(
    '当前筛选：状态 在读 / 格式 PDF'
  );
  await expect(page.getByLabel(/筛选无结果/)).toContainText(
    '状态 在读 / 格式 PDF 当前没有匹配的书'
  );
  await expect(page.getByLabel(/筛选无结果/)).toContainText(
    '全部 / 全部格式 / 全部归类 / 全部标签'
  );
  await expect(
    page
      .getByLabel(/筛选无结果/)
      .getByRole('button', { name: '移除空态筛选：状态 在读' })
  ).toBeVisible();
  await page
    .getByLabel(/筛选无结果/)
    .getByRole('button', { name: '移除空态筛选：格式 PDF' })
    .click();
  await expect(page.getByLabel('书库当前筛选详情')).toContainText('当前筛选：状态 在读');
  await expect(page.getByRole('heading', { name: '继续阅读' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '筛选结果' })).toBeVisible();
  await page.getByRole('button', { name: '清除书库筛选' }).click();
  await expect(page.getByLabel('书库当前筛选详情')).toHaveCount(0);
});

test('reader can open a parallel surface without collapsing the shell', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '并行阅读测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: '并行阅读' })).toBeVisible();
  await expect(page.locator('.reader-stage')).toHaveCount(1);

  await page.getByRole('button', { name: '并行阅读' }).click();

  await expect(page.getByRole('button', { name: '关闭并行阅读' })).toBeVisible();
  await expect(page.locator('.reader-stage')).toHaveCount(2);

  const primaryStage = page.getByRole('region', { name: '主阅读窗格' });
  const secondaryStage = page.getByRole('region', { name: '并行阅读窗格' });
  const primaryProgress = primaryStage.getByLabel('阅读进度').locator('span');
  const secondaryProgress = secondaryStage.getByLabel('阅读进度').locator('span');

  await expect(primaryStage.getByLabel('阅读页脚控制')).toBeVisible();
  await expect(secondaryStage.getByLabel('阅读页脚控制')).toBeVisible();
  await expect(primaryStage.getByRole('button', { name: '下一页' })).toBeVisible();
  await expect(secondaryStage.getByRole('button', { name: '下一页' })).toBeVisible();
  await expect(primaryProgress).not.toHaveText('');
  await expect(secondaryProgress).not.toHaveText('');

  await primaryStage.getByRole('button', { name: '下一页' }).click();

  await expect(page.getByRole('region', { name: '主阅读窗格' })).toBeVisible();
  await expect(page.getByRole('region', { name: '并行阅读窗格' })).toBeVisible();
  await expect(primaryStage.getByLabel('阅读页脚控制')).toBeVisible();
  await expect(secondaryStage.getByLabel('阅读页脚控制')).toBeVisible();
  await expect(secondaryStage.getByRole('button', { name: '下一页' })).toBeVisible();
});

test('reader can open a notebook workspace without collapsing navigation', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '笔记工作台测试'
  }).toString()}`;

  await page.goto(readerHref);

  const notebookModeToggle = page
    .getByLabel('工作台模式切换')
    .getByRole('button', { name: '打开笔记工作台' });
  await expect(notebookModeToggle).toBeVisible();
  await expect(page.getByRole('tablist', { name: '阅读侧栏标签' })).toBeVisible();
  await expect(page.getByRole('button', { name: '并行阅读' })).toBeVisible();

  await notebookModeToggle.click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台', exact: true });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭笔记工作台' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '笔记工作台标签' })).toBeVisible();
  await expect(page.getByRole('button', { name: '固定笔记工作台' })).toBeVisible();
  await expect(page.getByRole('button', { name: '并行阅读' })).toBeVisible();

  await page.getByRole('button', { name: '固定笔记工作台' }).click();
  await expect(page.getByRole('button', { name: '取消固定笔记工作台' })).toBeVisible();

  await page.getByRole('button', { name: '关闭笔记工作台' }).click();
  await expect(notebookModeToggle).toBeVisible();
  await expect(page.getByRole('tablist', { name: '阅读侧栏标签' })).toBeVisible();
});

test('reader keeps the overview sidebar surface legible in web mode', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '侧栏概览测试'
  }).toString()}`;

  await page.goto(readerHref);

  const overview = page.getByLabel('当前书概览');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText('EPUB');
  await expect(overview).toContainText('Sample Book for Prototype');
  await expect(overview).toContainText('书签');
  await expect(overview).toContainText('高亮');

  const toc = page.getByLabel('目录预览');
  await expect(toc).toBeVisible();
  const tocButtons = toc.getByRole('button');
  const tocButtonCount = await tocButtons.count();
  let targetTocIndex = Math.max(0, tocButtonCount - 1);
  for (let index = 0; index < tocButtonCount; index += 1) {
    const className = (await tocButtons.nth(index).getAttribute('class')) ?? '';
    if (!className.includes('active')) {
      targetTocIndex = index;
      break;
    }
  }
  await tocButtons.nth(targetTocIndex).click();
  await expect(tocButtons.nth(targetTocIndex)).toHaveClass(/active/);

  const moreActions = overview.getByRole('button', { name: '更多书籍操作' });
  await moreActions.click();
  const menu = page.getByRole('menu', { name: '书籍更多操作' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: '回到书库' })).toBeVisible();
});

test('reader sidebar chrome keeps tab routing legible in web mode', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '侧栏 chrome 测试'
  }).toString()}`;

  await page.goto(readerHref);

  const sidebarTabs = page.getByRole('tablist', { name: '阅读侧栏标签' });
  await expect(sidebarTabs).toBeVisible();
  await expect(sidebarTabs.getByRole('tab', { name: '目录', selected: true })).toBeVisible();
  await expect(page.getByLabel('当前书概览')).toBeVisible();

  await sidebarTabs.getByRole('tab', { name: '搜索' }).click();
  await expect(sidebarTabs.getByRole('tab', { name: '搜索', selected: true })).toBeVisible();
  await expect(page.getByLabel('正文搜索面板')).toBeVisible();

  await sidebarTabs.getByRole('tab', { name: '书签' }).click();
  await expect(sidebarTabs.getByRole('tab', { name: '书签', selected: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '书签面板' })).toBeVisible();

  await sidebarTabs.getByRole('tab', { name: '笔记' }).click();
  await expect(sidebarTabs.getByRole('tab', { name: '笔记', selected: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '笔记面板' })).toBeVisible();

  await sidebarTabs.getByRole('tab', { name: '目录' }).click();
  await expect(sidebarTabs.getByRole('tab', { name: '目录', selected: true })).toBeVisible();
  await expect(page.getByLabel('当前书概览')).toBeVisible();
});

test('reader can open the ai workspace inside the notebook shell', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: 'AI 工作台测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'AI 工作台' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '阅读侧栏标签' })).toBeVisible();

  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台', exact: true });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('tab', { name: 'AI 助手', selected: true })).toBeVisible();
  await expect(page.getByText('AI 阅读助手')).toBeVisible();
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('当前书查找 0 条');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('当前书翻译 0 条');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('助手待命');
  await expect(
    page.getByText('把查词、百科和翻译结果放到 notebook 里的独立工作台，而不是只做一个 sidebar 结果区。')
  ).toBeVisible();
  await expect(page.getByLabel('AI 工作台范围摘要')).toContainText('当前书范围：查找 0 条 · 翻译 0 条');
  await expect(page.getByLabel('AI 工作台范围摘要')).toContainText(
    '这里保留当前书的查找和翻译记录，并在摘要和分区之间切换浏览。'
  );
  await expect(page.getByLabel('本书 AI 记录摘要')).toBeVisible();
  await expect(page.getByLabel('本书 AI 记录摘要')).toContainText('查找 0 条 · 翻译 0 条');
  await expect(page.getByLabel('本书 AI 记录入口')).toBeVisible();
  await expect(page.getByLabel('AI 工作台浏览提示')).toContainText(
    '当前停留在本书 AI 记录摘要。选择 `查找记录` 或 `翻译记录` 后，才会展开对应 notebook lane 的导航、当前记录和历史记录列表。'
  );
  await expect(page.getByLabel('最近求助')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '并行阅读' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '阅读侧栏标签' })).toBeVisible();
});

test('reader sidebar assist workspace stays legible in web mode', async ({ page }) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: '侧栏查找工作台测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-history-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
    },
    { historyKey: historyStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });

  const sidebarTabs = page.getByRole('tablist', { name: '阅读侧栏标签' });
  await expect(sidebarTabs).toBeVisible();
  await sidebarTabs.getByRole('tab', { name: '查找' }).click();
  await expect(sidebarTabs.getByRole('tab', { name: '查找', selected: true })).toBeVisible();

  // This smoke guards the extraction boundary: the sidebar host should keep
  // presenting the same assist workspace contract without becoming a new owner
  // of route state or notebook history semantics.
  const assistPanel = page.getByLabel('查找面板');
  await expect(assistPanel).toBeVisible();
  await expect(assistPanel.getByText('AI 阅读助手')).toBeVisible();
  await expect(assistPanel.getByLabel('AI 工作台范围摘要')).toContainText(
    '当前书范围：查找 1 条 · 翻译 0 条'
  );
  await expect(assistPanel.getByLabel('本书 AI 记录摘要')).toBeVisible();
  await expect(assistPanel.getByLabel('本书 AI 记录入口')).toBeVisible();
  const historyLane = await openLookupHistoryLane(assistPanel, 'bridge reader');
  await expect(historyLane.getByText('第一章 · 维基百科', { exact: true })).toBeVisible();
  const activeRecord = await selectLastLookupHistoryRecord(historyLane);
  await expect(activeRecord).toContainText('bridge reader');
  const resultPanel = assistPanel.locator('.assist-result');
  await expect(resultPanel.locator('.assist-result-header > strong')).toHaveText('查找结果');
  await expect(resultPanel.locator('.assist-result-header > span')).toContainText('历史记录');
  await expect(resultPanel.locator('> h4')).toHaveText('Bridge reader');
});

test('reader restores ai workspace history for the current book in web mode', async ({ page }) => {
  const sourceUrl = '/samples/sample-book.epub';
  const storageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 历史恢复测试'
  }).toString()}`;

  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            id: 'assist-history-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
    },
    { key: storageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: 'AI 工作台' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const historyLane = await openLookupHistoryLane(notebook, 'bridge reader');
  await expect(historyLane.getByText('bridge reader', { exact: true })).toBeVisible();
  await expect(historyLane.getByText('第一章 · 维基百科', { exact: true })).toBeVisible();
  await historyLane.getByRole('button', { name: '查看记录' }).click();
  const resultPanel = notebook.locator('.assist-result');
  await expect(resultPanel.locator('.assist-result-header > strong')).toHaveText('查找结果');
  await expect(resultPanel.locator('.assist-result-header > span')).toContainText('历史记录');
  await expect(resultPanel.locator('> h4')).toHaveText('Bridge reader');
  await expect(resultPanel.locator('> p')).toHaveText('A notebook-style reading bridge.');
});

test('reader restores the selected ai history record for the current book in web mode', async ({ page }) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const selectionStorageKey = `br1.reader.assistance.selection:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 历史选中恢复测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey, selectionKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-lookup-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
      window.localStorage.setItem(
        selectionKey,
        JSON.stringify({
          lookupHistoryEntryId: 'assist-lookup-1',
          translationHistoryEntryId: ''
        })
      );
    },
    { historyKey: historyStorageKey, selectionKey: selectionStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const historyLane = notebook.getByLabel('最近求助');
  await expect(historyLane.locator('.assist-history-status-badge')).toHaveText('当前正在查看');
  await expect(notebook.getByLabel('当前正在查看的 AI 记录')).toContainText('bridge reader');
  const resultPanel = notebook.locator('.assist-result');
  await expect(resultPanel.locator('.assist-result-header > strong')).toHaveText('查找结果');
  await expect(resultPanel.locator('.assist-result-header > span')).toContainText('历史记录');
  await expect(resultPanel.locator('> h4')).toHaveText('Bridge reader');
  await expect(resultPanel.locator('> p')).toHaveText('A notebook-style reading bridge.');
});

test('reader restores the selected translation ai history record for the current book in web mode', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const selectionStorageKey = `br1.reader.assistance.selection:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 翻译历史选中恢复测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey, selectionKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-translation-1',
            request: {
              kind: 'translation',
              provider: 'deepl',
              text: 'Bridge reading keeps the text in focus.',
              targetLanguage: 'zh',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-result-1',
              provider: 'deepl',
              title: '第二章',
              body: '桥接式阅读让正文保持在中心位置。',
              createdAt: 20
            },
            error: '',
            createdAt: 20,
            updatedAt: 20
          }
        ])
      );
      window.localStorage.setItem(
        selectionKey,
        JSON.stringify({
          lookupHistoryEntryId: '',
          translationHistoryEntryId: 'assist-translation-1'
        })
      );
    },
    { historyKey: historyStorageKey, selectionKey: selectionStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const historyLane = notebook.getByLabel('最近翻译');
  await expect(historyLane.locator('.assist-history-status-badge')).toHaveText('当前正在查看');
  await expect(notebook.getByLabel('当前正在查看的 AI 记录')).toContainText(
    'Bridge reading keeps the text in focus.'
  );
  const resultPanel = notebook.locator('.assist-result');
  await expect(resultPanel.locator('.assist-card-header span').first()).toHaveText(
    '历史记录 · 第二章 · 译为 ZH'
  );
  await expect(resultPanel.locator('.assist-card-header span').last()).toHaveText(
    '历史记录 · 第二章 · 译为 ZH'
  );
  await expect(resultPanel.locator('article.assist-translation-card.result p')).toHaveText(
    '桥接式阅读让正文保持在中心位置。'
  );
});

test('reader groups current-book ai history into lookup and translation sections in web mode', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 记录摘要测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-translation-1',
            request: {
              kind: 'translation',
              provider: 'deepl',
              text: 'Bridge reading keeps the text in focus.',
              targetLanguage: 'zh',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-result-1',
              provider: 'deepl',
              title: '第二章',
              body: '桥接式阅读让正文保持在中心位置。',
              createdAt: 20
            },
            error: '',
            createdAt: 20,
            updatedAt: 20
          },
          {
            id: 'assist-lookup-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
    },
    { historyKey: historyStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const overview = notebook.getByLabel('本书 AI 记录摘要');
  await expect(overview.getByRole('button', { name: /查找记录/ })).toContainText('当前书 1 条');
  await expect(overview.getByRole('button', { name: /翻译记录/ })).toContainText('当前书 1 条');
  await overview.getByRole('button', { name: /翻译记录/ }).click();
  const historyLane = notebook.getByLabel('最近翻译');
  await expect(historyLane.getByText('Bridge reading keeps the text in focus.')).toBeVisible();
});

test('reader keeps the active ai archive summary visible when the history list is collapsed', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 折叠记录测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-lookup-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
    },
    { historyKey: historyStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const historyLane = await openLookupHistoryLane(notebook, 'bridge reader');
  const activeRecord = await selectLastLookupHistoryRecord(historyLane);
  await expect(activeRecord).toContainText('bridge reader');
  await historyLane.getByRole('button', { name: '收起记录列表' }).click();
  await expect(activeRecord).toContainText('bridge reader');
  await expect(historyLane.getByText('查找记录列表已收起；当前书的最近求助仍然保留在这个 section 里。')).toBeVisible();
  await expect(historyLane.getByRole('button', { name: '展开记录列表' })).toBeVisible();
});

test('reader shows notebook-style action hierarchy inside ai archive lanes', async ({ page }) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 分区动作层级测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-lookup-2',
            request: {
              kind: 'lookup',
              provider: 'dictionary',
              term: 'mediation',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-2',
              provider: 'dictionary',
              title: 'mediation',
              body: 'Bridging between two parties.',
              createdAt: 20
            },
            error: '',
            createdAt: 20,
            updatedAt: 20
          },
          {
            id: 'assist-lookup-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
    },
    { historyKey: historyStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: 'AI 工作台' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const historyLane = await openLookupHistoryLane(notebook, 'bridge reader');
  await expect(historyLane.getByLabel('记录分区维护操作')).toBeVisible();
  await selectLastLookupHistoryRecord(historyLane);
  const activeSection = historyLane.getByLabel('当前记录 section');
  await expect(activeSection.locator('.assist-history-section-head > strong')).toHaveText('当前记录');
  await expect(activeSection.getByLabel('当前正在查看的 AI 记录')).toBeVisible();
  const archiveSection = historyLane.getByLabel('历史记录列表 section');
  await expect(archiveSection.locator('.assist-history-section-head > strong')).toHaveText('历史记录列表');
  await expect(archiveSection.locator('.assist-history-section-head > span')).toHaveText(
    '当前书 2 条查找历史'
  );
  await expect(historyLane.locator('.assist-history-status-badge')).toHaveText('当前正在查看');
  await expect(historyLane.getByRole('button', { name: '再次发起' }).first()).toBeVisible();
});

test('reader can switch a focused ai lane between current-record and full-history views', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 分区浏览模式测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-lookup-2',
            request: {
              kind: 'lookup',
              provider: 'dictionary',
              term: 'mediation',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-2',
              provider: 'dictionary',
              title: 'mediation',
              body: 'Bridging between two parties.',
              createdAt: 20
            },
            error: '',
            createdAt: 20,
            updatedAt: 20
          },
          {
            id: 'assist-lookup-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
    },
    { historyKey: historyStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: 'AI 工作台' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const historyLane = await openLookupHistoryLane(notebook, 'bridge reader');
  await selectLastLookupHistoryRecord(historyLane);
  await historyLane.getByRole('button', { name: '只看当前记录' }).click();
  await expect(historyLane.getByRole('button', { name: '只看当前记录' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  const archiveSection = historyLane.getByLabel('历史记录列表 section');
  await expect(archiveSection).toContainText(
    '当前处于只看当前记录模式；切回完整历史后，可以继续浏览这本书的查找记录。'
  );
  await expect(archiveSection.getByRole('button', { name: '查看记录' })).toHaveCount(0);

  await historyLane.getByRole('button', { name: '查看完整历史' }).click();
  await expect(historyLane.getByRole('button', { name: '查看完整历史' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(archiveSection.getByRole('button', { name: '查看记录' })).toHaveCount(1);
  await expect(archiveSection.locator('.assist-history-status-badge')).toHaveText('当前正在查看');
});

test('reader shows breadcrumb and grouped browse controls inside focused ai lanes', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 导航分组测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-lookup-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
    },
    { historyKey: historyStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: 'AI 工作台' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const historyLane = await openLookupHistoryLane(notebook, 'bridge reader');
  const navSection = historyLane.getByLabel('AI 浏览导航 section');
  await expect(navSection).toContainText('浏览导航');
  await expect(navSection).toContainText('当前位置 本书查找记录');
  await expect(historyLane.getByLabel('当前 AI 导航路径')).toHaveText('本书 AI 记录摘要 / 本书查找记录');
  const navSummary = historyLane.getByLabel('当前 AI 浏览摘要');
  await expect(navSummary).toContainText('当前位置：本书查找记录');
  await expect(navSummary).toContainText('当前范围：完整历史');
  await expect(navSummary).not.toContainText('当前条目：');
  await historyLane.getByRole('button', { name: '查看记录' }).click();
  await historyLane.getByRole('button', { name: '只看当前记录' }).click();
  await expect(historyLane.getByLabel('当前 AI 导航路径')).toHaveText(
    '本书 AI 记录摘要 / 本书查找记录 / 当前记录'
  );
  await expect(navSection).toContainText('当前位置 本书查找记录 · 当前范围 当前记录');
  await expect(navSummary).toContainText('当前位置：本书查找记录');
  await expect(navSummary).toContainText('当前范围：当前记录');
  await expect(navSummary).toContainText('当前条目：bridge reader');
  await expect(historyLane.getByLabel('浏览位置')).toBeVisible();
  await expect(historyLane.getByLabel('浏览范围')).toBeVisible();
});

test('reader can move from the ai archive overview into one lane and back again', async ({ page }) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 记录导航测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-translation-1',
            request: {
              kind: 'translation',
              provider: 'deepl',
              text: 'Bridge reading keeps the text in focus.',
              targetLanguage: 'zh',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-result-1',
              provider: 'deepl',
              title: '第二章',
              body: '桥接式阅读让正文保持在中心位置。',
              createdAt: 20
            },
            error: '',
            createdAt: 20,
            updatedAt: 20
          },
          {
            id: 'assist-lookup-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
    },
    { historyKey: historyStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const overview = notebook.getByLabel('本书 AI 记录摘要');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText('本书 AI 记录摘要');
  await expect(overview).toContainText('查找 1 条 · 翻译 1 条');
  await expect(overview.getByLabel('本书 AI 记录入口')).toBeVisible();
  await overview.getByRole('button', { name: /翻译记录/ }).click();
  await expect(overview).toBeHidden();
  const historyLane = notebook.getByLabel('最近翻译');
  await expect(historyLane.locator('.assist-history-head > strong')).toHaveText('本书翻译记录');
  await expect(historyLane.getByText('当前书 1 条翻译记录')).toBeVisible();
  await expect(historyLane.getByRole('button', { name: '返回本书 AI 记录摘要' })).toBeVisible();
  await historyLane.getByRole('button', { name: '返回本书 AI 记录摘要' }).click();
  await expect(overview).toBeVisible();
  await expect(notebook.getByLabel('AI 工作台浏览提示')).toBeVisible();
  await expect(notebook.getByLabel('最近翻译')).toHaveCount(0);
});

test('reader can clear current-book ai history in web mode', async ({ page }) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'AI 历史清理测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-lookup-1',
            request: {
              kind: 'lookup',
              provider: 'wikipedia',
              term: 'bridge reader',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-result-1',
              provider: 'wikipedia',
              title: 'Bridge reader',
              body: 'A notebook-style reading bridge.',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
    },
    { historyKey: historyStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  const historyLane = await openLookupHistoryLane(notebook, 'bridge reader');
  await expect(historyLane.getByText('bridge reader', { exact: true })).toBeVisible();
  await historyLane.getByRole('button', { name: '清除本书求助记录' }).click();
  await expect(historyLane.getByText('还没有这本书的查找记录。发起一次查词或百科后，这里会保留最近请求。')).toBeVisible();
  await expect
    .poll(() => page.evaluate((key) => window.localStorage.getItem(key), historyStorageKey), {
      timeout: 15000
    })
    .toBe('[]');
});

test('reader can open translation mode as a dedicated notebook tab', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '翻译模式测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: '打开翻译模式' })).toBeVisible();

  await page.getByRole('button', { name: '打开翻译模式' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible();
  await expect(notebook.locator('.assist-summary strong', { hasText: '翻译模式' })).toBeVisible();
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('当前书翻译 0 条');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('翻译模式待命');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('跟随');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('原文 / 译文并排阅读');
  await expect(
    page.getByText('把原文和译文并排收进 reader 工作台，让翻译成为一种阅读模式，而不是助手里的临时请求。')
  ).toBeVisible();
  await expect(page.getByLabel('翻译模式范围摘要')).toContainText('当前书范围：翻译 0 条');
  await expect(page.getByLabel('翻译模式范围摘要')).toContainText(
    '这里只保留当前书的翻译记录，以及原文 / 译文并排的阅读结果。'
  );
  const translationHistoryLane = notebook.getByLabel('最近翻译');
  await expect(translationHistoryLane.getByLabel('当前 AI 导航路径')).toHaveText(
    '翻译模式 / 本书翻译记录'
  );
  await expect(
    translationHistoryLane.getByRole('button', { name: '返回本书 AI 记录摘要' })
  ).toHaveCount(0);
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('正在跟随');
  await expect(page.getByRole('button', { name: '锁定当前翻译目标' })).toBeVisible();
  const translationPanels = page.getByLabel('翻译阅读面板');
  await expect(translationPanels).toBeVisible();
  const sourceCard = translationPanels.locator('.assist-translation-card').first();
  const resultCard = translationPanels.locator('.assist-translation-card').last();
  await expect(sourceCard.locator('.assist-card-header strong', { hasText: '原文' })).toBeVisible();
  await expect(resultCard.locator('.assist-card-header strong', { hasText: '译文' })).toBeVisible();
  await expect(sourceCard.locator('.assist-card-header span')).toContainText('正在跟随');
  await expect(resultCard.locator('.assist-card-header span')).toHaveText('当前翻译结果');
  const translationInput = notebook.getByRole('textbox', { name: '翻译文本' });
  await expect(translationInput).toHaveValue('第 1 / 3 节');
  await expect(translationInput).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: '锁定当前翻译目标' }).click();
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('已锁定');
  await expect(sourceCard.locator('.assist-card-header span')).toContainText('已锁定');
  await expect(page.getByRole('button', { name: '回到当前阅读位置' })).toBeVisible();
  await expect(translationInput).not.toHaveAttribute('readonly', '');
  await translationInput.fill('Translate this paragraph while keeping the current reading mode.');
  await expect(page.getByRole('button', { name: '回到当前阅读位置' })).toBeVisible();
  await page.getByRole('button', { name: '回到当前阅读位置' }).click();
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('正在跟随');
  await expect(translationInput).toHaveAttribute('readonly', '');
});

test('reader exposes inline translation mode without replacing the notebook translation workspace', async ({
  page
}) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );
  await page.getByRole('button', { name: '翻译模式' }).click();
  await expect(page.getByRole('region', { name: '翻译模式' })).toBeVisible();
  await page.getByRole('button', { name: '开启正文内译文' }).click();
  await expect(page.getByRole('region', { name: '正文内译文状态' })).toContainText(
    '等待可翻译正文'
  );
  await expect(page.getByRole('region', { name: '翻译模式' })).toBeVisible();
});

test('reader can jump from translation mode into translated tts in web mode', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '翻译到朗读模式测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: '打开翻译模式' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '打开翻译模式' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible();
  await expect(page).toHaveURL(/\/reader\?.*workspace=translation(?:&|$)/);
  await expect(page.getByLabel('翻译模式朗读去向')).toContainText('可直接切到朗读译文');
  await expect(
    page.getByLabel('翻译模式朗读去向').getByRole('button', { name: '在朗读模式中查看' })
  ).toBeVisible();
  await page
    .getByLabel('翻译模式朗读去向')
    .getByRole('button', { name: '在朗读模式中查看' })
    .click({ force: true });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(page).toHaveURL(/\/reader\?.*workspace=tts(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*tts=translated(?:&|$)/);
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(notebook.getByRole('region', { name: '朗读模式' })).toContainText('正在跟随当前章节');
});

test('reader restores dedicated translation and tts modes from route state in web mode', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
    window.localStorage.removeItem('br1.reader.settings');
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '路由工作台模式测试',
    workspace: 'translation'
  }).toString()}`;

  await page.goto(readerHref);

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*workspace=translation(?:&|$)/);

  const translationPlaybackStrip = page.getByLabel('翻译模式朗读去向');
  await expect(translationPlaybackStrip).toContainText('可直接切到朗读译文');
  await translationPlaybackStrip.getByRole('button', { name: '在朗读模式中查看' }).click();

  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(page).toHaveURL(/\/reader\?.*workspace=tts(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*tts=translated(?:&|$)/);
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*workspace=tts(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*tts=translated(?:&|$)/);
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');

  await notebook.getByRole('tab', { name: '笔记' }).click();
  await expect(page.getByRole('tab', { name: '笔记', selected: true })).toBeVisible();
  await expect(page).not.toHaveURL(/\/reader\?.*workspace=/);
  await expect(page).not.toHaveURL(/\/reader\?.*tts=/);
});

test('reader restores dedicated tts read-aloud mode from route state in web mode', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
    window.localStorage.setItem(
      'br1.reader.settings',
      JSON.stringify({
        ttsReadAloudText: 'translated'
      })
    );
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '路由朗读模式测试',
    workspace: 'tts',
    tts: 'source'
  }).toString()}`;

  await page.goto(readerHref);

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*workspace=tts(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*tts=source(?:&|$)/);
  await expect(page.getByRole('button', { name: '朗读原文' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '朗读译文' }).click();
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/reader\?.*tts=translated(?:&|$)/);

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*tts=translated(?:&|$)/);
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');

  await notebook.getByRole('tab', { name: '笔记' }).click();
  await expect(page.getByRole('tab', { name: '笔记', selected: true })).toBeVisible();
  await expect(page).not.toHaveURL(/\/reader\?.*workspace=/);
  await expect(page).not.toHaveURL(/\/reader\?.*tts=/);
});

test('reader restores dedicated translation target language from route state in web mode', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '路由翻译目标语言测试',
    workspace: 'translation',
    tl: 'en'
  }).toString()}`;

  await page.goto(readerHref);

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('第 1 / 3 节', {
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*workspace=translation(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*tl=en(?:&|$)/);
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  await expect(notebook.getByRole('button', { name: '翻译为 EN' })).toBeVisible();

  await page.getByRole('button', { name: '中文' }).click();
  await expect(page.getByRole('button', { name: '中文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/reader\?.*tl=zh(?:&|$)/);
  await expect(notebook.getByRole('button', { name: '翻译为 ZH' })).toBeVisible();

  await page.reload();

  await expect(page.getByRole('button', { name: '中文' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('第 1 / 3 节', {
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*tl=zh(?:&|$)/);
  await expect(page.getByRole('button', { name: '中文' })).toHaveAttribute('aria-pressed', 'true');

  await notebook.getByRole('tab', { name: '笔记' }).click();
  await expect(page.getByRole('tab', { name: '笔记', selected: true })).toBeVisible();
  await expect(page).not.toHaveURL(/\/reader\?.*workspace=/);
  await expect(page).not.toHaveURL(/\/reader\?.*tl=/);
});

test('reader restores dedicated translation provider from route state in web mode', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '路由翻译提供方测试',
    workspace: 'translation',
    tp: 'yandex'
  }).toString()}`;

  await page.goto(readerHref);

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: 'Yandex' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('第 1 / 3 节', {
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*workspace=translation(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*tp=yandex(?:&|$)/);
  await expect(page.getByRole('button', { name: 'Yandex' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'DeepL' }).click();
  await expect(page.getByRole('button', { name: 'DeepL' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/reader\?.*tp=deepl(?:&|$)/);

  await page.reload();

  await expect(page.getByRole('button', { name: 'DeepL' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('第 1 / 3 节', {
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*tp=deepl(?:&|$)/);
  await expect(page.getByRole('button', { name: 'DeepL' })).toHaveAttribute('aria-pressed', 'true');

  await notebook.getByRole('tab', { name: '笔记' }).click();
  await expect(page.getByRole('tab', { name: '笔记', selected: true })).toBeVisible();
  await expect(page).not.toHaveURL(/\/reader\?.*workspace=/);
  await expect(page).not.toHaveURL(/\/reader\?.*tp=/);
});

test('reader restores dedicated translation ownership for the same book across reload', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '翻译模式归属持久化测试',
    workspace: 'translation'
  }).toString()}`;
  const lockedSourceText = 'Locked translation source after reload.';

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('正在跟随');
  await page.getByRole('button', { name: '锁定当前翻译目标' }).click();
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('已锁定');

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  const translationPanels = page.getByLabel('翻译阅读面板');
  const sourceCard = translationPanels.locator('.assist-translation-card').first();
  const translationInput = notebook.getByRole('textbox', { name: '翻译文本' });

  await expect(sourceCard.locator('.assist-card-header span')).toContainText('已锁定');
  await expect(translationInput).not.toHaveAttribute('readonly', '');
  await translationInput.fill(lockedSourceText);
  await expect(translationInput).toHaveValue(lockedSourceText);

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('已锁定');
  await expect(page.getByRole('button', { name: '回到当前阅读位置' })).toBeVisible();
  await expect(sourceCard.locator('.assist-card-header span')).toContainText('已锁定');
  await expect(translationInput).toHaveValue(lockedSourceText);
  await expect(translationInput).not.toHaveAttribute('readonly', '');

  await page.getByRole('button', { name: '回到当前阅读位置' }).click();
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('正在跟随');
  await expect(translationInput).toHaveAttribute('readonly', '');
  await expect(translationInput).toHaveValue('第 1 / 3 节');
});

test('reader restores dedicated translation mode config per book across reload', async ({
  page
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
    window.localStorage.removeItem('br1.reader.translation.mode:/samples/sample-book.epub');
    window.localStorage.removeItem('br1.reader.translation.mode:/samples/sample-book.txt');
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '翻译模式配置持久化测试',
    workspace: 'translation'
  }).toString()}`;
  const otherBookHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.txt',
    label: '另一册翻译模式配置测试',
    workspace: 'translation'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: '中文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'DeepL' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Yandex' }).click();
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Yandex' })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Yandex' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '翻译为 EN' })).toBeVisible();

  await page.goto(otherBookHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: '中文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'DeepL' })).toHaveAttribute('aria-pressed', 'true');
});

test('reader restores current-book archived translation provenance across reload', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const selectionStorageKey = `br1.reader.assistance.selection:${sourceUrl}`;
  const translationModeConfigStorageKey = `br1.reader.translation.mode:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: '历史译文 provenance 恢复测试',
    workspace: 'translation'
  }).toString()}`;

  await page.goto('/');
  await page.evaluate(({ historyKey, selectionKey, configKey }) => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
    window.localStorage.setItem(
      historyKey,
      JSON.stringify([
        {
          id: 'assist-translation-archive-1',
          request: {
            kind: 'translation',
            provider: 'yandex',
            text: 'Archived translation source text.',
            targetLanguage: 'en',
            chapterLabel: '第二章',
            bookKey: '/samples/sample-book.epub'
          },
          status: 'ready',
          result: {
            id: 'assist-translation-archive-result-1',
            provider: 'yandex',
            title: '第二章',
            body: 'This is the restored archived translation.',
            sourceLabel: 'Yandex',
            createdAt: 10
          },
          error: '',
          createdAt: 10,
          updatedAt: 10
        }
      ])
    );
    window.localStorage.setItem(
      selectionKey,
      JSON.stringify({
        lookupHistoryEntryId: '',
        translationHistoryEntryId: 'assist-translation-archive-1'
      })
    );
    window.localStorage.setItem(
      configKey,
      JSON.stringify({
        targetLanguage: 'zh',
        provider: 'deepl'
      })
    );
  }, {
    historyKey: historyStorageKey,
    selectionKey: selectionStorageKey,
    configKey: translationModeConfigStorageKey
  });

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Yandex' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('翻译阅读面板')).toContainText('历史记录');
  await expect(page.getByLabel('翻译阅读面板')).toContainText(
    'This is the restored archived translation.'
  );

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Yandex' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('翻译阅读面板')).toContainText('历史记录');
  await expect(page.getByLabel('翻译阅读面板')).toContainText(
    'This is the restored archived translation.'
  );
});

test('reader restores live translation snapshots for the same book across reload', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const selectionStorageKey = `br1.reader.assistance.selection:${sourceUrl}`;
  const translationOwnershipStorageKey = `br1.reader.translation.ownership:${sourceUrl}`;
  const translationLiveSnapshotStorageKey = `br1.reader.translation.live-result:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: '翻译模式 live snapshot 恢复测试',
    workspace: 'translation'
  }).toString()}`;

  await page.goto('/');
  await page.evaluate(
    ({ historyKey, selectionKey, translationOwnershipKey, translationSnapshotKey }) => {
      window.localStorage.removeItem('br1.reader.notebook-shell');
      window.localStorage.removeItem(translationSnapshotKey);
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-translation-live-1',
            request: {
              kind: 'translation',
              provider: 'deepl',
              text: 'Live translation source text.',
              targetLanguage: 'zh',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-live-result-1',
              provider: 'deepl',
              title: '第二章',
              body: '这是当前翻译模式的 live 译文。',
              sourceLabel: 'DeepL',
              createdAt: 20
            },
            error: '',
            createdAt: 20,
            updatedAt: 20
          },
          {
            id: 'assist-translation-archive-1',
            request: {
              kind: 'translation',
              provider: 'deepl',
              text: 'Archived translation source text.',
              targetLanguage: 'zh',
              chapterLabel: '第一章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-archive-result-1',
              provider: 'deepl',
              title: '第一章',
              body: '这是历史译文，不该抢走当前 live 结果。',
              sourceLabel: 'DeepL',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          }
        ])
      );
      window.localStorage.setItem(
        selectionKey,
        JSON.stringify({
          lookupHistoryEntryId: '',
          translationHistoryEntryId: ''
        })
      );
      window.localStorage.setItem(
        translationOwnershipKey,
        JSON.stringify({
          followsCurrentSource: false,
          pinnedSource: {
            text: 'Live translation source text.',
            label: '当前翻译目标',
            chapterLabel: '第二章'
          }
        })
      );
    },
    {
      historyKey: historyStorageKey,
      selectionKey: selectionStorageKey,
      translationOwnershipKey: translationOwnershipStorageKey,
      translationSnapshotKey: translationLiveSnapshotStorageKey
    }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  const translationPanels = page.getByLabel('翻译阅读面板');
  const translationResultCard = translationPanels.locator('.assist-translation-card.result');
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('已锁定');
  await expect(translationResultCard.locator('.assist-card-header span')).toHaveText('当前翻译结果');
  await expect(translationResultCard).toContainText('这是当前翻译模式的 live 译文。');
  await expect(translationResultCard).not.toContainText('历史记录');

  await page.evaluate((historyKey) => {
    window.localStorage.setItem(
      historyKey,
      JSON.stringify([
        {
          id: 'assist-translation-archive-1',
          request: {
            kind: 'translation',
            provider: 'deepl',
            text: 'Archived translation source text.',
            targetLanguage: 'zh',
            chapterLabel: '第一章',
            bookKey: '/samples/sample-book.epub'
          },
          status: 'ready',
          result: {
            id: 'assist-translation-archive-result-1',
            provider: 'deepl',
            title: '第一章',
            body: '这是历史译文，不该抢走当前 live 结果。',
            sourceLabel: 'DeepL',
            createdAt: 10
          },
          error: '',
          createdAt: 10,
          updatedAt: 10
        }
      ])
    );
  }, historyStorageKey);

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('已锁定');
  await expect(translationResultCard.locator('.assist-card-header span')).toHaveText('当前翻译结果');
  await expect(translationResultCard).toContainText('这是当前翻译模式的 live 译文。');
  await expect(translationResultCard).not.toContainText('历史记录');
});

test('reader restores dedicated tts ownership for the same book across reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
    window.localStorage.removeItem('br1.reader.tts.ownership:/samples/sample-book.txt');
    window.localStorage.removeItem('br1.reader.tts.ownership:/samples/sample-book.epub');
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.txt',
    label: '朗读模式归属持久化测试',
    workspace: 'tts'
  }).toString()}`;
  const otherBookHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '另一册朗读模式测试',
    workspace: 'tts'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  const ttsRegion = notebook.getByRole('region', { name: '朗读模式' });
  const currentTargetPanel = ttsRegion.locator('.tts-panel').first();

  await page.locator('.plain-text-surface').evaluate((element) => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) {
      throw new Error('expected the TXT fixture to produce a scrollable plain-text surface');
    }
    element.scrollTop = maxScroll * 0.82;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });

  await expect(currentTargetPanel).toContainText('Depth line');
  await page.getByRole('button', { name: '锁定当前朗读目标' }).click();
  await expect(page.getByLabel('朗读模式状态')).toContainText('已锁定朗读目标');
  await expect(page.getByRole('button', { name: '回到当前阅读位置' })).toBeVisible();

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByLabel('朗读模式状态')).toContainText('已锁定朗读目标');
  await expect(currentTargetPanel).toContainText('Depth line');
  await expect(page.getByRole('button', { name: '回到当前阅读位置' })).toBeVisible();

  await page.getByRole('button', { name: '回到当前阅读位置' }).click();
  await expect(page.getByLabel('朗读模式状态')).toContainText('跟随当前阅读位置');

  await page.goto(otherBookHref);
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByLabel('朗读模式状态')).toContainText('跟随当前阅读位置');
  await expect(page.getByLabel('朗读模式状态')).not.toContainText('已锁定朗读目标');
  await expect(currentTargetPanel).not.toContainText('Depth line');
});

test('reader restores dedicated tts read-aloud mode per book across reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
    window.localStorage.removeItem('br1.reader.tts.mode:/samples/sample-book.epub');
    window.localStorage.removeItem('br1.reader.tts.mode:/samples/sample-book.txt');
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '朗读模式模式归属持久化测试',
    workspace: 'tts'
  }).toString()}`;
  const otherBookHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.txt',
    label: '另一册朗读模式模式测试',
    workspace: 'tts'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: '朗读原文' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '朗读译文' }).click();
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('朗读模式状态')).toContainText('译文朗读');

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('朗读模式状态')).toContainText('译文朗读');

  await page.goto(otherBookHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: '朗读原文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('朗读模式状态')).toContainText('原文朗读');
});

test('reader restores dedicated translation archive selection from route state in web mode', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const selectionStorageKey = `br1.reader.assistance.selection:${sourceUrl}`;
  const selectedTranslationEntryId = 'assist-translation-route-2';
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: '路由翻译历史选中测试',
    workspace: 'translation',
    ta: selectedTranslationEntryId
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey, selectionKey }) => {
      window.localStorage.removeItem('br1.reader.notebook-shell');
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-translation-route-1',
            request: {
              kind: 'translation',
              provider: 'deepl',
              text: 'Bridge reading keeps the text in focus.',
              targetLanguage: 'zh',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-route-result-1',
              provider: 'deepl',
              title: '第二章',
              body: '桥接式阅读让正文保持在中心位置。',
              sourceLabel: 'DeepL',
              createdAt: 20
            },
            error: '',
            createdAt: 20,
            updatedAt: 20
          },
          {
            id: 'assist-translation-route-2',
            request: {
              kind: 'translation',
              provider: 'yandex',
              text: 'Reader-owned route state should restore the archived translation.',
              targetLanguage: 'en',
              chapterLabel: '第三章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-route-result-2',
              provider: 'yandex',
              title: '第三章',
              body: 'Reader-owned route state should restore the archived translation.',
              sourceLabel: 'Yandex',
              createdAt: 30
            },
            error: '',
            createdAt: 30,
            updatedAt: 30
          }
        ])
      );
      window.localStorage.setItem(
        selectionKey,
        JSON.stringify({
          lookupHistoryEntryId: '',
          translationHistoryEntryId: ''
        })
      );
    },
    { historyKey: historyStorageKey, selectionKey: selectionStorageKey }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*workspace=translation(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*ta=assist-translation-route-2(?:&|$)/);

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  const translationHistoryLane = notebook.getByLabel('最近翻译');
  await expect(translationHistoryLane.locator('.assist-history-status-badge')).toHaveText(
    '当前正在查看'
  );
  await expect(notebook.getByLabel('当前正在查看的 AI 记录')).toContainText(
    'Reader-owned route state should restore the archived translation.'
  );
  await expect(notebook.locator('.assist-result')).toContainText('历史记录 · 第三章 · 译为 EN');

  await page
    .getByLabel('翻译模式朗读去向')
    .getByRole('button', { name: '在朗读模式中查看' })
    .click();
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(page).toHaveURL(/\/reader\?.*workspace=tts(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*tts=translated(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*ta=assist-translation-route-2(?:&|$)/);
  await expect(notebook.getByLabel('译文朗读来源')).toContainText('历史记录 · 第三章 · 译为 EN');
  await expect(notebook.getByLabel('译文朗读来源')).toContainText(
    'Reader-owned route state should restore the archived translation.'
  );

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page).toHaveURL(/\/reader\?.*workspace=tts(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*tts=translated(?:&|$)/);
  await expect(page).toHaveURL(/\/reader\?.*ta=assist-translation-route-2(?:&|$)/);
  await expect(page.getByRole('region', { name: '阅读中的朗读控制条' })).toContainText(
    '历史译文 · Yandex'
  );
  await expect(notebook.getByLabel('译文朗读来源')).toContainText('历史记录 · 第三章 · 译为 EN');

  await notebook.getByRole('tab', { name: '笔记' }).click();
  await expect(page.getByRole('tab', { name: '笔记', selected: true })).toBeVisible();
  await expect(page).not.toHaveURL(/\/reader\?.*workspace=/);
  await expect(page).not.toHaveURL(/\/reader\?.*ta=/);
});

test('reader can switch translated playback back to source from translation mode in web mode', async ({
  page
}) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '翻译模式切回原文朗读测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: '打开翻译模式' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '打开翻译模式' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  const translationPlaybackStrip = page.getByLabel('翻译模式朗读去向');
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible();
  await expect(translationPlaybackStrip).toContainText('可直接切到朗读译文');
  await translationPlaybackStrip.getByRole('button', { name: '在朗读模式中查看' }).click();

  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('tab', { name: '翻译模式' }).click();
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible();
  await expect(translationPlaybackStrip).toContainText('当前朗读会复用这条翻译来源');
  await translationPlaybackStrip.getByRole('button', { name: '切换到朗读原文' }).click();
  await expect(translationPlaybackStrip).toContainText('可直接切到朗读译文');
  await expect(translationPlaybackStrip.getByRole('button', { name: '切换到朗读原文' })).toHaveCount(0);
  await expect(translationPlaybackStrip.getByRole('button', { name: '在朗读模式中查看' })).toBeVisible();

  await page.getByRole('tab', { name: '朗读模式' }).click();
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '朗读原文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(notebook.getByLabel('朗读模式状态')).toContainText('原文朗读');

  await page.getByRole('tab', { name: '翻译模式' }).click();
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible();
  await translationPlaybackStrip.getByRole('button', { name: '在朗读模式中查看' }).click();
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(notebook.getByLabel('朗读模式状态')).toContainText('译文朗读');
});

test('reader can open tts mode as a dedicated notebook tab', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '朗读模式测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('打开朗读模式')).toBeVisible({ timeout: 15000 });
  const miniBar = page.getByRole('region', { name: '阅读中的朗读控制条' });
  await expect(miniBar).toBeVisible();
  await expect(miniBar).toContainText('空闲');
  await expect(miniBar).toContainText('原文朗读');
  await expect(miniBar).toContainText('第 1 / 3 节');

  await page.getByLabel('打开朗读模式').click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(notebook.getByText('把朗读从 header 的瞬时按钮收成显式阅读模式，让目标、跟随状态和会话控制都可见。')).toBeVisible();
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('朗读状态：');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('跟随：');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('朗读原文');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('朗读目标：');
  await expect(page.getByLabel('朗读模式状态')).toContainText('跟随当前阅读位置');
  await expect(page.getByLabel('朗读模式状态')).toContainText('原文朗读');
  await expect(page.getByRole('button', { name: '朗读原文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: '朗读译文' }).click();
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('朗读译文');
  await expect(page.getByLabel('朗读模式状态')).toContainText('译文朗读');
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(notebook.getByRole('region', { name: '朗读模式' })).toContainText('正在跟随当前章节');
  await expect(notebook.getByRole('region', { name: '朗读模式' })).toContainText('第 1 / 3 节');
  await expect(notebook.getByRole('article', { name: '朗读位置' })).toContainText('第 1 / 3 节');
  await expect(notebook.getByLabel('译文朗读来源')).toContainText('正在跟随当前章节');
  await expect(notebook.getByLabel('译文朗读来源')).toContainText('第 1 / 3 节');
  await expect(page.getByRole('button', { name: '在翻译模式中查看' })).toBeVisible();
  const lockTtsTargetButton = page.getByRole('button', { name: '锁定当前朗读目标' });
  await expect(lockTtsTargetButton).toBeVisible();
  await expect(notebook.locator('.tts-panel strong', { hasText: '当前朗读目标' })).toBeVisible();
  await expect(notebook.locator('.tts-panel strong', { hasText: '会话状态' })).toBeVisible();
  if (await lockTtsTargetButton.isEnabled()) {
    await lockTtsTargetButton.click();
    await expect(page.getByLabel('笔记工作台摘要')).toContainText('已固定：');
    await expect(page.getByLabel('朗读模式状态')).toContainText('已锁定朗读目标');
    await expect(page.getByRole('button', { name: '回到当前阅读位置' })).toBeVisible();
    await page.getByRole('button', { name: '回到当前阅读位置' }).click();
    await expect(page.getByLabel('笔记工作台摘要')).toContainText('跟随：');
    await expect(page.getByLabel('朗读模式状态')).toContainText('跟随当前阅读位置');
  } else {
    await expect(page.getByLabel('笔记工作台摘要')).toContainText('朗读目标：等待译文结果');
    await expect(lockTtsTargetButton).toBeDisabled();
    await page.getByLabel('收起笔记工作台').click();
    await expect(page.getByRole('complementary', { name: '笔记工作台已收起', exact: true })).toBeVisible();
    await expect(miniBar).toBeVisible();
    await expect(miniBar).toContainText('等待译文结果');
    await expect(miniBar).toContainText('正在跟随当前章节');
    await expect(miniBar).toContainText('第 1 / 3 节');
    await miniBar.getByRole('button', { name: '切换到朗读原文' }).click();
    await expect(miniBar).toContainText('原文朗读');
    await miniBar.getByRole('button', { name: '切换到朗读译文' }).click();
    await expect(miniBar).toContainText('译文朗读');
    await miniBar.getByRole('button', { name: '在翻译模式中查看' }).click();
    await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible();
    await expect(page.getByLabel('翻译模式阅读来源状态')).toContainText('正在跟随当前章节');
    await notebook.getByRole('tab', { name: '朗读模式' }).click();
    await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  }
  await page.getByRole('button', { name: '朗读原文' }).click();
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('朗读原文');
  await expect(page.getByLabel('朗读模式状态')).toContainText('原文朗读');
  await notebook.getByRole('tab', { name: '笔记' }).click();
  await expect(notebook.getByRole('tab', { name: '笔记', selected: true })).toBeVisible();
  await expect(miniBar).toBeVisible();
  await miniBar.getByRole('button', { name: '打开朗读工作台' }).click();
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
});

test('reader uses visible plain-text excerpts as the source tts target in web mode', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.txt',
    label: 'TXT 朗读摘录测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '打开朗读模式' }).click();
  await page.getByRole('button', { name: '朗读原文' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  const ttsRegion = notebook.getByRole('region', { name: '朗读模式' });
  const currentTargetPanel = ttsRegion.locator('.tts-panel').first();
  const lockTtsTargetButton = page.getByRole('button', { name: '锁定当前朗读目标' });
  const miniBar = page.getByRole('region', { name: '阅读中的朗读控制条' });
  await expect(miniBar).toContainText('原文朗读');
  await expect(miniBar).toContainText('当前阅读位置');
  await expect(miniBar).toContainText('正文摘录');
  await expect(currentTargetPanel).toContainText(
    'This plain text file exists to verify the current P0-1 downgrade contract.'
  );
  await expect(currentTargetPanel).toContainText('当前阅读位置');
  await expect(ttsRegion.getByRole('article', { name: '朗读位置' })).toContainText('第 1 /');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('正文摘录');
  await expect(miniBar).toContainText('正文摘录');

  await page.locator('.plain-text-surface').evaluate((element) => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) {
      throw new Error('expected the TXT fixture to produce a scrollable plain-text surface');
    }
    element.scrollTop = maxScroll * 0.82;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });

  await expect(currentTargetPanel).toContainText('Depth line');
  await expect(currentTargetPanel).not.toContainText(
    'This plain text file exists to verify the current P0-1 downgrade contract.'
  );
  await expect(ttsRegion.getByRole('article', { name: '朗读位置' })).toContainText('%');
  await expect(lockTtsTargetButton).toBeVisible();

  if (await lockTtsTargetButton.isEnabled()) {
    await page.getByLabel('收起笔记工作台').click();
    await expect(page.getByRole('complementary', { name: '笔记工作台已收起', exact: true })).toBeVisible();
    const miniBarPinTargetButton = miniBar.getByRole('button', { name: '锁定当前朗读目标' });
    await expect(miniBarPinTargetButton).toBeVisible();
    await miniBarPinTargetButton.click();
    await expect(miniBarPinTargetButton).toHaveCount(0);
    await miniBar.getByRole('button', { name: '打开朗读工作台' }).click();
    await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
    await expect(page.getByLabel('朗读模式状态')).toContainText('已锁定朗读目标');
    await page.locator('.plain-text-surface').evaluate((element) => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    const backToTtsLocationButton = ttsRegion.getByRole('button', { name: '回到朗读位置' });
    const miniBarBackToTtsLocationButton = miniBar.getByRole('button', { name: '回到朗读位置' });
    await expect(backToTtsLocationButton).toBeVisible();
    await expect(miniBarBackToTtsLocationButton).toBeVisible();
    await expect(page.getByLabel('笔记工作台摘要')).toContainText('可回到朗读位置');
    await expect(ttsRegion.getByRole('article', { name: '朗读位置' })).toContainText('已固定到较早的朗读位置');
    await expect(ttsRegion.locator('.tts-panel').last()).toContainText('当前阅读已经离开朗读位置');
    await page.getByLabel('收起笔记工作台').click();
    await expect(page.getByRole('complementary', { name: '笔记工作台已收起', exact: true })).toBeVisible();
    const miniBarResumeFollowingButton = miniBar.getByRole('button', { name: '回到当前阅读位置' });
    await expect(miniBarResumeFollowingButton).toBeVisible();
    await miniBarResumeFollowingButton.click();
    await expect(miniBarResumeFollowingButton).toHaveCount(0);
    await expect(miniBarBackToTtsLocationButton).toHaveCount(0);
    await miniBar.getByRole('button', { name: '打开朗读工作台' }).click();
    await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
    await expect(page.getByLabel('朗读模式状态')).toContainText('跟随当前阅读位置');
    await expect(page.getByRole('button', { name: '回到当前阅读位置' })).toHaveCount(0);
    await expect(backToTtsLocationButton).toHaveCount(0);
    await expect(miniBarBackToTtsLocationButton).toHaveCount(0);
    await expect(page.getByLabel('笔记工作台摘要')).not.toContainText('可回到朗读位置');
    await expect(ttsRegion.locator('.tts-panel').last()).not.toContainText('当前阅读已经离开朗读位置');
  }
});

test('reader uses current chapter body excerpts as the EPUB source tts target in web mode', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  await page.goto('/');
  await page.evaluate((bookUrl) => {
    window.localStorage.removeItem('br1.reader.notebook-shell');
    window.localStorage.removeItem(`br1.reader.tts.ownership:${bookUrl}`);
    window.localStorage.removeItem(`br1.reader.tts.mode:${bookUrl}`);
    window.localStorage.removeItem(`br1.reader.tts.translated-owner:${bookUrl}`);
    window.localStorage.removeItem(`br1.reader.assistance.history:${bookUrl}`);
    window.localStorage.removeItem(`br1.reader.assistance.selection:${bookUrl}`);
    window.localStorage.removeItem(`br1.reader.translation.mode:${bookUrl}`);
    window.localStorage.removeItem(`br1.reader.translation.ownership:${bookUrl}`);
    window.localStorage.removeItem(`br1.reader.translation.live-result:${bookUrl}`);
    window.localStorage.removeItem(`br1.reader.tts.translated-live:${bookUrl}`);
  });
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: 'EPUB 朗读摘录测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '打开朗读模式' }).click();
  await page.getByRole('button', { name: '朗读原文' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  const ttsRegion = notebook.getByRole('region', { name: '朗读模式' });
  const currentTargetPanel = ttsRegion.locator('.tts-panel').first();
  const miniBar = page.getByRole('region', { name: '阅读中的朗读控制条' });

  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(currentTargetPanel).toContainText(
    'This prototype demonstrates a simple EPUB reading assistant.'
  );
  await expect(currentTargetPanel).toContainText('当前章节正文');
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('正文摘录');
  await expect(miniBar).toContainText('正文摘录');
  await expect(miniBar).toContainText('当前章节正文');
});

test('reader tts workspace exposes mature playback controls in web mode', async ({ page }) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book&workspace=tts'
  );

  const ttsRegion = page.getByRole('region', { name: '朗读模式' });
  await expect(ttsRegion.getByRole('region', { name: '播放控制' })).toBeVisible();
  await expect(ttsRegion.getByRole('slider', { name: '朗读速度' })).toBeVisible();
  await expect(ttsRegion.getByRole('button', { name: '定时关闭' })).toBeVisible();
  await expect(ttsRegion.getByText('正文多段分段还没有接入这条 route-local 队列')).toBeVisible();
});

test('reader lets translated tts mode consume the selected translation archive in web mode', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const selectionStorageKey = `br1.reader.assistance.selection:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: '译文朗读历史接管测试'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey, selectionKey }) => {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-translation-tts-1',
            request: {
              kind: 'translation',
              provider: 'deepl',
              text: 'Bridge reading keeps the text in focus.',
              targetLanguage: 'zh',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-tts-result-1',
              provider: 'deepl',
              title: '第二章',
              body: '桥接式阅读让正文保持在中心位置。',
              sourceLabel: 'DeepL',
              createdAt: 20
            },
            error: '',
            createdAt: 20,
            updatedAt: 20
          }
        ])
      );
      window.localStorage.setItem(
        selectionKey,
        JSON.stringify({
          lookupHistoryEntryId: '',
          translationHistoryEntryId: 'assist-translation-tts-1'
        })
      );
    },
    { historyKey: historyStorageKey, selectionKey: selectionStorageKey }
  );

  await page.goto(readerHref);

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  if (!(await notebook.isVisible().catch(() => false))) {
    await expect(page.getByRole('button', { name: '打开朗读模式' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: '打开朗读模式' }).click();
  }
  await expect(notebook).toBeVisible();
  await page.getByRole('button', { name: '朗读译文' }).click();
  await expect(page.getByLabel('笔记工作台摘要')).toContainText('朗读译文');
  await expect(page.getByLabel('朗读模式状态')).toContainText('译文朗读');
  await expect(page.getByRole('region', { name: '阅读中的朗读控制条' })).toContainText('历史译文 · DeepL');
  await expect(notebook.getByText('当前还没有可朗读的译文结果。')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '锁定当前朗读目标' })).toBeEnabled();
  await expect(notebook.getByLabel('译文朗读来源')).toContainText('历史记录 · 第二章 · 译为 ZH');
  await expect(notebook.getByLabel('译文朗读来源')).toContainText(
    'Bridge reading keeps the text in focus.'
  );
  await page.getByLabel('收起笔记工作台').click();
  const miniBar = page.getByRole('region', { name: '阅读中的朗读控制条' });
  await expect(miniBar).toContainText('历史译文 · DeepL');
  await miniBar.getByRole('button', { name: '切换到朗读原文' }).click();
  await expect(miniBar).toContainText('原文朗读');
  await miniBar.getByRole('button', { name: '切换到朗读译文' }).click();
  await expect(miniBar).toContainText('译文朗读');
  await miniBar.getByRole('button', { name: '在翻译模式中查看' }).click();
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible();
  await expect(notebook.getByLabel('最近翻译').locator('.assist-history-status-badge')).toHaveText(
    '当前正在查看'
  );
  await expect(page.getByLabel('翻译模式朗读去向')).toContainText('当前朗读会复用这条历史译文来源');
  await page.getByLabel('翻译模式朗读去向').getByRole('button', { name: '在朗读模式中查看' }).click();
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('朗读模式状态')).toContainText('译文朗读');
  await page.reload();
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('朗读模式状态')).toContainText('译文朗读');
  await expect(page.getByRole('region', { name: '阅读中的朗读控制条' })).toContainText('历史译文 · DeepL');
});

test('reader preserves live translated tts ownership over archive selection across reload', async ({
  page
}) => {
  const sourceUrl = '/samples/sample-book.epub';
  const historyStorageKey = `br1.reader.assistance.history:${sourceUrl}`;
  const selectionStorageKey = `br1.reader.assistance.selection:${sourceUrl}`;
  const translationOwnershipStorageKey = `br1.reader.translation.ownership:${sourceUrl}`;
  const translatedTtsOwnerStorageKey = `br1.reader.tts.translated-owner:${sourceUrl}`;
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: sourceUrl,
    label: '译文朗读 live owner 恢复测试',
    workspace: 'tts',
    tts: 'translated'
  }).toString()}`;

  await page.addInitScript(
    ({ historyKey, selectionKey, translationOwnershipKey, translatedTtsOwnerKey }) => {
      window.localStorage.removeItem('br1.reader.notebook-shell');
      window.localStorage.removeItem('br1.reader.tts.mode:/samples/sample-book.epub');
      window.localStorage.setItem(
        historyKey,
        JSON.stringify([
          {
            id: 'assist-translation-archive-1',
            request: {
              kind: 'translation',
              provider: 'deepl',
              text: 'Archive-owned translation text.',
              targetLanguage: 'zh',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-archive-result-1',
              provider: 'deepl',
              title: '第二章',
              body: '这是历史译文所有者。',
              sourceLabel: 'DeepL',
              createdAt: 10
            },
            error: '',
            createdAt: 10,
            updatedAt: 10
          },
          {
            id: 'assist-translation-live-1',
            request: {
              kind: 'translation',
              provider: 'deepl',
              text: 'Live owner translation source text.',
              targetLanguage: 'zh',
              chapterLabel: '第二章',
              bookKey: '/samples/sample-book.epub'
            },
            status: 'ready',
            result: {
              id: 'assist-translation-live-result-1',
              provider: 'deepl',
              title: '第二章',
              body: '这是当前译文所有者。',
              sourceLabel: 'DeepL',
              createdAt: 20
            },
            error: '',
            createdAt: 20,
            updatedAt: 20
          }
        ])
      );
      window.localStorage.setItem(
        selectionKey,
        JSON.stringify({
          lookupHistoryEntryId: '',
          translationHistoryEntryId: 'assist-translation-archive-1'
        })
      );
      window.localStorage.setItem(
        translationOwnershipKey,
        JSON.stringify({
          followsCurrentSource: false,
          pinnedSource: {
            text: 'Live owner translation source text.',
            label: '当前翻译目标',
            chapterLabel: '第二章'
          }
        })
      );
      window.localStorage.setItem(translatedTtsOwnerKey, 'live');
    },
    {
      historyKey: historyStorageKey,
      selectionKey: selectionStorageKey,
      translationOwnershipKey: translationOwnershipStorageKey,
      translatedTtsOwnerKey: translatedTtsOwnerStorageKey
    }
  );

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/workspace=tts/);
  await expect(page).toHaveURL(/tts=translated/);
  await expect(page).not.toHaveURL(/(?:\?|&)ta=/);
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: '阅读中的朗读控制条' })).toContainText('译文朗读');
  await expect(page.getByRole('region', { name: '阅读中的朗读控制条' })).not.toContainText('历史译文');
  await expect(notebook.getByText('这是当前译文所有者。')).toBeVisible();
  await expect(notebook.getByLabel('译文朗读来源')).toContainText('已锁定当前翻译目标');

  await page.evaluate((historyKey) => {
    window.localStorage.setItem(
      historyKey,
      JSON.stringify([
        {
          id: 'assist-translation-archive-1',
          request: {
            kind: 'translation',
            provider: 'deepl',
            text: 'Archive-owned translation text.',
            targetLanguage: 'zh',
            chapterLabel: '第二章',
            bookKey: '/samples/sample-book.epub'
          },
          status: 'ready',
          result: {
            id: 'assist-translation-archive-result-1',
            provider: 'deepl',
            title: '第二章',
            body: '这是历史译文所有者。',
            sourceLabel: 'DeepL',
            createdAt: 10
          },
          error: '',
          createdAt: 10,
          updatedAt: 10
        }
      ])
    );
  }, historyStorageKey);

  await page.reload();

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible({
    timeout: 15000
  });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('button', { name: '朗读译文' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: '阅读中的朗读控制条' })).toContainText('译文朗读');
  await expect(page.getByRole('region', { name: '阅读中的朗读控制条' })).not.toContainText('历史译文');
  await expect(notebook.getByText('这是当前译文所有者。')).toBeVisible();
  await expect(notebook.getByLabel('译文朗读来源')).toContainText('已锁定当前翻译目标');
});

test('reader can open sync workspace inside the notebook shell', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '同步工作台测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: '打开同步工作台' })).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: '打开同步工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('tab', { name: '同步工作台', selected: true })).toBeVisible();
  await expect(
    notebook.getByText('把 KOReader 交换文件和远端进度控制从 library 菜单抬到 reader notebook，让同步成为显式阅读工作流。')
  ).toBeVisible();
  await expect(page.getByLabel('同步工作台状态')).toContainText('当前环境不支持桌面同步');
  await expect(page.getByLabel('当前图书同步就绪状态')).toContainText(
    '当前环境不是桌面端，所以这里只能展示同步状态，不能执行导出。'
  );
  await expect(page.getByLabel('整库同步就绪状态')).toContainText(
    '当前环境不是桌面端，所以这里只能展示整库同步边界，不能执行交换文件导入或远端进度同步。'
  );
  await expect(page.getByLabel('当前图书同步状态时间线')).toContainText(
    '当前书还没有发生过导出动作。'
  );
  await expect(page.getByLabel('整库同步状态时间线')).toContainText(
    '整库同步还没有留下最近动作。'
  );
  await expect(notebook.getByText('当前图书已有 KOReader-compatible locator。')).toHaveCount(0);
  await expect(notebook.getByText('最近动作 ·')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '导出当前图书 KOReader 交换文件' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '推送 KOReader 阅读进度' })).toBeDisabled();
});

test('catalog route explains the desktop-owned boundary in web mode', async ({ page }) => {
  await page.goto('/catalogs');

  await expect(page.getByRole('heading', { name: '书源目录' })).toBeVisible();
  await expect(page.getByLabel('书源连接器状态')).toBeVisible();
  await expect(page.getByText('当前环境不会直接发起 live catalog 抓取；桌面端负责所有安全 browse/search/import 调用。')).toBeVisible();
  await expect(page.getByLabel('书源设置').getByText('先选择一个书源。')).toBeVisible();
  await expect(page.getByText('导入动作始终在桌面端完成，renderer 不直接下载 acquisition 链接。')).toBeVisible();
});

test('reader opens txt assets in web mode', async ({ page }) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  const footer = page.getByLabel('阅读页脚控制');

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(footer).toContainText('TXT');
  await expect(footer).toContainText('滚动');
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();
  await expect(page.getByText(/This plain text file exists to verify/i)).toBeVisible();
});

test('reader focused-reading overlay supports keyboard transport in web mode', async ({ page }) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();
  const paragraphOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(paragraphOverlay).toBeVisible();
  await expect(paragraphOverlay).toContainText('段落聚焦');
  await expect(paragraphOverlay).toContainText(
    'This plain text file exists to verify'
  );
  await expect(paragraphOverlay.getByText('Esc 退出专注阅读')).toBeVisible();
  await expect(paragraphOverlay.getByText('Space 暂停')).toHaveCount(0);
  await paragraphOverlay.press('Escape');
  await expect(paragraphOverlay).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开 RSVP-lite' }).click();
  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const progress = overlay.getByLabel('RSVP-lite 进度');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('RSVP-lite');
  await expect(overlay.getByLabel('RSVP-lite 当前词')).toBeVisible();
  await expect(overlay.getByRole('button', { name: '暂停自动播放' })).toBeVisible();
  await expect(overlay.getByText('Space 暂停 / 继续')).toBeVisible();
  await expect(overlay.getByText('← → 上一个 / 下一个')).toBeVisible();
  await expect(overlay.getByText('↑ ↓ 更快 / 更慢')).toBeVisible();
  await expect(progress).toContainText(/1 \/ \d+/);
  const initialProgress = ((await progress.textContent()) ?? '').trim();
  await expect
    .poll(async () => ((await progress.textContent()) ?? '').trim(), { timeout: 8000 })
    .not.toBe(initialProgress);

  await overlay.press('Space');
  const pausedProgress = ((await progress.textContent()) ?? '').trim();
  const [pausedWordIndexText = '0', pausedWordTotalText = '0'] = pausedProgress
    .split('/')
    .map((value) => value.trim());
  const pausedWordIndex = Number.parseInt(pausedWordIndexText, 10);
  const pausedWordTotal = Number.parseInt(pausedWordTotalText, 10);
  await page.waitForTimeout(700);
  await expect(progress).toHaveText(pausedProgress);
  await expect(overlay).toContainText('240 词/分钟');
  await overlay.press('ArrowUp');
  await expect(overlay).toContainText('280 词/分钟');
  const fasterButton = overlay.getByRole('button', { name: '更快' });
  await fasterButton.focus();
  await fasterButton.press('Space');
  await expect(overlay).toContainText('320 词/分钟');
  await overlay.press('ArrowRight');
  await expect(progress).toContainText(
    new RegExp(`${Math.min(pausedWordIndex + 1, pausedWordTotal)} \\/ ${pausedWordTotal}`)
  );
  await overlay.press('ArrowLeft');
  await expect(progress).toContainText(new RegExp(`${pausedWordIndex} \\/ ${pausedWordTotal}`));
  await overlay.press('ArrowDown');
  await expect(overlay).toContainText('280 词/分钟');
  await overlay.press('ArrowDown');
  await expect(overlay).toContainText('240 词/分钟');
  await overlay.press('Space');
  await expect
    .poll(async () => ((await progress.textContent()) ?? '').trim(), { timeout: 8000 })
    .not.toBe(pausedProgress);
  await overlay.press('Escape');
  await expect(overlay).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-outline.pdf&label=Sample%20Outline%20PDF'
  );
  await expect(page.getByLabel('reader stage').getByText(/^PDF$/)).toBeVisible();
  await expect(page.getByLabel('当前阅读状态').getByText('第 1 / 4 页')).toBeVisible();
  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();
  const unsupportedOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(unsupportedOverlay).toBeVisible();
  await expect(unsupportedOverlay).toContainText('PDF 正文暂时不能进入专注阅读');
});

test('reader focused-reading overlay shows chapter and progress context in web mode', async ({
  page
}) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();

  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const context = overlay.getByLabel('当前阅读上下文');
  await expect(overlay).toContainText('段落聚焦');
  await expect(context).toContainText('当前阅读位置');
  await expect(context).toContainText('0%');
  await expect(context).toContainText('摘录来源');
  await expect(context).toContainText('进度');
  await expect(context).not.toContainText('txt:');
});

test('reader can switch focused-reading modes on the same excerpt in web mode', async ({ page }) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();

  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const sameExcerptHint = '保持当前摘录，不重新抓取正文。';
  await expect(overlay).toContainText('段落聚焦');
  await expect(overlay).toContainText('This plain text file exists to verify');
  await expect(overlay.getByText(sameExcerptHint)).toBeVisible();

  await overlay.getByRole('button', { name: '切换到 RSVP-lite' }).click();
  await expect(overlay).toContainText('RSVP-lite');
  await expect(overlay).toContainText('This plain text file exists to verify');

  const pauseButton = overlay.getByRole('button', { name: '暂停自动播放' });
  await expect(pauseButton).toBeVisible();
  await pauseButton.click();

  const progress = overlay.getByLabel('RSVP-lite 进度');
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await expect(progress).toContainText(/2 \/ \d+/);

  await overlay.getByRole('button', { name: '从第 1 词重新开始' }).click();
  await expect(progress).toContainText(/1 \/ \d+/);
  await expect(overlay.getByRole('button', { name: '继续自动播放' })).toBeVisible();

  await overlay.getByRole('button', { name: '切换到段落聚焦' }).click();
  await expect(overlay).toContainText('段落聚焦');
  await expect(overlay).toContainText('This plain text file exists to verify');
  await expect(overlay.getByRole('button', { name: '切换到 RSVP-lite' })).toBeVisible();
  await expect(overlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);
});

test('reader preserves same-excerpt rsvp play-pause intent across paragraph detours in web mode', async ({
  page
}) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开 RSVP-lite' }).click();

  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const progress = overlay.getByLabel('RSVP-lite 进度');
  await expect(overlay).toContainText('RSVP-lite');

  await overlay.getByRole('button', { name: '暂停自动播放' }).click();
  await overlay.getByRole('button', { name: '更快' }).click();
  await expect(overlay).toContainText('280 词/分钟');
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await expect(progress).toContainText(/3 \/ \d+/);

  await overlay.getByRole('button', { name: '切换到段落聚焦' }).click();
  await expect(overlay).toContainText('段落聚焦');
  await expect(overlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);

  await overlay.getByRole('button', { name: '切换到 RSVP-lite' }).click();
  await expect(overlay).toContainText('RSVP-lite');
  await expect(progress).toContainText(/3 \/ \d+/);
  await expect(overlay).toContainText('280 词/分钟');
  await expect(overlay.getByRole('button', { name: '继续自动播放' })).toBeVisible();
  await expect(overlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);

  await overlay.getByRole('button', { name: '从第 1 词重新开始' }).click();
  await expect(progress).toContainText(/1 \/ \d+/);
  await expect(overlay.getByRole('button', { name: '继续自动播放' })).toBeVisible();

  await overlay.getByRole('button', { name: '切换到段落聚焦' }).click();
  await overlay.getByRole('button', { name: '切换到 RSVP-lite' }).click();
  await expect(progress).toContainText(/1 \/ \d+/);
  await expect(overlay).toContainText('280 词/分钟');
  await expect(overlay.getByRole('button', { name: '继续自动播放' })).toBeVisible();
  await expect(overlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);
});

test('reader restores focused reading position for supported text surfaces', async ({ page }) => {
  const bookUrl = '/samples/sample-book.txt';
  await page.addInitScript((key) => {
    const resetMarker = `br1.reader.focused-reading-reset:${key}`;
    if (!window.sessionStorage.getItem(resetMarker)) {
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem(resetMarker, '1');
    }
  }, `br1.reader.focused-reading:${bookUrl}`);

  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开 RSVP-lite' }).click();
  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(overlay).toBeVisible();
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await expect(overlay.getByLabel('RSVP-lite 进度')).toContainText(/2 \/ \d+/);

  await page.reload();

  const restoredOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(restoredOverlay).toBeVisible();
  await expect(restoredOverlay).toContainText('RSVP-lite');
  await expect(restoredOverlay.getByLabel('RSVP-lite 进度')).toContainText(/2 \/ \d+/);
  await expect(restoredOverlay).toContainText('This plain text file exists to verify');
});

test('reader preserves same-excerpt rsvp return state across paragraph-mode reloads in web mode', async ({
  page
}) => {
  const bookUrl = '/samples/sample-book.txt';
  await page.addInitScript((key) => {
    const resetMarker = `br1.reader.focused-reading-reset:${key}`;
    if (!window.sessionStorage.getItem(resetMarker)) {
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem(resetMarker, '1');
    }
  }, `br1.reader.focused-reading:${bookUrl}`);

  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开 RSVP-lite' }).click();

  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const progress = overlay.getByLabel('RSVP-lite 进度');
  await expect(overlay).toContainText('RSVP-lite');

  await overlay.getByRole('button', { name: '暂停自动播放' }).click();
  await overlay.getByRole('button', { name: '更快' }).click();
  await expect(overlay).toContainText('280 词/分钟');
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await expect(progress).toContainText(/3 \/ \d+/);

  await overlay.getByRole('button', { name: '切换到段落聚焦' }).click();
  await expect(overlay).toContainText('段落聚焦');
  await expect(overlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);

  await page.reload();

  const restoredOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const restoredProgress = restoredOverlay.getByLabel('RSVP-lite 进度');
  await expect(restoredOverlay).toBeVisible();
  await expect(restoredOverlay).toContainText('段落聚焦');
  await expect(restoredOverlay).toContainText('This plain text file exists to verify');
  await expect(restoredOverlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);

  await restoredOverlay.getByRole('button', { name: '切换到 RSVP-lite' }).click();
  await expect(restoredOverlay).toContainText('RSVP-lite');
  await expect(restoredProgress).toContainText(/3 \/ \d+/);
  await expect(restoredOverlay).toContainText('280 词/分钟');
  await expect(restoredOverlay.getByRole('button', { name: '继续自动播放' })).toBeVisible();
  await expect(restoredOverlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);
});

test('reader reopens the last focused-reading excerpt after exit in web mode', async ({ page }) => {
  const bookUrl = '/samples/sample-book.txt';
  await page.addInitScript((key) => {
    const resetMarker = `br1.reader.focused-reading-reset:${key}`;
    if (!window.sessionStorage.getItem(resetMarker)) {
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem(resetMarker, '1');
    }
  }, `br1.reader.focused-reading:${bookUrl}`);

  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开 RSVP-lite' }).click();

  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const progress = overlay.getByLabel('RSVP-lite 进度');
  await expect(overlay).toContainText('RSVP-lite');
  await overlay.getByRole('button', { name: '暂停自动播放' }).click();
  await overlay.getByRole('button', { name: '更快' }).click();
  await expect(overlay).toContainText('280 词/分钟');
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await expect(progress).toContainText(/3 \/ \d+/);
  await expect(overlay).toContainText('This plain text file exists to verify');

  await overlay.getByRole('button', { name: '退出专注阅读' }).click();
  await expect(overlay).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开 RSVP-lite' }).click();

  const reopenedOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(reopenedOverlay).toBeVisible();
  await expect(reopenedOverlay).toContainText('RSVP-lite');
  await expect(reopenedOverlay).toContainText('This plain text file exists to verify');
  await expect(reopenedOverlay).toContainText('280 词/分钟');
  await expect(reopenedOverlay.getByLabel('RSVP-lite 进度')).toContainText(/3 \/ \d+/);
  await expect(reopenedOverlay.getByRole('button', { name: '继续自动播放' })).toBeVisible();
  await expect(reopenedOverlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);
});

test('reader reopens paragraph focus on the hidden excerpt after exit in web mode', async ({
  page
}) => {
  const bookUrl = '/samples/sample-book.txt';
  await page.addInitScript((key) => {
    const resetMarker = `br1.reader.focused-reading-reset:${key}`;
    if (!window.sessionStorage.getItem(resetMarker)) {
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem(resetMarker, '1');
    }
  }, `br1.reader.focused-reading:${bookUrl}`);

  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  const readerSurface = page.getByLabel('plain text reading surface');
  await expect(readerSurface).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();

  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const hiddenExcerpt = 'This plain text file exists to verify';
  const readingProgress = page.getByLabel('阅读进度');
  await expect(overlay).toContainText('段落聚焦');
  await expect(overlay).toContainText(hiddenExcerpt);
  const startingProgress = ((await readingProgress.textContent()) ?? '').trim();

  await overlay.getByRole('button', { name: '退出专注阅读' }).click();
  await expect(overlay).toHaveCount(0);

  await page.evaluate(() => {
    const reader = document.querySelector('.plain-text-reader');
    if (!(reader instanceof HTMLElement)) {
      throw new Error('expected the plain-text reader surface to exist');
    }

    reader.scrollTop = Math.max(0, (reader.scrollHeight - reader.clientHeight) * 0.52);
    reader.dispatchEvent(new Event('scroll'));
  });
  await expect
    .poll(async () => ((await readingProgress.textContent()) ?? '').trim(), {
      message: 'expected TXT reading progress to move after scrolling before paragraph-focus reopen'
    })
    .not.toBe(startingProgress);

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();

  const reopenedOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(reopenedOverlay).toBeVisible();
  await expect(reopenedOverlay).toContainText('段落聚焦');
  await expect(reopenedOverlay).toContainText(hiddenExcerpt);
});

test('reader restores hidden focused-reading resume after exit and reload in web mode', async ({
  page
}) => {
  const bookUrl = '/samples/sample-book.txt';
  await page.addInitScript((key) => {
    const resetMarker = `br1.reader.focused-reading-reset:${key}`;
    if (!window.sessionStorage.getItem(resetMarker)) {
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem(resetMarker, '1');
    }
  }, `br1.reader.focused-reading:${bookUrl}`);

  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开 RSVP-lite' }).click();

  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const progress = overlay.getByLabel('RSVP-lite 进度');
  await expect(overlay).toContainText('RSVP-lite');
  await overlay.getByRole('button', { name: '暂停自动播放' }).click();
  await overlay.getByRole('button', { name: '更快' }).click();
  await expect(overlay).toContainText('280 词/分钟');
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await overlay.getByRole('button', { name: '下一个词' }).click();
  await expect(progress).toContainText(/3 \/ \d+/);
  await expect(overlay).toContainText('This plain text file exists to verify');

  await overlay.getByRole('button', { name: '退出专注阅读' }).click();
  await expect(overlay).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();
  await expect(page.getByRole('dialog', { name: '专注阅读浮层' })).toHaveCount(0);

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开 RSVP-lite' }).click();

  const reopenedOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(reopenedOverlay).toBeVisible();
  await expect(reopenedOverlay).toContainText('RSVP-lite');
  await expect(reopenedOverlay).toContainText('This plain text file exists to verify');
  await expect(reopenedOverlay).toContainText('280 词/分钟');
  await expect(reopenedOverlay.getByLabel('RSVP-lite 进度')).toContainText(/3 \/ \d+/);
  await expect(reopenedOverlay.getByRole('button', { name: '继续自动播放' })).toBeVisible();
  await expect(reopenedOverlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);
});

test('reader reuses the exited epub selection-owned focused-reading excerpt on reopen in web mode', async ({
  page
}) => {
  const bookUrl = '/samples/sample-book.epub';
  await page.addInitScript((key) => {
    const resetMarker = `br1.reader.focused-reading-reset:${key}`;
    if (!window.sessionStorage.getItem(resetMarker)) {
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem(resetMarker, '1');
    }
  }, `br1.reader.focused-reading:${bookUrl}`);

  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.epub&label=Sample%20EPUB%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });

  const hiddenExcerpt = 'This prototype demonstrates a simple EPUB reading assistant.';
  const readingProgress = page.getByLabel('阅读进度');
  await expect
    .poll(async () => {
      return page.evaluate((targetText) => {
        const view = document.querySelector('foliate-view') as any;
        const contents = view?.renderer?.getContents?.() ?? [];
        return contents.some(({ doc }: { doc?: Document }) =>
          Boolean(doc?.body?.textContent?.includes(targetText))
        );
      }, hiddenExcerpt);
    }, {
      message: 'expected the EPUB reader to mount the target text before building the real selection'
    })
    .toBe(true);
  const selectionToolbar = page.getByRole('toolbar', { name: '选中文本操作' });
  const highlightButton = selectionToolbar.getByRole('button', { name: '高亮' });
  const applyEpubSelection = async () =>
    page.evaluate((targetText) => {
      const view = document.querySelector('foliate-view') as any;
      const contents = view?.renderer?.getContents?.() ?? [];
      for (const { doc } of contents) {
        const candidates = Array.from(doc.body.querySelectorAll('p, li, blockquote, div')) as HTMLElement[];
        for (const candidate of candidates) {
          const candidateText = candidate.textContent?.replace(/\s+/g, ' ').trim() ?? '';
          if (!candidateText.includes(targetText)) {
            continue;
          }

          const range = doc.createRange();
          range.selectNodeContents(candidate);
          const selection = doc.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          doc.dispatchEvent(new Event('selectionchange'));
          return selection?.toString().replace(/\s+/g, ' ').trim() ?? candidateText;
        }
      }

      throw new Error(`expected the EPUB fixture text to contain "${targetText}"`);
    }, hiddenExcerpt);
  let selectedExcerpt = '';
  await expect
    .poll(async () => {
      selectedExcerpt = await applyEpubSelection();
      return await highlightButton.isVisible().catch(() => false);
    }, {
      message: 'expected the EPUB selection-owned popup to appear before opening focused reading'
    })
    .toBe(true);
  let startingProgress = '';
  await expect
    .poll(async () => {
      startingProgress = ((await readingProgress.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      return startingProgress;
    }, {
      message: 'expected EPUB footer progress to expose a human-readable percentage before opening focused reading'
    })
    .toMatch(/\d+%/);
  const startingProgressPercent = startingProgress.match(/\d+%/)?.[0] ?? '';

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();

  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const overlayContext = overlay.getByLabel('当前阅读上下文');
  const overlaySourceValue = overlayContext
    .locator('.overlay-context-item', { hasText: '摘录来源' })
    .locator('strong');
  const overlayProgressValue = overlayContext
    .locator('.overlay-context-item', { hasText: '进度' })
    .locator('strong');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('段落聚焦');
  await expect(overlay).toContainText(selectedExcerpt);
  await expect(overlayContext).toContainText('摘录来源');
  await expect(overlayContext).toContainText('进度');
  await expect(overlaySourceValue).toHaveText(/\S+/);
  const initialOverlaySourceValue = ((await overlaySourceValue.textContent()) ?? '').trim();
  expect(initialOverlaySourceValue).toMatch(/\S+/);
  expect(initialOverlaySourceValue).not.toMatch(/^(epubcfi\(|txt:|page:|pdf:)/);
  await expect(overlayProgressValue).toHaveText(startingProgressPercent);
  await expect(overlay).not.toContainText('epubcfi(');

  await overlay.getByRole('button', { name: '退出专注阅读' }).click();
  await expect(overlay).toHaveCount(0);

  await page.evaluate(async () => {
    const view = document.querySelector('foliate-view') as any;
    const contents = view?.renderer?.getContents?.() ?? [];
    for (const { doc } of contents) {
      doc.getSelection()?.removeAllRanges();
      doc.dispatchEvent(new Event('selectionchange'));
    }
    await view?.goToFraction?.(0.82);
  });
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const view = document.querySelector('foliate-view') as any;
        const contents = view?.renderer?.getContents?.() ?? [];
        return contents.every(
          ({ doc }: { doc?: Document }) => (doc?.getSelection?.()?.toString().trim() ?? '') === ''
        );
      });
    }, {
      message: 'expected the live EPUB DOM selection to be cleared before focused-reading reopen'
    })
    .toBe(true);
  await expect(selectionToolbar).toHaveCount(0);
  let movedProgress = '';
  await expect
    .poll(async () => {
      movedProgress = ((await readingProgress.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      return movedProgress;
    }, {
      message: 'expected EPUB reading progress to move after exit before focused-reading reopen'
    })
    .not.toBe(startingProgress);

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();

  const reopenedOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const reopenedContext = reopenedOverlay.getByLabel('当前阅读上下文');
  const reopenedSourceValue = reopenedContext
    .locator('.overlay-context-item', { hasText: '摘录来源' })
    .locator('strong');
  const reopenedProgressValue = reopenedContext
    .locator('.overlay-context-item', { hasText: '进度' })
    .locator('strong');
  await expect(reopenedOverlay).toBeVisible();
  await expect(reopenedOverlay).toContainText('段落聚焦');
  await expect(reopenedOverlay).toContainText(selectedExcerpt);
  await expect(reopenedContext).toContainText('摘录来源');
  await expect(reopenedContext).toContainText('进度');
  await expect(reopenedSourceValue).toHaveText(initialOverlaySourceValue);
  await expect(reopenedProgressValue).toHaveText(startingProgressPercent);
  await expect(reopenedOverlay).not.toContainText('epubcfi(');
});

test('reader reuses the exited epub selection-owned focused-reading excerpt after exit, reload, and reopen in web mode', async ({
  page
}) => {
  const bookUrl = '/samples/sample-book.epub';
  await page.addInitScript((key) => {
    const resetMarker = `br1.reader.focused-reading-reset:${key}`;
    if (!window.sessionStorage.getItem(resetMarker)) {
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem(resetMarker, '1');
    }
  }, `br1.reader.focused-reading:${bookUrl}`);

  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.epub&label=Sample%20EPUB%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });

  const hiddenExcerpt = 'This prototype demonstrates a simple EPUB reading assistant.';
  const readingProgress = page.getByLabel('阅读进度');
  await expect
    .poll(async () => {
      return page.evaluate((targetText) => {
        const view = document.querySelector('foliate-view') as any;
        const contents = view?.renderer?.getContents?.() ?? [];
        return contents.some(({ doc }: { doc?: Document }) =>
          Boolean(doc?.body?.textContent?.includes(targetText))
        );
      }, hiddenExcerpt);
    }, {
      message: 'expected the EPUB reader to mount the target text before building the real selection'
    })
    .toBe(true);
  const selectionToolbar = page.getByRole('toolbar', { name: '选中文本操作' });
  const highlightButton = selectionToolbar.getByRole('button', { name: '高亮' });
  const applyEpubSelection = async () =>
    page.evaluate((targetText) => {
      const view = document.querySelector('foliate-view') as any;
      const contents = view?.renderer?.getContents?.() ?? [];
      for (const { doc } of contents) {
        const candidates = Array.from(doc.body.querySelectorAll('p, li, blockquote, div')) as HTMLElement[];
        for (const candidate of candidates) {
          const candidateText = candidate.textContent?.replace(/\s+/g, ' ').trim() ?? '';
          if (!candidateText.includes(targetText)) {
            continue;
          }

          const range = doc.createRange();
          range.selectNodeContents(candidate);
          const selection = doc.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          doc.dispatchEvent(new Event('selectionchange'));
          return selection?.toString().replace(/\s+/g, ' ').trim() ?? candidateText;
        }
      }

      throw new Error(`expected the EPUB fixture text to contain "${targetText}"`);
    }, hiddenExcerpt);
  let selectedExcerpt = '';
  await expect
    .poll(async () => {
      selectedExcerpt = await applyEpubSelection();
      return await highlightButton.isVisible().catch(() => false);
    }, {
      message: 'expected the EPUB selection-owned popup to appear before opening focused reading'
    })
    .toBe(true);
  let startingProgress = '';
  await expect
    .poll(async () => {
      startingProgress = ((await readingProgress.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      return startingProgress;
    }, {
      message: 'expected EPUB footer progress to expose a human-readable percentage before opening focused reading'
    })
    .toMatch(/\d+%/);
  const startingProgressPercent = startingProgress.match(/\d+%/)?.[0] ?? '';

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();

  const overlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const overlayContext = overlay.getByLabel('当前阅读上下文');
  const overlaySourceValue = overlayContext
    .locator('.overlay-context-item', { hasText: '摘录来源' })
    .locator('strong');
  const overlayProgressValue = overlayContext
    .locator('.overlay-context-item', { hasText: '进度' })
    .locator('strong');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('段落聚焦');
  await expect(overlay).toContainText(selectedExcerpt);
  await expect(overlayContext).toContainText('摘录来源');
  await expect(overlayContext).toContainText('进度');
  await expect(overlaySourceValue).toHaveText(/\S+/);
  const initialOverlaySourceValue = ((await overlaySourceValue.textContent()) ?? '').trim();
  expect(initialOverlaySourceValue).toMatch(/\S+/);
  expect(initialOverlaySourceValue).not.toMatch(/^(epubcfi\(|txt:|page:|pdf:)/);
  await expect(overlayProgressValue).toHaveText(startingProgressPercent);
  await expect(overlay).not.toContainText('epubcfi(');

  await overlay.getByRole('button', { name: '退出专注阅读' }).click();
  await expect(overlay).toHaveCount(0);

  await page.evaluate(async () => {
    const view = document.querySelector('foliate-view') as any;
    const contents = view?.renderer?.getContents?.() ?? [];
    for (const { doc } of contents) {
      doc.getSelection()?.removeAllRanges();
      doc.dispatchEvent(new Event('selectionchange'));
    }
    await view?.goToFraction?.(0.82);
  });
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const view = document.querySelector('foliate-view') as any;
        const contents = view?.renderer?.getContents?.() ?? [];
        return contents.every(
          ({ doc }: { doc?: Document }) => (doc?.getSelection?.()?.toString().trim() ?? '') === ''
        );
      });
    }, {
      message: 'expected the live EPUB DOM selection to be cleared before focused-reading reopen'
    })
    .toBe(true);
  await expect(selectionToolbar).toHaveCount(0);
  let movedProgress = '';
  await expect
    .poll(async () => {
      movedProgress = ((await readingProgress.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      return movedProgress;
    }, {
      message: 'expected EPUB reading progress to move after exit before focused-reading reopen'
    })
    .not.toBe(startingProgress);

  // The reload must not depend on an open overlay or a live Foliate selection.
  // Manual reopen should still reuse the hidden same-book excerpt payload.
  await page.reload();
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('dialog', { name: '专注阅读浮层' })).toHaveCount(0);
  await expect(selectionToolbar).toHaveCount(0);
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const view = document.querySelector('foliate-view') as any;
        const contents = view?.renderer?.getContents?.() ?? [];
        return contents.every(
          ({ doc }: { doc?: Document }) => (doc?.getSelection?.()?.toString().trim() ?? '') === ''
        );
      });
    }, {
      message: 'expected the live EPUB DOM selection to stay cleared after reload before manual reopen'
    })
    .toBe(true);

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开段落聚焦' }).click();

  const reopenedOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const reopenedContext = reopenedOverlay.getByLabel('当前阅读上下文');
  const reopenedSourceValue = reopenedContext
    .locator('.overlay-context-item', { hasText: '摘录来源' })
    .locator('strong');
  const reopenedProgressValue = reopenedContext
    .locator('.overlay-context-item', { hasText: '进度' })
    .locator('strong');
  await expect(reopenedOverlay).toBeVisible();
  await expect(reopenedOverlay).toContainText('段落聚焦');
  await expect(reopenedOverlay).toContainText(selectedExcerpt);
  await expect(reopenedContext).toContainText('摘录来源');
  await expect(reopenedContext).toContainText('进度');
  await expect(reopenedSourceValue).toHaveText(initialOverlaySourceValue);
  await expect(reopenedProgressValue).toHaveText(startingProgressPercent);
  await expect(reopenedOverlay).not.toContainText('epubcfi(');
});

test('reader opens focused reading modes from keyboard in web mode', async ({ page }) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();
  await expect(page.getByText('专注 Shift+P / Shift+R')).toBeVisible();

  await page.keyboard.press('Shift+P');
  const paragraphOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(paragraphOverlay).toBeVisible();
  await expect(paragraphOverlay).toContainText('段落聚焦');
  await paragraphOverlay.press('Escape');
  await expect(paragraphOverlay).toHaveCount(0);

  await page.getByRole('tab', { name: '搜索' }).click();
  const readerSearchbox = page.getByRole('searchbox', { name: '搜索正文内容' });
  await expect(readerSearchbox).toBeVisible();
  await readerSearchbox.focus();
  await page.keyboard.press('Shift+P');
  await expect(paragraphOverlay).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByLabel('plain text reading surface').click();

  await page.keyboard.press('Shift+R');
  const rsvpOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(rsvpOverlay).toBeVisible();
  await expect(rsvpOverlay).toContainText('RSVP-lite');
  await expect(rsvpOverlay.getByLabel('RSVP-lite 当前词')).toBeVisible();
});

test('reader restores focused reading per book after switching between txt and epub in web mode', async ({
  page
}) => {
  const txtBookUrl = '/samples/sample-book.txt';
  const epubBookUrl = '/samples/sample-book.epub';

  await page.goto('/');
  await page.evaluate(
    ([txtKey, epubKey]) => {
      window.localStorage.removeItem(`br1.reader.focused-reading:${txtKey}`);
      window.localStorage.removeItem(`br1.reader.focused-reading:${epubKey}`);
    },
    [txtBookUrl, epubBookUrl]
  );

  const txtReaderHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: txtBookUrl,
    label: 'Sample TXT Book'
  }).toString()}`;
  const epubReaderHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: epubBookUrl,
    label: 'Sample EPUB Book'
  }).toString()}`;

  await page.goto(txtReaderHref);
  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '打开 RSVP-lite' }).click();

  const txtOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  const txtProgress = txtOverlay.getByLabel('RSVP-lite 进度');
  await expect(txtOverlay).toContainText('RSVP-lite');
  await txtOverlay.getByRole('button', { name: '暂停自动播放' }).click();
  await txtOverlay.getByRole('button', { name: '更快' }).click();
  await expect(txtOverlay).toContainText('280 词/分钟');
  await txtOverlay.getByRole('button', { name: '下一个词' }).click();
  await txtOverlay.getByRole('button', { name: '下一个词' }).click();
  await expect(txtProgress).toContainText(/3 \/ \d+/);
  await expect(txtOverlay).toContainText('This plain text file exists to verify');

  await page.goto(epubReaderHref);
  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('dialog', { name: '专注阅读浮层' })).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toHaveCount(0);

  await page.goto(txtReaderHref);
  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();

  const restoredOverlay = page.getByRole('dialog', { name: '专注阅读浮层' });
  await expect(restoredOverlay).toBeVisible();
  await expect(restoredOverlay).toContainText('RSVP-lite');
  await expect(restoredOverlay).toContainText('This plain text file exists to verify');
  await expect(restoredOverlay).toContainText('280 词/分钟');
  await expect(restoredOverlay.getByLabel('RSVP-lite 进度')).toContainText(/3 \/ \d+/);
  await expect(restoredOverlay.getByRole('button', { name: '继续自动播放' })).toBeVisible();
  await expect(restoredOverlay.getByRole('button', { name: '暂停自动播放' })).toHaveCount(0);
});

test('reader search states read like one product surface across txt and epub', async ({ page }) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  await page.getByRole('tab', { name: '搜索' }).click();
  await expect(page.getByLabel('正文搜索面板')).toBeVisible();
  await expect(page.locator('.search-summary')).toContainText('正文搜索');
  await expect(page.locator('.search-summary')).toContainText(
    '输入关键词后会在正文里搜索，而不只是过滤目录。'
  );

  await page.getByRole('searchbox', { name: '搜索正文内容' }).fill('plain text');
  await expect(page.locator('.search-summary')).toContainText('当前格式不支持正文搜索');
  await expect(page.getByLabel('搜索结果')).toContainText('TXT 书籍暂不支持全文搜索。');

  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.epub&label=Sample%20EPUB%20Book'
  );
  await page.getByRole('tab', { name: '搜索' }).click();
  await expect(page.locator('.search-summary')).toContainText('正文搜索');
  await expect(page.locator('.search-summary')).toContainText(
    '输入关键词后会在正文里搜索，而不只是过滤目录。'
  );

  await page.getByRole('searchbox', { name: '搜索正文内容' }).fill('does-not-exist');
  await expect(page.locator('.search-summary')).toContainText('0');
  await expect(page.locator('.search-summary')).toContainText('当前关键词没有命中正文内容');
  await expect(page.getByLabel('搜索结果')).toContainText('没有命中正文内容。');

  await page.getByRole('searchbox', { name: '搜索正文内容' }).fill('prototype');
  await expect(page.locator('.search-summary')).toContainText('正文命中结果');
  await expect(page.locator('.search-results .search-result').first()).toBeVisible();
  await expect(page.getByLabel('搜索结果导航')).toContainText(/1 \/ \d+/);
});

test('reader persists epub layout settings through reload in web mode', async ({ page }) => {
  const readerUrl =
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.epub&label=Sample%20EPUB%20Book';

  const pickReaderSetting = async (
    groupLabel:
      | '阅读模式'
      | '阅读氛围'
      | '阅读字体'
      | '字号'
      | '行距'
      | '页边距'
      | '阅读尺'
      | '聚焦模式',
    optionLabel: string
  ) => {
    await page.getByRole('button', { name: '更多操作' }).click();
    const option = page
      .locator(`[role="group"][aria-label="${groupLabel}"]`)
      .getByRole('menuitemradio', { name: optionLabel, exact: true });
    await option.evaluate((element) => {
      if (!(element instanceof HTMLButtonElement)) {
        throw new Error('expected reader settings option button');
      }
      element.click();
    });
  };

  const readRendererState = async () =>
    page.evaluate(() => {
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

  const readShellState = async () =>
    page.evaluate(() => {
      const stage = document.querySelector('.reader-stage');
      const headFrame = document.querySelector('.reader-head-frame');
      const viewportShell = document.querySelector('.viewport-shell');
      const stageStyles = stage ? getComputedStyle(stage) : null;
      const headStyles = headFrame ? getComputedStyle(headFrame) : null;
      const viewportStyles = viewportShell ? getComputedStyle(viewportShell) : null;

      return {
        shellBackdrop: stageStyles?.getPropertyValue('--reader-shell-backdrop').trim() ?? '',
        shellAccent: stageStyles?.getPropertyValue('--reader-shell-accent').trim() ?? '',
        headBorderColor: headStyles?.borderBottomColor ?? '',
        viewportBorderColor: viewportStyles?.borderColor ?? ''
      };
    });

  const readFocusAidState = async () =>
    page.evaluate(() => {
      const host = document.querySelector('.engine-host') as HTMLElement | null;
      const overlay = document.querySelector('.focus-aid-overlay') as HTMLElement | null;
      const ruler = document.querySelector('.focus-aid-ruler') as HTMLElement | null;
      const hostStyles = host ? getComputedStyle(host) : null;
      const overlayStyles = overlay ? getComputedStyle(overlay) : null;
      const rulerStyles = ruler ? getComputedStyle(ruler) : null;

      return {
        readingRulerMode: host?.dataset.readingRulerMode ?? '',
        focusAidMode: host?.dataset.focusAidMode ?? '',
        overlayDisplay: overlayStyles?.display ?? '',
        rulerOpacity: rulerStyles?.opacity ?? '',
        bandHeight: hostStyles?.getPropertyValue('--reader-focus-band-height').trim() ?? '',
        bandOpacity: hostStyles?.getPropertyValue('--reader-focus-band-opacity').trim() ?? ''
      };
    });

  await page.goto(readerUrl);
  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('阅读页脚控制')).toContainText('分页');

  await pickReaderSetting('阅读模式', '滚动');
  await pickReaderSetting('阅读字体', '无衬线');
  await pickReaderSetting('字号', '大');
  await pickReaderSetting('行距', '舒展');
  await pickReaderSetting('页边距', '宽');
  await pickReaderSetting('阅读尺', '开启阅读尺');
  await pickReaderSetting('聚焦模式', '行聚焦');
  await page.reload();

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(page.getByLabel('阅读页脚控制')).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('阅读页脚控制')).toContainText('滚动');
  await expect
    .poll(readRendererState, { message: 'expected renderer settings to update before reload' })
    .toMatchObject({
      flow: 'scrolled',
      marginLeft: '52px',
      fontSize: '22px'
    });
  await expect
    .poll(async () => (await readRendererState()).lineHeightPx, {
      message: 'expected renderer line height to expand in relaxed mode'
    })
    .toBeGreaterThan(42);
  await expect
    .poll(async () => (await readRendererState()).fontFamily, {
      message: 'expected renderer body font family to switch to sans'
    })
    .toContain('IBM Plex Sans');
  await expect
    .poll(readShellState, { message: 'expected the reader shell contract to expose stage-level palette tokens before reload' })
    .toMatchObject({
      shellBackdrop: '#f1e6d7',
      shellAccent: '#8c6a3b'
    });
  await expect
    .poll(async () => (await readShellState()).headBorderColor, {
      message: 'expected the reader header shell chrome to pick up the warm atmosphere after reload'
    })
    .not.toBe('rgba(0, 0, 0, 0)');
  await expect
    .poll(readRendererState, { message: 'expected renderer settings to survive reload' })
    .toMatchObject({
      flow: 'scrolled',
      marginLeft: '52px',
      fontSize: '22px'
    });
  await expect
    .poll(async () => (await readRendererState()).lineHeightPx, {
      message: 'expected relaxed line height to survive reload'
    })
    .toBeGreaterThan(42);
  await expect
    .poll(async () => (await readRendererState()).fontFamily, {
      message: 'expected sans font family to survive reload'
    })
    .toContain('IBM Plex Sans');
  await expect
    .poll(readShellState, { message: 'expected reader shell palette tokens to survive reload alongside the layout settings' })
    .toMatchObject({
      shellBackdrop: '#f1e6d7',
      shellAccent: '#8c6a3b'
    });
  await expect
    .poll(async () => (await readShellState()).viewportBorderColor, {
      message: 'expected the viewport shell chrome to retain themed border styling after reload'
    })
    .not.toBe('rgba(0, 0, 0, 0)');
  await expect
    .poll(readFocusAidState, { message: 'expected focus aid settings and overlay styling to survive reload' })
    .toMatchObject({
      readingRulerMode: 'on',
      focusAidMode: 'line',
      overlayDisplay: 'grid',
      bandHeight: '3.4em',
      bandOpacity: '0.09'
    });
  await expect(page.locator('.focus-aid-overlay')).toBeVisible();
  await expect(page.locator('.focus-aid-ruler')).toBeVisible();
});

test('reader manages structured search history through reload in web mode', async ({ page }) => {
  const readerUrl =
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.epub&label=Sample%20EPUB%20Book';
  const historyKey = 'br1.reader.search.history:/samples/sample-book.epub';
  const hitQuery = 'constitutional order';
  const missQuery = 'missing phrase for history';

  await page.goto(readerUrl);
  await expect(page.locator('.stage-error')).toHaveCount(0);

  await page.evaluate(
    ([nextHistoryKey, successfulQuery, emptyQuery]) => {
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
            resultCount: 3,
            createdAt: Date.now()
          },
          {
            id: JSON.stringify([emptyQuery, 'section', false, true, false]),
            query: emptyQuery,
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
      localStorage.setItem(
        'br1.reader.search.config',
        JSON.stringify({
          scope: 'book',
          matchCase: true,
          matchWholeWords: false,
          matchDiacritics: false
        })
      );
    },
    [historyKey, hitQuery, missQuery] as const
  );

  await page.reload();
  await expect(page.locator('.stage-error')).toHaveCount(0);
  await page.getByRole('tab', { name: '搜索' }).click();

  await expect(page.getByLabel('搜索缓存状态')).toContainText('当前书搜索缓存已启用');
  await expect(page.getByLabel('搜索缓存状态')).toContainText('2 条历史 · 1 条有命中 · 1 条无命中');
  await expect(page.getByLabel('搜索缓存状态')).toContainText('缓存标识：/samples/sample-book.epub');
  await expect(page.getByLabel('搜索缓存查询记录')).toContainText(hitQuery);
  await expect(page.getByLabel('搜索缓存查询记录')).toContainText('3 条 · 全书');
  await expect(page.getByRole('button', { name: '全部 2' })).toBeVisible();
  await expect(page.getByRole('button', { name: '有命中 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: '无命中 1' })).toBeVisible();
  await expect(page.locator('.history-chip').filter({ hasText: hitQuery })).toBeVisible();
  await expect(page.locator('.history-chip').filter({ hasText: missQuery })).toBeVisible();

  await page.getByRole('button', { name: '无命中 1' }).click();
  await expect(page.locator('.history-chip').filter({ hasText: missQuery })).toBeVisible();
  await expect(page.locator('.history-chip').filter({ hasText: hitQuery })).toHaveCount(0);

  await page.getByRole('button', { name: `删除搜索记录 ${missQuery}` }).click();
  await expect(page.locator('.history-chip').filter({ hasText: missQuery })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '无命中 0' })).toBeDisabled();

  await page.getByRole('button', { name: '有命中 1' }).click();
  const hitHistoryChip = page.locator('.history-chip').filter({ hasText: hitQuery });
  await expect(hitHistoryChip).toContainText('3 条命中');
  await hitHistoryChip.click();
  await expect(page.locator('input[type="search"]')).toHaveValue(hitQuery);
});

test('reader shows explicit text-annotation limits for txt and cbz assets in web mode', async ({ page }) => {
  const cases = [
    {
      assetPath: '/samples/sample-comic.cbz',
      label: 'Sample CBZ Book',
      message: '当前 CBZ 只支持阅读进度和书签，还不支持正文文本批注。'
    }
  ] as const;

  for (const sample of cases) {
    await page.goto(
      `/reader?source=asset&url=${encodeURIComponent(sample.assetPath)}&label=${encodeURIComponent(sample.label)}`
    );
    await page.getByLabel('阅读侧栏标签').getByRole('tab', { name: '笔记' }).click();
    await expect(page.getByRole('region', { name: '笔记面板' })).toContainText(sample.message);
    await expect(page.getByRole('button', { name: '当前格式暂不支持批注' })).toBeDisabled();
  }
});

test('reader productizes bookmarks as current reading positions in web mode', async ({ page }) => {
  const readerUrl =
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book';

  await page.goto(readerUrl);
  const sidebarTabs = page.getByLabel('阅读侧栏标签');
  await sidebarTabs.getByRole('tab', { name: '书签' }).click();

  const bookmarksPanel = page.getByRole('region', { name: '书签面板' });
  await expect(bookmarksPanel).toContainText('阅读位置');
  await expect(bookmarksPanel).toContainText('还没有保存的阅读位置，可以先把当前页存成书签。');
  await expect(bookmarksPanel).toContainText('当前页未入书签');
  await expect(bookmarksPanel.getByRole('button', { name: '最近添加' })).toBeVisible();

  const bookmarkAction = page.getByRole('button', { name: '保存当前页位置' });
  await expect(bookmarkAction).toBeVisible();
  await bookmarkAction.click();

  await expect(bookmarksPanel).toContainText('已保存 1 个阅读位置，当前页已经在书签里。');
  await expect(bookmarksPanel).toContainText('当前页已入书签');
  await expect(page.getByRole('button', { name: '移除当前页书签' })).toBeVisible();
});

test('reader annotation controller interactions stay legible in web mode', async ({ page }) => {
  const readerUrl =
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book';
  const selectText = async (needle: string) => {
    await page.evaluate((targetText) => {
      const pre = document.querySelector('.plain-text-paper pre');
      if (!pre || !pre.firstChild) throw new Error('expected the plain text surface to exist');
      const textNode = pre.firstChild;
      const raw = textNode.textContent ?? '';
      const start = raw.indexOf(targetText);
      if (start < 0) throw new Error(`expected the TXT fixture text to contain "${targetText}"`);
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + targetText.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }, needle);
  };

  await page.goto(readerUrl);
  const sidebarTabs = page.getByLabel('阅读侧栏标签');
  await sidebarTabs.getByRole('tab', { name: '笔记' }).click();
  const highlightButton = page.locator('.secondary-note-action').first();

  await selectText('plain text file exists');
  await expect(highlightButton).toBeEnabled();
  await highlightButton.click();
  await selectText('steady reading length');
  await highlightButton.click();

  await sidebarTabs.getByRole('tab', { name: '高亮' }).click();
  const highlightsPanel = page.getByRole('region', { name: '高亮面板' });
  const highlightCards = page.locator('.highlight-card');
  await expect(highlightsPanel).toContainText('当前书已保存 2 条高亮');
  await expect(highlightCards).toHaveCount(2);

  await highlightsPanel.getByRole('button', { name: '选中当前视图高亮' }).click();
  await expect(highlightsPanel).toContainText('已选 2 条');
  await highlightsPanel.getByRole('button', { name: '已选高亮' }).click();
  await expect(highlightsPanel).toContainText('2 已选高亮');

  await highlightCards.first().locator('.highlight-selection-toggle').click();
  await expect(highlightsPanel).toContainText('1 已选高亮');
  await expect(highlightCards).toHaveCount(1);
  await highlightsPanel.getByRole('button', { name: '清空选中' }).click();
  await expect(highlightsPanel).toContainText('未选高亮');
  await expect(highlightCards).toHaveCount(0);
});

test('reader saved-highlight helper flows stay legible in web mode', async ({ page }) => {
  const readerUrl =
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book';
  const selectText = async (needle: string) => {
    await page.evaluate((targetText) => {
      const pre = document.querySelector('.plain-text-paper pre');
      if (!pre || !pre.firstChild) throw new Error('expected the plain text surface to exist');
      const textNode = pre.firstChild;
      const raw = textNode.textContent ?? '';
      const start = raw.indexOf(targetText);
      if (start < 0) throw new Error(`expected the TXT fixture text to contain "${targetText}"`);
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + targetText.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }, needle);
  };

  await page.goto(readerUrl);
  const sidebarTabs = page.getByLabel('阅读侧栏标签');
  await sidebarTabs.getByRole('tab', { name: '笔记' }).click();
  const highlightButton = page.locator('.secondary-note-action').first();

  await selectText('plain text file exists');
  await expect(highlightButton).toBeEnabled();
  await highlightButton.click();

  await sidebarTabs.getByRole('tab', { name: '高亮' }).click();
  const highlightsPanel = page.getByRole('region', { name: '高亮面板' });
  const savedSelectionPanel = page.getByLabel('已保存高亮选择集');
  await highlightsPanel.getByRole('button', { name: '选中当前视图高亮' }).click();
  page.once('dialog', (dialog) => dialog.accept('Helper Flow Source'));
  await highlightsPanel.getByRole('button', { name: '保存当前选择集' }).click();
  await expect(savedSelectionPanel).toContainText('Helper Flow Source');

  await savedSelectionPanel
    .locator('.saved-highlight-selection-card')
    .filter({ hasText: 'Helper Flow Source' })
    .getByRole('button', { name: '导出' })
    .click();
  const exportPreview = page.getByLabel('高亮选择集导出预览');
  const exportedPayload = await exportPreview.locator('textarea').inputValue();
  const crossBookPayload = JSON.stringify({
    ...JSON.parse(exportedPayload),
    bookKey: 'helper-flow-other-book',
    bookTitle: 'Helper Flow Other Book'
  });
  await exportPreview.getByRole('button', { name: '关闭' }).click();

  page.once('dialog', (dialog) => dialog.accept(crossBookPayload));
  await savedSelectionPanel.getByRole('button', { name: '导入' }).click();
  await expect(savedSelectionPanel).toContainText('跨书预检：可映射 1/1 条高亮');
  const importPreview = page.getByLabel('高亮选择集导入预检');
  await expect(importPreview).toContainText('Helper Flow Other Book');
  await importPreview.getByRole('button', { name: '导入已匹配高亮' }).click();
  await expect(savedSelectionPanel).toContainText('已导入跨书选择集：Helper Flow Source (2)（1/1）');

  const importedCard = savedSelectionPanel
    .locator('.saved-highlight-selection-card')
    .filter({ hasText: 'Helper Flow Source (2)' });
  await expect(importedCard).toContainText('跨书导入 · Helper Flow Other Book / Helper Flow Source · 1/1');
  await importedCard.getByRole('button', { name: '刷新映射' }).click();
  await expect(savedSelectionPanel).toContainText('已刷新跨书选择集：Helper Flow Source (2)（1/1）');
  await expect(importedCard).toContainText('完全匹配');
});

test('reader highlights workspace persistence stays legible in web mode', async ({ page }) => {
  const readerUrl =
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book';
  const selectText = async (needle: string) => {
    await page.evaluate((targetText) => {
      const pre = document.querySelector('.plain-text-paper pre');
      if (!pre || !pre.firstChild) throw new Error('expected the plain text surface to exist');
      const textNode = pre.firstChild;
      const raw = textNode.textContent ?? '';
      const start = raw.indexOf(targetText);
      if (start < 0) throw new Error(`expected the TXT fixture text to contain "${targetText}"`);
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + targetText.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }, needle);
  };

  await page.goto(readerUrl);
  const sidebarTabs = page.getByLabel('阅读侧栏标签');
  await sidebarTabs.getByRole('tab', { name: '笔记' }).click();
  const highlightButton = page.locator('.secondary-note-action').first();

  await selectText('plain text file exists');
  await expect(highlightButton).toBeEnabled();
  await highlightButton.click();
  await selectText('steady reading length');
  await highlightButton.click();

  await sidebarTabs.getByRole('tab', { name: '高亮' }).click();
  const highlightsPanel = page.getByRole('region', { name: '高亮面板' });
  const highlightCards = page.locator('.highlight-card');
  const savedSelectionPanel = page.getByLabel('已保存高亮选择集');
  const highlightSortControls = page.getByLabel('高亮排序控制');

  await highlightSortControls.getByRole('button', { name: '最早添加', exact: true }).click();
  await expect(highlightsPanel).toContainText('最早添加优先');
  await highlightCards.first().locator('.highlight-selection-toggle').click();
  await highlightsPanel.getByRole('button', { name: '已选高亮' }).click();
  await expect(highlightsPanel).toContainText('1 已选高亮');
  page.once('dialog', (dialog) => dialog.accept('Persisted Helper Set'));
  await highlightsPanel.getByRole('button', { name: '保存当前选择集' }).click();
  await expect(savedSelectionPanel).toContainText('Persisted Helper Set');

  await page.reload();
  await sidebarTabs.getByRole('tab', { name: '高亮' }).click();
  await expect(highlightsPanel).toContainText('最早添加优先');
  await expect(highlightsPanel).toContainText('1 已选高亮');
  await expect(highlightCards).toHaveCount(1);
  await expect(highlightCards.first()).toContainText('plain text file exists');
  await expect(savedSelectionPanel).toContainText('Persisted Helper Set');
  await expect(highlightSortControls.getByRole('button', { name: '最早添加' })).toHaveClass(/active/);
});

test('reader supports txt notes through selection, persistence, and note reopen in web mode', async ({ page }) => {
  const readerUrl =
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book';
  const selectText = async (needle: string) => {
    await page.evaluate((targetText) => {
      const pre = document.querySelector('.plain-text-paper pre');
      if (!pre || !pre.firstChild) throw new Error('expected the plain text surface to exist');
      const textNode = pre.firstChild;
      const raw = textNode.textContent ?? '';
      const start = raw.indexOf(targetText);
      if (start < 0) throw new Error(`expected the TXT fixture text to contain "${targetText}"`);
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + targetText.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, needle);
  };

  await page.goto(readerUrl);
  const sidebarTabs = page.getByLabel('阅读侧栏标签');
  await sidebarTabs.getByRole('tab', { name: '笔记' }).click();
  const notesPanel = page.getByRole('region', { name: '笔记面板' });
  await expect(notesPanel).toContainText('标注');
  await expect(notesPanel).toContainText('先在正文里选中一段文本，再把它存成当前书的笔记或高亮。');
  await expect(notesPanel.getByRole('button', { name: '全部类型' })).toBeVisible();
  const noteButton = page.locator('.primary-note-action');
  const highlightButton = page.locator('.secondary-note-action').first();
  await expect(noteButton).toBeDisabled();
  await expect(highlightButton).toBeDisabled();

  await selectText('plain text file exists');

  await expect(notesPanel.locator('.selection-card p')).toContainText('plain text file exists');
  await expect(notesPanel).toContainText('已选中一段正文，可以直接记笔记或高亮。');
  await expect(noteButton).toBeEnabled();
  await expect(highlightButton).toBeEnabled();
  await expect(noteButton).toHaveText('为当前选中内容记笔记');
  await expect(highlightButton).toHaveText('先高亮当前选中内容');

  await highlightButton.click();
  await expect(page.locator('.note-card').first()).toContainText('高亮');
  await expect(page.locator('.note-card').first()).toContainText('plain text file exists');

  await page.locator('.plain-text-surface').evaluate((element) => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) {
      throw new Error('expected the TXT fixture to produce a scrollable plain-text surface');
    }
    element.scrollTop = maxScroll * 0.35;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await selectText('The rest of this fixture just adds enough steady reading length');
  await expect(notesPanel.locator('.selection-card p')).toContainText(
    'The rest of this fixture just adds enough steady reading length'
  );

  await highlightButton.click();
  await expect(page.locator('.notes-meta-row')).toContainText('2 高亮');
  await expect(page.locator('.notes-meta-row')).toContainText('0 笔记');

  await selectText('the book opens, the state moves, and the state comes back');
  await expect(notesPanel.locator('.selection-card p')).toContainText(
    'the book opens, the state moves, and the state comes back'
  );

  page.once('dialog', (dialog) => dialog.accept('txt note body'));
  await noteButton.click();
  await expect(page.locator('.note-card', { hasText: 'txt note body' })).toContainText('txt note body');
  await expect(page.locator('.notes-meta-row')).toContainText('2 高亮');
  await expect(page.locator('.notes-meta-row')).toContainText('1 笔记');

  const progressBeforeJump = await page
    .locator('[aria-label="阅读页脚控制"]')
    .textContent();

  await page.locator('.plain-text-surface').evaluate((element) => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) {
      throw new Error('expected the TXT fixture to produce a scrollable plain-text surface');
    }
    element.scrollTop = maxScroll * 0.8;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await expect(page.locator('[aria-label="阅读页脚控制"]')).not.toHaveText(progressBeforeJump ?? '');

  await page.locator('.note-card', { hasText: 'txt note body' }).locator('.note-link').click();
  await expect(page.locator('[aria-label="阅读页脚控制"]')).toHaveText(progressBeforeJump ?? '');

  const notesMetaRow = page.locator('.notes-meta-row');
  const notesCards = page.locator('.note-card');
  const kindFilters = page.getByLabel('笔记筛选控制');
  await kindFilters.getByRole('button', { name: '高亮', exact: true }).click();
  await expect(notesMetaRow).toContainText('仅看高亮');
  await expect(notesCards).toHaveCount(2);
  await expect(notesCards.first()).toContainText('高亮');
  await expect(page.getByText('当前筛选下还没有高亮')).toHaveCount(0);

  await kindFilters.getByRole('button', { name: '笔记', exact: true }).click();
  await expect(notesMetaRow).toContainText('仅看笔记');
  await expect(notesCards).toHaveCount(1);
  await expect(notesCards.first()).toContainText('txt note body');
  await expect(notesCards.first()).not.toContainText('高亮');

  await kindFilters.getByRole('button', { name: '全部类型', exact: true }).click();
  await expect(notesMetaRow).toContainText('全部类型');
  await expect(notesCards).toHaveCount(3);

  await kindFilters.getByRole('button', { name: '笔记', exact: true }).click();
  await expect(notesMetaRow).toContainText('仅看笔记');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除本组笔记' }).click();
  await expect(notesCards).toHaveCount(0);
  await expect(page.getByText('当前筛选下还没有笔记')).toBeVisible();

  await kindFilters.getByRole('button', { name: '全部类型', exact: true }).click();
  await expect(notesMetaRow).toContainText('2 高亮');
  await expect(notesMetaRow).toContainText('0 笔记');
  await expect(notesCards).toHaveCount(2);

  await sidebarTabs.getByRole('tab', { name: '高亮' }).click();
  const highlightCards = page.locator('.highlight-card');
  const highlightsPanel = page.getByLabel('高亮面板');
  await expect(highlightsPanel).toContainText('当前书已保存 2 条高亮，可继续筛选、选中或整理成跨书选择集。');
  await expect(highlightsPanel).toContainText('最近添加优先');
  await expect(highlightCards).toHaveCount(2);
  await expect(highlightCards.first()).toContainText('The rest of this fixture just adds enough steady reading length');
  await expect(highlightCards.first()).toContainText('高亮');
  await expect(highlightCards.first()).not.toContainText('txt note body');
  const highlightSortControls = page.getByLabel('高亮排序控制');
  await highlightSortControls.getByRole('button', { name: '最早添加', exact: true }).click();
  await expect(highlightsPanel).toContainText('最早添加优先');
  await expect(highlightCards.first()).toContainText('plain text file exists');
  await page.getByRole('button', { name: '选中本组高亮' }).click();
  await expect(highlightsPanel).toContainText('已选 2 条');
  await page.getByRole('button', { name: '已选高亮' }).click();
  await expect(highlightsPanel).toContainText('2 已选高亮');
  await expect(highlightCards).toHaveCount(2);
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('button', { name: '清空本组选择' }).click();
  await expect(highlightsPanel).toContainText('未选高亮');
  await highlightSortControls.getByRole('button', { name: '最近添加', exact: true }).click();
  await expect(highlightsPanel).toContainText('最近添加优先');
  await expect(highlightCards.first()).toContainText('The rest of this fixture just adds enough steady reading length');
  await highlightSortControls.getByRole('button', { name: '最早添加', exact: true }).click();
  await highlightCards.first().locator('.highlight-selection-toggle').click();
  await expect(highlightsPanel).toContainText('已选 1 条');
  await page.getByRole('button', { name: '已选高亮' }).click();
  await expect(highlightsPanel).toContainText('1 已选高亮');
  await expect(highlightCards).toHaveCount(1);
  await expect(highlightCards.first()).toContainText('plain text file exists');
  page.once('dialog', (dialog) => dialog.accept('Web TXT 重点高亮'));
  await page.getByRole('button', { name: '保存当前选择集' }).click();
  const savedSelectionPanel = page.getByLabel('已保存高亮选择集');
  await expect(savedSelectionPanel).toContainText('跨书高亮选择集');
  await expect(savedSelectionPanel).toContainText('按书保留跨书映射结果');
  await expect(savedSelectionPanel).toContainText('Web TXT 重点高亮');
  page.once('dialog', (dialog) => dialog.accept('Web TXT 重命名高亮'));
  await savedSelectionPanel.getByRole('button', { name: '重命名' }).click();
  await expect(savedSelectionPanel).toContainText('Web TXT 重命名高亮');
  await expect(page.getByText('Web TXT 重点高亮')).toHaveCount(0);
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('button', { name: '清空选中' }).click();
  await expect(highlightsPanel).toContainText('未选高亮');
  await highlightCards.nth(1).locator('.highlight-selection-toggle').click();
  await expect(highlightsPanel).toContainText('已选 1 条');
  await page.getByRole('button', { name: '已选高亮' }).click();
  await expect(highlightCards).toHaveCount(1);
  await expect(highlightCards.first()).toContainText('steady reading length');
  page.once('dialog', (dialog) => dialog.accept('Web TXT 第二高亮'));
  await page.getByRole('button', { name: '保存当前选择集' }).click();
  await expect(savedSelectionPanel).toContainText('Web TXT 第二高亮');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('Web TXT 第二高亮');
  const savedSelectionSortControls = page.getByLabel('选择集排序控制');
  await savedSelectionSortControls.getByRole('button', { name: '最早保存' }).click();
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('Web TXT 重命名高亮');
  await page.reload();
  await sidebarTabs.getByRole('tab', { name: '高亮' }).click();
  await expect(highlightsPanel).toContainText('1 已选高亮');
  await expect(highlightsPanel).toContainText('最早添加优先');
  await expect(highlightCards).toHaveCount(1);
  await expect(highlightCards.first()).toContainText('steady reading length');
  await expect(savedSelectionSortControls.getByRole('button', { name: '最早保存' })).toHaveClass(/active/);
  const firstSavedSelectionCard = savedSelectionPanel.locator('.saved-highlight-selection-card').first();
  await expect(firstSavedSelectionCard).toContainText('Web TXT 重命名高亮');
  await expect(savedSelectionPanel).toContainText('Web TXT 重命名高亮');
  await expect(savedSelectionPanel).toContainText('Web TXT 第二高亮');
  await firstSavedSelectionCard.getByRole('button', { name: '导出' }).click();
  const exportPreview = page.getByLabel('高亮选择集导出预览');
  await expect(exportPreview).toContainText('Web TXT 重命名高亮');
  await expect(exportPreview.locator('textarea')).toHaveValue(/"schemaVersion": 1/);
  await expect(exportPreview.locator('textarea')).toHaveValue(/"bookTitle": "Sample TXT Book"/);
  await expect(exportPreview.locator('textarea')).toHaveValue(/"name": "Web TXT 重命名高亮"/);
  await expect(exportPreview.locator('textarea')).toHaveValue(/"highlights": \[/);
  const exportedPayload = await exportPreview.locator('textarea').inputValue();
  const importedPayload = JSON.stringify({
    ...JSON.parse(exportedPayload),
    selectionSet: {
      ...JSON.parse(exportedPayload).selectionSet,
      selectedIds: ['missing-highlight-id'],
      importSource: {
        bookKey: 'imported-txt-book',
        bookTitle: 'Imported TXT Source',
        formatLabel: 'TXT',
        selectionName: 'Imported TXT Selection',
        matchedCount: 1,
        totalCount: 2,
        unmatchedCount: 1,
        importedAt: 1710000000000,
        highlights: [
          ...JSON.parse(exportedPayload).highlights,
          {
            ...JSON.parse(exportedPayload).highlights[0],
            id: 'missing-imported-highlight',
            cfi: 'epubcfi(/6/imported-missing)',
            text: 'missing imported passage for unresolved drilldown',
            chapterHref: '/missing-imported-chapter.xhtml'
          }
        ]
      }
    },
    highlights: JSON.parse(exportedPayload).highlights.map((highlight: Record<string, unknown>) => ({
      ...highlight,
      cfi: 'epubcfi(/6/missing)',
      chapterHref: '/missing-chapter.xhtml'
    }
    ))
  });
  const crossBookPreviewPayload = JSON.stringify({
    ...JSON.parse(exportedPayload),
    bookKey: 'other-book-key',
    bookTitle: 'Other TXT Book',
    selectionSet: {
      ...JSON.parse(exportedPayload).selectionSet,
      selectedIds: ['missing-highlight-id']
    },
    highlights: JSON.parse(exportedPayload).highlights.map((highlight: Record<string, unknown>) => ({
      ...highlight,
      cfi: 'epubcfi(/6/missing)',
      chapterHref: '/missing-chapter.xhtml'
    }))
  });
  await exportPreview.getByRole('button', { name: '关闭' }).click();
  await expect(exportPreview).toHaveCount(0);
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('button', { name: '清空选中' }).click();
  await expect(highlightsPanel).toContainText('未选高亮');
  await firstSavedSelectionCard.getByRole('button', { name: '套用' }).click();
  await expect(highlightsPanel).toContainText('1 已选高亮');
  page.once('dialog', (dialog) => dialog.accept());
  await firstSavedSelectionCard.getByRole('button', { name: '删除' }).click();
  await expect(page.getByText('Web TXT 重命名高亮')).toHaveCount(0);
  await expect(savedSelectionPanel).toContainText('Web TXT 第二高亮');
  page.once('dialog', (dialog) => dialog.accept(importedPayload));
  await savedSelectionPanel.getByRole('button', { name: '导入' }).click();
  await expect(savedSelectionPanel).toContainText('已导入选择集：Web TXT 重命名高亮');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('Web TXT 重命名高亮');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText(
    '跨书导入 · Imported TXT Source / Imported TXT Selection · 1/2'
  );
  await savedSelectionPanel.locator('.saved-highlight-selection-card').first().getByRole('button', { name: '刷新映射' }).click();
  await expect(savedSelectionPanel).toContainText('已刷新跨书选择集：Web TXT 重命名高亮（1/2）');
  await savedSelectionPanel.getByRole('button', { name: '刷新全部跨书映射' }).click();
  await expect(savedSelectionPanel).toContainText('已刷新 1 组跨书选择集');
  const refreshSummary = page.getByLabel('高亮选择集刷新摘要');
  await expect(refreshSummary).toContainText('共处理 1 组跨书选择集');
  await expect(refreshSummary).toContainText('部分匹配：');
  await expect(refreshSummary).toContainText('Web TXT 重命名高亮（1/2）');
  await firstSavedSelectionCard.getByRole('button', { name: '套用' }).click();
  await expect(highlightsPanel).toContainText('1 已选高亮');
  page.once('dialog', (dialog) => dialog.accept(crossBookPreviewPayload));
  await savedSelectionPanel.getByRole('button', { name: '导入' }).click();
  await expect(savedSelectionPanel).toContainText('跨书预检：可映射 1/1 条高亮');
  const importPreview = page.getByLabel('高亮选择集导入预检');
  await expect(importPreview).toContainText('来源：Other TXT Book · TXT');
  await expect(importPreview).toContainText('来源选择集：Web TXT 重命名高亮');
  await expect(importPreview).toContainText('当前书可映射 1 / 1 条高亮');
  await importPreview.getByRole('button', { name: '导入已匹配高亮' }).click();
  await expect(savedSelectionPanel).toContainText('已导入跨书选择集：Web TXT 重命名高亮 (2)（1/1）');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('Web TXT 重命名高亮 (2)');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText(
    '跨书导入 · Other TXT Book / Web TXT 重命名高亮 · 1/1'
  );
  page.once('dialog', (dialog) => dialog.accept(crossBookPreviewPayload));
  await savedSelectionPanel.getByRole('button', { name: '导入' }).click();
  await expect(savedSelectionPanel).toContainText('跨书预检：可映射 1/1 条高亮');
  await importPreview.getByRole('button', { name: '导入已匹配高亮' }).click();
  await expect(savedSelectionPanel).toContainText('已更新跨书选择集：Web TXT 重命名高亮 (2)（1/1）');
  await expect(page.getByText('Web TXT 重命名高亮 (2)', { exact: true })).toHaveCount(1);
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('完全匹配');
  await savedSelectionPanel.getByRole('button', { name: '部分匹配 1' }).click();
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card')).toHaveCount(1);
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('Web TXT 重命名高亮');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('部分匹配');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('未命中 1 条，可刷新映射');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('未映射片段');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText(
    'missing imported passage for unresolved drilldown'
  );
  await page.reload();
  await sidebarTabs.getByRole('tab', { name: '高亮' }).click();
  await expect(savedSelectionPanel).toContainText('按书保留跨书映射结果');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card')).toHaveCount(1);
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('部分匹配');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('未命中 1 条，可刷新映射');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText(
    'missing imported passage for unresolved drilldown'
  );
  await savedSelectionPanel.getByRole('button', { name: '完全匹配 1' }).click();
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card')).toHaveCount(1);
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('Web TXT 重命名高亮 (2)');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('完全匹配');
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card').first()).toContainText('已全部映射 1/1');
  await expect(savedSelectionPanel.getByRole('button', { name: '未匹配 0' })).toBeDisabled();
  await savedSelectionPanel.getByRole('button', { name: '全部选择集' }).click();
  await expect(savedSelectionPanel.locator('.saved-highlight-selection-card')).toHaveCount(3);
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await expect(highlightsPanel).toContainText('全部章节');
  await expect(highlightCards).toHaveCount(2);
  await page.getByRole('button', { name: '反选本组高亮' }).click();
  await expect(highlightsPanel).toContainText('已选 1 条');
  await expect(highlightCards.first().locator('.highlight-selection-toggle')).toHaveText('选中');
  await expect(highlightCards.nth(1).locator('.highlight-selection-toggle')).toHaveText('已选');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除选中高亮' }).click();
  await expect(highlightsPanel).toContainText('已保存 1 条高亮');
  await expect(highlightsPanel).toContainText('未选高亮');
  await expect(highlightCards).toHaveCount(1);
  await expect(highlightCards.first()).toContainText('plain text file exists');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除本组高亮' }).click();
  await expect(highlightCards).toHaveCount(0);
  await expect(page.getByLabel('高亮面板')).toContainText(
    '当前书还没有高亮，但跨书高亮选择集还保留在上面，可以继续整理或导入匹配结果。'
  );

  await sidebarTabs.getByRole('tab', { name: '笔记' }).click();
  await expect(page.locator('.notes-meta-row')).toContainText('0 高亮');
  await expect(page.locator('.notes-meta-row')).toContainText('0 笔记');
  await expect(page.locator('.note-card')).toHaveCount(0);
  await page.reload();
  await sidebarTabs.getByRole('tab', { name: '笔记' }).click();
  await expect(page.locator('.notes-meta-row')).toContainText('0 笔记');
  await expect(page.locator('.note-card', { hasText: 'txt note body' })).toHaveCount(0);
  await expect(page.locator('.note-card', { hasText: '高亮' })).toHaveCount(0);
});

test('reader highlights fenced code blocks in the txt fallback surface', async ({ page }) => {
  await page.goto(
    `/reader?source=asset&url=${encodeURIComponent('/samples/sample-code-block.txt')}&label=${encodeURIComponent('Sample Code TXT Book')}`
  );

  await expect(page.getByLabel('plain text reading surface')).toBeVisible({ timeout: 15000 });
  const codeBlock = page.locator('.plain-text-code-block').first();
  await expect(codeBlock).toBeVisible({ timeout: 15000 });
  await expect(codeBlock).toHaveAttribute('data-language', 'ts');
  await expect(codeBlock.locator('.reader-code-token-keyword').first()).toContainText('const');
  await expect(codeBlock.locator('.reader-code-token-number').first()).toContainText('42');
  await expect(codeBlock.locator('.reader-code-token-comment').first()).toContainText(
    'The regression checks this comment and keyword tokens.'
  );
  await expect(page.locator('.plain-text-paper')).toContainText(
    'The prose after the code block proves normal text still renders beside highlighted code.'
  );
});

const sampleReaderCases = [
  {
    assetPath: '/samples/sample-book.epub',
    label: 'Sample EPUB Book',
    format: 'EPUB',
    layout: 'PAGINATED'
  },
  {
    assetPath: '/samples/sample-outline.pdf',
    label: 'Sample PDF Outline',
    format: 'PDF',
    layout: 'FIXED'
  },
  {
    assetPath: '/samples/sample-book.fb2',
    label: 'Sample FB2 Book',
    format: 'FB2',
    layout: 'PAGINATED'
  },
  {
    assetPath: '/samples/sample-book.mobi',
    label: 'Sample MOBI Book',
    format: 'MOBI',
    layout: 'PAGINATED'
  },
  {
    assetPath: '/samples/sample-book.azw3',
    label: 'Sample AZW3 Book',
    format: 'AZW3',
    layout: 'PAGINATED'
  },
  {
    assetPath: '/samples/sample-comic.cbz',
    label: 'Sample CBZ Book',
    format: 'CBZ',
    layout: 'FIXED'
  },
  {
    assetPath: '/samples/sample-book.txt',
    label: 'Sample TXT Book',
    format: 'TXT',
    layout: 'SCROLL'
  }
] as const;

test('reader shows selection-near annotation actions in web mode', async ({ page }) => {
  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book');
  await page.getByLabel('工作台模式切换').getByRole('button', { name: '打开笔记工作台' }).click();
  const pinnedSelectionText = 'plain text file exists';
  const replacementSelectionText = 'verify the current P0-1 downgrade contract';

  const selectText = async (targetText: string) => {
    await page.evaluate((nextTargetText) => {
      const reader = document.querySelector('.plain-text-reader');
      if (!(reader instanceof HTMLElement)) {
        throw new Error('expected the plain-text reader surface to exist');
      }

      const pre = reader.querySelector('pre');
      const textNode = pre?.firstChild;
      if (!(textNode instanceof Text)) {
        throw new Error('expected the TXT reader text node to exist');
      }

      const raw = textNode.textContent ?? '';
      const start = raw.indexOf(nextTargetText);
      if (start < 0) {
        throw new Error(`expected the TXT fixture text to contain "${nextTargetText}"`);
      }

      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + nextTargetText.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }, targetText);
  };

  await selectText(pinnedSelectionText);

  const toolbar = page.getByRole('toolbar', { name: '选中文本操作' });
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole('button', { name: '高亮' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: '翻译' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: '朗读' })).toBeVisible();
  await toolbar.getByRole('button', { name: '朗读' }).click();

  const ttsWorkspace = page.getByRole('region', { name: '朗读模式' });
  const currentTargetPanel = ttsWorkspace.locator('article').filter({ hasText: '当前朗读目标' });
  const ttsStatusStrip = page.getByLabel('朗读模式状态');

  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(ttsWorkspace).toBeVisible();
  await expect(currentTargetPanel.locator('p')).toHaveText(pinnedSelectionText);
  await ttsWorkspace.getByRole('button', { name: '锁定当前朗读目标' }).click();
  await expect(ttsStatusStrip).toContainText('已锁定朗读目标');

  await selectText(replacementSelectionText);

  await expect(toolbar).toBeVisible();
  await toolbar.getByRole('button', { name: '朗读' }).click();

  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(page).toHaveURL(/workspace=tts/);
  await expect(page).toHaveURL(/tts=source/);
  await expect(ttsWorkspace).toBeVisible();
  await expect(currentTargetPanel).toContainText('正文选区');
  await expect(currentTargetPanel.locator('p')).toHaveText(replacementSelectionText);
  await expect(ttsWorkspace.getByLabel('译文朗读来源')).toHaveCount(0);
  await expect(ttsStatusStrip).toContainText('跟随当前阅读位置');
  await expect(ttsStatusStrip).not.toContainText('已锁定朗读目标');
  await expect(ttsWorkspace.getByRole('button', { name: '朗读原文' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(ttsWorkspace.getByRole('button', { name: '朗读译文' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
});

test('reader opens footnote links in a reader popup in web mode', async ({ page }) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-footnote.epub&label=Sample%20Footnote%20Book'
  );

  const footnoteFrame = page.frameLocator('iframe').first();
  await expect(footnoteFrame.getByRole('link', { name: /footnote|注/i }).first()).toBeVisible();
  await footnoteFrame.getByRole('link', { name: /footnote|注/i }).first().click();

  const footnoteDialog = page.getByRole('dialog', { name: '脚注预览' });
  await expect(footnoteDialog).toBeVisible();
  await expect(footnoteDialog).toContainText(
    'This is the preview text that should appear inside the reader footnote popup.'
  );
  await expect(footnoteDialog.getByRole('button', { name: '关闭脚注' })).toBeVisible();
});

for (const sample of sampleReaderCases) {
  test(`reader opens and reopens ${sample.format} sample assets in web mode`, async ({ page }) => {
    await page.goto(
      `/reader?source=asset&url=${encodeURIComponent(sample.assetPath)}&label=${encodeURIComponent(sample.label)}`
    );

    const footer = page.getByLabel('阅读页脚控制');

    await expect(page.locator('.stage-error')).toHaveCount(0);
    await expect(footer).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(new RegExp(`Failed to open ${sample.label}`, 'i'))).toHaveCount(0);
    await expect(footer).toContainText(sample.format);
    await expect(footer).toContainText(readerLayoutLabel(sample.layout));
    await expect(footer).not.toContainText('正在打开');
    await expect(footer.getByLabel('当前阅读状态')).toBeVisible();
    await expect(footer.getByLabel('阅读环境')).toBeVisible();

    await page.reload();

    await expect(page.locator('.stage-error')).toHaveCount(0);
    await expect(footer).toBeVisible({ timeout: 15000 });
    await expect(footer).toContainText(sample.format);
    await expect(footer).toContainText(readerLayoutLabel(sample.layout));
    await expect(footer).not.toContainText('正在打开');
    await expect(footer.getByLabel('当前阅读状态')).toBeVisible();
    await expect(footer.getByLabel('阅读环境')).toBeVisible();
  });
}
