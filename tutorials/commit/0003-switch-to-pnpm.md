# 0003 Switch br1 to pnpm and restore local verification

## 背景

`br1` 的 Tauri 配置里本来就已经写着 `pnpm dev` 和 `pnpm build`，但仓库实际还是 `npm` 风格：

- 有 `package-lock.json`
- 文档里写的是 `npm run ...`
- 本地校验最开始靠 `npm run check`

这会带来两个问题：

1. 工具链认知不统一，后面 AI 和人会混着用不同包管理器
2. 锁文件和真实执行方式不一致，长期很容易出现环境漂移

更直接的问题是，当时本地校验虽然被修通了，但包管理器约定还没有真正统一。

## 主要目标

- 正式把 `br1` 切换到 `pnpm`
- 让文档、协作规则、锁文件和真实命令一致
- 保证 `pnpm check` 能在本地跑通

## 改动概览

- 生成并纳入 `pnpm-lock.yaml`
- 删除 `package-lock.json`
- 更新 `AGENTS.md` 中的常用命令和包管理规则
- 更新已有提交教程中的命令示例，从 `npm run check` 改为 `pnpm check`
- 保留 `package.json` 的脚本名不变，但统一通过 `pnpm <script>` 调用

## 关键知识

### 1. 包管理器不只是安装命令不同

真正重要的是三件事必须一致：

- 锁文件
- 文档
- 团队实际执行方式

如果只换命令，不换锁文件和协作规则，仓库很快又会漂回混乱状态。

### 2. 为什么 `pnpm` 更适合这里

对 `br1` 来说，`pnpm` 不是随便换个口味，而是因为：

- `src-tauri/tauri.conf.json` 已经在用 `pnpm`
- 后续很可能会有更多依赖和更复杂的前端结构
- 统一后，Tauri 命令、前端命令和协作规则能保持同一套约定

### 3. “跑通本地校验” 不等于 “只跑一次”

这次的意义不只是看到一次 PASS。

更重要的是让以后每个功能切片都能用同一条标准命令验证：

```bash
pnpm check
```

这会直接影响后续 commit message 的 `Verification:` 质量。

## 验证

- `pnpm install` (PASS)
- `pnpm check` (PASS)
  - `svelte-check found 0 errors and 0 warnings`

## 未覆盖项

- 这次没有引入测试框架，只是统一了包管理器和轻量校验入口
- 这次没有做任何产品功能实现
- `package.json` 脚本名本身没有改动，只统一了执行方式和锁文件
