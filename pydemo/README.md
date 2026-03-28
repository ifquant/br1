# Python EPUB Reader Prototype

This is a simple Python prototype for an EPUB reading assistant. It has two panes:
- Top: book content display
- Bottom: streaming log area for reading progress and learned knowledge

Features:
- Load `.epub` files, parse chapters, render text
- Background task simulates continuous reading and logs insights
- Optional LLM integration via environment variable (OpenAI-compatible)

## Setup

1. Ensure Python 3.10+
2. Install dependencies:

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r pydemo/requirements.txt
```

## Run

```bash
python pydemo/epub_reader.py path\\to\\book.epub
```

If no path is provided, a file picker will open.

Generate a sample EPUB for testing:

```bash
python pydemo/create_sample_epub.py
python pydemo/epub_reader.py pydemo\\sample_book.epub
```

## LLM Integration

Set environment variables to enable simulated/real LLM summarization:

- `LLM_PROVIDER`: `mock` (default), `openai`, or `deepseek`
- `LLM_MODEL`: optional, override default model per provider
- `OPENAI_API_KEY`: required when `LLM_PROVIDER=openai`
- `DEEPSEEK_API_KEY`: required when `LLM_PROVIDER=deepseek`
- `DEEPSEEK_BASE_URL`: optional, defaults to `https://api.deepseek.com`

Optional dependency for OpenAI provider:

```bash
pip install openai
```

Example (PowerShell) using DeepSeek via OpenAI SDK:

```powershell
$env:LLM_PROVIDER = "deepseek"
$env:DEEPSEEK_API_KEY = "YOUR_DEEPSEEK_KEY"
$env:DEEPSEEK_BASE_URL = "https://api.deepseek.com"
$env:LLM_MODEL = "deepseek-chat"  # optional
python pydemo\epub_reader.py pydemo\sample_book.epub
```

The reading loop periodically summarizes the current section and appends learned knowledge.

## Notes

- This is a prototype for UI and flow demonstration; not production-ready.
- EPUB rendering is simplified to plain text.