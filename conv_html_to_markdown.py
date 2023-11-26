"""
This module provides functionality for converting HTML to Markdown and
formatting a dataset of HTML content into structured Markdown.
"""
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
from markdownify import markdownify as md


class HTMLToMarkdownConverter:
    """
    A converter class that transforms HTML content to Markdown format.

    Attributes:
        strip_tags (list): A list of HTML tags to be stripped during conversion.
        convert_links (bool): A flag to determine whether links should be converted.

    Methods:
        convert(html_content): Converts the given HTML content to Markdown.
        curate_content(html): Curates the HTML content by removing specified elements.
    """

    def __init__(self, strip_tags=None, convert_links=True):
        """Initialize converter with configuration options."""
        self.strip_tags = (
            strip_tags if strip_tags is not None else ["script", "style", "meta"]
        )
        self.convert_links = convert_links

    def convert(self, html_content):
        """Convert HTML content to Markdown."""
        try:
            curated_html = self.curate_content(html_content)
            # Assuming md function is defined elsewhere for Markdown conversion
            return md(
                curated_html,
                strip_tags=self.strip_tags,
                convert_links=self.convert_links,
            )
            # Exception handling
        except (TypeError, AttributeError) as e:
            logging.error("HTML parsing error: %s", e)
            raise
        except Exception as e:
            logging.error("Unexpected error during conversion: %s", e)
            raise

    def curate_content(self, html):
        """Curate the HTML content before conversion."""
        try:
            soup = BeautifulSoup(html, "html.parser")

            # List of CSS selectors for elements to be removed
            fluff_selectors = [
                "header",
                "footer",
                "nav",
                ".navbar",
                ".menu",
                ".footer-links",
                "#sidebar",
                "#ad-container",
                'div[class*="cookie"], div[class*="banner"]',
                "aside",
                ".pagination",
                "form",
            ]

            # Remove the identified fluff elements
            for selector in fluff_selectors:
                for element in soup.select(selector):
                    element.decompose()

            # Return the curated HTML content
            logging.info("Successfully curated HTML content.")
            return str(soup)

        except Exception as e:
            logging.error(f"Error in curating HTML content: {e}")
            # Return original HTML in case of error
            return html


class DatasetFormatter:
    """
    A class to format a dataset of HTML entries into structured Markdown.

    Attributes:
        converter (HTMLToMarkdownConverter): An instance of HTMLToMarkdownConverter for HTML to Markdown conversion.

    Methods:
        format_entry(entry): Formats a single dataset entry into Markdown.
        structure_markdown(title, url, content): Structures Markdown content with headers and links.
        format_dataset(data): Formats an entire dataset of entries into Markdown.
    """

    def __init__(self, converter):
        self.converter = converter

    def format_entry(self, entry):
        """Format a single entry from the dataset."""
        try:
            title = entry.get("title", "Untitled")
            url = entry.get("url", "")
            html_content = entry.get("html", "")
            logging.info(f"Formatted entry: {title}")
            markdown_content = self.converter.convert(html_content)
            return self.structure_markdown(title, url, markdown_content)
        except Exception as e:
            logging.error(f"Error formatting entry: {e}")
            return ""

    def structure_markdown(self, title, url, content):
        """Structure the Markdown content with headers, lists, etc."""
        structured_content = f"## {title}\n\n"
        if url:
            structured_content += f"[Read More]({url})\n\n"
        structured_content += content
        return structured_content

    def format_dataset(self, data):
        """Format the entire dataset."""
        formatted_content = ""
        for entry in data:
            formatted_content += self.format_entry(entry)
        return formatted_content


def load_json(file_path):
    """
    Load data from a JSON file.

    Args:
        file_path (str): Path to the JSON file.

    Returns:
        dict: The data loaded from the JSON file.
    """
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def save_output_in_chunks(file_path, contents, chunk_size=1024):
    """
    Save the given content into a file in chunks.

    Args:
        file_path (str): Path where the output should be saved.
        contents (iterable): The content to be written to the file.
        chunk_size (int): The size of each chunk to be written.
    """
    with open(file_path, "w") as file:
        for content in contents:
            file.write(content)
            if len(content) > chunk_size:
                file.flush()  # Flush after writing a large chunk


def chunk_dataset(data, chunk_size):
    """
    Yields chunks of the dataset for processing.

    Args:
        data (iterable): The dataset to be chunked.
        chunk_size (int): The size of each chunk.

    Yields:
        iterable: A chunk of the dataset.
    """
    logging.info(f"Dividing dataset into chunks of size {chunk_size}.")
    for i in range(0, len(data), chunk_size):
        yield data[i : i + chunk_size]


def process_chunk(chunk):
    """
    Processes a single chunk of the dataset.

    Args:
        chunk (iterable): A chunk of the dataset to be processed.

    Returns:
        str: The formatted Markdown content of the chunk.
    """
    logging.info("Processing a new chunk of the dataset.")
    formatter = DatasetFormatter(HTMLToMarkdownConverter())
    return formatter.format_dataset(chunk)


def main():
    """
    Main function to load, process, and save the dataset.

    Performs the steps:
    - Load data from JSON.
    - Chunk the data.
    - Process each chunk in parallel.
    - Save the processed data in chunks.
    """
    logging.basicConfig(level=logging.INFO)
    try:
        original_data = load_json("transformers_documentation-gpt-crawler_output.json")
        chunk_size = 200  # Adjust chunk size as needed
        max_threads = 10  # Adjust the maximum number of threads as needed

        chunks = list(chunk_dataset(original_data, chunk_size))

        formatted_contents = []
        logging.info("Processing and saving dataset in chunks.")
        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            results = executor.map(process_chunk, chunks)
            for result in results:
                formatted_contents.append(result)

        save_output_in_chunks(
            "transformers_documentation-gpt-crawler-curated_markdown.md",
            formatted_contents,
        )
        logging.info("Content formatted and saved in chunks successfully.")
    except Exception as e:
        logging.error(f"An error occurred in the main function: {e}")


if __name__ == "__main__":
    main()
