# 0106：把 PDF.js 的 host vendor 契约补齐到可加载 wasm

这次改动的目标不是继续修改 `foliate-js`，而是把 `br1` 自己的宿主资源准备流程补齐到更接近 `Readest` 的方式。

问题根因很具体：

- `pdf.worker.mjs` 在运行时会请求 `jbig2.wasm`
- 旧的 `pnpm setup-vendors` 只复制了 `openjpeg.wasm` 和 `qcms_bg.wasm`
- 所以 `PDF` 在 `br1` 里会出现运行期资源缺失，即使 `foliate-js` 本身没坏

这次做了什么：

1. 在 [/Users/dev/workspace2/hc_apps/br1/scripts/setup-pdfjs-vendor.mjs](/Users/dev/workspace2/hc_apps/br1/scripts/setup-pdfjs-vendor.mjs) 里把 vendor 输出补齐：
   - 新增 `jbig2.wasm`
   - 新增 `openjpeg_nowasm_fallback.js`
2. 在 [/Users/dev/workspace2/hc_apps/br1/package.json](/Users/dev/workspace2/hc_apps/br1/package.json) 里把 `copy-pdfjs-runtime` 正式串进 `copy-pdfjs` 任务链
3. 重新执行 `pnpm setup-vendors`，让 [/Users/dev/workspace2/hc_apps/br1/static/vendor/pdfjs](/Users/dev/workspace2/hc_apps/br1/static/vendor/pdfjs) 成为完整的宿主输出目录

为什么这比继续改库更对：

- `Readest` 的思路是：应用宿主负责准备 `public/vendor/pdfjs`
- `foliate-js` 只消费这个宿主契约
- 这样升级 `pdfjs-dist` 或迁宿主时，职责边界更清楚

这次顺手能学到两个点：

1. `wasm` 问题很多时候不是“浏览器不支持”，而是“宿主没有把运行时依赖文件放到 worker 真的会请求的位置”
2. 任务脚本本身支持某个步骤还不够，真正生效取决于 `package.json` 里的任务链有没有把这一步串起来

这次实际验证：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 setup-vendors`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- 桌面 WDIO/Tauri smoke 跑到 8 条断言全部通过，证明 `PDF` 主链已经恢复

还没处理的：

- `test-tauri-webdriver.sh` 在 teardown 阶段仍然会带出一个 `pnpm` 非零退出码，这和本次 `jbig2.wasm` 根因无关
- `setup-vendors` 现在是对齐 `Readest` 的 host-side 方式，但还没把这套 vendor 输出做成更细的版本检查或升级提示
