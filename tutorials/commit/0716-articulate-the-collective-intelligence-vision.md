# 0716 - 明确 Bridge Reader 的集体智能愿景

## 背景

旧 README 已经把 Bridge Reader 描述为 AI-native reader，但仍主要停留在“AI 帮助个人深读和知识迁移”。本轮依据 `design.txt` 的顶层设计，把项目进一步定位为可追溯人类-AI集体智能网络的第一个 Reading Runtime / Cognitive Runtime 客户端，同时明确区分当前产品和长期研究方向。

## 改动

- 用英文重写项目使命、设计原则、核心闭环和六阶段演进路线。
- 将原来的 Book IR、Reader Model、Reading Runtime、Knowledge Memory 映射到 Epistemic IR、Cognitive State、Cognitive Runtime、Epistemic Commons。
- 明确 `br1` 是当前阅读客户端，`reads` 是 Knowledge Compiler、编辑和评测实验室。
- 加入生成式架构图，展示 Contribution、Coordination、Action / Validation 与 Reality 的反馈关系。
- 保留已有书库和并行阅读截图，并把“当前可用”与“长期愿景”分开陈述。
- 增加投资、LLM 推理/API credits、算力、研究和试点合作入口，避免与加密货币 token 混淆。
- 补齐 npm package description，使仓库元数据与 README 定位一致。

## 两个知识点

1. 投资叙事不能靠扩大功能清单。更可信的方式是明确一个足够大的长期问题，同时标出今天已经成立的产品楔子和下一阶段可验证闭环。
2. AI 知识系统的个性化应发生在理解投影层，而不是事实层。共享 Source、Claim、Evidence 和 Provenance，才能让不同认知路径仍然连接到共同现实。

## 验证

- README 本地图片引用检查：PASS
- `package.json` JSON 解析：PASS
- `pnpm check`：PASS（0 errors, 0 warnings）
- `git diff --check`：PASS
- Sol high 愿景与架构复审：PASS（4 个初审问题修正后无剩余 findings）

## 证据边界

README 中的本地书库、格式、进度、笔记、高亮和并行阅读属于当前能力；Shared Reading、Epistemic Commons、Contribution Graph、Coordination Graph 和 Action / Validation Graph 是明确标注的长期路线，不代表已经交付。架构图用于表达系统愿景，不是运行时拓扑证明。
