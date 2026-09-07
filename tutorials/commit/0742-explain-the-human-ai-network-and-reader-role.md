# 0742：在完整人机网络中说明 br1 的位置

## 背景

原 README 已有可用的阅读截图和两个创作概念动画，但没有把整个生态、近期产品与中长期路线连起来。第一轮草稿又把“读薄、读厚、迁移与创作”放成全局主线；用户指出这只是 br1 的个人阅读路径，README 应先解释更大的网络场景，再定位阅读器。

本次完整重读工作区中的 `reads/docs/ecosystem/venture-discussion-v0.11.md`，包括正文、讨论问题、附录和修订记录。用户在本轮进一步明确：一本书可被视为程序，以少量核心 IR 及其连接表示，这层架构是确定存在的。本次 README 用 BookIR 指称这一确定的架构层；内部表示和接口仍可演进，不再将这层是否存在写成未定问题。该澄清优先于旧讨论稿中的命名不确定性。

## 主要目标

- README 及两张图均使用英文。
- 先说明个人能力、可接续积累与共同增益，再解释 br1 的个人客户端位置。
- 在同一张路线图中区分当前、近期、中期和长期，并保留六类能力层次。
- 用整体网络图展示书籍、BookIR、人、模型、公共积累与现实反馈，不把整个生态等同于阅读器或知识图谱。
- 保留原有五张截图、两个 GIF、安装和致谢内容，不改应用代码。

## 改动概览

README 的开头改为从个人阅读进入人机集体智能的叙事。BookIR 为个人与公共使用提供材料；读者保留自身意图和私人记忆；其他参与者带来互补经验；作品、协作与现实结果进入可选择公开的反馈关系。LLM 与其他算法提供加工、适配、发现和公共维护支持，不替代人的判断与授权。

路线图在四个时间视野中展示 Personal Reading、Shared Reading、Collective Knowledge、Problem Network、Action Network 与 Collective Intelligence Infrastructure。它们是能力方向，不是有日期承诺的严格关卡；小范围行动反馈可以提前发生。

“读薄、读厚、迁移与创作”保留在 BookIR 下的个人阅读说明中。未来网络、确定的架构职责、尚未冻结的接口与当前产品能力分别标明。创作版本与发布是两次选择，模型对人和连接的理解保留为可修正的推测。

## 关键知识

### 1. 中间表示与界面、执行环境是不同边界

IR 保存供不同用途调用的材料与关系；界面决定怎样呈现，运行环境决定怎样组织当前活动。不能因为 README 中画出 BookIR，就推导出已有固定 schema、编译器或可执行引擎，也不能把图中的每个职责都直接实现成独立服务。确定架构职责与验证实现进度是两件事。

### 2. 文档验证也需要区分证据层次

Mermaid 代码块把图的节点和关系保存在 Markdown 中，便于和文字一起审查；语法解析成功不代表图的含义正确，也不代表 GitHub 的托管渲染结果相同。媒体路径保持不变也不证明媒体内容未改，因此本次另做字节比较和 SHA-256 记录。

## 验证

- `git diff --check`：通过。
- `node /tmp/br1-readme-20260907/verify.mjs`：通过。该本地验收脚本不加入仓库依赖。
- 与编辑前 `ca9165c` 的 README 比较：五张截图与两个 GIF 的引用集合不变，各媒体字节一致；安装与致谢区块保持原文。
- README 不含中文字符；两个 Mermaid 代码块均可解析、渲染；本地相对链接存在。
- 通过现有 Playwright + Chrome，使用固定版本的 marked 15.0.12、Mermaid 11.12.0 做本地预览，未修改项目依赖。
- CDN 方式的后续复跑曾因动态模块加载失败而中断，这些尝试不记为通过。最终在临时目录缓存相同版本的分发文件，并在浏览器中阻断 HTTP(S) 请求后重新渲染，通过全部检查。
- 最终报告绑定 README SHA-256：`dc9998d3c334b648c95bd8e8c2c31640be38c8963a8d347b96e0a340e8b8a9a8`。
- 在 1280px 与 390px 视口保存截图：七项媒体均加载成功，无浏览器脚本错误，无页面级横向溢出；窄屏图表在各自容器内横向滚动。
- 直接查看两张桌面图截图，检查文字、连线与结构可读性。
- 全新 Terra high 任务级审查：通过，无待处理问题。
- 全新 Sol high 整体叙事与架构审查：通过；教程术语说明经任务级复审后闭合。

本地报告及截图位于 `/tmp/br1-readme-20260907/`。这些是临时验收产物，不是发布附件或保证长期保留的仓库文件。

可在仓库根目录复查媒体保全约束：

```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const old = execFileSync('git', ['show', 'ca9165c:README.md'], { encoding: 'utf8' });
const now = readFileSync('README.md', 'utf8');
const paths = text => [...text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1]).sort();
assert.deepEqual(paths(now), paths(old));
for (const path of paths(now)) {
  assert(readFileSync(path).equals(execFileSync('git', ['show', `ca9165c:${path}`], { maxBuffer: 20_000_000 })));
}
assert(!/\p{Script=Han}/u.test(now));
console.log('PASS: English README and preserved media');
NODE
```

## 未覆盖项

- 未修改或实现 BookIR、IRCompile、个人 memory、公共协作及现实行动流程。
- 未运行应用构建、Rust 或阅读器回归测试；本次仅修改文档。
- 未验证 GitHub 托管页面的实际渲染，未推送提交。
- 未将愿景、概念动画或完整反馈图视为已经验证的网络效果。
- 未修改三项既有未跟踪文件，也未改动外部 v0.11 讨论稿。
