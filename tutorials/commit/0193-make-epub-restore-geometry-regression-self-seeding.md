# 0193: 让 EPUB 恢复几何回归变成可自举的桌面测试

## 这次改动做了什么

这次没有继续改 reader 运行代码，重点是把 `EPUB restore-location` 的桌面回归从“依赖本地环境里刚好已有一本文本样本”改成“测试自己先造出恢复位置，再验证恢复后的主舞台几何”。

同时，我把恢复用例的“渲染表面”判定，和前一刀统一成了 `paginatorContainer` 优先，不再把整张超宽 iframe 当成当前可见页。

---

## 1. 原来的问题是什么

原来的恢复回归有两个环境耦合点：

1. 本地书库里必须已经有一本文本 EPUB，并且它已经保存过 `location`
2. 几何断言直接拿 `geometry.rendered`，但 EPUB 分页时这个值可能是整张超宽 iframe，不是当前用户看到的切口

这两个问题会导致测试很脆弱：

- 一换机器就可能找不到样本
- 恢复其实成功了，但因为 iframe 总宽度巨大，仍然被误判成失败

## 2. 这次怎么把它改成可自举

新的流程是：

1. 先尝试找现成的可恢复 EPUB
2. 如果找不到，就自己打开一本文本 shelf EPUB
3. 等 `reader` 把 `progressLocation` 落进 `library.json`
4. 关闭 reader，切回 library
5. 等 library 链接自己长出 `location=...`
6. 再用这本刚刚“种”出来的书去跑恢复验证

这样测试就不依赖“你本地之前用过什么书”，而只依赖：

- 书库里至少有一本文本 EPUB
- reader 能正常把阅读位置持久化回 library

这更接近真正想验证的产品闭环。

## 3. 为什么恢复几何要用 `paginatorContainer`

在 EPUB 分页模式下，iframe 经常是“整段文档的列化画布”：

- 它本身可能几万像素宽
- 当前真正可见的，只是 `foliate-paginator` 里被裁剪出来的一小段

所以恢复用例如果继续拿：

- `rendered.left/right/width`

就会把“整张画布很大”误判成“当前页跑出舞台”。

更合理的定义是：

- 优先看 `paginatorContainer`
- 它才是用户当前真正看到的分页切口

这样恢复用例和普通 EPUB 几何用例的判断口径就一致了。

---

## 4. 这次顺手学到的编程知识

### 知识点 1：好的 E2E 回归应该尽量“自举”

脆弱测试最常见的问题之一，就是偷用环境前置状态：

- 假设数据库里已经有某条数据
- 假设用户已经登录过
- 假设书库里已经有带恢复位置的书

这种测试一到新机器、CI、别的开发者环境就会飘。

更稳的方式是：

- 测试自己准备前置状态
- 测试自己制造输入
- 测试自己再消费输出

也就是把“依赖环境”变成“验证闭环的一部分”。

### 知识点 2：验证可见布局时，要找“视口切口”而不是“底层画布”

分页阅读器、虚拟列表、canvas 编辑器、地图组件，都会有这个特点：

- 底层真实画布很大
- 用户只看得到一块裁剪窗口

如果测试直接断言底层画布的 bounding rect，就会误把“实现细节”当成“用户看到的布局”。

更稳的策略是：

- 先找可见切口容器
- 再判断内容是否落在这个切口里

这类思路在 reader、editor、白板、图表系统里都很常见。

---

## 5. 这次如何验证

实际跑过：

```bash
pnpm check
```

结果：`PASS`

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'restores a library-file epub into a visible reading position inside the reader stage'"
```

结果：

- 目标 spec `PASS`
- 包装脚本 teardown 仍然返回 `ELIFECYCLE`

```bash
git diff --check
```

结果：`PASS`

## 6. 这次还没处理什么

- PDF 恢复回归没有跟着这次一起改
- 这次没有继续改 reader 的实际渲染逻辑，只把 EPUB 恢复回归变得更稳定、更贴近真实可见区域
