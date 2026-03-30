# 0093 把 reader 的 header/footer 收成 hover overlay

这次不是继续改布局，而是补 `Readest` 那种更轻的 chrome 行为：

- 靠近时出现
- 离开后退场

这样顶部和底部 bar 就不再一直压在正文上。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFooterBar.svelte`

### 1. ReaderStage 开始管理 `chromeVisible`

`ReaderStage` 现在在 `window-mode` 下会根据鼠标位置决定：

- 顶部 / 底部 bar 是否应该显示

规则很简单：

- 靠近顶部
- 靠近底部
- 或者组件获得 focus

就显示 chrome。

### 2. 离开后延迟收起

当用户离开舞台时，不会立刻消失，而是延迟约 1.2 秒再收起。  
这样不会显得“闪一下就没了”。

### 3. 侧栏展开时强制保持可见

如果 sidebar 还开着，就不急着隐藏 header/footer。  
这能避免 panel 交互和顶部 bar 的显隐互相打架。

### 4. Header/Footer 改成真正 overlay 过渡层

`ReaderHeaderBar` 和 `ReaderFooterBar` 现在都接受：

- `isVisible`

在 `window-mode` 下会用：

- `opacity`
- `transform`
- `pointer-events`

控制显隐，而不是永远顶在正文上。

## 这次能学到的 2 个编程点

### 知识点 1：overlay chrome 的显隐控制最好放在共同父层

如果 header 和 footer 各自判断自己该不该出现，很容易出现节奏不一致。  
更稳的做法是像这次一样，把：

- `chromeVisible`

放在 `ReaderStage` 统一控制，再往下传。

### 知识点 2：隐藏 UI 时不仅要改透明度，还要改 pointer-events

如果只把元素设成透明，它仍然可能挡住下面的交互。  
所以这次显隐同时控制了：

- `opacity`
- `transform`
- `pointer-events`

这是一种很常见的 overlay UI 写法。

## 这次还没做什么

- 还没有做更复杂的滚动驱动显隐
- 也还没有根据设备尺寸或阅读状态进一步细分 bar 的出现条件

这次先把最基本的 hover overlay 行为立住。
