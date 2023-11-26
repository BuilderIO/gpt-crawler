import unittest
import json
import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.conv_html_to_markdown import HTMLToMarkdownConverter, DatasetFormatter


class TestHTMLToMarkdownConverter(unittest.TestCase):
    def setUp(self):
        self.converter = HTMLToMarkdownConverter()

    def test_convert(self):
        html_content = "<p>This is a test.</p>"
        expected_markdown = "This is a test."
        markdown_content = self.converter.convert(html_content)
        self.assertEqual(markdown_content, expected_markdown)

    def test_curate_content(self):
        html_content = "<p>This is a test.</p><script>alert('test');</script>"
        expected_html = "<p>This is a test.</p>"
        curated_html = self.converter.curate_content(html_content)
        self.assertEqual(curated_html, expected_html)


class TestDatasetFormatter(unittest.TestCase):
    def setUp(self):
        self.formatter = DatasetFormatter(HTMLToMarkdownConverter())

    def test_format_entry(self):
        entry = {
            "title": "Test Entry",
            "url": "https://example.com/test-entry",
            "html": "<p>This is a test.</p>",
        }
        expected_markdown = "## Test Entry\n\n[Read More](https://example.com/test-entry)\n\nThis is a test."
        markdown_content = self.formatter.format_entry(entry)
        self.assertEqual(markdown_content, expected_markdown)

    def test_structure_markdown(self):
        title = "Test Entry"
        url = "https://example.com/test-entry"
        content = "This is a test."
        expected_markdown = "## Test Entry\n\n[Read More](https://example.com/test-entry)\n\nThis is a test."
        structured_markdown = self.formatter.structure_markdown(title, url, content)
        self.assertEqual(structured_markdown, expected_markdown)

    def test_format_dataset(self):
        data = [
            {
                "title": "Test Entry 1",
                "url": "https://example.com/test-entry-1",
                "html": "<p>This is a test.</p>",
            },
            {
                "title": "Test Entry 2",
                "url": "https://example.com/test-entry-2",
                "html": "<p>This is another test.</p>",
            },
        ]
        expected_markdown = "## Test Entry 1\n\n[Read More](https://example.com/test-entry-1)\n\nThis is a test.\n\n## Test Entry 2\n\n[Read More](https://example.com/test-entry-2)\n\nThis is another test."
        markdown_content = self.formatter.format_dataset(data)
        self.assertEqual(markdown_content, expected_markdown)


if __name__ == "__main__":
    unittest.main()
