# 0259: 给 highlights workspace 补第一条按组反选路径

这次继续沿 `highlights` workspace 的 group-level 管理往前推，但不再只是“能选”或“能删”，而是让章节组第一次具备真正的集合翻转动作：

- `反选本组高亮`

## 为什么这刀值得做

到 `0258` 为止，章节组已经第一次具备了三种动作：

- `选中本组高亮`
- `清空本组选择`
- `删除本组高亮`

这说明 group 已经从“可见分组”变成了“可直接操作的对象”。  
但它还缺一个非常关键的管理粒度：

- 不重建 selection set
- 不退回全视图
- 只翻转当前 group 对选择集的贡献

如果没有这一刀，现有的 invert 仍然只有：

- `反选当前视图高亮`

那就意味着：

- selection management 还是以整个当前视图为最小翻转单位
- 章节组虽然能“整组选中”与“整组清空”，但还不能作为独立集合做局部翻转

所以这刀的目标很明确：

- 让章节组第一次支持局部 `invert-selection`

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

### 1. 每个高亮分组新增 `反选本组高亮`

在 `高亮` tab 的每个分组 action row 里，现在除了：

- `选中本组高亮`
- `清空本组选择`
- `删除本组高亮`

之外，还新增了：

- `反选本组高亮`

它的实现仍然复用同一个 `selectedHighlightIds`：

1. 遍历当前组里的 `group.notes`
2. 已选中的就移出
3. 未选中的就加入
4. 最后一次性写回新的 selection set

所以它不是单独的新状态层，而是：

- 继续复用现有 selection set
- 只是把章节组第一次变成“局部翻转”的操作对象

### 2. TXT web smoke 现在直接证明 group-level invert

原来的 TXT web smoke 在：

- 单独选中 1 条高亮
- 回到 `全部`

之后，走的是：

- `反选当前视图高亮`

现在改成：

- `反选本组高亮`

这样 TXT web 证明的就变成了：

1. 可以先选中组里的一条高亮
2. 可以进入 `已选高亮` 视图确认这个 selection set
3. 回到 `全部`
4. 只对当前 group 做反选
5. 结果变成“原来那条取消，另一条进来”
6. 后续 `删除选中高亮` 继续消费这个翻转后的局部集合

也就是说：

- 新 group-level invert 不是悬空按钮
- 它已经接进了后面的 delete 链路

### 3. EPUB desktop regression 也改成组级反选

桌面的 `EPUB` 主路径 regression 这次同步改成：

- 在 `高亮` tab 中先选中一条
- 进入 `已选高亮` 视图确认
- 回到 `全部`
- 执行 `反选本组高亮`
- 再验证选择状态已经在当前组内部翻转

这一步很关键，因为它证明：

- group-level invert 已经不只是 web 层的按钮行为
- 它已经进入真实 desktop reader 的 annotation management 主路径

## 为什么这次仍然只锁 `TXT web + EPUB desktop`

这次我还是有意把证据范围压在：

- `TXT web`
- `EPUB desktop`

原因很直接：

- 先把新的 group-level 集合操作本身锁稳
- 不急着把所有 secondary-format regression 都同步改一遍

否则又会重新陷进“同等级证据复制”，而不是先判断这个新管理粒度本身是不是值得保留。

## 审计表同步了什么

`FEATURE-PARITY-AUDIT.md` 这次新增了一条明确结论：

- 现在已经有第一条 `per-group invert-selection path`

当前证据范围写死为：

- `web TXT`
- `desktop EPUB`

这让功能总账更准确：

- group-level management 不再只是 select / clear / delete
- 章节组现在也开始承担局部集合翻转

## 这刀没做什么

这次没有补：

- `FB2 / MOBI / AZW3` 的 group-level invert evidence
- selected-only 视图里的 group-level 组合动作
- selection persistence
- cross-group / cross-chapter selection set

所以它只是：

- 给 highlights workspace 补第一条按组反选路径
- 并先用 `TXT web + EPUB desktop` 把它锁住

不是整条 selection-management 线的最终收口。

## 验证

本次实际运行：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
- `PASS`
