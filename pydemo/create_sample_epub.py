from ebooklib import epub
import sys


def create_sample(path: str):
    book = epub.EpubBook()
    book.set_identifier("sample-12345")
    book.set_title("Sample Book for Prototype")
    book.set_language("en")
    book.add_author("Trae Reader")

    # Chapters
    c1 = epub.EpubHtml(title="Introduction", file_name="intro.xhtml", lang="en")
    c1.content = (
        """
        <h1>Introduction</h1>
        <p>This prototype demonstrates a simple EPUB reading assistant.</p>
        <p>It shows content on top and logs on the bottom.</p>
        """
    )

    c2 = epub.EpubHtml(title="Concepts", file_name="concepts.xhtml", lang="en")
    c2.content = (
        """
        <h2>Key Concepts</h2>
        <p>Continuous reading loop summarizes chapters and extracts insights.</p>
        <p>Optional LLM integration augments summaries.</p>
        """
    )

    book.add_item(c1)
    book.add_item(c2)

    # Spine and TOC
    book.toc = (epub.Link("intro.xhtml", "Introduction", "intro"), c2)
    book.spine = ["nav", c1, c2]

    # Navigation files
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    epub.write_epub(path, book)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "pydemo/sample_book.epub"
    create_sample(out)
    print(f"Wrote sample EPUB to {out}")