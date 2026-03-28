# 0008 Add foliate-js as a git submodule dependency

## 背景

前面已经给 `br1` 的 reader 建好了 Svelte 壳和阅读引擎挂载边界，但真正的阅读能力还没有接进来。

这一步先不急着写 adapter，而是先把阅读引擎源码的来源固定下来。  
用户明确希望把 [ifquant/foliate-js](https://github.com/ifquant/foliate-js) 作为子项目引入，而不是从 `readest` 本地代码里散搬。

这和 `foliate-js` 自己 README 里的建议也是一致的：当前库 API 还不稳定，更适合通过 git submodule 方式受控引入。

## 主要目标

- 把 `ifquant/foliate-js` 正式纳入 `br1`
- 固定一个明确的上游提交，而不是让依赖来源悬空
- 为下一步写 `foliate-js -> br1` 适配层准备稳定来源

## 改动概览

- 新增 `.gitmodules`
- 把 `https://github.com/ifquant/foliate-js.git` 作为 git submodule 加到：
  - `vendor/foliate-js`
- 当前锁定子模块提交：
  - `7de55d4ebfff3264abc638586212e380e934cae1`

## 关键知识

### 1. 为什么这里用 git submodule，而不是 npm 包或手工复制

这次选 `git submodule`，核心不是“更高级”，而是更适合这个依赖的现实状态：

- `foliate-js` 目前不是一个稳定发布的 npm 包工作流
- README 明确建议把它作为 git submodule 引入
- 我们后面大概率要读它的源码、跟它的 DOM 结构和模块边界打交道

如果现在手工复制代码，会有几个问题：

- 上游来源会慢慢变模糊
- 以后想同步上游改动时很难知道自己改过什么
- `br1` 仓库会混入一大块“看起来像自己代码，实际上是 vendored upstream”的内容

submodule 的好处是把这件事说清楚：

- 这是外部依赖
- 它有独立历史
- `br1` 只锁定它的某个提交

### 2. git submodule 的本质是“主仓库记录一个外部仓库的提交指针”

很多人第一次用 submodule 会误以为：

- 主仓库把对方代码完整吸进来了
- 或者 submodule 像普通目录一样只是多了个 `.git`

更准确的理解是：

- 主仓库提交的是一个“指向外部仓库某个 commit 的引用”
- `.gitmodules` 记录的是路径和来源 URL
- 真正的源码历史仍然属于子仓库自己

所以后面如果要更新它，通常流程会是：

```bash
cd vendor/foliate-js
git fetch
git checkout <new-commit>
cd ../..
git add vendor/foliate-js
git commit
```

也就是说，主仓库真正提交的是“把子模块指针从 A 挪到 B”。

### 3. 为什么路径选 `vendor/foliate-js`

路径命名本身也是工程信息。

这里用 `vendor/foliate-js`，是为了表达：

- 这是受控引入的上游代码
- 它不是 `br1/src` 里那种可随意揉在业务逻辑里的本地模块
- 将来 adapter 应该写在 `br1` 自己的 `src/lib/reader/`，而不是直接把业务逻辑改进 submodule 里

这能提前减少一个常见问题：  
“为了快，先去第三方源码里随手改两行，之后再说。”

## 验证

- `git submodule status` (PASS)
- `pnpm check` (PASS)

## 未覆盖项

- 这次没有开始接 `foliate-js` 到 `ReaderViewport`
- 这次没有定义 adapter 层，也没有测试真实打开 EPUB
- 这次只是把依赖来源固定下来，真正的运行时集成留到下一步
