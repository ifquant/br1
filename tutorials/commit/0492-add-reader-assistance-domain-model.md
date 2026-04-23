# 0492: add reader assistance domain model

这一刀先把 reader assistance 的领域模型和服务边界立起来，不把 Wikipedia、dictionary、DeepL、Yandex 的具体 UI 或网络实现混进 route 文件里。

这次落下的是 trust-boundary 先行的骨架：请求、结果、状态、provider allowlist、规范化入口，以及一个明确会拒绝未实现 provider 的 renderer-safe facade stub。这样后续 P1-1.2 和 P1-1.3 可以直接接在同一个模型上，不需要再回头拆 route-local 类型。

验证结果：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`，PASS
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`，PASS

没做的事：

- 没有实现 Wikipedia 或 dictionary lookup
- 没有接入 Tauri 网络命令
- 没有修改 reader UI
