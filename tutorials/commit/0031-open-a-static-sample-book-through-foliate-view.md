# 0031: 让 Reader 通过 foliate-view 打开一个静态样例书

这一提交的目标不是做完整导入流程，而是把 `reader` 从“宿主已经挂好”推进到“可以真实调用一次 `view.open()`”。这样下一步再接文件导入、目录、位置恢复时，问题范围会小很多。

## 为什么先做这一步

上一提交只是确认 `foliate-view` 自定义元素已经被注册，并且能挂到 `ReaderViewport` 里。但“元素挂上了”不等于“阅读引擎真的工作了”。

如果我们直接往后接导入、目录、桥接解释，后面一旦打不开书，就很难分清是：

- 宿主容器边界错了
- `foliate-js` 模块没真正接好
- 还是导入链路本身有问题

所以这一步先只做一个显式的开发期入口：点击 `Load sample`，让 `foliate-view.open('/samples/reader-step4.epub')` 真正跑起来。

## 改动概览

- 在 [`src/lib/reader/foliate.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts) 里补了：
  - `FoliateViewElement` 接口
  - `SAMPLE_READER_BOOK_URL`
- 在 [`src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts) 里对外导出这些 reader 侧 helper
- 在 [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里：
  - 增加 `Load sample` 按钮
  - 增加 `sampleStatus`
  - 在 `adapter ready` 后显式调用 `foliateViewElement.open(...)`
  - 打开成功后让真实 `foliate-view` 显示出来
- 把 [`pydemo/sample_book.epub`](/Users/dev/workspace2/hc_apps/br1/pydemo/sample_book.epub) 最小拷贝到 [`static/samples/reader-step4.epub`](/Users/dev/workspace2/hc_apps/br1/static/samples/reader-step4.epub)，让前端能通过静态路径直接访问

## 这次顺手学到的具体知识

### 1. 自定义元素如果要调用扩展方法，最好在本地补接口，而不是一直用 `any`

`document.createElement('foliate-view')` 默认只会被 TypeScript 视为普通 `HTMLElement`。  
但 `foliate-view` 其实还有自己的 `.open()` 方法。

所以这次在 `foliate.ts` 里补了：

```ts
export interface FoliateViewElement extends HTMLElement {
  open(book: string | Blob | File): Promise<void>;
}
```

这样做的好处是：

- 调 `open()` 时有类型提示
- 后面接 `goTo()`、事件监听、renderer 访问时也更容易继续收紧类型
- 不会把整个 reader adapter 污染成 `any`

### 2. “可打开样例书” 比 “自动打开样例书” 更适合做中间验证

中间阶段如果一上来就自动加载样例书，页面一 mount 就会同时发生：

- 宿主注册
- 元素创建
- 样例书打开
- 真实阅读视图渲染

这样一旦失败，很难定位是哪一步炸了。

所以这次故意把它拆成两层状态：

- `adapterStatus`: 宿主和自定义元素是否准备好
- `sampleStatus`: 样例书是否真的开始加载、是否打开成功

这就是为什么中间状态要显式暴露出来。对调试复杂 UI 集成很有帮助。

## 验证

我实际运行了：

```bash
pnpm check
git diff --check
```

结果：

- `pnpm check`：PASS
- `git diff --check`：PASS

## 还没做的事

这一提交**没有**处理：

- 真实文件导入
- `view.open(file)` 的用户文件来源
- TOC / 位置恢复 / 翻页控制
- `bridge` 和 reader 的联动

它只是把 `reader` 推进到“可以显式尝试打开内容”的阶段。
