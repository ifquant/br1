# 0111：把 reader notes 从 localStorage 提升到宿主 store

这次改动的目的很直接：

- 之前 notes 已经能新增、编辑、删除、回跳、高亮
- 但它们还只是存在浏览器侧 `localStorage`
- 对桌面阅读器来说，这个层级太轻了，不够像 `Readest`

所以这次把 notes 提升成了更正式的宿主持久化：

- Tauri 桌面端：存到应用数据目录里的 `reader-notes/*.json`
- 非桌面环境：继续保留 `localStorage` fallback

## 这次做了什么

1. 在 [/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs) 新增：
   - `load_reader_notes`
   - `save_reader_notes`
2. 在 [/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerNotes.ts](/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerNotes.ts) 新增前端服务封装
3. 在 [/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 里：
   - 优先从宿主 store 读 notes
   - 修改 notes 后优先写回宿主 store
   - 只有在非 Tauri 环境下才回退到 `localStorage`

## 为什么这比一直用 localStorage 更对

`localStorage` 适合：
- demo
- 快速实验
- 单页应用里的轻量状态

但对桌面阅读器来说，notes 更像“书的数据”，不是“页面的小状态”。  
放到宿主 store 有几个直接好处：

- 更接近真正的 per-book config / annotation store
- 不依赖浏览器环境是否保留同一个 origin 状态
- 后面要和 `library`、导出、同步整合时更自然

## 这次可以学到的两个点

### 1. 做迁移时，最稳的是“宿主优先 + web fallback”

如果这次硬切到宿主 store 而完全删掉 fallback，会让 web-mode 或调试页突然断掉。  
所以这里采用的是：

- 桌面端：host store
- 非桌面端：localStorage

这种双轨方式很适合在迁移早期保护现有能力。

### 2. 持久化入口最好集中在 route，不要散落在组件里

`ReaderSidebar` 和 `ReaderViewport` 都只是 reader 的局部视图。  
真正知道：

- 当前书是谁
- 当前 book key 是什么
- 当前环境是不是 Tauri

的是 route 层。  
所以 notes 的 load/save 仍然放在 `+page.svelte`，这是更稳定的边界。

## 实际验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 这次没做的

- 还没有做 notes 数据从旧 `localStorage` 自动迁移到宿主 store
- 也还没有支持“同一 CFI 多条 note”的更完整数据模型
