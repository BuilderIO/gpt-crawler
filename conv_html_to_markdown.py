import json
import logging
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from concurrent.futures import ThreadPoolExecutor

class HTMLToMarkdownConverter:
    def __init__(self, strip_tags=None, convert_links=True):
        """ Initialize converter with configuration options. """
        self.strip_tags = strip_tags or []
        self.convert_links = convert_links

    def convert(self, html_content):
        """ Convert HTML content to Markdown. """
        try:
            curated_html = self.curate_content(html_content)
            return md(curated_html, strip_tags=self.strip_tags, convert_links=self.convert_links)
        except Exception as e:
            logging.error(f"Error in HTML to Markdown conversion: {e}")
            return ""
    
    def curate_content(self, html):
        """ Curate the HTML content before conversion. """
        soup = BeautifulSoup(html, 'html.parser')
        # Implement specific curation logic here based on the content nature
        return str(soup)

class DatasetFormatter:
    def __init__(self, converter):
        self.converter = converter

    def format_entry(self, entry):
        """ Format a single entry from the dataset. """
        try:
            title = entry.get('title', 'Untitled')
            url = entry.get('url', '')
            html_content = entry.get('html', '')
            markdown_content = self.converter.convert(html_content)
            return self.structure_markdown(title, url, markdown_content)
        except Exception as e:
            logging.error(f"Error formatting entry: {e}")
            return ""

    def structure_markdown(self, title, url, content):
        """ Structure the Markdown content with headers, lists, etc. """
        structured_content = f"## {title}\n\n"
        if url:
            structured_content += f"[Read More]({url})\n\n"
        structured_content += content
        return structured_content

    def format_dataset(self, data):
        """ Format the entire dataset. """
        formatted_content = ""
        for entry in data:
            formatted_content += self.format_entry(entry)
        return formatted_content

def load_json(file_path):
    """ Load the JSON file. """
    with open(file_path, 'r') as file:
        return json.load(file)

def save_output_in_chunks(file_path, contents, chunk_size=1024):
    """ Save the formatted content in chunks. """
    with open(file_path, 'w') as file:
        for content in contents:
            file.write(content)
            if len(content) > chunk_size:
                file.flush()  # Flush after writing a large chunk

def chunk_dataset(data, chunk_size):
    """ Divide the dataset into chunks of approximately equal size. """
    for i in range(0, len(data), chunk_size):
        yield data[i:i + chunk_size]

def process_chunk(chunk):
    """ Process a single chunk of the dataset. """
    formatter = DatasetFormatter(HTMLToMarkdownConverter())
    return formatter.format_dataset(chunk)

def main():
    logging.basicConfig(level=logging.INFO)
    try:
        original_data = load_json('transformers_documentation-gpt-crawler_output.json')
        chunk_size = 200  # Adjust chunk size as needed
        max_threads = 10   # Adjust the maximum number of threads as needed

        chunks = list(chunk_dataset(original_data, chunk_size))

        formatted_contents = []
        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            results = executor.map(process_chunk, chunks)
            for result in results:
                formatted_contents.append(result)

        final_formatted_content = '\n'.join(formatted_contents)
        save_output_in_chunks('transformers_documentation-gpt-crawler-curated_markdown.md', formatted_contents)
        logging.info("Content formatted and saved in chunks successfully.")
    except Exception as e:
        logging.error(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
