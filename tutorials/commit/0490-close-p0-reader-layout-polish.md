# 0490: close remaining reader chrome and sidebar layout polish

这一刀的目标不是扩 reader 功能，而是把 P0-2.2 里剩下的窗口壳体对齐问题收口掉，让 header、footer、viewport、sidebar 在 Readest 风格的 window mode 里用同一组布局 token。

这次主要做了两件事：

- 把 window-mode 的 frame width / edge inset token 提到 `reader-shell` 这一层，header、footer、viewport 直接读同一组变量
- 去掉 sidebar window-mode 里叠加在 workspace padding 上的额外纵向 margin，避免侧栏卡片比正文舞台和 chrome 更“下沉”

我顺手把 sidebar overlay 的 top / left / bottom inset 也接回了同一组 shell token，这样 pinned / overlay 两种状态都不会再出现自己一套边距的情况。

覆盖到的 surface：

- header
- footer
- viewport / canvas
- sidebar
- PDF host / TXT paper / foliate surface 的窗口壳体 token 读取路径

验证结果：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`，PASS
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`，PASS

没做的事：

- 没有改 reader 状态模型
- 没有补新的 e2e 回归，这一刀只做 source/static 层面的 layout certification
