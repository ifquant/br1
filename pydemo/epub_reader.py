import os
import sys
import threading
import time
import warnings
import json
from dataclasses import dataclass
from typing import List, Optional, Dict

try:
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup
except Exception as e:
    print("Missing dependencies. Please run: pip install -r pydemo/requirements.txt", file=sys.stderr)
    raise

# Optional PDF dependency; only required when opening PDF files
try:
    import PyPDF2  # type: ignore
except Exception:
    PyPDF2 = None

# Optional: PyMuPDF for robust PDF TOC and text extraction
try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None

# Optional: pdfminer.six for font-size aware heading detection
try:
    from pdfminer.high_level import extract_pages
    from pdfminer.layout import LTTextContainer, LTTextLineHorizontal, LTChar
except Exception:
    extract_pages = None
    LTTextContainer = None
    LTTextLineHorizontal = None
    LTChar = None

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except Exception as e:
    print("Tkinter is required. On Windows it ships with Python; on Linux install python3-tk.", file=sys.stderr)
    raise

# Debug mode: show chapter structure only for PDF, skip page text extraction
# Disabled by default so content displays; can be overridden via env var PDF_STRUCTURE_ONLY
PDF_STRUCTURE_ONLY = str(os.environ.get("PDF_STRUCTURE_ONLY", "0")).lower() in ("1", "true", "yes", "y")
# Prefer PyMuPDF when available; can be overridden via env var PDF_USE_PYMUPDF
PDF_USE_PYMUPDF = False
try:
    val = str(os.environ.get("PDF_USE_PYMUPDF", "auto")).lower()
    if fitz is not None and val in ("1", "true", "yes", "y", "auto"):
        PDF_USE_PYMUPDF = True
except Exception:
    PDF_USE_PYMUPDF = (fitz is not None)


# Simple tooltip helper for Tkinter widgets (must be defined before use)
class ToolTip:
    def __init__(self, widget):
        self.widget = widget
        self.tipwindow = None
        self.text = ""

    def showtip(self, text: str, x_root: int, y_root: int):
        try:
            if not text:
                self.hidetip()
                return
            # Avoid duplicating the same tooltip repeatedly
            if self.tipwindow:
                # update position and text
                try:
                    self.tipwindow.wm_geometry(f"+{x_root + 20}+{y_root + 10}")
                except Exception:
                    pass
                return
            tw = tk.Toplevel(self.widget)
            self.tipwindow = tw
            tw.wm_overrideredirect(True)
            tw.wm_geometry(f"+{x_root + 20}+{y_root + 10}")
            label = tk.Label(
                tw,
                text=text,
                justify="left",
                background="#ffffe0",
                relief="solid",
                borderwidth=1,
                font=("tahoma", 8),
            )
            label.pack(ipadx=4, ipady=2)
        except Exception:
            self.hidetip()

    def hidetip(self):
        tw = self.tipwindow
        self.tipwindow = None
        if tw:
            try:
                tw.destroy()
            except Exception:
                pass


# Recent books persistence
RECENTS_FILE = os.path.join(os.path.dirname(__file__), "recent_books.json")

def load_recents() -> list[str]:
    try:
        with open(RECENTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                # ensure strings
                return [str(p) for p in data]
    except Exception:
        pass
    return []

def save_recents(paths: list[str]) -> None:
    try:
        with open(RECENTS_FILE, "w", encoding="utf-8") as f:
            json.dump(paths, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def add_recent(path: str) -> list[str]:
    recents = load_recents()
    # Move to front or insert
    try:
        path = os.path.abspath(path)
    except Exception:
        path = path
    if path in recents:
        recents.remove(path)
    recents.insert(0, path)
    # Limit length
    recents = recents[:20]
    save_recents(recents)
    return recents


@dataclass
class Chapter:
    title: str
    text: str
    level: int = 1
    start_page: Optional[int] = None
    end_page: Optional[int] = None


class EpubLoader:
    def __init__(self, path: str | None = None) -> None:
        self.path = path
        self.chapters: List[Chapter] = []
        self.book_title: str = ""

    def pick_file(self) -> Optional[str]:
        root = tk.Tk()
        root.withdraw()
        path = filedialog.askopenfilename(
            title="选择电子书文件",
            filetypes=[
                ("EPUB 文件", "*.epub"),
                ("PDF 文件", "*.pdf"),
                ("所有支持格式", "*.epub *.pdf"),
            ],
        )
        root.destroy()
        return path or None

    def load(self) -> List[Chapter]:
        if not self.path:
            self.path = self.pick_file()
        if not self.path:
            raise FileNotFoundError("No EPUB selected")

        # Silence known ebooklib warnings in terminal output
        try:
            warnings.filterwarnings(
                "ignore",
                message=r"In the future version we will turn default option ignore_ncx to True.",
                category=UserWarning,
                module=r"ebooklib.epub",
            )
            warnings.filterwarnings(
                "ignore",
                category=FutureWarning,
                module=r"ebooklib.epub",
            )
        except Exception:
            pass

        # Read EPUB with explicit option to avoid NCX-related warning
        book = epub.read_epub(self.path, options={"ignore_ncx": True})
        # Get book title for caching
        title = ""
        try:
            md = book.get_metadata('DC', 'title')
            if md and md[0] and md[0][0]:
                title = str(md[0][0])
        except Exception:
            pass
        if not title:
            try:
                title = os.path.splitext(os.path.basename(self.path))[0]
            except Exception:
                title = "Untitled"
        self.book_title = title
        chapters: List[Chapter] = []
        # Prefer direct document items; fallback by media_type detection
        try:
            doc_items = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))
        except Exception:
            doc_items = [
                it for it in book.get_items()
                if getattr(it, "media_type", "").lower() in ("application/xhtml+xml", "text/html")
            ]

        for item in doc_items:
            html = item.get_content()
            soup = BeautifulSoup(html, "html.parser")
            # Extract title
            title_tag = soup.find(["h1", "h2", "h3"]) or soup.title
            title = title_tag.get_text(strip=True) if title_tag else "Untitled"
            # Extract text
            # Remove scripts/styles
            for tag in soup(["script", "style"]):
                tag.extract()
            text = soup.get_text(separator="\n")
            text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
            if text:
                chapters.append(Chapter(title=title, text=text, level=1, start_page=None, end_page=None))
        # Fallback to spine order if no document items parsed
        if not chapters and getattr(book, "spine", None):
            for (idref, _) in book.spine:
                item = book.get_item_with_id(idref)
                if not item:
                    continue
                mt = getattr(item, "media_type", "").lower()
                if mt not in ("application/xhtml+xml", "text/html"):
                    continue
                html = item.get_content()
                soup = BeautifulSoup(html, "html.parser")
                title_tag = soup.find(["h1", "h2", "h3"]) or soup.title
                title = title_tag.get_text(strip=True) if title_tag else idref
                text = soup.get_text(separator="\n")
                text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
                chapters.append(Chapter(title=title, text=text, level=1, start_page=None, end_page=None))

        self.chapters = chapters
        return chapters


class PdfLoader:
    def __init__(self, path: str | None = None) -> None:
        self.path = path
        self.chapters: List[Chapter] = []
        self.book_title: str = ""

    def pick_file(self) -> Optional[str]:
        # Reuse the same file picker behavior as EpubLoader
        root = tk.Tk()
        root.withdraw()
        path = filedialog.askopenfilename(
            title="选择电子书文件",
            filetypes=[
                ("EPUB 文件", "*.epub"),
                ("PDF 文件", "*.pdf"),
                ("所有支持格式", "*.epub *.pdf"),
            ],
        )
        root.destroy()
        return path or None

    def load(self) -> List[Chapter]:
        if not self.path:
            raise FileNotFoundError("No PDF selected")
        # Ensure at least one backend is available
        if not PDF_USE_PYMUPDF and PyPDF2 is None:
            raise ImportError("未安装 PDF 解析器，请运行: pip install -r pydemo/requirements.txt")

        # Prefer PyMuPDF
        if PDF_USE_PYMUPDF and fitz is not None:
            try:
                doc = fitz.open(self.path)
            except Exception as e:
                raise RuntimeError(f"读取 PDF 失败: {e}")

            chapters: List[Chapter] = []
            # TOC format: list of [level, title, page_number] with 1-based page
            toc: List[list] = []
            try:
                toc = doc.get_toc(simple=True) or []
            except Exception:
                toc = []
            items: List[tuple[str, int, int]] = []
            for entry in toc:
                try:
                    level = int(entry[0]) if len(entry) > 0 else 1
                    title = str(entry[1]) if len(entry) > 1 else "书签"
                    page1 = int(entry[2]) if len(entry) > 2 else 1
                except Exception:
                    level, title, page1 = 1, "书签", 1
                # Convert to 0-based index and clamp
                start_idx = max(0, min(page1 - 1, doc.page_count - 1))
                items.append((title, start_idx, max(1, level)))

            if items:
                total_pages = int(getattr(doc, "page_count", 0)) or 0
                if total_pages <= 0:
                    total_pages = len(items)  # fallback
                for i, (title, start_idx, level) in enumerate(items):
                    next_boundary = None
                    for j in range(i + 1, len(items)):
                        _, next_start, next_level = items[j]
                        if (next_level or 1) <= (level or 1):
                            next_boundary = next_start
                            break
                    end_idx = (next_boundary - 1) if next_boundary is not None else (total_pages - 1)
                    end_idx = max(start_idx, end_idx)
                    if PDF_STRUCTURE_ONLY:
                        content = ""
                    else:
                        # Concatenate page texts in range
                        parts: List[str] = []
                        for p in range(start_idx, end_idx + 1):
                            try:
                                parts.append(doc.load_page(p).get_text("text") or "")
                            except Exception:
                                parts.append("")
                        content = "\n".join(s.strip() for s in parts if s).strip()
                    chapters.append(Chapter(
                        title=title,
                        text=content,
                        level=int(level) if level else 1,
                        start_page=start_idx + 1,
                        end_page=end_idx + 1,
                    ))

            # Book title from metadata or filename
            title = ""
            try:
                md = doc.metadata or {}
                t = md.get("title")
                if t:
                    title = str(t)
            except Exception:
                pass
            if not title:
                try:
                    title = os.path.splitext(os.path.basename(self.path))[0]
                except Exception:
                    title = "Untitled"
            self.book_title = title
            self.chapters = chapters
            try:
                doc.close()
            except Exception:
                pass
            return chapters

        # Fallback to PyPDF2
        try:
            reader = PyPDF2.PdfReader(self.path)
        except Exception as e:
            raise RuntimeError(f"读取 PDF 失败: {e}")

        # Extract per-page text first unless in structure-only debugging mode
        pages_text: List[str] = []
        if not PDF_STRUCTURE_ONLY:
            try:
                if extract_pages is not None:
                    pages_text = self._extract_pages_text_via_pdfminer()
            except Exception:
                pages_text = []
            if not pages_text:
                for page in reader.pages:
                    try:
                        pages_text.append(page.extract_text() or "")
                    except Exception:
                        pages_text.append("")

        chapters: List[Chapter] = []
        # Try to use outlines (bookmarks) as chapter titles and boundaries
        outlines = None
        try:
            outlines = getattr(reader, "outlines", None)
        except Exception:
            outlines = None

        # Helper to flatten outlines into (title, page_index, level)
        def flatten_outlines(obj) -> List[tuple[str, int, int]]:
            result: List[tuple[str, int, int]] = []

            def get_title(node) -> str:
                try:
                    t = getattr(node, "title", None)
                    if t:
                        return str(t)
                except Exception:
                    pass
                try:
                    t = getattr(node, "get", lambda *_: None)("/Title") or getattr(node, "get", lambda *_: None)("Title")
                    if t:
                        return str(t)
                except Exception:
                    pass
                return "书签"

            def get_page_index(node) -> int:
                try:
                    return int(reader.get_destination_page_number(node))
                except Exception:
                    pass
                try:
                    page_obj = getattr(node, "page", None) or getattr(node, "get", lambda *_: None)("/Page")
                    if page_obj is not None:
                        return int(reader.pages.index(page_obj))
                except Exception:
                    pass
                return 0

            def iter_children(node):
                # Prefer explicit 'children' list
                try:
                    children = getattr(node, "children", None)
                    if isinstance(children, list) and children:
                        return list(children)
                except Exception:
                    pass
                # Fallback: dict-like linked list via '/First' and '/Next'
                out: List[object] = []
                try:
                    first = getattr(node, "get", lambda *_: None)("/First")
                    curr = first
                    while curr is not None:
                        out.append(curr)
                        curr = getattr(curr, "get", lambda *_: None)("/Next")
                except Exception:
                    pass
                return out

            def walk_list(lst, depth: int):
                for item in lst:
                    if isinstance(item, list):
                        # Nested list represents children -> increase depth
                        walk_list(item, depth + 1)
                    else:
                        walk_node(item, depth)

            def walk_node(node, depth: int):
                title = get_title(node)
                page_index = max(0, min(get_page_index(node), len(reader.pages) - 1))
                result.append((title, page_index, max(1, depth)))
                # Recurse explicit children
                for child in iter_children(node):
                    walk_node(child, depth + 1)

            # Kick off using list walker to honor nested list depths
            if isinstance(obj, list):
                walk_list(obj, 1)
            else:
                walk_node(obj, 1)
            # Preserve pre-order sequence
            return result

        items: List[tuple[str, int, int]] = []
        if outlines:
            try:
                items = flatten_outlines(outlines)
            except Exception:
                items = []

        if items:
            # Build chapters from bookmark ranges
            total_pages = len(reader.pages)
            for i, (title, start_idx, level) in enumerate(items):
                # Find the next item that is same level or higher to close current section
                next_boundary = None
                for j in range(i + 1, len(items)):
                    next_title, next_start, next_level = items[j]
                    if (next_level or 1) <= (level or 1):
                        next_boundary = next_start
                        break
                end_idx = (next_boundary - 1) if next_boundary is not None else (total_pages - 1)
                end_idx = max(start_idx, end_idx)
                # In structure-only mode, do not include page content
                if PDF_STRUCTURE_ONLY or not pages_text:
                    content = ""
                else:
                    content = "\n".join(pages_text[start_idx:end_idx + 1]).strip()
                chapters.append(Chapter(
                    title=title,
                    text=content,
                    level=int(level) if level else 1,
                    start_page=start_idx + 1,
                    end_page=end_idx + 1,
                ))
        else:
            # No bookmarks — try heading-based segmentation
            headings = self._find_headings_via_pdfminer() or self._find_headings_via_regex(pages_text)
            if headings and len(headings) >= 2:
                for i, (title, start_idx) in enumerate(headings):
                    end_idx = (headings[i + 1][1] - 1) if i + 1 < len(headings) else (len(pages_text) - 1)
                    end_idx = max(start_idx, end_idx)
                    content = "\n".join(pages_text[start_idx:end_idx + 1]).strip()
                    chapters.append(Chapter(
                        title=title,
                        text=content,
                        level=self._infer_heading_level(title),
                        start_page=start_idx + 1,
                        end_page=end_idx + 1,
                    ))
            else:
                # Fallback: one page per chapter
                for i, text in enumerate(pages_text):
                    chapters.append(Chapter(title=f"第 {i + 1} 页", text=text, level=1, start_page=i + 1, end_page=i + 1))

        # Book title from metadata or filename
        title = ""
        try:
            md_title = reader.metadata.get("/Title") if getattr(reader, "metadata", None) else None
            if md_title:
                title = str(md_title)
        except Exception:
            pass
        if not title:
            try:
                title = os.path.splitext(os.path.basename(self.path))[0]
            except Exception:
                title = "Untitled"
        self.book_title = title
        self.chapters = chapters
        return chapters

    def _extract_pages_text_via_pdfminer(self) -> List[str]:
        """Extract text per page using pdfminer.six layouts for improved accuracy."""
        pages: List[str] = []
        if extract_pages is None or LTTextContainer is None:
            return pages
        try:
            for layout in extract_pages(self.path):
                lines: List[tuple[float, float, str]] = []  # (y, x, text)
                for element in layout:
                    if isinstance(element, LTTextContainer):
                        # Collect each text line with approximate position
                        for line in element:
                            text = getattr(line, 'get_text', lambda: '')().strip()
                            if not text:
                                continue
                            x = getattr(line, 'x0', 0.0)
                            y = getattr(line, 'y1', getattr(line, 'y0', 0.0))
                            lines.append((y, x, text))
                # Order: top-to-bottom (y desc), then left-to-right (x asc)
                lines.sort(key=lambda t: (-t[0], t[1]))
                page_text = "\n".join(t[2] for t in lines)
                pages.append(page_text)
        except Exception:
            # Return what we have, or empty to trigger fallback
            return pages
        return pages

    def _find_headings_via_regex(self, pages_text: List[str]) -> List[tuple[str, int]]:
        """Detect heading pages using regex heuristics on early lines of each page.
        Returns list of (title, start_page_index).
        """
        import re
        headings: List[tuple[str, int]] = []

        # Patterns for Chinese headings like 第X章/节/部分/篇
        cn_num = "[一二三四五六七八九十百千0-9]+"
        cn_head_pat = re.compile(rf"^\s*第{cn_num}[章节部篇集]\s*[:：、]?\s*(\S.*)?$")
        # Numeric hierarchical headings: 1 / 1.1 / 2.3.4 Title
        en_num_head_pat = re.compile(r"^\s*\d+(?:\.\d+){0,2}\s+\S.*")
        # All-caps short lines (English)
        all_caps_pat = re.compile(r"^[A-Z0-9][A-Z0-9\s\-:]{3,60}$")

        def is_probable_heading(line: str) -> bool:
            s = line.strip()
            if not s:
                return False
            # Exclude page numbers and trivial headers/footers
            if re.fullmatch(r"\d{1,4}", s):
                return False
            if len(s) < 3:
                return False
            if len(s) > 120:
                return False
            if cn_head_pat.match(s):
                return True
            if en_num_head_pat.match(s):
                return True
            if all_caps_pat.match(s):
                return True
            # Title Case heuristic: few words, capitalized
            words = s.split()
            if 1 <= len(words) <= 10:
                cap_words = sum(1 for w in words if w[:1].isupper())
                if cap_words >= max(1, int(0.7 * len(words))):
                    return True
            return False

        for page_index, text in enumerate(pages_text):
            # Look at top lines only
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
            top_lines = lines[:20]
            # Prefer longer heading lines to avoid lone section numbers
            candidates = [ln for ln in top_lines if is_probable_heading(ln)]
            if candidates:
                # Pick the first candidate with reasonable length
                best = None
                for ln in candidates:
                    if 4 <= len(ln) <= 80:
                        best = ln
                        break
                if best is None:
                    best = candidates[0]
                # Deduplicate consecutive identical headings
                if not headings or headings[-1][0] != best:
                    headings.append((best, page_index))

        # Heuristic: if too many headings (e.g., one per page), reduce by filtering to strong patterns only
        if len(headings) > len(pages_text) // 2:
            strong_headings = [h for h in headings if cn_head_pat.match(h[0]) or all_caps_pat.match(h[0])]
            if len(strong_headings) >= 2:
                headings = strong_headings
        return headings

    def _find_headings_via_pdfminer(self) -> Optional[List[tuple[str, int]]]:
        """Use pdfminer.six to detect headings by font size and position at the top of pages.
        Returns list of (title, start_page_index) or None if pdfminer.six unavailable.
        """
        if extract_pages is None or LTTextContainer is None:
            return None
        headings: List[tuple[str, int]] = []
        try:
            for page_index, layout in enumerate(extract_pages(self.path)):
                top_candidates: List[tuple[str, float, float]] = []  # (text, avg_size, y_top)
                page_sizes: List[float] = []
                for element in layout:
                    if isinstance(element, LTTextContainer):
                        for line in element:
                            if LTTextLineHorizontal is not None and not isinstance(line, LTTextLineHorizontal):
                                continue
                            text = getattr(line, 'get_text', lambda: '')().strip()
                            if not text:
                                continue
                            sizes: List[float] = []
                            y_top = getattr(line, 'y1', getattr(line, 'y0', 0.0))
                            for obj in line:
                                if LTChar is not None and isinstance(obj, LTChar):
                                    sizes.append(getattr(obj, 'size', 0.0))
                            avg_size = sum(sizes) / len(sizes) if sizes else 0.0
                            if avg_size > 0:
                                page_sizes.append(avg_size)
                            top_candidates.append((text, avg_size, y_top))
                if not top_candidates:
                    continue
                # Sort by y_top descending (top of page first)
                top_candidates.sort(key=lambda t: t[2], reverse=True)
                top_candidates = top_candidates[:30]
                avg_page_size = (sum(page_sizes) / len(page_sizes)) if page_sizes else 0.0
                def plausible(text: str) -> bool:
                    t = text.strip()
                    if len(t) < 3 or len(t) > 120:
                        return False
                    if t.isdigit():
                        return False
                    return True
                chosen = None
                for text, avg_size, _y in top_candidates:
                    if plausible(text) and avg_size >= (avg_page_size * 1.2):
                        chosen = text
                        break
                if chosen:
                    if not headings or headings[-1][0] != chosen:
                        headings.append((chosen, page_index))
            return headings if headings else None
        except Exception:
            return None

    def _infer_heading_level(self, title: str) -> int:
        """Infer hierarchical level from heading text.
        Chinese: 章->1, 节->2, 部分/篇->1, 一、->1, （一）->2, （1）->2; English numeric: dots -> level.
        """
        try:
            import re
            t = title.strip()
            # Normalize some punctuation variants
            t = t.replace('﹙', '（').replace('﹚', '）')
            t = t.replace('(', '（').replace(')', '）')
            if re.search(r"第[一二三四五六七八九十百千0-9]+章", t):
                return 1
            if re.search(r"第[一二三四五六七八九十百千0-9]+节", t):
                return 2
            if re.search(r"第[一二三四五六七八九十百千0-9]+[部分篇集]", t):
                return 1
            # Chinese top-level like "一、" or "1、"
            if re.match(r"\s*[一二三四五六七八九十]+、", t):
                return 1
            if re.match(r"\s*\d+、", t):
                return 1
            # Chinese sub-level like "（一）" / "(一)" or "（1）"
            if re.match(r"\s*（[一二三四五六七八九十]+）", t):
                return 2
            if re.match(r"\s*（\d+）", t):
                return 2
            m = re.match(r"\s*(\d+(?:\.\d+)+)\b", t)
            if m:
                return min(4, 1 + m.group(1).count('.'))
            m2 = re.match(r"\s*(\d+)\b", t)
            if m2:
                return 1
            return 1
        except Exception:
            return 1


class LLMReader:
    def __init__(self) -> None:
        self.provider = os.getenv("LLM_PROVIDER", "mock")
        self.client = None
        self.model_name = os.getenv("LLM_MODEL", "")

        if self.provider == "deepseek":
            # DeepSeek via OpenAI SDK-compatible endpoint
            api_key = os.getenv("DEEPSEEK_API_KEY")
            base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
            if not self.model_name:
                self.model_name = "deepseek-chat"
            if api_key:
                try:
                    from openai import OpenAI
                    self.client = OpenAI(api_key=api_key, base_url=base_url)
                except Exception:
                    self.client = None
        elif self.provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if not self.model_name:
                self.model_name = "gpt-4o-mini"
            if api_key:
                try:
                    from openai import OpenAI
                    self.client = OpenAI(api_key=api_key)
                except Exception:
                    self.client = None

    def summarize(self, text: str, max_chars: int = 800) -> str:
        snippet = text[:max_chars]
        if self.provider in {"openai", "deepseek"} and self.client:
            try:
                # Use a simple prompt; keep lightweight. Model name intentionally generic.
                resp = self.client.chat.completions.create(
                    model=self.model_name or "gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a helpful reading assistant."},
                        {"role": "user", "content": f"Summarize the following excerpt succinctly and list 3 key insights.\n\n{snippet}"},
                    ],
                    temperature=0.3,
                )
                return resp.choices[0].message.content or ""
            except Exception:
                pass
        # Mock summary
        lines = snippet.splitlines()
        summary = " ".join(lines[:5])
        insights = [
            "Identified central theme in the excerpt.",
            "Noted key terminology and definitions.",
            "Flagged potential connections to previous chapters.",
        ]
        return f"Summary: {summary}\nInsights:\n- " + "\n- ".join(insights)


class ReaderGUI:
    def __init__(self, chapters: List[Chapter], llm: LLMReader, loader: Optional[EpubLoader] = None) -> None:
        self.root = tk.Tk()
        self.root.title("EPUB Reading Assistant Prototype")
        self.root.geometry("1000x680")
        self.loader = loader or EpubLoader(None)
        # Caching base directory under current module path
        self.cache_base_dir = os.path.join(os.path.dirname(__file__), "data")
        try:
            os.makedirs(self.cache_base_dir, exist_ok=True)
        except Exception:
            pass
        self.cache_dir: Optional[str] = None

        # Menu bar with Open
        menubar = tk.Menu(self.root)
        filemenu = tk.Menu(menubar, tearoff=0)
        filemenu.add_command(label="打开...", command=self.menu_open)
        menubar.add_cascade(label="文件", menu=filemenu)
        self.root.config(menu=menubar)

        # Toolbar under the menu
        self.toolbar = tk.Frame(self.root)
        self.toolbar.pack(side="top", fill="x")
        self.close_btn = tk.Button(self.toolbar, text="关闭", command=self.close_book)
        self.prev_btn = tk.Button(self.toolbar, text="Prev", command=self.prev_chapter)
        self.next_btn = tk.Button(self.toolbar, text="Next", command=self.next_chapter)
        self.close_btn.pack(side="left", padx=4, pady=2)
        self.prev_btn.pack(side="left", padx=4, pady=2)
        self.next_btn.pack(side="left", padx=4, pady=2)
        # Auto-reading toggle button (default off)
        self.auto_reading = False
        self.auto_btn = tk.Button(self.toolbar, text="自动阅读", command=self.toggle_auto_read, relief="raised")
        self.auto_btn.pack(side="left", padx=4, pady=2)
        # Reread button to force regeneration of current page's cache
        self.reread_btn = tk.Button(self.toolbar, text="重读", command=self.reread_current)
        self.reread_btn.pack(side="left", padx=4, pady=2)

        # Top area: left-right split for content and analysis
        self.top_split = tk.PanedWindow(self.root, orient="horizontal")
        self.top_split.pack(side="top", fill="both", expand=True)

        # Left: recent books list
        self.recent_frame = tk.Frame(self.top_split)
        self.recent_header = tk.Label(self.recent_frame, text="最近打开", anchor="w")
        self.recent_header.pack(fill="x")
        self.recent_list = tk.Listbox(self.recent_frame)
        self.recent_list.pack(fill="both", expand=True)
        # Chapter tree for hierarchical chapters
        self.chapter_tree = ttk.Treeview(self.recent_frame, show="tree")
        self.chapter_tree_scroll = tk.Scrollbar(self.recent_frame, orient="vertical", command=self.chapter_tree.yview)
        self.chapter_tree.configure(yscrollcommand=self.chapter_tree_scroll.set)
        self._tree_item_to_index: Dict[str, int] = {}
        self.recent_list.bind("<<ListboxSelect>>", self.on_recent_select)
        self.recent_list.bind("<Motion>", self.on_recent_hover)
        self.recent_list.bind("<Leave>", self.on_recent_leave)
        # Tooltip for chapter tree
        self.chapter_tree.bind("<Motion>", self.on_chapter_tree_hover)
        self.chapter_tree.bind("<Leave>", self.on_chapter_tree_leave)
        self.chapter_tree.bind("<<TreeviewSelect>>", self.on_chapter_tree_select)
        self.top_split.add(self.recent_frame)

        # Middle: book content
        self.text_display = tk.Text(self.top_split, wrap="word")
        self.top_split.add(self.text_display)

        # Right: analysis/summaries
        self.analysis_display = tk.Text(self.top_split, wrap="word", bg="#f7f7f7")
        self.top_split.add(self.analysis_display)

        # Ensure panes have minimum widths and place initial sashes to keep left list visible
        try:
            self.top_split.paneconfigure(self.recent_frame, minsize=160)
            self.top_split.paneconfigure(self.text_display, minsize=220)
            self.top_split.paneconfigure(self.analysis_display, minsize=220)
        except Exception:
            pass
        # Defer sash placement until geometry is realized
        self.root.after(150, self._place_sashes)

        # Populate recent list
        self.left_mode = 'recents'
        self.recent_paths: List[str] = []
        self.chapter_titles: List[str] = []
        self.recent_tooltip = ToolTip(self.recent_list)
        self._left_hover_index = -1
        self.set_recents(load_recents())

        # Bottom: logs
        self.log_display = tk.Text(self.root, wrap="word", height=8, bg="#111", fg="#eee")
        self.log_display.pack(side="bottom", fill="x")

        # (moved) controls are now on toolbar under the menu

        self.chapters = chapters
        self.llm = llm
        self.index = 0
        self._stop = False

        self.render_chapter()
        # Do not start background reading thread by default
        self.reader_thread = None

        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def on_close(self):
        self._stop = True
        self.root.destroy()

    def _place_sashes(self):
        # Place initial sashes: left ~16%, middle/right ~42% each (equal)
        try:
            w = self.top_split.winfo_width()
            if w <= 1:
                self.root.after(150, self._place_sashes)
                return
            # First sash after left recent/chapters list
            self.top_split.sash_place(0, int(w * 0.16), 0)
            # Second sash after middle content, so middle/right are equal
            self.top_split.sash_place(1, int(w * 0.58), 0)
        except Exception:
            pass

    def render_chapter(self):
        if not self.chapters:
            self.text_display.delete("1.0", tk.END)
            self.text_display.insert(tk.END, "No chapters parsed.")
            return
        chapter = self.chapters[self.index]
        self.text_display.delete("1.0", tk.END)
        try:
            # When structure-only, show title only
            if PDF_STRUCTURE_ONLY:
                self.text_display.insert(tk.END, f"# {chapter.title}\n")
            else:
                self.text_display.insert(tk.END, f"# {chapter.title}\n\n{chapter.text}")
        except Exception:
            self.text_display.insert(tk.END, f"# {chapter.title}\n\n{chapter.text}")
        # Clear analysis panel for the new chapter
        self.update_analysis("", clear=True)
        # When not auto-reading, show cached analysis if available immediately
        try:
            if not self.auto_reading:
                self.show_cached_analysis_if_available()
        except Exception:
            pass

    def log(self, text: str):
        # Ensure UI updates happen on the main thread
        def _append():
            self.log_display.insert(tk.END, text + "\n")
            self.log_display.see(tk.END)
        try:
            if self.root:
                self.root.after(0, _append)
            else:
                _append()
        except Exception:
            _append()

    def update_analysis(self, text: str, clear: bool = False):
        # Update right-side analysis panel safely from background thread
        def _apply():
            if clear:
                self.analysis_display.delete("1.0", tk.END)
            if text:
                self.analysis_display.insert(tk.END, text + "\n")
            self.analysis_display.see(tk.END)
        try:
            if self.root:
                self.root.after(0, _apply)
            else:
                _apply()
        except Exception:
            _apply()

    def set_recents(self, paths: List[str]):
        try:
            self.left_mode = 'recents'
            self.recent_paths = list(paths)
            # Hide chapter tree if visible
            try:
                self.chapter_tree.pack_forget()
                self.chapter_tree_scroll.pack_forget()
            except Exception:
                pass
            self.recent_list.delete(0, tk.END)
            for p in paths:
                name = os.path.basename(p) or p
                self.recent_list.insert(tk.END, name)
            self.recent_header.config(text="最近打开")
            # Ensure listbox is visible
            try:
                self.recent_list.pack(fill="both", expand=True)
            except Exception:
                pass
        except Exception:
            pass

    def set_chapters(self):
        try:
            self.left_mode = 'chapters'
            self.chapter_titles = [c.title for c in self.chapters] if self.chapters else []
            # Hide listbox and show tree
            try:
                self.recent_list.pack_forget()
            except Exception:
                pass
            try:
                self.chapter_tree.pack(fill="both", expand=True, side="left")
                self.chapter_tree_scroll.pack(fill="y", side="right")
            except Exception:
                pass
            self.recent_header.config(text="章节")
            self.populate_chapter_tree()
        except Exception:
            pass

    def populate_chapter_tree(self):
        try:
            # Clear previous tree items
            for item in self.chapter_tree.get_children(""):
                self.chapter_tree.delete(item)
            self._tree_item_to_index.clear()
            # Build hierarchy using Chapter.level; include page range and word count in labels
            stack: List[str] = []  # stack of node ids for current path
            for idx, ch in enumerate(self.chapters or []):
                level = getattr(ch, 'level', 1) or 1
                if level < 1:
                    level = 1
                # Compose label
                p_start = getattr(ch, 'start_page', None)
                p_end = getattr(ch, 'end_page', None)
                page_label = ""
                if p_start is not None and p_end is not None:
                    page_label = f"[{p_start}-{p_end}] "
                word_count = len(ch.text) if ch and ch.text else 0
                wc_label = f"[{word_count}] "
                label = f"{page_label}{wc_label}{ch.title}"
                # Trim stack to parent level (level-1)
                while len(stack) >= level:
                    stack.pop()
                parent = stack[-1] if stack else ""
                node_id = self.chapter_tree.insert(parent, 'end', text=label)
                # Record mapping to chapter index
                self._tree_item_to_index[node_id] = idx
                # Push current node
                stack.append(node_id)
            # Expand top-level nodes by default
            for item in self.chapter_tree.get_children(""):
                try:
                    self.chapter_tree.item(item, open=True)
                except Exception:
                    pass
        except Exception as e:
            self.log(f"章节树构建失败: {e}")

    def on_recent_select(self, event):
        try:
            sel = event.widget.curselection()
            if not sel:
                return
            idx = sel[0]
            if self.left_mode == 'recents':
                path = self.recent_paths[idx] if 0 <= idx < len(self.recent_paths) else None
                if not path:
                    return
                self.open_book(path)
            else:
                # chapters mode: jump to chapter
                if 0 <= idx < len(self.chapters):
                    self.index = idx
                    self.render_chapter()
                    self.log(f"跳转到章节 {self.index + 1}: {self.chapters[self.index].title}")
        except Exception as e:
            self.log(f"Left panel select error: {e}")

    def on_chapter_tree_select(self, event):
        try:
            if self.left_mode != 'chapters':
                return
            selection = self.chapter_tree.selection()
            if not selection:
                return
            iid = selection[0]
            idx = self._tree_item_to_index.get(iid, -1)
            if 0 <= idx < len(self.chapters):
                self.index = idx
                self.render_chapter()
                self.log(f"跳转到章节 {self.index + 1}: {self.chapters[self.index].title}")
        except Exception as e:
            self.log(f"章节树选择失败: {e}")

    def on_chapter_tree_hover(self, event):
        try:
            if self.left_mode != 'chapters':
                self.recent_tooltip.hidetip()
                return
            # Identify item under cursor
            iid = self.chapter_tree.identify_row(event.y)
            if not iid:
                self.recent_tooltip.hidetip()
                return
            idx = self._tree_item_to_index.get(iid, -1)
            if 0 <= idx < len(self.chapters):
                if self._left_hover_index != idx:
                    self._left_hover_index = idx
                    self.recent_tooltip.hidetip()
                ch = self.chapters[idx]
                p_start = getattr(ch, 'start_page', None)
                p_end = getattr(ch, 'end_page', None)
                page_label = ""
                if p_start is not None and p_end is not None:
                    page_label = f"[{p_start}-{p_end}] "
                word_count = len(ch.text) if ch and ch.text else 0
                wc_label = f"[{word_count}] "
                title = f"{page_label}{wc_label}{ch.title}"
                self.recent_tooltip.showtip(title, event.x_root, event.y_root)
            else:
                self.recent_tooltip.hidetip()
        except Exception:
            self.recent_tooltip.hidetip()

    def on_chapter_tree_leave(self, event):
        self._left_hover_index = -1
        try:
            self.recent_tooltip.hidetip()
        except Exception:
            pass

    def on_recent_hover(self, event):
        try:
            idx = self.recent_list.nearest(event.y)
            if self.left_mode == 'recents':
                if not self.recent_paths:
                    self.recent_tooltip.hidetip()
                    return
                if 0 <= idx < len(self.recent_paths):
                    path = self.recent_paths[idx]
                    if self._left_hover_index != idx:
                        self._left_hover_index = idx
                        self.recent_tooltip.hidetip()
                    self.recent_tooltip.showtip(path, event.x_root, event.y_root)
                else:
                    self.recent_tooltip.hidetip()
            else:
                # chapters mode: tooltip shows chapter title
                if 0 <= idx < len(self.chapter_titles):
                    title = self.chapter_titles[idx]
                    if self._left_hover_index != idx:
                        self._left_hover_index = idx
                        self.recent_tooltip.hidetip()
                    self.recent_tooltip.showtip(title, event.x_root, event.y_root)
                else:
                    self.recent_tooltip.hidetip()
        except Exception:
            self.recent_tooltip.hidetip()

    def on_recent_leave(self, event):
        self._left_hover_index = -1
        try:
            self.recent_tooltip.hidetip()
        except Exception:
            pass

    def menu_open(self):
        try:
            path = self.loader.pick_file()
            if path:
                self.open_book(path)
        except Exception as e:
            self.log(f"Open error: {e}")

    def open_book(self, path: str):
        try:
            ext = os.path.splitext(path)[1].lower()
            if ext == ".pdf":
                loader = PdfLoader(path)
            else:
                loader = EpubLoader(path)
            self.loader = loader
            chapters = loader.load()
            self.chapters = chapters
            self.index = 0
            self.render_chapter()
            # update recents
            recents = add_recent(path)
            self.set_recents(recents)
            # switch left panel to chapter list
            self.set_chapters()
            # Prepare cache directory for this book
            try:
                title = getattr(self.loader, "book_title", "") or os.path.splitext(os.path.basename(path))[0]
                safe = self._sanitize_name(title)
                self.cache_dir = os.path.join(self.cache_base_dir, safe)
                os.makedirs(self.cache_dir, exist_ok=True)
            except Exception:
                self.cache_dir = None
            # restart reader loop to focus new content only when auto-reading is enabled
            if self.auto_reading:
                self.restart_reader_thread()
            self.log(f"Opened: {os.path.basename(path)}")
        except Exception as e:
            self.log(f"Load Error: {e}")

    def restart_reader_thread(self):
        # signal stop and restart the background loop
        try:
            self._stop = True
            time.sleep(0.2)
        except Exception:
            pass
        self._stop = False
        try:
            self.reader_thread = threading.Thread(target=self._background_reading_loop, daemon=True)
            self.reader_thread.start()
        except Exception as e:
            self.log(f"Restart thread error: {e}")

    def next_chapter(self):
        if self.index < len(self.chapters) - 1:
            self.index += 1
            self.render_chapter()
            self.log(f"Moved to chapter {self.index + 1}: {self.chapters[self.index].title}")

    def prev_chapter(self):
        if self.index > 0:
            self.index -= 1
            self.render_chapter()
            self.log(f"Moved to chapter {self.index + 1}: {self.chapters[self.index].title}")

    def close_book(self):
        # Close current book view and restore recent books list on left
        try:
            self.chapters = []
            self.index = 0
            self.text_display.delete("1.0", tk.END)
            self.text_display.insert(tk.END, "未打开书籍。请通过文件菜单或左侧最近列表打开。")
            self.update_analysis("", clear=True)
            # Stop auto-reading if active
            try:
                self._stop = True
            except Exception:
                pass
            self.auto_reading = False
            try:
                self.auto_btn.config(relief="raised")
            except Exception:
                pass
            # Clear cache dir reference
            self.cache_dir = None
            # Restore recents
            self.set_recents(load_recents())
            self.log("已关闭当前书籍")
        except Exception as e:
            self.log(f"关闭失败: {e}")

    def toggle_auto_read(self):
        # Toggle automatic reading: start/stop background loop and update button relief
        try:
            if self.auto_reading:
                # Turning off
                self.auto_reading = False
                self._stop = True
                try:
                    self.auto_btn.config(relief="raised")
                except Exception:
                    pass
                self.log("已停止自动阅读")
            else:
                # Turning on
                if not self.chapters:
                    self.log("未打开书籍，无法自动阅读。")
                    return
                self._stop = False
                self.auto_reading = True
                try:
                    self.auto_btn.config(relief="sunken")
                except Exception:
                    pass
                # Start thread if not alive
                try:
                    if not getattr(self, "reader_thread", None) or not self.reader_thread.is_alive():
                        self.reader_thread = threading.Thread(target=self._background_reading_loop, daemon=True)
                        self.reader_thread.start()
                except Exception as e:
                    self.log(f"自动阅读启动失败: {e}")
        except Exception as e:
            self.log(f"自动阅读切换失败: {e}")

    def _sanitize_name(self, name: str) -> str:
        # Windows-safe filename: remove invalid chars
        try:
            import re
            safe = re.sub(r"[^\w\-\s]", "_", name).strip()
            return safe or "Untitled"
        except Exception:
            return name or "Untitled"

    def _chapter_cache_path(self, idx: int) -> Optional[str]:
        if not self.cache_dir:
            return None
        try:
            return os.path.join(self.cache_dir, f"chapter_{idx + 1}.txt")
        except Exception:
            return None

    def get_or_generate_analysis(self, idx: int, force: bool = False) -> str:
        # Return cached analysis if available; otherwise generate and cache
        chapter = self.chapters[idx] if 0 <= idx < len(self.chapters) else None
        if not chapter:
            return ""
        path = self._chapter_cache_path(idx)
        if path and (not force) and os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                pass
        # Generate via LLM and cache
        summary = self.llm.summarize(chapter.text)
        if path:
            try:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(summary)
            except Exception as e:
                self.log(f"缓存写入失败: {e}")
        return summary

    def show_cached_analysis_if_available(self):
        # Display cached analysis for current chapter if present
        try:
            path = self._chapter_cache_path(self.index)
            if path and os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    cached = f.read()
                ch = self.chapters[self.index] if self.chapters else None
                title = ch.title if ch else ""
                self.update_analysis(f"Summary & Insights for: {title}\n\n{cached}", clear=True)
        except Exception:
            pass

    def reread_current(self):
        # Force regenerate analysis for current chapter and update cache
        try:
            if not self.chapters:
                self.log("未打开书籍，无法重读当前页。")
                return
            summary = self.get_or_generate_analysis(self.index, force=True)
            title = self.chapters[self.index].title
            self.update_analysis(f"Summary & Insights for: {title}\n\n{summary}", clear=True)
            self.log("已强制重读并更新缓存")
        except Exception as e:
            self.log(f"重读失败: {e}")

    def _background_reading_loop(self):
        self.log("Reader started. Summarizing current chapter...")
        while not self._stop:
            try:
                chapter = self.chapters[self.index] if self.chapters else None
                if chapter:
                    summary = self.get_or_generate_analysis(self.index, force=False)
                    self.log(f"Current chapter: {chapter.title}")
                    # Show analysis on the right panel for side-by-side comparison
                    self.update_analysis(f"Summary & Insights for: {chapter.title}\n\n{summary}", clear=True)
                else:
                    self.log("No content available to read.")
                # Sleep and then move forward automatically to simulate continuous reading
                for _ in range(10):
                    if self._stop:
                        break
                    time.sleep(0.5)
                if self._stop:
                    break
                if self.index < len(self.chapters) - 1:
                    self.index += 1
                    # Must update UI in main thread; use after()
                    self.root.after(0, self.render_chapter)
                    self.log(f"Auto-advanced to chapter {self.index + 1}: {self.chapters[self.index].title}")
                else:
                    self.log("Reached end of book. Looping from start.")
                    self.index = 0
                    self.root.after(0, self.render_chapter)
            except Exception as e:
                self.log(f"Error in reading loop: {e}")
                time.sleep(2)

    def run(self):
        self.root.mainloop()


def main():
    # Optional programmatic configuration: read from config.py and inject env vars
    try:
        from config import (
            LLM_PROVIDER,
            LLM_MODEL,
            OPENAI_API_KEY,
            DEEPSEEK_API_KEY,
            DEEPSEEK_BASE_URL,
            PDF_USE_PYMUPDF as CFG_PDF_USE_PYMUPDF,
            PDF_STRUCTURE_ONLY as CFG_PDF_STRUCTURE_ONLY,
        )
        # Only set env vars if values are provided to avoid overriding external env
        if LLM_PROVIDER:
            os.environ["LLM_PROVIDER"] = str(LLM_PROVIDER)
        if LLM_MODEL:
            os.environ["LLM_MODEL"] = str(LLM_MODEL)
        if OPENAI_API_KEY:
            os.environ["OPENAI_API_KEY"] = str(OPENAI_API_KEY)
        if DEEPSEEK_API_KEY:
            os.environ["DEEPSEEK_API_KEY"] = str(DEEPSEEK_API_KEY)
        if DEEPSEEK_BASE_URL:
            os.environ["DEEPSEEK_BASE_URL"] = str(DEEPSEEK_BASE_URL)
        # Configure PyMuPDF usage via config if provided
        if CFG_PDF_USE_PYMUPDF:
            os.environ["PDF_USE_PYMUPDF"] = str(CFG_PDF_USE_PYMUPDF)
        if CFG_PDF_STRUCTURE_ONLY:
            os.environ["PDF_STRUCTURE_ONLY"] = str(CFG_PDF_STRUCTURE_ONLY)
    except Exception:
        # config.py is optional; ignore if not present or invalid
        pass

    # Recompute runtime flags after potential config injection so they take effect
    try:
        global PDF_STRUCTURE_ONLY, PDF_USE_PYMUPDF
        PDF_STRUCTURE_ONLY = str(os.environ.get("PDF_STRUCTURE_ONLY", "0")).lower() in ("1", "true", "yes", "y")
        val = str(os.environ.get("PDF_USE_PYMUPDF", "auto")).lower()
        PDF_USE_PYMUPDF = False
        if fitz is not None and val in ("1", "true", "yes", "y", "auto"):
            PDF_USE_PYMUPDF = True
    except Exception:
        pass


    # Do not auto-load any book at startup; let user open via menu or recent list
    loader = EpubLoader(None)
    chapters: List[Chapter] = []
    llm = LLMReader()
    app = ReaderGUI(chapters, llm, loader)
    app.run()


if __name__ == "__main__":
    main()