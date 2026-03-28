"""
Generate a simple PDF with hierarchical bookmarks to test chapter parsing.

Outputs: pydemo/sample_outline.pdf
"""
import os
import sys

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
except Exception:
    print("Missing reportlab. Please run: pip install reportlab", file=sys.stderr)
    sys.exit(1)


def make_sample_pdf(path: str) -> None:
    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4

    def add_page(text: str, bookmark_key: str | None = None):
        c.setFont("Helvetica", 16)
        c.drawString(2 * cm, height - 3 * cm, text)
        c.setFont("Helvetica", 12)
        for i in range(20):
            c.drawString(2 * cm, height - (5 + i) * cm, f"Sample content line {i + 1} for {text}")
        if bookmark_key:
            c.bookmarkPage(bookmark_key)
        c.showPage()

    # Chapter 1
    add_page("Chapter 1: Introduction", bookmark_key="ch1")
    c.addOutlineEntry("Chapter 1: Introduction", "ch1", level=0, closed=False)

    # Section 1.1 under Chapter 1
    add_page("1.1 Section A", bookmark_key="sec11")
    c.addOutlineEntry("1.1 Section A", "sec11", level=1, closed=False)

    # Subsection 1.1.1 under Section 1.1
    add_page("1.1.1 Subsection A1", bookmark_key="sub111")
    c.addOutlineEntry("1.1.1 Subsection A1", "sub111", level=2, closed=False)

    # Section 1.2 under Chapter 1
    add_page("1.2 Section B", bookmark_key="sec12")
    c.addOutlineEntry("1.2 Section B", "sec12", level=1, closed=False)

    # Chapter 2
    add_page("Chapter 2: Basics", bookmark_key="ch2")
    c.addOutlineEntry("Chapter 2: Basics", "ch2", level=0, closed=False)

    c.save()


if __name__ == "__main__":
    out_path = os.path.join(os.path.dirname(__file__), "sample_outline.pdf")
    make_sample_pdf(out_path)
    print(f"Generated: {out_path}")