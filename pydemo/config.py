"""
Programmatic configuration for LLM settings.

Edit these values directly in code to configure providers without relying on external env vars.
Note: Avoid committing real API keys in version control.
"""

# Set to a provider name to enable programmatic overrides: "mock", "openai", or "deepseek".
LLM_PROVIDER = "deepseek"  # e.g. "deepseek"

# Optional: model name per provider (e.g. "deepseek-chat")
LLM_MODEL = "deepseek-chat"

# OpenAI provider key (used when LLM_PROVIDER == "openai")
OPENAI_API_KEY = "sk-99abbb8a414349158f03df754352b600"

# DeepSeek provider settings (used when LLM_PROVIDER == "deepseek")
DEEPSEEK_API_KEY = "sk-99abbb8a414349158f03df754352b600"
DEEPSEEK_BASE_URL = "https://api.deepseek.com"  # e.g. "https://api.deepseek.com"

# PDF parsing backend: set to "1" to force using PyMuPDF (fitz),
# set to "0" to disable, or use "auto" to enable when installed.
# This value will be exported to env var PDF_USE_PYMUPDF at startup.
PDF_USE_PYMUPDF = "1"

# PDF structure-only mode: set to "1" to only show chapter titles
# (skip page text extraction), set to "0" to display full content.
# This value will be exported to env var PDF_STRUCTURE_ONLY at startup.
PDF_STRUCTURE_ONLY = "0"
