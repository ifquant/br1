# 0210: 给 FB2 / MOBI / AZW3 / CBZ 补可验证的打开路径

本次提交的目标不是宣称 `br1` 已经完成多格式阅读，而是先把 `FB2 / MOBI / AZW3 / CBZ` 从“输入合同里说支持”推进到“仓库内至少有一条可跑的端到端打开证据”。

## 为什么要先做这一刀

前面的格式合同切片已经把：

- desktop picker
- library hidden file input
- reader route / open boundary

统一到了同一套扩展名合同里。

但那还只是“能选这些文件”。如果没有真实样本和回归，`FEATURE-PARITY-AUDIT.md` 里对多格式支持的判断仍然只能写成：

- `EPUB/PDF` 真正可验证
- `FB2/MOBI/AZW3/CBZ` 只是边界接通

这会让 `P0-1` 停在一个很危险的中间态：看起来支持，实际上没有证据。

所以这次提交只做一件事：

**给这四种格式各落一条仓库内可跑的 web 端到端打开路径。**

## 这次具体做了什么

### 1. 新增最小样本

新增了四个可供 `/reader?source=asset` 直接打开的样本：

- `static/samples/sample-book.fb2`
- `static/samples/sample-book.mobi`
- `static/samples/sample-book.azw3`
- `static/samples/sample-comic.cbz`

其中：

- `FB2` 样本是仓库内手写的最小合法 `FictionBook` XML
- `CBZ` 样本是两页 SVG 打包成的最小 comic archive
- `MOBI` 样本来自公开的 `libmobi` 测试样本
- `AZW3` 当前复用同一条 Kindle 容器路径来验证 `.azw3` 扩展名的 reader open flow

这里最重要的不是“样本多丰富”，而是它们足够小、足够稳定、足够适合回归。

### 2. 把 smoke 从“能选”推进到“能打开”

`tests/e2e/library-smoke.spec.ts` 新增了四条样本回归：

- 打开 `FB2`
- 打开 `MOBI`
- 打开 `AZW3`
- 打开 `CBZ`

每条回归都直接访问 reader asset URL，然后验证：

- 没有落到 `.stage-error`
- 没有出现 `Failed to open ...`
- footer 里出现了预期的 `format`
- footer 里出现了预期的 `layout`

也就是说，这次不是只验证“文件路径可达”，而是验证：

**reader 已经真的走完整条打开链并进入稳定的 preview state。**

### 3. 同步更新产品总账

`FEATURE-PARITY-AUDIT.md` 的 `Multi-Format Support` 条目也一起更新了。

现在它不再说：

- `FB2/MOBI/AZW3/CBZ` 没有端到端证据

而是改成：

- 这几种格式已经各有一条可验证的样本打开路径
- 但仍然不能宣称“完整 parity”

这一步很关键，因为总账现在能区分：

- **有无证据**
- **证据强度够不够支撑“Completed”**

## 为什么 `AZW3` 这里还不能算完全收口

这次的 `AZW3` 验证，证明的是：

- `.azw3` 扩展名
- 通过 `foliate-js` 的 Kindle 容器识别路径
- 能进入 `br1` reader 并稳定渲染

但它**还不能等价于**：

- 已经验证了真实 `KF8` 专属能力
- 已经覆盖 `AZW3` 的更深层格式差异

所以 audit 里仍然保持保守说法：

- `Multi-Format Support` 还是 `Partial`

这是正确的。因为这次关闭的是“完全没有证据”的问题，不是“所有 Kindle 细节都已对齐”的问题。

## 这次验证了什么

实际跑过：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
pnpm check
git diff --check
```

结果：

- `library-smoke` PASS
- `pnpm check` PASS
- `git diff --check` PASS

## 这次没有处理什么

这次**没有**处理：

- desktop `library-file` 形式的 `FB2/MOBI/AZW3/CBZ` 回归
- 真正的 `KF8` 专属 `AZW3` fixture
- `TXT` 的实现，它仍然只是明确降级
- 更丰富的多格式 metadata / progress / restore parity

所以这次提交应该理解成：

**给 `P0-1` 补一块“格式证据底座”，不是宣布多格式支持完成。**
