# 0096: 让 reader header 真正切换 sidebar panels

这次提交继续补 `reader` 的行为层对齐。前两刀已经把 `sidebar` 里的 `目录 / 搜索 / 笔记` 做成了真实 panel，也把顶部双层 chrome 压回了更像单一系统 bar 的结构。下一步自然就是：让 header 上的动作真的能驱动 sidebar，而不是继续当装饰按钮。

## 这次要解决什么

之前 `ReaderHeaderBar` 里的很多按钮 still 更像占位：

- `⌂`
- `Aa`
- `🔊`
- `⋯`

它们在视觉上占着位置，但没有真正参与 reader 的 panel system。  
而 `Readest` 的 header 并不是“摆几个图标好看”，而是：

- 顶部 controls 会驱动 sidebar
- sidebar 又会切到不同内容面板

所以这次的目标很明确：

- 把 `header -> sidebar` 这条状态链接通

## 这次改了什么

改动文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

### 1. 在 route 层提升 `sidebarTab` 状态

这次把 tab 状态提升到了 reader route：

```ts
let sidebarTab: 'toc' | 'search' | 'notes' = 'toc';
```

并且统一通过：

```ts
const openSidebarTab = (tab) => {
  sidebarTab = tab;
  sidebarVisible = true;
};
```

来切换。

这样做的原因是：

- `ReaderHeaderBar` 和 `ReaderSidebar` 是兄弟关系
- 它们不应该彼此偷偷操作 DOM
- 应该让 route 做组合层，统一持有共享状态

这也是之前我们一直坚持的那个原则：**route 做 composition，不做散乱业务逻辑。**

### 2. `ReaderStage` 不再只是透传 toggle，还能透传 `switchsidebartab`

现在 `ReaderStage` 会把 header 想切换到哪一个 panel 的意图，向上派发给 route：

```ts
dispatch('switchsidebartab', tab);
```

这能让 Stage 继续保持“组合层”，而不是在内部偷偷拥有 sidebar 状态。

### 3. `ReaderHeaderBar` 的按钮开始变成真实 panel controls

这次把原来更偏占位的按钮收成了：

- `⌂`：打开书
- `⌕`：切到搜索 panel
- `✎`：切到笔记 panel
- `⋯`：保留更多动作位

并且加了 active 状态：

- 当 sidebar 当前就在 `search`
- 或者当前就在 `notes`

按钮会有自己的激活样式。

### 4. `ReaderSidebar` 不再偷偷自己维护 tab

这次把它改成受控组件：

- `activeTab` 从外面传进来
- `onTabChange` 负责把点击结果告诉上层

这是前端里一个很重要的结构升级：  
从“组件自己藏状态”升级成“上层统一控制状态”。

## 这里对应的编程知识

### 1. 为什么共享状态要提升到共同父组件

当两个组件都要读写同一份状态时，最稳的方式通常是：

- 把状态提升到它们最近的共同父组件

这次就是：

- `ReaderHeaderBar` 想切 tab
- `ReaderSidebar` 也想切 tab

所以 `sidebarTab` 最适合放在 `reader/+page.svelte`

这叫 **lifting state up**，是前端里非常常见也非常重要的结构手法。

### 2. 受控组件会比“内部自管状态”更容易组合

这次 `ReaderSidebar` 从：

- 自己内部 `let activeTab = ...`

变成：

- `export let activeTab`
- `export let onTabChange`

受控组件的好处是：

- 谁来决定状态，一眼清楚
- 更容易让 header、快捷键、route、store 一起协作
- 更适合复杂产品 UI，而不是单个孤立控件

## 我实际怎么验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `pnpm check`：PASS
- `git diff --check`：PASS

## 这次还没做的

- `search` 还只是 TOC 过滤，不是全文检索
- `notes` 还没有接真实 annotations/notebook 数据
- `header` 里的更多动作还不是完整 `Readest` 级工具集
