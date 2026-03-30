# 0067：让 reader 控制请求在 Svelte 里真正响应

这次修的是一个很隐蔽的 Svelte 响应式 bug。

表面现象是：

- 从 `library` 点一本书
- 新 reader 窗口确实打开了
- 但正文还是空白

看起来像是 reader 打不开书。  
其实更底层的问题是：**打开书的那条控制请求，根本没有在 `ReaderViewport` 里真正再次执行。**

## 根因

`ReaderViewport.svelte` 之前写的是：

```ts
$: void applyControlRequest();
```

看起来像“只要有变化就调用”，但 Svelte 不会自动追踪 `applyControlRequest()` 函数体内部用到的变量。  
也就是说：

- `controlRequest` 变了
- `foliateViewElement` 变了
- `sampleStatus` 变了

这条语句不一定会因为这些变化而重新触发。

结果就是：

- route 已经把 `library-file` 请求传下来了
- 但 viewport 没在阅读器准备好之后重新跑那次 `openBook(...)`

## 改了什么

- 在 `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
  - 把那条过于隐式的 reactive statement 改成显式依赖：

```ts
$: {
  controlRequest?.nonce;
  foliateViewElement;
  sampleStatus;
  void applyControlRequest();
}
```

这样 Svelte 才会在这些关键状态变化后，重新执行控制请求处理逻辑。

## 这次值得学的两个知识点

### 1. Svelte 不会自动分析你函数体里的依赖

这是很多人第一次写 Svelte 响应式时会踩的坑。

如果你写：

```ts
$: doSomething();
```

Svelte 只知道“这里调用了 `doSomething`”，  
它**不会**自动把 `doSomething()` 函数体内部读到的变量，全都算成依赖。

所以当函数体里藏着真正关键的状态时，reactive statement 往往会“看起来很聪明，实际上没响应”。

### 2. 当动作依赖多个异步状态时，最好把依赖显式写出来

这次打开书其实依赖三件事都 ready：

- `controlRequest` 已经到了
- `foliateViewElement` 已经挂好了
- 当前状态允许执行

这种时候最稳的办法就是把这些依赖显式写出来，让触发条件非常清楚。  
不要赌框架会替你“理解意图”。

## 我怎么验证

实际跑过：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` `PASS`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` `PASS`

## 还没做什么

- 还没有加 reader 打开失败时的用户可见错误提示
- 这次只修了控制请求重新触发，不涉及 reader 的视觉布局
