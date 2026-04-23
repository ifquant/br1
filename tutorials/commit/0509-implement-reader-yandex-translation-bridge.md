# 0509: 把 Yandex 翻译桥接到现有 reader assist 流程里

这次不是再造一个新的翻译入口，而是把 Yandex 接到已经跑通的 reader assist translation 流程里。这样 DeepL 和 Yandex 共用同一条请求、加载、错误、结果展示路径，侧边栏也还是那一套 UI，而不是分裂成两套翻译面板。

## 这次改了什么

- `src-tauri/src/commands/reader_services.rs`
  - 给 Yandex 增加真正的翻译 bridge。
  - 固定请求端点为 `https://translate.api.cloud.yandex.net/translate/v2/translate`，不接受 renderer 传 URL。
  - 本地配置只从桌面环境推导：
    - API key: `BR1_YANDEX_TRANSLATE_API_KEY` 或 `YANDEX_TRANSLATE_API_KEY`
    - IAM token: `BR1_YANDEX_TRANSLATE_IAM_TOKEN` 或 `YANDEX_TRANSLATE_IAM_TOKEN`
    - folderId: `BR1_YANDEX_TRANSLATE_FOLDER_ID`、`YANDEX_TRANSLATE_FOLDER_ID`、`BR1_YANDEX_FOLDER_ID`、`YANDEX_FOLDER_ID`
  - 如果本地只有 key / token 但没有 `folderId`，状态会明确提示配置缺失，而不是假装 provider 已可用。
  - 请求体按 Yandex 当前 REST 形状构造：`folderId`、`texts[]`、`targetLanguageCode`，可选 `sourceLanguageCode`。
  - 新增 Yandex 的 HTTP 错误分类：认证/配置失败、限流、配额类失败、一般请求错误。

- `src/lib/services/readerAssistance.ts`
  - 当 translation provider 未配置时，不再硬编码成 “缺 API key”。
  - 直接使用 Tauri 返回的 provider status label，这样 Yandex 缺的是 `folderId` 时，renderer 也能显示真实原因。

- `src/lib/components/reader/ReaderSidebar.svelte`
  - 现有翻译模式下新增 Yandex provider chip。
  - 沿用现有 assist translation 文本输入、目标语言切换、请求按钮、结果区域。
  - 未配置时直接显示当前 provider 的桌面端状态说明。

## 为什么这样做

要求里最重要的一句是“复用现有 translation workflow，而不是再开一条平行 UI”。这意味着：

- 用户在 reader sidebar 里还是点“翻译”
- 还是同一个输入框
- 还是同一个 loading / ready / error / empty 状态区
- 只是 provider 从原来只有 DeepL，扩成 DeepL / Yandex

这样做的好处是：后续如果再补 provider，主要改的是 provider bridge 和状态映射，而不是继续复制 UI 和状态机。

## Yandex 这次的 trust boundary

这次继续保持 S-1：

- renderer 不能决定端点
- renderer 不能传认证头
- renderer 不能传 `folderId`
- renderer 不能传任意网络 URL

Yandex 需要的“本地秘密 + 本地上下文”都留在 Tauri：

- API key 或 IAM token
- `folderId`

renderer 只知道 provider 是否可用，以及当前为什么不可用。

## 测试怎么覆盖

这次没有做 live network test，而是补了更稳定的单元测试：

- Yandex translate endpoint 是否固定到 allowlisted 官方地址
- 请求体是否正确包含 `folderId` / `texts[]` / `targetLanguageCode` / `sourceLanguageCode`
- 429 是否归类为限流
- 带 quota/limit 文案的失败是否归类为配额类错误
- 403 是否归类为认证或配置失败

这样能直接保护“构造请求”和“错误映射”这两个最容易漂的点。

## 新手知识点

有些第三方 API 不是“只要一个 key 就能调”。Yandex 这类云服务经常同时要求：

- 一个凭证：证明“你是谁”
- 一个资源上下文：说明“你要在谁的目录/项目下扣费和执行”

这里的 `folderId` 就属于第二类。  
如果系统只检查 key，不检查 `folderId`，UI 很容易误判成“已经配置成功”，但真正发请求时才在服务端失败。更稳妥的办法是把“provider 是否 configured”定义成“本地所需配置是否齐全”。
