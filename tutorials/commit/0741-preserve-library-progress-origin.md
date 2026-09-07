# 0741 - 保留书库阅读进度的定位来源

## 背景

书签已经保留定位来源，但书库恢复阅读使用的是另一份进度记录。
同一个 EPUB CFI 字符串在不同文档结构中可能指向不同位置，不能因为
旧位置能解析，就反推它来自当前渲染文档。

## 主要目标

完成 S2-R04C13B2b 的书库进度来源传递，使来源跟随实际保存或选中的位置。
本项不判断旧位置是否兼容，也不改变恢复失败后的自动保存策略。

## 改动概览

- 使用可选 `progressLocationOrigin`，缺失或 `null` 表示未知；空字符串和
  未来来源字符串原样保留，不推断旧记录的来源。
- 打通现有书库、Readest 导入、快照和 KOReader 合并中的位置/来源配对。
- 恢复目标通过 `locationOrigin` URL 参数保留来源，到路由目标为止。
- 保持快照版本、位置选择优先级和阅读器导航行为不变。

## 关键知识

1. 来源属于字段，不属于整条记录。合并时如果保留旧位置，就必须一起
   保留旧位置的来源；采用另一套位置时，不能顺带继承旧来源。
2. 可选字段支持向后兼容，但“缺失”和“类型错误”不同。缺失或 `null`
   可以表示未知；数字等非法类型应在导入边界报错，不能悄悄变成未知。
3. 传递元数据不等于启用策略。先让写入和传输保留来源，后续才能在
   同时具备恢复写保护的条件下加入兼容性判断，避免失败回退覆盖原始位置。

审查发现书籍元数据中的额外字段可能混入进度来源。因此重建书库记录时，
需要先按已有元数据契约筛选字段，再组合阅读进度，不能直接展开外部对象。
路由自动打开还会经过并排状态管理器；保留 URL 参数不等于后续状态仍保留它。
路由身份用 JSON 编码可选来源，区分缺失、空字符串和未来字符串，避免
页面的去重判断把两种不同来源当成同一个打开目标。

## 验证

Final4 在代码冻结后执行，以下是本轮最终结果：

- `pnpm check`：通过，0 错误、0 警告。
- 项目 TypeScript 编译后，16 个文件的 `node --test`：144/144 通过。
- 现有 Vite `ssrLoadModule` 加载 `syncSnapshot.test.ts`：2/2 通过。
- 三个实际 Playwright 测试文件的独立严格 TypeScript 检查通过，并以
  `--listFiles` 确认范围；没有把 WebDriver 配置检查当成这项证据。
- Chrome Playwright，单 worker、零重试：6/6 通过，覆盖书签回归、真实
  EPUB Range 到模拟原生进度调用、并排方向状态和并排打开。
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`：63/63 通过。
- `pnpm exec vite build`：通过，没有重新生成 PDF vendor。
- Terra high 任务审查及修复复审、Sol high 整体审查及修复复审通过。
- 177 个源码/测试文件的 SHA-256 前后完全一致；`git diff --check` 通过。
- 独立清单重计数：678 个唯一提交，61 covered、405 partial、77 gap、
  135 not-applicable，54 个剩余主任务。

日志前缀：`/tmp/br1-c13b2b-final4-20260907-144032-15334-`。

在仓库根目录复现带 `$lib` 别名的快照测试：

```sh
node --input-type=module -e '
import { createServer } from "vite";
const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try { await server.ssrLoadModule("/src/lib/services/syncSnapshot.test.ts"); }
finally { await server.close(); }
'
```

首轮验证的快照测试遇到 `$lib` 别名解析问题，已用项目现有 Vite 的
`ssrLoadModule` 加载测试验证通过，没有新增依赖或自定义加载器。
路由模块旧的无扩展名导出已按现有 `.js` 模式修复。首轮哈希命令不可用，
空清单已作废；上述 Final4 使用有效的 SHA-256 清单重新生成并核验。

## 未覆盖项

- 不包含历史定位迁移或重放证明、恢复拒绝和自动保存保护，后者属于 B3。
- 不改搜索缓存、辅助阅读历史、TTS、专注阅读恢复或 Warichu 排版。
- 不新增网页书库存储、不更换依赖、不修改 Foliate。
- 公共快照准备函数没有生产 UI 调用方；其测试不代表网页恢复入口验收。
- 不以单元测试或模拟 IPC 浏览器测试代替打包 Tauri/WebKit、真实 Readest
  安装目录导入或跨平台人工验收。
