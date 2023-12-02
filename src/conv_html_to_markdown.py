"""
This module provides functionality for converting HTML to Markdown and
formatting a dataset of HTML content into structured Markdown, with added
capabilities of processing text embeddings to identify and
remove redundant content.
"""

import glob
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from transformers import AutoTokenizer, AutoModel
import torch


class HTMLToMarkdownConverter:
    """
    A converter class that transforms HTML content to Markdown
    format and processes text embeddings.

    Attributes:
        strip_tags (list): A list of HTML tags to be stripped during
        conversion.
        convert_links (bool): A flag to determine whether links
        should be converted.
        tokenizer (AutoTokenizer): Tokenizer from the transformers library.
        model (AutoModel): Pre-trained model from the transformers library.
    """

    def __init__(self, strip_tags=None, convert_links=True):
        """Initialize the converter with configuration options and
        Jina embeddings model."""
        self.strip_tags = strip_tags or ["script", "style", "meta"]
        self.convert_links = convert_links
        self.tokenizer = AutoTokenizer.from_pretrained(
            "jinaai/jina-embeddings-v2-small-en", trust_remote_code=True
        )
        self.model = AutoModel.from_pretrained("jinaai/jina-embeddings-v2-small-en")

    def mean_pooling(self, model_output, attention_mask):
        """Applies mean pooling to the token embeddings to
        create sentence embeddings."""
        token_embeddings = model_output[0]
        input_mask_expanded = (
            attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        )
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        return sum_embeddings / sum_mask

    def process_embeddings(self, lines, batch_size=32):
        """Processes the embeddings for the given lines in batches."""
        batched_embeddings = []
        for i in range(0, len(lines), batch_size):
            batch = lines[i : i + batch_size]
            encoded_input = self.tokenizer(
                batch, padding=True, truncation=True, return_tensors="pt"
            )
            with torch.no_grad():
                model_output = self.model(**encoded_input)
            batch_embeddings = self.mean_pooling(
                model_output, encoded_input["attention_mask"]
            )
            batched_embeddings.extend(batch_embeddings)

        return torch.nn.functional.normalize(
            torch.stack(batched_embeddings), p=2, dim=1
        )

    def remove_redundant_data(self, embeddings, lines):
        """Removes redundant lines based on semantic similarity
        using embeddings."""
        cleaned_lines = [lines[0]]  # Always include the first line
        for i in range(1, len(lines)):
            similarity = torch.cosine_similarity(
                embeddings[i].unsqueeze(0), embeddings[i - 1].unsqueeze(0)
            )
            if similarity.item() < 0.86899:  # Threshold for redundancy
                cleaned_lines.append(lines[i])
        return "\n".join(cleaned_lines)

    def convert(self, html_content):
        """Converts HTML content to Markdown format."""
        try:
            curated_html = self.curate_content(html_content)
            markdown_content = md(
                curated_html,
                strip_tags=self.strip_tags,
                convert_links=self.convert_links,
            ).strip()
            lines = markdown_content.split("\n")
            embeddings = self.process_embeddings(lines)
            return self.remove_redundant_data(embeddings, lines)
        except Exception as e:
            logging.error("Error during conversion: %s", e)
            raise

    def curate_content(self, html):
        """Curates the HTML content by removing specified elements and tags."""
        try:
            soup = BeautifulSoup(html, "html.parser")
            for selector in [
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
            ]:
                for element in soup.select(selector):
                    element.decompose()
            for tag in self.strip_tags:
                for s in soup(tag):
                    s.decompose()
            return str(soup)
        except Exception as e:
            logging.error("Error in curating HTML content: %s", e)
            return html


class DatasetFormatter:
    """
    A class to format a dataset of HTML entries into structured Markdown.

    Attributes:
        converter (HTMLToMarkdownConverter): An instance of \
            HTMLToMarkdownConverter for HTML to Markdown conversion.

    Methods:
        format_entry(entry): Formats a single dataset entry into Markdown.
        structure_markdown(title, url, content): Structures \
            Markdown content with headers and links.
        format_dataset(data): Formats an entire dataset \
            of entries into Markdown.
    """

    def __init__(self, converter):
        self.converter = converter

    def format_entry(self, entry):
        """Format a single entry from the dataset."""
        try:
            title = entry.get("title", "Untitled")
            url = entry.get("url", "")
            html_content = entry.get("html", "")
            logging.info("Formatted entry: %s", title)
            markdown_content = self.converter.convert(html_content)
            return self.structure_markdown(title, url, markdown_content)
        except Exception as e:
            logging.error("Error formatting entry: %s", e)
            return ""

    def structure_markdown(self, title, url, content):
        """Structure the Markdown content with headers, lists, etc."""
        structured_content = f"## {title}\n\n"
        if url:
            structured_content += f"[Read More]({url})\n\n"
        structured_content += (
            content.strip()
        )  # Remove leading and trailing whitespace/newlines
        return structured_content

    def format_dataset(self, data):
        """Format the entire dataset."""
        formatted_content = []
        for entry in data:
            formatted_entry = self.format_entry(entry)
            formatted_content.append(formatted_entry)
        return "\n\n".join(
            formatted_content
        )  # Ensure proper newline separation between entries


def load_json_files(pattern):
    """
    Load data from multiple JSON files matching a pattern.

    Args:
        pattern (str): Glob pattern to match files.

    Returns:
        list: Aggregated data from all matched files.
    """
    aggregated_data = []
    for file_path in glob.glob(pattern):
        with open(file_path, "r", encoding="utf-8") as file:
            aggregated_data.extend(json.load(file))
    return aggregated_data


def save_output_in_chunks(file_path, contents, chunk_size=1024):
    """
    Save the given content into a file in chunks.

    Args:
        file_path (str): Path where the output should be saved.
        contents (iterable): The content to be written to the file.
        chunk_size (int): The size of each chunk to be written.
    """
    with open(file_path, "w", encoding="utf-8") as file:
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
    logging.info("Dividing dataset into chunks of size %s.", chunk_size)
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
        pattern = "output*.json"  # Pattern to match JSON files
        original_data = load_json_files(pattern)
        chunk_size = 512  # Adjust chunk size as needed
        max_threads = 10  # Adjust the maximum number of threads as needed

        chunks = list(chunk_dataset(original_data, chunk_size))
        formatted_contents = []

        logging.info("Processing and saving dataset in chunks.")
        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            results = executor.map(process_chunk, chunks)
            for result in results:
                formatted_contents.append(result)

        output_file_name = "gpt-crawler-curated_markdown.md"
        save_output_in_chunks(output_file_name, formatted_contents)
        logging.info("Content formatted and saved in chunks successfully.")

        logging.info("\nConversion process successful. Exiting program.")
    except Exception as e:
        logging.error("An error occurred in the main function: %s", e)


if __name__ == "__main__":
    main()
