import { expect, test } from '@playwright/test';

const readerLayoutLabel = (layout: 'PAGINATED' | 'SCROLL' | 'FIXED') =>
  ({
    PAGINATED: '分页',
    SCROLL: '滚动',
    FIXED: '固定版式'
  })[layout];

test('library renders the reading-first shell in web mode', async ({ page }) => {
  await page.goto('/library');

  const searchbox = page.getByRole('searchbox', { name: '搜索书籍' });

  await expect(searchbox).toHaveAttribute(
    'placeholder',
    /在 5 本书籍中搜索/i
  );
  await expect(page.getByRole('heading', { name: '继续阅读' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '最近阅读' })).toBeVisible();
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
  await expect(page.getByRole('link', { name: /继续阅读《胡雪岩》/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '导入书籍' })).toBeVisible();
  await expect(page.locator('input.import-input[type="file"]').first()).toHaveAttribute(
    'accept',
    '.epub,.pdf,.mobi,.azw3,.fb2,.cbz,.txt'
  );

  await page.getByRole('button', { name: '更多操作' }).click();
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
  await expect(page.getByRole('link', { name: /在阅读器打开《论法的精神》/ })).toHaveCount(0);
  await expect(page.getByLabel('书库筛选摘要')).toContainText('筛选命中 1 / 5 本');
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

  await expect(page.getByRole('button', { name: '打开笔记工作台' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '阅读侧栏标签' })).toBeVisible();
  await expect(page.getByRole('button', { name: '并行阅读' })).toBeVisible();

  await page.getByRole('button', { name: '打开笔记工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭笔记工作台' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '笔记工作台标签' })).toBeVisible();
  await expect(page.getByRole('button', { name: '固定笔记工作台' })).toBeVisible();
  await expect(page.getByRole('button', { name: '并行阅读' })).toBeVisible();

  await page.getByRole('button', { name: '固定笔记工作台' }).click();
  await expect(page.getByRole('button', { name: '取消固定笔记工作台' })).toBeVisible();

  await page.getByRole('button', { name: '关闭笔记工作台' }).click();
  await expect(page.getByRole('button', { name: '打开笔记工作台' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '阅读侧栏标签' })).toBeVisible();
});

test('reader can open the ai workspace inside the notebook shell', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: 'AI 工作台测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: 'AI 工作台' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '阅读侧栏标签' })).toBeVisible();

  await page.getByRole('button', { name: 'AI 工作台' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('tab', { name: 'AI 助手', selected: true })).toBeVisible();
  await expect(page.getByText('AI 阅读助手')).toBeVisible();
  await expect(
    page.getByText('把查词、百科和翻译结果放到 notebook 里的独立工作台，而不是只做一个 sidebar 结果区。')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '并行阅读' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: '阅读侧栏标签' })).toBeVisible();
});

test('reader can open translation mode as a dedicated notebook tab', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '翻译模式测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: '打开翻译模式' })).toBeVisible();

  await page.getByRole('button', { name: '打开翻译模式' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('tab', { name: '翻译模式', selected: true })).toBeVisible();
  await expect(notebook.locator('.assist-summary strong', { hasText: '翻译模式' })).toBeVisible();
  await expect(
    page.getByText('把原文和译文并排收进 reader 工作台，让翻译成为一种阅读模式，而不是助手里的临时请求。')
  ).toBeVisible();
  const translationPanels = page.getByLabel('翻译阅读面板');
  await expect(translationPanels).toBeVisible();
  await expect(translationPanels.locator('.assist-translation-card strong', { hasText: '原文' })).toBeVisible();
  await expect(translationPanels.locator('.assist-translation-card strong', { hasText: '译文' })).toBeVisible();
});

test('reader can open tts mode as a dedicated notebook tab', async ({ page }) => {
  const readerHref = `/reader?${new URLSearchParams({
    source: 'asset',
    url: '/samples/sample-book.epub',
    label: '朗读模式测试'
  }).toString()}`;

  await page.goto(readerHref);

  await expect(page.getByRole('button', { name: '打开朗读模式' })).toBeVisible();

  await page.getByRole('button', { name: '打开朗读模式' }).click();

  const notebook = page.getByRole('complementary', { name: '笔记工作台' });
  await expect(notebook).toBeVisible();
  await expect(page.getByRole('tab', { name: '朗读模式', selected: true })).toBeVisible();
  await expect(notebook.getByText('把朗读从 header 的瞬时按钮收成显式阅读模式，让目标、跟随状态和会话控制都可见。')).toBeVisible();
  await expect(page.getByLabel('朗读模式状态')).toContainText('跟随当前阅读位置');
  await expect(page.getByRole('button', { name: '锁定当前朗读目标' })).toBeVisible();
  await expect(notebook.locator('.tts-panel strong', { hasText: '当前朗读目标' })).toBeVisible();
  await expect(notebook.locator('.tts-panel strong', { hasText: '会话状态' })).toBeVisible();
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
    await page.getByRole('tab', { name: '笔记' }).click();
    await expect(page.getByRole('region', { name: '笔记面板' })).toContainText(sample.message);
    await expect(page.getByRole('button', { name: '当前格式暂不支持批注' })).toBeDisabled();
  }
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
  await page.getByRole('tab', { name: '笔记' }).click();
  const noteButton = page.locator('.primary-note-action');
  const highlightButton = page.locator('.secondary-note-action').first();
  await expect(noteButton).toBeDisabled();
  await expect(highlightButton).toBeDisabled();

  await selectText('plain text file exists');

  await expect(page.locator('.selection-card p')).toContainText('plain text file exists');
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
  await expect(page.locator('.selection-card p')).toContainText(
    'The rest of this fixture just adds enough steady reading length'
  );

  await highlightButton.click();
  await expect(page.locator('.notes-meta-row')).toContainText('2 高亮');
  await expect(page.locator('.notes-meta-row')).toContainText('0 笔记');

  await selectText('the book opens, the state moves, and the state comes back');
  await expect(page.locator('.selection-card p')).toContainText(
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

  await page.getByRole('tab', { name: '高亮' }).click();
  const highlightCards = page.locator('.highlight-card');
  const highlightsPanel = page.getByLabel('高亮面板');
  await expect(highlightsPanel).toContainText('已保存 2 条高亮');
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
  await page.getByRole('tab', { name: '高亮' }).click();
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
  await page.getByRole('tab', { name: '高亮' }).click();
  await expect(savedSelectionPanel).toContainText('刷新筛选按书保留');
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
  await savedSelectionPanel.getByRole('button', { name: '全部已保存' }).click();
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
  await expect(page.getByLabel('高亮面板')).toContainText('还没有高亮');

  await page.getByRole('tab', { name: '笔记' }).click();
  await expect(page.locator('.notes-meta-row')).toContainText('0 高亮');
  await expect(page.locator('.notes-meta-row')).toContainText('0 笔记');
  await expect(page.locator('.note-card')).toHaveCount(0);
  await page.reload();
  await page.getByRole('tab', { name: '笔记' }).click();
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

for (const sample of sampleReaderCases) {
  test(`reader opens and reopens ${sample.format} sample assets in web mode`, async ({ page }) => {
    await page.goto(
      `/reader?source=asset&url=${encodeURIComponent(sample.assetPath)}&label=${encodeURIComponent(sample.label)}`
    );

    const footer = page.getByLabel('阅读页脚控制');

    await expect(page.locator('.stage-error')).toHaveCount(0);
    await expect(page.getByRole('main', { name: /reader stage/i })).toBeVisible();
    await expect(page.getByText(new RegExp(`Failed to open ${sample.label}`, 'i'))).toHaveCount(0);
    await expect(footer).toContainText(sample.format);
    await expect(footer).toContainText(readerLayoutLabel(sample.layout));
    await expect(footer).not.toContainText('正在打开');

    await page.reload();

    await expect(page.locator('.stage-error')).toHaveCount(0);
    await expect(page.getByRole('main', { name: /reader stage/i })).toBeVisible();
    await expect(footer).toContainText(sample.format);
    await expect(footer).toContainText(readerLayoutLabel(sample.layout));
    await expect(footer).not.toContainText('正在打开');
  });
}
