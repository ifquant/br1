# 0332 - 给全部归类和全部标签补总数

上一轮每个 collection/tag 筛选项已经显示它覆盖的书籍数量，但集合入口本身仍然只是 `全部归类` 和 `全部标签`。这轮把集合入口也补上规模，让 header 的元数据管理信息更一致。

## 改了什么

- `全部归类` 显示当前归类组数。
- `全部标签` 显示当前标签总数。
- 单项 collection/tag 的 `N 本` 保持不变。
- web smoke 覆盖 `全部归类 3 组` 和 `全部标签 8 个`。

## 为什么这样做

这不是新的筛选语义，只是把已有 collection/tag inventory 信息放到最靠近操作的位置。用户可以在同一行看到：

- 当前有多少组归类
- 当前有多少个标签
- 每个归类或标签覆盖多少本书

这样 collection/tag header 不再像普通按钮堆，而更像一个轻量的本地书库管理面。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 没有包含

- 没有做多选筛选。
- 没有做批量重命名或独立 collection/tag 管理页。
- 没有做 cover editing、在线目录或同步能力。
