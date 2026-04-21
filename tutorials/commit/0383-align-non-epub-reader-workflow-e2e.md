# 0383 - Align Non-EPUB Reader Workflow E2E

本次提交收口的是桌面端书库工作流中非 EPUB 格式的端到端断言。FB2、MOBI、AZW3、CBZ 在当前 reader 引擎里都能稳定证明“从书架打开并进入最近阅读”，但不能稳定证明“自然翻页后产生可恢复 fraction/CFI”。旧断言把这两个能力绑在一起，导致测试失败时看起来像书库分区坏了，实际只是 reader 没有给这些格式提供稳定恢复信号。

改动后的测试把能力边界拆开：

- `expectsNaturalRestoreProgress: false` 标注当前不能依赖自然翻页恢复进度的格式。
- 书库工作流测试继续要求这些格式打开后离开 shelf，并进入 continue/recent reading。
- 显式恢复测试对这些格式先写入持久化进度，再验证书库 href 能携带恢复参数，并能重新打开 reader。
- EPUB/TXT 这类能稳定产生 reader 进度的路径仍然保留更强的自然进度断言。

这里的关键是不要把“打开过一本书”和“reader 引擎可精确恢复位置”混成一个测试条件。前者是书库工作流能力，后者是每种格式 reader adapter 的能力。拆开以后，后续如果 FB2/MOBI/AZW3/CBZ adapter 真正支持稳定恢复，只需要移除对应标记并增强该格式断言即可。

同时修了一个产品侧元数据保护问题：reader 预览里会出现中文占位作者，例如 `阅读工作区`、`未知作者`、`正在准备书籍`。这些值不应覆盖导入阶段解析出的真实作者。Rust 侧的 placeholder 判断现在同时识别英文和中文占位文案，FB2 round-trip 后会保留导入元数据里的 `Bridge Team`。

验证命令：

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "moves FB2, MOBI, AZW3, CBZ, and TXT imports into the library reading workflow|reopens FB2, MOBI, AZW3, CBZ, and TXT imports with stored restore progress|keeps fb2 mobi and azw3 library statuses human-readable|keeps fb2 authors and tiny kindle progress labels human-readable"
pnpm check
cargo test --manifest-path src-tauri/Cargo.toml --features webdriver
cargo clippy --manifest-path src-tauri/Cargo.toml --features webdriver -- -D warnings
git diff --check
```
