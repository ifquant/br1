# Record the P14 closeout review

## Why

`P14` 现在已经不缺“再补一个 current-book restore 开关”这种同类薄片了。真正还剩下的东西，已经开始变成：

- payload-heavy deep-link state
- cross-book archive/replay behavior
- 或者更外层的 workspace shell persistence

这些都不再是 `P14` 最初承诺的 current-book ownership persistence 范围。

## What changed

- 把 `P14` 的 closeout review verdict 写进 repo，而不是继续靠聊天记忆判断这条线是否该停。
- 明确记录：当前没有剩余结构性 blocker。
- 明确记录：如果后面还要继续 reader persistence，应开新的 mainline，而不是再回 `P14` 里切碎片。

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- 这刀不做新的 runtime/product change。
- 这刀不决定下一条主线具体叫什么，只把 `P14` 的边界收死。
