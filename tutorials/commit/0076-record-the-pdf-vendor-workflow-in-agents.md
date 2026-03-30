# 0076：把 PDF vendor 工作流写进 AGENTS.md

这次改动很小，但它解决的是协作中的“隐性知识”问题。

前一条提交已经把 `br1` 的 PDF vendor 流程正式化成了 `setup-vendors`。如果这条规则只存在于最近几次对话里，那过一段时间后，新一轮修改 `pdfjs-dist`、`foliate-js/pdf.js` 或 PDF 相关 CSS 时，还是很容易有人忘记重新生成 `static/vendor/pdfjs`，然后又回到“为什么这次 PDF 又打不开了”的状态。

所以这次不是改功能，而是把这条运行规则写进 [`AGENTS.md`](/Users/dev/workspace2/hc_apps/br1/AGENTS.md)，让后续 agent 或协作者默认知道：

- `static/vendor/pdfjs` 不是手工维护目录
- PDF 相关改动后要跑 `pnpm setup-vendors`
- 如果 vendor 目录变了，提交说明里要明确这是脚本重建的结果

## 主要目标

- 把 PDF vendor 的宿主约定写成仓库规则
- 降低以后重复踩 PDF 资源链问题的概率
- 让后续协作者知道什么时候必须重新生成 vendor 目录

## 改动概览

- 在 [`AGENTS.md`](/Users/dev/workspace2/hc_apps/br1/AGENTS.md) 的 `Common Commands` 里加入 `pnpm setup-vendors`
- 增加 `Readest` 风格 host-vendor contract 的说明
- 新增 `Vendor Setup Rules` 小节，明确：
  - 哪些改动后必须跑 `setup-vendors`
  - 不要手工维护 `static/vendor/pdfjs`
  - vendor 目录变动时要在提交里说明来源

## 关键知识

### 1. “文档规则”也是工程基线的一部分

很多 bug 不是代码难，而是团队里有人不知道某个步骤必须做。

这类知识如果只存在于聊天记录中，就很容易丢失。把它写进 `AGENTS.md` 的作用，就是把“做事顺序”和“验证要求”变成仓库自己的约束，而不是某个人脑子里的记忆。

### 2. 生成目录最怕被误当成源码目录

`static/vendor/pdfjs` 这类目录虽然在 git 里，但它的性质更接近“由脚本生成的宿主资源”。

如果后续协作者把它当普通源码目录直接手改，会出现两个问题：

- 改动来源不清楚
- 下一次重新生成时容易互相覆盖

所以要在规则里明确它的身份：**它是脚本产物，入口是 `pnpm setup-vendors`。**

## 验证

我实际运行了：

```bash
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `diff --check` 通过

这次没有重新跑功能测试，因为只改了文档规则，没有改运行时代码。

## 未覆盖项

- 这次没有改 `setup-vendors` 脚本本身
- 这次没有变更 `reader` 或 `PDF` 打开逻辑
- 这次只是把前一条提交形成的约定正式写入仓库规则
