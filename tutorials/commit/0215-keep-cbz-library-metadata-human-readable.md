# 0215: 保持 CBZ 的 library metadata 可读

这次提交处理的是一个很具体、但会直接影响产品观感的多格式问题：

- `CBZ` 能导入
- `CBZ` 能打开
- `CBZ` 能回流到 library

但在回流之后，library 里的 metadata 会被污染成内部实现细节：

- `title` 可能变成带时间戳前缀的存储文件名
- `status` 可能变成 `002-page.svg` 这类内部页面资源名

这会让“格式支持”在用户视角上看起来仍然是半成品。

## 问题长什么样

在这次修复前，本地 `library.json` 里会出现类似这样的记录：

- `title = "1776494250354-sample-comic.cbz"`
- `status = "002-page.svg"`

这两个值都不是用户想看到的阅读信息：

- 前者暴露了库内存储实现
- 后者暴露了 `CBZ` 内部页面资源文件名

## 做了什么

### 1. 在 Rust 持久化层加入 metadata 归一化

在 [`src-tauri/src/commands/library.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs) 里新增了两个小 helper：

- `derive_library_title()`
- `derive_library_status()`

规则很明确：

- 如果 reader 回传的 `title` 看起来像带数字前缀的存储文件名，就优先回退到 `sourcePath` 的原始文件 stem
- 如果回传的 `chapterLabel` 看起来像内部资源文件名（例如 `.svg` / `.png`），就不要把它直接持久化成 `status`
- 对这种场景统一收成更产品化的 `继续阅读`

这样做的好处是：

- 不用改 library UI 逻辑
- 不用给 `CBZ` 单独造一套前端补丁
- 直接在持久化边界把脏值挡住

### 2. 新增 focused desktop regression

在 [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts) 里新增：

- `keeps cbz library metadata human-readable after reader round-trips`

这条回归会：

1. 导入样本 `CBZ`
2. 打开 reader
3. 推进一次阅读状态
4. 回到 library
5. 直接读取 `library.json`
6. 断言：
   - `title === "sample-comic"`
   - `title` 不带时间戳前缀
   - `status` 不是 `.svg/.png/...`
   - `status === "继续阅读"`

这条测试锁的是产品输出，不是内部实现。

## 为什么这样做

这一步的价值不在于“修得漂亮”，而在于把多格式支持从“技术上能读”推进到“产品上不露馅”。

`P0-1` 到这个阶段，最大的风险已经不是：

- 还能不能再多支持一种扩展名

而是：

- library 和 reader 来回一次后，产品表面会不会漏出底层实现细节

如果这些值不收掉，用户感知到的就不是“支持 CBZ”，而是“支持得很毛糙”。

## 验证

本次实际运行：

```bash
cargo check --manifest-path src-tauri/Cargo.toml
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'keeps cbz library metadata human-readable after reader round-trips' --mochaOpts.timeout 120000"
git diff --check
```

## 还没解决

这次仍然只是 `CBZ` 这一类最明显脏值的收口，不代表多格式 metadata 已经全面完成。后面还差：

- 更多格式的 title / author 对齐
- `status / progress` 语义继续统一
- 注释、搜索、书签等跨格式一致性

所以这次是把“CBZ metadata 不露内部实现”这件事先锁住，而不是宣告整个 metadata 主线完结。
