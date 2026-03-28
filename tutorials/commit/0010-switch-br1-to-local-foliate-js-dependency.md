# 0010 Switch br1 from a vendored submodule to the local foliate-js repo

## 背景

前面 `br1` 把 `foliate-js` 作为 git submodule 放在了 `vendor/foliate-js`，这样来源清楚，但会有一个现实问题：

- 目录里会有两份 `foliate-js`
- 你后面想长期调 `foliate-js` 性能时，很容易在两个位置之间来回切

你现在更明确的目标是：

- `hc_apps/foliate-js` 才是唯一那份真实源码
- 它继续走 `performance` 分支
- `br1` 直接依赖这份本地仓库，不再额外存一份复制品

## 主要目标

- 移除 `br1` 里的 `vendor/foliate-js` submodule
- 让 `br1` 直接依赖本地 `../foliate-js`
- 保持 `pnpm` 和类型校验仍然正常

## 改动概览

- 删除 `.gitmodules`
- 删除 `vendor/foliate-js` submodule 记录
- 更新 `package.json`，新增：
  - `"foliate-js": "file:../foliate-js"`
- 更新 `pnpm-lock.yaml`，把 `foliate-js` 锁定为本地目录依赖

## 关键知识

### 1. `file:../foliate-js` 这种本地目录依赖，适合“你自己也在维护上游仓库”的场景

这次改成：

```json
"foliate-js": "file:../foliate-js"
```

它表达的是：

- `br1` 不去 npm 拉这个包
- 也不在自己仓库里额外存一份
- 而是直接把旁边那个目录当依赖源

这种方式很适合现在这个场景，因为：

- 你自己就在维护 `hc_apps/foliate-js`
- 你希望所有性能修改都只落在那一份源码上
- `br1` 只是消费它，而不是再复制它

### 2. submodule 更适合“受控 vendor”，本地目录依赖更适合“同一工作区联动开发”

这两种方式都不是绝对更好，只是适合不同目标。

submodule 更适合：

- 想明确记录上游来源
- 想锁定一个外部仓库提交
- 不准备频繁在主项目开发时同时改它

本地目录依赖更适合：

- 你本来就在同一个 workspace 里维护依赖
- 想避免双份代码
- 想一边改依赖仓库，一边在主项目里立刻消费

所以这一步其实不是“推翻前面的选择”，而是根据你更清晰的开发习惯，把依赖策略换成更省摩擦的一种。

### 3. `pnpm-lock.yaml` 里锁的是“依赖来源类型”，不只是版本号

这次锁文件里出现了：

- `specifier: file:../foliate-js`
- `resolution: { directory: ../foliate-js, type: directory }`

这说明锁文件不只是记版本，还会记：

- 这是一个本地目录依赖
- 它从哪里解析

所以当你把依赖从 submodule 方案切成 `file:` 方案时，锁文件必须一起更新。  
否则仓库虽然表面上改了 `package.json`，实际安装结果却不一定一致。

## 验证

- `pnpm install` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 未覆盖项

- 这次没有开始写 `foliate-js` 的 adapter
- 这次没有验证真实 EPUB 打开流程
- 这次只是切换依赖来源，`br1` 还没有真正 import `foliate-js`
