# 0068 Exclude foliate-js from Vite optimizeDeps

## 这次改动为什么存在

`br1` 现在直接依赖本地源码版 `foliate-js`，而不是一个已经为 Vite 预打包准备好的稳定 npm 包。

当 Vite 的 dep optimizer 试图把 `foliate-js/view.js` 预构建进 `.vite/deps/` 时，开发期会偶发出现：

- `The file does not exist at ".../.vite/deps/undefined"`

这类日志通常说明：某个依赖并不适合走 Vite 的预构建链，而更适合保留为运行时原始模块。

这次改动的目标很窄：

- 不改 reader 逻辑
- 不改 `foliate-js` 源码
- 只让 Vite 不再错误预处理 `foliate-js`

## 这次改了什么

- 在 [vite.config.js](/Users/dev/workspace2/hc_apps/br1/vite.config.js) 中新增：

```js
optimizeDeps: {
  exclude: ["foliate-js", "foliate-js/view.js"],
}
```

- 这样 `foliate-js` 会继续以原始 ESM 源码形式在开发期加载，而不会被塞进 `.vite/deps`。

## 你可以学到的知识

### 1. `optimizeDeps` 是给“适合预打包的依赖”准备的，不是所有依赖都该进去

Vite 会预构建依赖，主要是为了：

- 提高冷启动速度
- 把 CommonJS/复杂依赖先转成浏览器更容易吃的格式

但像下面这类依赖，经常不适合预构建：

- 本地 `file:` 依赖
- 直接暴露源码入口的包
- 含有动态 import、原生资源路径、浏览器特有运行时假设的包

这种情况下，`exclude` 往往比“继续和 dep optimizer 硬碰硬”更稳。

### 2. `exclude` 不是“禁用依赖”，只是“别替我预打包它”

很多人第一次看到这个配置会误会：

```js
optimizeDeps: {
  exclude: ["foliate-js"],
}
```

它的意思不是“不允许 import foliate-js”，而是：

- 运行时照样可以 import
- 只是 Vite 启动时别先把它塞进 `.vite/deps`

也就是说：

- `import("foliate-js/view.js")` 仍然有效
- 只是模块加载路径回到了更原始、更稳定的 ESM 模式

## 这次如何验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec vite optimize --force
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `pnpm check`：PASS
- `vite optimize --force`：PASS
- `git diff --check`：PASS

## 这次没有处理什么

- 这次没有继续修 reader 空白页的其它潜在原因
- 这次没有改 `foliate-js` 自身的导入结构
- 这次只是先切掉一条明显不稳定的 dev-runtime 链
