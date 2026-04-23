# 0507: 不让 renderer 伪造翻译 provider 已配置状态

这一刀是 `0506` 的安全边界补强。`0506` 已经把 DeepL / Yandex 的 provider 状态放到了 Tauri 侧，但保存 command 里还有一个问题：如果 renderer 可以传 `configured: true`，那“是否已经配置 key”仍然不是 Tauri 真正拥有的事实。

## 这次改了什么

这次把 `configured` 从 renderer 输入里拿掉，改成由 Tauri 自己推导。

Tauri 会检查本机环境变量里是否存在 provider key：

- DeepL: `BR1_DEEPL_API_KEY` 或 `DEEPL_API_KEY`
- Yandex: `BR1_YANDEX_TRANSLATE_API_KEY` 或 `YANDEX_TRANSLATE_API_KEY`

如果这些值不存在或为空，provider status 就保持 `missingKey`。renderer 仍然可以保存 label 这类展示元数据，但不能把 provider 伪造成已配置。

## 为什么这很重要

这里的核心不是“有没有把密钥存进 JSON”，而是“谁有资格声明密钥存在”。

如果 renderer 能直接写 `configured: true`，后续翻译 bridge 很容易误以为 provider 已经可用，然后走到错误的网络调用或错误状态。把 `configured` 改成 Tauri 侧根据本机 key presence 推导后，reader UI 看到的状态才是真正的桌面边界状态。

## 测试怎么覆盖

Rust 测试改成验证一个更关键的行为：

- provider 元数据可以持久化
- 但没有本机 key 时，状态仍然是 `missingKey`
- 序列化内容里不包含 secret

也就是说，测试不再证明“可以保存 configured=true”，而是证明“renderer 不能靠保存元数据改变 configured 状态”。

## 新手知识点

做 Tauri trust-boundary 时，不要只问“有没有保存 secret”。还要问：

- renderer 能不能伪造权限、配置或能力状态？
- 后续业务逻辑会不会把这个状态当成可信事实？
- 状态是否由后端自己可验证的信息推导？

这类问题在导入文件、网络 provider、同步账号、付费能力里都很常见。
