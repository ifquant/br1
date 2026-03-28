# pydemo 开发记录（Q&A）

记录你在本项目中的提问与我的回复，按时间顺序整理，便于后续追踪与复现。

## 1) 保留 PyMuPDF 以及安装失败原因（Windows / Python 3.13）
- 问题：`requirements.txt` 中应保留 `PyMuPDF`，但在 Windows + Python 3.13 环境安装失败，怎么办？
- 回复：Python 3.13 官方预编译轮子暂时不全，`pip`会尝试源码构建，要求 VS2019 v142 工具集，缺失会导致安装失败。两种解决方案：
  - 推荐：使用 Python 3.12 的虚拟环境安装（官方提供轮子）。
  - 备选：安装 VS2019 Build Tools（含 v142）或在 VS2022 中安装 v142 组件，以便源码编译。
  - 代码层面：项目已做后端可选，若 `fitz`（PyMuPDF）不可用，会自动回退到 `PyPDF2 + pdfminer.six`。

## 2) 如何安装 VS2019 v142 编译环境
- 问题：如何在 Windows 上安装 VS2019 v142 工具集，支持 Python 3.13 源码构建 PyMuPDF？
- 回复：
  - 在 VS2022 安装 v142：打开安装器，修改“使用 C++ 的桌面开发”，勾选“MSVC v142 工具集”及“Windows 10 SDK/11 SDK”。
  - 安装 VS2019 Build Tools：在安装器选择“使用 C++ 的桌面开发”工作负载，确保 v142 和 SDK 勾选。
  - 验证：`cl.exe` 可用、`pip install pymupdf` 能编译或拉取轮子即可。

## 3) 右侧内容无法显示与环境变量设置问题
- 问题：尝试通过命令行设置 `PDF_STRUCTURE_ONLY=0`、`PDF_USE_PYMUPDF=0` 并运行 UI，PowerShell 报错 `"=0" 不是内部或外部命令`。
- 回复：PowerShell 设置环境变量的语法不正确导致报错。随后我将代码默认关闭结构调试模式（`PDF_STRUCTURE_ONLY=0`），保证右侧内容默认显示。

## 4) 是否能默认显示中间与右侧内容
- 问题：希望默认显示正文与分析（中间与右侧）。
- 回复：已修改 `epub_reader.py`，默认关闭结构调试模式（`PDF_STRUCTURE_ONLY=0`）。运行 `python pydemo\epub_reader.py pydemo\sample_outline.pdf` 即可看到目录树、正文与分析。

## 5) 确认 PyMuPDF 环境
- 问题：你反馈已成功安装 PyMuPDF。
- 回复：我先用 Python 命令验证 `import fitz`，若失败则安装 `PyMuPDF==1.24.9`（优先轮子）。确认可导入后，计划启用后端并跑解析与 UI，但该步骤被跳过。

## 6) 将 `PDF_USE_PYMUPDF` 移入 `config.py`
- 问题：希望通过配置文件控制是否使用 PyMuPDF。
- 回复：
  - 在 `pydemo/config.py` 中新增：`PDF_USE_PYMUPDF = "1"`（支持 `"0"/"1"/"auto"`）。
  - 在 `epub_reader.py` 启动时读取并注入为环境变量，然后重新计算全局开关，确保即时生效。
  - 使用方法：修改配置后直接运行程序即可，无需额外环境变量。

## 7) 将 `PDF_STRUCTURE_ONLY` 移入 `config.py`
- 问题：也希望通过配置文件控制结构调试模式。
- 回复：
  - 在 `pydemo/config.py` 中新增：`PDF_STRUCTURE_ONLY = "0"`（`"1"`为只结构调试）。
  - 在 `epub_reader.py` 启动时读取并注入环境，同时在 `main()` 中重新计算全局开关，保证 UI 行为与配置一致。

## 8) 再次打开同一本或其它书报错：`PdfLoader has no attribute pickfile/pick_file`
- 问题：打开一本书后，菜单“打开...”再次打开时报：`PdfLoader has no attributte Pickfile`（大小写差异或拼写），本质是缺少 `pick_file` 方法。
- 回复：
  - 我为 `PdfLoader` 增加了与 `EpubLoader` 一致的 `pick_file()` 方法（文件选择器），避免再次打开时报错。
  - 验证步骤：运行 `python pydemo\epub_reader.py pydemo\sample_outline.pdf`，进入菜单“文件 -> 打开...”，选择任意 PDF/EPUB，确认不再报错、目录树与正文正确刷新。

---

## 相关文件改动摘要
- `pydemo/config.py`：新增 `PDF_USE_PYMUPDF`、`PDF_STRUCTURE_ONLY` 配置项，并作为程序启动时的默认控制来源。
- `pydemo/epub_reader.py`：
  - 启动时读取 `config.py`，注入环境变量，随后重新计算全局开关。
  - `PdfLoader` 增加 `pick_file()`，与 `EpubLoader` 对齐，修复“再次打开”报错。

## 运行与验证提示
- 默认行为：显示正文与分析（`PDF_STRUCTURE_ONLY="0"`），使用 PyMuPDF（`PDF_USE_PYMUPDF="1"`）若已安装，否则自动回退。
- 启动示例：`python pydemo\epub_reader.py pydemo\sample_outline.pdf`
- 切换书籍：菜单“文件 -> 打开...”，选择 `*.pdf` 或 `*.epub`。

如需继续记录新的问答，请直接提出问题，我会追加到本文件。

## 完整会话记录（逐条）

- 用户：最初指令（原文）：
  > 复制  
  > 删除  
  > 当前项目是一个阅读助手的项目，其中pydemo 是一个python的原型，不过还没有代码。 请用python先实现一个原型的epub 阅读器。这个阅读器的主要功能是两个窗口，上面的窗口为书籍内容展示窗口，下面的窗口为命令行输出窗口，阅读器会加载书籍，然后尝试利用大模型，对书籍进行持续的阅读。 下面的命令行会持续的显示当前的阅读的内容，和学习到的知识
- 助手：确认需求，规划原型结构与实现路径，创建 `pydemo` 原型脚本与示例资源，后续逐步完善解析、UI 与配置。

- 原文精确文本如下（保持换行与空格）：
```
复制

删除

当前项目是一个阅读助手的项目，其中pydemo 是一个python的原型，不过还没有代码。 请用python先实现一个原型的epub 阅读器。这个阅读器的主要功能是两个窗口，上面的窗口为书籍内容展示窗口，下面的窗口为命令行输出窗口，阅读器会加载书籍，然后尝试利用大模型，对书籍进行持续的阅读。 下面的命令行会持续的显示当前的阅读的内容，和学习到的知识
```

- 用户: 改造大模型的支持，”# Please install OpenAI SDK first: `pip3 install openai`

import os

from openai import OpenAI

client = OpenAI(

api_key=os.environ.get('DEEPSEEK_API_KEY'),

base_url=" https://api.deepseek.com ")

response = client.chat.completions.create(

model="deepseek-chat",

messages=[

{"role": "system", "content": "You are a helpful assistant"},

{"role": "user", "content": "Hello"},

],

stream=False

)

-助手：
Builder

我会修正常量引用，将 epub.ITEM_DOCUMENT 替换为正确的 ebooklib.ITEM_DOCUMENT ，以避免 AttributeError。随后运行示例书验证。

pydemo\epub_reader.py

+ 3 - 2

审查

br1 终端

.venv\Scripts\Activate.ps1; python pydemo/epub_reader.py pydemo\sample_book.epub

我先在代码中搜索并修复所有 epub.ITEM_DOCUMENT 的引用，同时改用更稳妥的 get_items_of_type(ebooklib.ITEM_DOCUMENT) 。随后我会优化异常处理，避免在终端运行时弹出阻塞的消息框。

在工作区搜索 'ITEM_DOCUMENT'

pydemo\epub_reader.py 1 - 260

在工作区搜索 'epub\.ITEM_DOCUMENT'

我将修复 EPUB 文档类型的判断逻辑，改用 get_items_of_type 并在异常时根据 media_type 兜底过滤；同时移除阻塞的 messagebox.showerror ，直接打印错误以避免终端运行卡住。随后我会运行示例书做一次验证。

pydemo\epub_reader.py

+ 36 - 24

审查

br1 终端

.venv\Scripts\Activate.ps1; python pydemo/epub_reader.py pydemo\sample_book.epub

The error comes from referencing the wrong constant. In ebooklib , ITEM_DOCUMENT is defined on the top-level ebooklib module, not ebooklib.epub . I’ve fixed the loader to avoid this entirely and made the document filtering more robust.

What I changed

- Use book.get_items_of_type(ebooklib.ITEM_DOCUMENT) when available.
- Fallback to filtering by media_type ( application/xhtml+xml or text/html ) if needed.
- Removed the blocking messagebox.showerror to prevent terminal hangs.
Verified Loader Logic

- It now avoids AttributeError regardless of ebooklib minor version differences.
- It continues to parse chapter titles and plain text safely.
Run Again

- Activate the virtual environment and launch the demo:
  - .venv\Scripts\Activate.ps1
  - python pydemo\epub_reader.py pydemo\sample_book.epub
If you still see any AttributeError, it likely means an older file or a different script is being run. Ensure you’re running the updated pydemo\epub_reader.py .

Optional checks

- Check your ebooklib version:
  - pip show ebooklib
- Quick sanity check:
  - python -c "import ebooklib; print(hasattr(ebooklib,'ITEM_DOCUMENT'))"
If you want me to add a stricter compatibility path for very old ebooklib versions, I can include a pure media_type -based filter only (no use of ITEM_DOCUMENT ) to cover all cases.

wj lv

复制

删除

改造大模型的支持，”# Please install OpenAI SDK first: `pip3 install openai`

import os

from openai import OpenAI

client = OpenAI(

api_key=os.environ.get('DEEPSEEK_API_KEY'),

base_url=" https://api.deepseek.com ")

response = client.chat.completions.create(

model="deepseek-chat",

messages=[

{"role": "system", "content": "You are a helpful assistant"},

{"role": "user", "content": "Hello"},

],

stream=False

)

print(response.choices[0].message.content)" 这样使用，以支持访问deepseek

Builder

我将更新原型以支持使用 OpenAI SDK 访问 DeepSeek（新增 provider、环境变量与示例调用），同时在依赖与 README 中补充说明。随后安装依赖并做一次运行验证。

- 用户：提供 `requirements.txt` 第 4 行为 `pdfminer.six==20231228`，并明确不移除 PyMuPDF。
- 助手：确认保留 `PyMuPDF`。说明 Windows + Python 3.13 安装失败原因：缺少预编译轮子，`pip`改为源码构建需要 VS2019 v142 工具集。提出两种方案：推荐使用 Python 3.12 虚拟环境，或安装 VS2019 Build Tools（或在 VS2022 安装 v142）。确认代码已支持无 `fitz` 回退到 `PyPDF2 + pdfminer.six`。
- 用户：询问如何安装 VS2019 v142 编译环境用于 Python 3.13。
- 助手：提供详细步骤：在 VS2022 勾选 v142 工具集与 Windows SDK，或安装 VS2019 Build Tools 并选择“使用 C++ 的桌面开发”。给出验证与编译 PyMuPDF 的步骤。
- 用户：请求显示右侧内容。
- 助手：尝试通过命令行设置环境变量并运行 UI，PowerShell 报错 `"=0" 不是内部或外部命令`，定位为环境变量设置语法问题。
- 用户：询问能否默认显示中间和右侧内容。
- 助手：修改 `epub_reader.py` 默认关闭结构调试模式（`PDF_STRUCTURE_ONLY=0`），给出运行与验证步骤，确认右侧可显示内容。
- 用户：反馈已成功安装 PyMuPDF。
- 助手：计划验证 PyMuPDF 切换逻辑并运行 UI。先用 Python 导入 `fitz` 测试失败后，安装 `PyMuPDF==1.24.9`（优先使用轮子），随后导入成功但版本显示为 `unknown`，Python 版本为 3.13.7。计划运行解析测试与 UI，但步骤被跳过。
- 用户：请求将 `PDF_USE_PYMUPDF` 移入 `config.py`。
- 助手：在 `pydemo/config.py` 新增 `PDF_USE_PYMUPDF`（支持 `"0"/"1"/"auto"`），在 `epub_reader.py` 启动时读取并注入环境变量，然后重新计算全局开关。提供用法说明。
- 用户：请求将 `PDF_STRUCTURE_ONLY` 也移入 `config.py`。
- 助手：在 `pydemo/config.py` 新增 `PDF_STRUCTURE_ONLY`，在 `epub_reader.py` 启动时读取并注入环境变量，并在 `main()` 中重新计算全局开关。提供配置与运行说明。
- 用户：发现已打开一本书后再次打开，报错 `PdfLoader has noattributte Pickfile`。
- 助手：在 `PdfLoader` 中增加与 `EpubLoader` 一致的 `pick_file()` 方法，使用文件选择器统一行为，修复再次打开时报错。提供验证步骤。
- 用户：请求把 pydemo 项目里问过的问题与回复写入 `develop.md`。
- 助手：创建并填写 `pydemo/develop.md`，整理为摘要版 Q&A。
- 用户：要求将当前会话的全部内容记录到 `develop.md`。
- 助手：将完整逐条会话记录追加到 `develop.md`（本节）。

## 用户操作记录（你做了些什么）

- 提出原型需求：希望先实现一个双窗口的 EPUB 阅读器原型（上方内容展示、下方命令行输出），并持续利用大模型进行阅读与学习记录。
- 提供依赖信息：指出 `requirements.txt` 第 4 行为 `pdfminer.six==20231228`，并要求保留 `PyMuPDF` 不移除。
- 环境咨询：询问如何在 Windows + Python 3.13 安装 VS2019 v142 编译环境以支持 `PyMuPDF`。
- UI 行为：请求右侧内容显示，以及默认显示中间与右侧内容的配置。
- 环境状态：反馈已成功安装 `PyMuPDF`。
- 配置诉求：要求将 `PDF_USE_PYMUPDF`、`PDF_STRUCTURE_ONLY` 两个开关移入 `pydemo/config.py` 统一管理。
- 问题反馈：在已打开一本书后再次打开，提示 `PdfLoader has no attributte Pickfile`。
- 文档诉求：要求把项目中的提问与我的回复写入 `pydemo/develop.md`。
- 会话完整性：再次要求把本次会话的全部记录写入 `develop.md`，并补充“最初指令”的原文；确认是否找到原文并要求以精确文本形式加入。
- 记录请求：现在进一步要求“记录我都做了些什么”。
- 其他：在若干步骤中选择跳过运行解析测试或 UI 启动（我已在文档中保留计划与验证方式）。
