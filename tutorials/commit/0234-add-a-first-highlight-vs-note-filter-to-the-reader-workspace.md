# 0234: 给 reader notes workspace 补第一层高亮/笔记筛选

这次不是继续补格式证据，而是往 `P0-3 Annotations and Highlighting` 的产品面推进一小步：让 notes workspace 第一次具备“按标注类型管理”的能力。

## 为什么做这刀

前面的提交已经把 annotation 这条线分成了两类真实动作：

- `高亮`
- `笔记`

而且这些动作已经在：

- `TXT`
- `EPUB`
- `FB2`
- `MOBI/AZW3`

上都有实际持久化证据。

但 workspace 本身还停留在“所有标注都堆在一起”。这会带来一个很实际的问题：

- 用户虽然能创建高亮和笔记
- 但无法快速只看高亮，或者只看真正带正文补充的笔记

这就是一个典型的“底层能力已有，但管理面还没跟上”的 gap。

## 改了什么

### 1. notes workspace 新增类型筛选

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

notes 面板现在除了原来的：

- `全部`
- `当前章节`

之外，又新增了一组 annotation kind filters：

- `全部类型`
- `高亮`
- `笔记`

这里的设计有几个要点：

1. **不改持久化模型**
   - 这刀只动展示和管理层，不改 notes 数据结构
   - 仍然复用现有的 `note.kind === 'highlight' | 'note'`

2. **先按 scope，再按 kind 过滤**
   - 先应用 `全部 / 当前章节`
   - 再在这个结果上应用 `全部类型 / 高亮 / 笔记`
   - 这样逻辑是可叠加的，而不是互相打架

3. **meta row 会显式反映当前视角**
   - `仅看高亮`
   - `仅看笔记`
   - `全部类型`

4. **空态会区分“这个章节没有内容”和“这个类型当前为空”**
   - 如果当前 scope 里有标注，但当前类型过滤后为空，会显示：
     - `当前筛选下还没有高亮`
     - 或 `当前筛选下还没有笔记`
   - 这比直接掉回总空态更诚实

### 2. 用现有 TXT web flow 锁住这个行为

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这里没有新造一条复杂 regression，而是把已经存在的 `TXT notes/highlights` smoke 往前扩了一步：

1. 先创建一条高亮
2. 再创建一条笔记
3. 点击 `高亮` 过滤
   - 只剩 1 条高亮卡片
4. 点击 `笔记` 过滤
   - 只剩 1 条笔记卡片
5. 点击 `全部类型`
   - 重新看到两条记录

这样这刀验证的是“已有 annotation split 是否真正形成了一个可管理的 workspace”，而不只是按钮还在。

## 这刀的意义

它的价值不在于多了三个 chip，而在于 annotation 这条线开始从：

- “可以创建高亮/笔记”

往：

- “可以管理高亮/笔记”

跨了一步。

也就是说，当前 reader 的 notes workspace 已经不再只是一个 capture 面板，而是开始有了第一层分类浏览能力。

这正好对应 `FEATURE-PARITY-AUDIT.md` 里之前提到的 gap：

- `dedicated highlight management`

这刀还没把这个 gap 彻底收完，但至少已经从“完全没有”推进到“有一个最小真实产品面”。

## 还没做什么

这刀刻意没有碰下面这些更重的点：

- 单独的 highlights workspace
- 批量删除或批量转换
- instant mode annotation
- 更复杂的高亮颜色或分组系统
- desktop-focused highlight management regression

也就是说，它是一个低风险的产品面推进，不是 annotation 系统的大改。

## 验证

本次实际运行：

```bash
pnpm check
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
