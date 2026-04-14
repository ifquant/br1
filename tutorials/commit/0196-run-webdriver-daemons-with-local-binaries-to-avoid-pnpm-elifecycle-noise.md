# 0196: 让 Tauri WebDriver 包装脚本直接跑本地二进制，去掉 `pnpm` teardown 噪音

这次切片不是产品功能改动，而是测试基础设施修整。

问题很具体：

- 目标 spec 已经通过
- 但 `scripts/automation/test-tauri-webdriver.sh` 在退出时还会打印两行 `ELIFECYCLE`

这会让人误以为：

- 是测试没过
- 或者是 Tauri / WebDriver 进程真的崩了

实际上很多时候只是 wrapper 在 `trap cleanup` 里杀掉后台 `pnpm dev` / `pnpm tauri dev`，  
`pnpm` 作为父进程被 `TERM` 后，会把“脚本被中断”当成 lifecycle failure 打出来。

所以这次的目标很窄：

- 不改 app
- 不改 e2e 逻辑
- 只把 wrapper 的 teardown 输出收干净

## 这次改了什么

文件：`scripts/automation/test-tauri-webdriver.sh`

### 1. 不再后台跑 `pnpm dev`

之前：

```bash
pnpm dev --host 127.0.0.1 --port "$DEV_PORT" &
```

现在：

```bash
"$BIN_DIR/vite" dev --host 127.0.0.1 --port "$DEV_PORT" &
```

也就是直接跑：

- `node_modules/.bin/vite`

这样当 cleanup 杀掉后台 dev server 时，被杀的是 `vite` 本体，不再是 `pnpm` 包管理器壳层。

### 2. 不再后台跑 `pnpm tauri dev`

之前：

```bash
pnpm tauri dev --features webdriver --no-watch ...
```

现在：

```bash
"$BIN_DIR/tauri" dev --features webdriver --no-watch ...
```

直接跑：

- `node_modules/.bin/tauri`

同样的道理：

- cleanup 杀的是 `tauri` CLI 进程
- 而不是 `pnpm`

所以退出时不会再多冒一层 lifecycle 噪音。

### 3. 启动前先检查本地二进制是否存在

脚本现在会显式检查：

- `node_modules/.bin/vite`
- `node_modules/.bin/tauri`

如果缺失，就直接报：

- `Run pnpm install first`

这比跑到一半再出莫名其妙的命令不存在，要清楚得多。

## 为什么这个修复有效

核心原因不是 shell 技巧，而是“谁在当父进程”。

之前的链路大概是：

```text
wrapper script
  -> pnpm
     -> vite / tauri
```

cleanup 一杀，`pnpm` 会觉得：

- “我管理的脚本被异常终止了”

于是输出：

- `ELIFECYCLE`

现在变成：

```text
wrapper script
  -> vite
  -> tauri
```

这样 cleanup 杀的是目标守护进程本身。  
没有 `pnpm` 这一层帮你“好心”解释成 lifecycle error。

## 这次顺手能学到的知识

### 知识点 1：测试 wrapper 也有“产品信号质量”

很多人把测试脚本当成杂物间。

但现实是：

- 测试结果是不是一眼能读懂
- 失败时是不是只报真实错误

这本身就是工程质量。

如果脚本每次成功都夹带两行红色噪音，  
团队很快就会对真正的失败失去敏感度。

### 知识点 2：后台守护进程最好少套一层包管理器

像这种长期运行、最后还要主动 `kill` 的进程：

- dev server
- watch process
- mock server
- webdriver wrapper

通常更适合直接跑本地可执行文件。

因为一旦你套了一层：

- `pnpm`
- `npm`
- `yarn`

在退出、信号、清理阶段，往往就会多出一层你不想要的解释和错误输出。

## 相关文件

- `scripts/automation/test-tauri-webdriver.sh`

## 本次验证

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'opens the first library book in a separate reader window'"` (PASS，无 `ELIFECYCLE` 噪音)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage' --mochaOpts.timeout 120000"`  
  wrapper 层不再输出 `ELIFECYCLE`，但目标 spec 本身仍然 FAIL
- `git diff --check` (PASS)
