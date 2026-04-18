# 0212: 用真实 `KF8` 样本替换占位 `AZW3`

前面的多格式回归虽然已经覆盖了：

- `FB2`
- `MOBI`
- `AZW3`
- `CBZ`

但其中有一个明显的质量问题：

- 仓库里的 `sample-book.azw3` 实际上只是把一个旧式 `MOBI` 文件换了扩展名

这意味着当时的 `AZW3` 证据只证明了：

- `.azw3` 扩展名能走进同一条 Kindle 容器打开链

却还不能证明：

- 当前样本真的是 `KF8`
- `br1` 真的在读一个更接近真实 `AZW3` 的文件

这类问题如果不主动修，会让审计表看起来很完整，但证据强度其实不够。

## 这次做了什么

这次没有继续改 reader 逻辑，而是直接把样本质量补正。

### 1. 用真实 `.azw3` 文件替换了旧占位样本

新的 `static/samples/sample-book.azw3` 来自公开可下载的样本源，并且经过本地头部校验，确认：

- 它仍然是 Kindle 容器
- 其 `version = 8`

也就是：

- 这次开始，`AZW3` 的样本不再只是“扩展名验证”
- 而是至少拥有一份真实 `KF8` fixture

### 2. 复跑了现有两条 `AZW3` 相关证据

替换样本后，重新验证：

- web asset 路径
- desktop `library-file` 路径

这样可以确认一件更重要的事：

- 现有 reader 打开链不是只对假样本有效
- 换成真实 `KF8` 之后，`br1` 仍能稳定打开

## 为什么这一步比继续堆更多测试更重要

如果样本本身是假的，那么：

- 再多的回归数量
- 再多的“通过”

都只是在放大一个错误前提。

这一步的价值，不在于“又加了一个功能”，而在于：

**把 `AZW3` 这一行的证据从弱证据提升成可信证据。**

这是 `P0-1` 这种格式基座工作里很关键的一种收口方式：

- 不只是加更多 case
- 而是先提高 case 本身的真实性

## 审计表如何变化

`FEATURE-PARITY-AUDIT.md` 现在不再写：

- `AZW3` 只是通过共享 Kindle 容器路径验证，`KF8` 仍未证实

而改成：

- `AZW3` 已经有真实 `KF8` 样本，并在 web 与 desktop `library-file` 两条路径上通过

但状态仍然保持 `Partial`。

这是对的，因为：

- 单个真实样本 ≠ 整个格式已经完全对齐

还没完成的仍然包括：

- 更广的 fixture 覆盖
- 多格式恢复语义
- 多格式 metadata / annotation / search 一致性
- 桌面导入 UI 和 `open with` 之类更完整的产品路径

## 这次验证了什么

实际跑过：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'opens FB2, MOBI, AZW3, and CBZ library-file samples in separate reader windows' --mochaOpts.timeout 120000"
git diff --check
```

结果：

- web smoke PASS
- focused desktop webdriver regression PASS
- `git diff --check` PASS

## 这次没有处理什么

这次没有继续处理：

- `AZW3` 更深层的格式特性差异
- 更大的 `KF8` fixture 矩阵
- `desktop import dialog` 自动化
- 多格式恢复位置 / 注释 / 搜索 parity

所以这次提交应当理解成：

**不是给 `AZW3` 新增功能，而是把它从“占位样本”提升到“真实 `KF8` 证据”。**
