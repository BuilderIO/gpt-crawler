import sys
import os
import unittest
import json

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.conv_html_to_markdown import HTMLToMarkdownConverter, DatasetFormatter


class TestHTMLToMarkdownConverter(unittest.TestCase):
    def setUp(self):
        self.converter = HTMLToMarkdownConverter()
        self.formatter = DatasetFormatter(self.converter)
        self.html_content = "<h1>This is a test</h1><p>This is a paragraph.</p>"
        self.markdown_content = "# This is a test\n\nThis is a paragraph."

    def test_convert(self):
        self.assertEqual(
            self.converter.convert(self.html_content), self.markdown_content
        )

    def test_curate_content(self):
        self.assertEqual(
            self.converter.curate_content(self.html_content), self.html_content
        )

    def test_format_entry(self):
        entry = {"title": "Test", "url": "www.test.com", "html": self.html_content}
        self.assertEqual(
            self.formatter.format_entry(entry),
            f"## Test\n\n[Read More](www.test.com)\n\n{self.markdown_content}",
        )

    def test_structure_markdown(self):
        self.assertEqual(
            self.formatter.structure_markdown(
                "Test", "www.test.com", self.markdown_content
            ),
            f"## Test\n\n[Read More](www.test.com)\n\n{self.markdown_content}",
        )

    def test_format_dataset(self):
        data = [
            {"title": "Test 1", "url": "www.test1.com", "html": self.html_content},
            {"title": "Test 2", "url": "www.test2.com", "html": self.html_content},
        ]
        self.assertEqual(
            self.formatter.format_dataset(data),
            f"## Test 1\n\n[Read More](www.test1.com)\n\n{self.markdown_content}\n\n## Test 2\n\n[Read More](www.test2.com)\n\n{self.markdown_content}",
        )

    def test_load_json(self):
        with open("output.json", "r", encoding="utf-8") as file:
            expected_data = json.load(file)
        self.assertEqual(load_json("output.json"), expected_data)

    def test_chunk_dataset(self):
        data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        chunk_size = 3
        expected_chunks = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
        self.assertEqual(list(chunk_dataset(data, chunk_size)), expected_chunks)

    def test_process_chunk(self):
        chunk = [
            {"title": "Test 1", "url": "www.test1.com", "html": self.html_content},
            {"title": "Test 2", "url": "www.test2.com", "html": self.html_content},
        ]
        self.assertEqual(
            process_chunk(chunk),
            f"## Test 1\n\n[Read More](www.test1.com)\n\n{self.markdown_content}\n\n## Test 2\n\n[Read More](www.test2.com)\n\n{self.markdown_content}",
        )


if __name__ == "__main__":
    unittest.main
