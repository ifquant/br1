"""
Load the sample_outline.pdf and print parsed chapter structure using PdfLoader.
"""
import os
import sys

from epub_reader import PdfLoader


def main():
    pdf_path = os.path.join(os.path.dirname(__file__), "sample_outline.pdf")
    if not os.path.exists(pdf_path):
        print("Sample PDF not found. Run create_sample_pdf.py first.")
        sys.exit(1)
    loader = PdfLoader(pdf_path)
    chapters = loader.load()
    for i, ch in enumerate(chapters, 1):
        lvl = getattr(ch, "level", 1)
        s = getattr(ch, "start_page", None)
        e = getattr(ch, "end_page", None)
        print(f"{i:02d} L{lvl} [{s}-{e}] {ch.title}")


if __name__ == "__main__":
    main()