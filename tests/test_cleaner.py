"""Tests for extractor.cleaner module."""

from extractor.cleaner import clean_html, extract_main_content


def test_clean_html_strips_tags():
    html = "<p>Hello <b>world</b></p>"
    assert clean_html(html) == "Hello world"


def test_clean_html_removes_scripts():
    html = "<div>Text<script>alert('xss')</script> more</div>"
    result = clean_html(html)
    assert "alert" not in result
    assert "Text" in result
    assert "more" in result


def test_clean_html_collapses_whitespace():
    html = "<p>  lots   of    spaces  </p>"
    result = clean_html(html)
    assert "  " not in result


def test_extract_main_content_finds_main():
    html = """
    <html>
    <body>
        <nav>Navigation stuff</nav>
        <main><p>Important content here</p></main>
        <footer>Footer stuff</footer>
    </body>
    </html>
    """
    result = extract_main_content(html)
    assert "Important content here" in result
    assert "Navigation stuff" not in result


def test_extract_main_content_falls_back():
    html = "<div>No main tag here</div>"
    result = extract_main_content(html)
    assert "No main tag here" in result
