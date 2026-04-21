# 0324 - 增加本地书架归类筛选

上一轮已经让书库条目可以保存 `书架归类`。这次把它从“只读/可编辑字段”推进成真正可用的管理动作：library header 现在会根据当前书库生成 collection filter，用户可以按本地归类收窄 `继续阅读 / 最近阅读 / 你的书库 / 待修复书籍`。

## 改了什么

- `LibraryHeader` 新增 collection filter pills。
- `library/+page.svelte` 从当前书库记录生成去重后的 collection options。
- collection filter 和已有状态 filter 组合生效，而不是替代状态 filter。
- 搜索 haystack 现在包含 collection，所以可以直接搜归类名称。
- library scroll restore key 纳入 collection filter，避免不同归类之间共享错误滚动位置。
- web smoke 用样例书库验证 `政治哲学` 归类可以筛出 `A Theory of Justice` 和 `论法的精神`。

## 为什么这样做

完整 collections/tags 管理还需要批量归类、分组视图、重命名、迁移和空集合处理，不适合在一个小 slice 里完成。先做 filter 的价值更直接：

- 让上一轮的 collection 字段变成用户可感知的管理面。
- 不引入在线 catalog、账号、同步或服务依赖。
- 和现有状态筛选共享同一套 product semantics，降低后续扩展成本。

## 实现细节

过滤顺序是：

```text
search/sort source list
-> status filter
-> collection filter
-> visible continue/recent/shelf/recovery sections
```

collection 空值会显示为 `未归类`，但 header 只展示真实存在的非空 collection options，避免刚导入的普通书库出现一排低价值筛选按钮。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`

## 没有包含

- 没有做多标签。
- 没有做批量归类、重命名归类或 collection 管理页。
- 没有做 cover editing。
- 没有接入在线目录或同步服务。
