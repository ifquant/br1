# 0223: 锁定 Kindle-family 的导入 metadata 契约

这次切片没有继续加新的打开路径，而是把 `P0-1` 里一个更真实的剩余缺口锁成了可验证契约：`MOBI` 和 `AZW3` 都走 Kindle 容器导入，但它们当前的 metadata 深度并不一样，不能再只证明 `AZW3`。

## 为什么这一步值钱

前面的几刀已经证明：

- `FB2 / MOBI / AZW3 / CBZ / TXT` 能导入
- 能打开
- 能回到 library
- 能带着 restore 信号重开

但 `FEATURE-PARITY-AUDIT.md` 里还明确写着，多格式主线剩下的更大 gap 是 `deeper metadata consistency across formats`。

如果只测 `AZW3`，那我们其实只证明了：

- 真正带完整 EXTH metadata 的 Kindle 容器可以导入 richer metadata

却没有证明：

- 老式 `MOBI` 在 metadata 稀疏时，是否至少会稳定落到“可读 fallback”，而不是空字符串、垃圾值，或者要等 reader 往返后才偶然变干净

这是两个不同层级的产品契约。

## 这次实际做了什么

### 1. 把 focused regression 从 `AZW3-only` 扩成 `Kindle-family`

桌面回归现在不再只检查：

- `AZW3` 导入后是否立即得到 `author / language / publisher / description`

还会同时检查：

- `MOBI` 导入后是否立即得到它当前样本真实能提供的字段
- 不能提供的字段是否落到稳定且人类可读的 fallback

也就是说，当前 `MOBI` 的产品契约被明确成：

- `title = sample-book`
- `author = Unknown author`
- `language = en`
- `publisher = None`
- `description = None`

这不是“理想最终状态”，但它是当前真实、可验证、不会误导的状态。

### 2. 顺手修掉一个真的 `MOBI` importer bug

focused regression 这次不是只补证据，它还直接打出了一个真实问题：

- 当前 `sample-book.mobi` 明明带着 `EXTH` 区块和 `language = en`
- 但 importer 因为硬信 `MOBI header flags & 0x40` 才允许解析 `EXTH`
- 结果旧式 `MOBI` 在 flag 没置位时，会被整块跳过，最后 library 里落成 `language = None`

这次修成了更稳的规则：

- 先在允许范围内找 `EXTH` marker
- 只要 marker 真实存在，就继续解析
- 不再因为某些 legacy `MOBI` 没置标志位，就把现成 metadata 全部扔掉

这一步的价值在于，它把 “MOBI 只有 clean fallback” 推进成了：

- `MOBI` 至少能可靠导入当前样本里真实存在的 `language`
- 同时对缺失字段仍然保持干净 fallback

### 3. 更新 feature audit，让总账反映真实证据

总账现在不再继续写成：

- 只证明了 `AZW3` 的 Kindle container metadata

而是明确分成两层：

- `MOBI`：有 clean fallback contract
- `AZW3`：有 richer container metadata contract

同时顺手把上一刀 `TXT` 已正式支持后的证据行补齐：

- import contract 包含 `.txt`
- reader file input 包含 `.txt`
- web smoke 和 desktop evidence 也都包含 `TXT`

## 为什么不在这一步强行把 MOBI 也做成和 AZW3 一样 rich

因为那样很容易开始“假对齐”。

当前这个仓库内的 `sample-book.mobi` 真实可提取到的是：

- `language = en`

它不像现在的 `sample-book.azw3` 那样，本身就带完整 EXTH metadata。

如果在没有更好 fixture 的情况下，硬把 `MOBI` 包装成“也已经有 rich metadata”，那就是把 audit 做脏了。

这一步更稳的做法是先把真实 contract 锁住：

- 能提取的字段，导入时就落盘
- 提不出来的字段，稳定回退成可读值

后面如果换进更强的 `MOBI` fixture，再把 contract 往上推。

## 结果

`P0-1` 的多格式主线现在又少了一个模糊地带：

- 不再只是知道 `AZW3` 可以 richer import
- 也明确知道 `MOBI` 当前是“language + clean fallback”这一级产品行为

这让 `Multi-Format Support` 这行总账的结论更诚实，也更适合继续往 richer metadata 或 secondary-format annotation 一致性推进。

## 这一步没有包含

- 没有新增 `MOBI` richer metadata 解析实现
- 没有更换成更强的 `MOBI` fixture
- 没有开始做 secondary formats 的 annotation/highlight 一致性
