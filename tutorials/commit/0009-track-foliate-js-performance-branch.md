# 0009 Track the foliate-js performance branch from br1

## 背景

`br1` 已经把 `foliate-js` 作为 git submodule 引进来了，但默认还是跟着上游的 `main`。

这一步的需求更具体：

- 在 `foliate-js` 远程上切一个 `performance` 分支
- 把 `br1` 的 submodule 配置改成默认跟踪这个分支

这样后面如果我们要在 `foliate-js` 上做性能相关实验，就不会和 `main` 混在一起。

## 主要目标

- 在 `vendor/foliate-js` 本地切出 `performance`
- 推到远程 `origin/performance`
- 让 `br1/.gitmodules` 明确写成跟踪 `performance`

## 改动概览

- 在 `vendor/foliate-js` 中新建并推送：
  - `performance`
- 更新 `.gitmodules`：
  - `branch = performance`

## 关键知识

### 1. submodule “跟踪某个分支” 和 “当前主仓库锁定哪个提交” 不是一回事

这是 git submodule 最容易让人误会的地方。

这次 `.gitmodules` 里加上：

```ini
branch = performance
```

它表达的是：

- 以后如果执行 `git submodule update --remote`
- Git 会优先参考 `origin/performance`

但它**不会自动改变主仓库当前锁定的 submodule 提交**。

主仓库真正记录的，仍然是一个具体 commit 指针。  
所以 submodule 的“跟踪分支”更像更新策略，不是自动漂移机制。

### 2. 为什么要先推远程分支，再让主仓库跟踪它

如果只在本地 submodule 切出 `performance`，但没有推到远程，就会有两个问题：

- 别人在拉 `br1` 时拿不到这个分支
- `.gitmodules` 里写了 `branch = performance` 也没有稳定的远程目标

所以顺序上更稳的是：

1. 在 submodule 本地切分支
2. 推到远程并建立 upstream
3. 回到主仓库，把 `.gitmodules` 改成跟踪这个分支

这和先建远程 API 再写客户端配置是同一种思路：  
先让被依赖对象真实存在，再让主系统依赖它。

### 3. 以后如果要把 br1 更新到 performance 的新提交，通常还差一步

这次做完以后，`br1` 只是“知道应该看 performance”了。

如果以后 `vendor/foliate-js` 的 `performance` 分支继续前进，常见更新流程会是：

```bash
git -C vendor/foliate-js fetch origin
git -C vendor/foliate-js checkout performance
git -C vendor/foliate-js pull
git add vendor/foliate-js
git commit
```

也就是说：

- `.gitmodules` 决定“看哪条线”
- 主仓库提交决定“当前锁到哪一个点”

这两个层次要分开理解。

## 验证

- `git -C vendor/foliate-js status --short --branch` (PASS)
- `git submodule status` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 未覆盖项

- 这次没有改 `foliate-js` 任何源码
- 这次没有让 `br1` 自动更新到未来的 `performance` 新提交
- 这次只改了 submodule 分支策略，还没有开始写 `foliate-js` adapter
