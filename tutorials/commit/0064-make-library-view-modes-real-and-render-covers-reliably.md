# 0064：让书库视图模式真正可切换，并稳定显示书籍封面

这次其实修了两个一直挂在界面上的假动作：

- `网格 / 列表` 之前只是视觉标签，不是真的切换
- 封面虽然已经迁进 `br1` 了，但前端并没有稳定把它们显示出来

所以表面现象就是：

- 你点“网格”，页面还是列表
- 书库里明明有 `cover.png`，界面却只显示一个坏图标

## 改了什么

- 在 `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte`
  - 把 `网格 / 列表` 从静态 `<span>` 改成真实按钮
  - 通过 `onChangeViewMode` 把视图切换事件抛给上层
- 在 `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
  - 增加 `libraryViewMode`
  - `你的书库` 现在会真的在 `grid` 和 `list` 间切换
- 在 `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
  - 新增 `load_library_cover_data_urls`
  - 直接把本地 `cover.png` 读成 data URL 返回给前端
- 在 `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`
  - 封面不再赌 `convertFileSrc`
  - 改成走 Rust 命令拿稳定的 data URL

## 这次值得学的两个知识点

### 1. 视觉状态和真实状态必须接起来，不然 UI 就是在撒谎

之前 `BookshelfPreview` 里的“网格 / 列表”只是：

- 两个看起来可点的标签
- 但没有状态回传
- 也没有真正驱动上层重新渲染

这种 UI 最容易误导用户，因为它“看起来支持”，但实际上什么都没做。  
做法很简单：

- 组件里负责发事件
- 路由层负责持有真实状态
- 再把状态传回组件

这样视图切换才是活的。

### 2. 桌面本地资源如果一直显示不稳，走 data URL 往往比继续赌协议配置更稳

这次封面文件其实已经在磁盘上了，问题不在“有没有文件”，而在“前端怎么稳定拿到它”。

原来走的是：

- `coverPath -> convertFileSrc(...) -> img src`

这条链在桌面壳里不一定总是稳定。  
所以这次直接换成：

- Rust 读二进制
- Rust 转成 `data:image/png;base64,...`
- 前端直接喂给 `<img>`

这不是最轻的方案，但对当前阶段是很稳的方案。先让它显示对，再谈更高阶的资源策略。

## 我怎么验证

实际跑过：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` `PASS`
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml` `PASS`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` `PASS`

## 还没做什么

- 还没有把书库视图模式持久化到本地设置
- 当前封面方案优先稳定显示，不是最低开销的最终方案
