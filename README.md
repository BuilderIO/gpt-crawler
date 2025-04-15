# GPT Crawler Plus

Create knowledge files for custom GPTs or AI assistants with this advanced web crawler. Enhanced version featuring OpenAI integration, batch processing, and Markdown support.

## Features

- 🤖 **OpenAI Integration**: Automatic content processing and enrichment with OpenAI API
- 📊 **Token Usage Tracking**: Automatic calculation of OpenAI API usage and costs
- 📑 **Batch Processing**: Process large sites in chunks and segment outputs
- 📝 **Markdown Support**: Output content in structured Markdown format
- 🔍 **Advanced Content Processing**: Titles, summaries, key points, and more
- 🕷️ **Flexible Crawling**: Sitemap support and customizable crawling rules

## Getting Started

### Installation

```bash
git clone https://github.com/[your-username]/gpt-crawler
cd gpt-crawler
npm install
```

### Configuration

Configure the crawler by editing `config.ts`:

```typescript
export const defaultConfig: Config = {
  url: "https://example.com",
  match: "https://example.com/**",
  selector: ".content-container",
  maxPagesToCrawl: 50,
  outputFileName: "output.md",
  maxTokens: 5000,
  pagesPerFile: 5,
  openai: {
    enabled: true,
    model: "gpt-3.5-turbo",
    prompt: {
      system: "Analyze and structure the content",
      temperature: 0.7,
      maxTokens: 1000,
    },
    costPerInputToken: 0.3, // USD/1M tokens
    costPerOutputToken: 0.6, // USD/1M tokens
  },
};
```

### Important Configuration Options

- **url**: Starting URL for crawling (can be sitemap.xml)
- **match**: URL patterns to crawl
- **selector**: Content selector (CSS or XPath)
- **maxPagesToCrawl**: Maximum number of pages to crawl
- **outputFileName**: Output file name
- **maxTokens**: Maximum tokens per file
- **pagesPerFile**: Number of pages per output file
- **openai**: OpenAI integration settings

### Running

```bash
npm start
```

## Output Format

The crawler saves content in structured Markdown format:

```markdown
# Token Usage and Cost Summary

Total Prompt Tokens: 1,234
Total Completion Tokens: 5,678
Total Tokens: 6,912

Estimated Cost:

- Input Cost: $0.3702
- Output Cost: $3.4068
- Total Cost: $3.7770

---

# Page Title

## Summary

[Page summary]

## Tags

[Related tags]

## Key Points

[Important points]

## Formatted Text

[Processed content]
```

## Advanced Features

### Batch Processing

- Separate file creation for each batch
- Configurable delay between batches
- Automatic segmentation based on token limits

### OpenAI Integration

- Content analysis and structuring
- Token usage tracking
- Cost calculation
- Customizable prompts

### Resource Management

- Selective resource filtering
- Maximum file size control
- Concurrent request management

## Usage Methods

### 1. Direct URL Crawling

This method crawls a website starting from a single URL and follows links based on your patterns:

```typescript
export const defaultConfig: Config = {
  url: "https://example.com/docs",
  match: "https://example.com/docs/**",
  selector: ".content-container",
  maxPagesToCrawl: 50,
  outputFileName: "output.md",
  maxTokens: 5000,
  pagesPerFile: 5,
  openai: {
    enabled: true,
    model: "gpt-3.5-turbo",
    prompt: {
      system: "Analyze and structure the content",
      temperature: 0.7,
      maxTokens: 1000,
    },
  },
};
```

In this method:

- Crawler starts from the specified URL
- Follows links matching the `match` pattern
- Processes each page it finds
- Stops when reaching `maxPagesToCrawl` limit
- Useful for smaller sites or specific sections

### 2. Sitemap-Based Crawling

This method uses a sitemap XML file to crawl pre-defined URLs:

1. Create a sitemap file in `local_xmls/sitemap.xml`:

```xml
<?xml version="1.0" ?>
<urls base_url="https://example.com" total_count="50">
  <url>https://example.com/page1</url>
  <url>https://example.com/page2</url>
  <url>https://example.com/docs/section1</url>
  <!-- Add more URLs -->
</urls>
```

2. Configure the crawler to use the sitemap:

```typescript
export const defaultConfig: Config = {
  url: "local_xmls/sitemap.xml", // Local sitemap file
  match: "https://example.com/**", // Pattern to filter URLs
  selector: ".content-container",
  maxPagesToCrawl: 50,
  outputFileName: "output.md",
  maxTokens: 5000,
  pagesPerFile: 5,
  openai: {
    enabled: true,
    model: "gpt-3.5-turbo",
    prompt: {
      system: "Analyze and structure the content",
      temperature: 0.7,
      maxTokens: 1000,
    },
  },
};
```

Benefits of Sitemap-Based Crawling:

- **Precise Control**: Exactly specify which URLs to crawl
- **Better Organization**: Pre-define the structure of your crawl
- **Efficient Processing**: No need to discover URLs during crawling
- **Filtering Capabilities**: Can still use match/exclude patterns
- **Batch Processing**: Works well with `pagesPerFile` for large sites

The crawler will:

1. Read the sitemap file
2. Filter URLs based on match/exclude patterns
3. Process URLs up to maxPagesToCrawl limit
4. Generate structured output files

Both methods support all features like:

- OpenAI processing
- Token tracking
- Batch processing
- Markdown output
- Resource filtering

Choose the method based on your needs:

- Use **Direct URL** for:
  - Small to medium sites
  - Dynamic exploration
  - Unknown site structure
- Use **Sitemap-Based** for:
  - Large sites
  - Known URL structure
  - Precise control
  - Batch processing
  - Selective crawling

## Serving Local XML Files for the Crawler

To serve your local sitemap or other XML files for the crawler, you can use Python's built-in HTTP server. This is useful for testing or development when you want to provide a local sitemap file.

1. Place your sitemap or XML files in the `local_xmls` folder.
2. Start a simple HTTP server in the project root (or inside the `local_xmls` folder):

```bash
cd local_xmls
python -m http.server 8000
```

3. Access your XML file in your browser or crawler at:

```
http://localhost:8000/your_sitemap.xml
```

Replace `your_sitemap.xml` with the actual file name you want to serve.

## Contributing

We welcome your suggestions and pull requests to improve the project!

## License

MIT

---

<p align="center">
   <a href="https://www.builder.io/m/developers">
      <picture>
         <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/844291/230786554-eb225eeb-2f6b-4286-b8c2-535b1131744a.png">
         <img width="250" alt="Made with love by Builder.io" src="https://user-images.githubusercontent.com/844291/230786555-a58479e4-75f3-4222-a6eb-74c5af953eac.png">
       </picture>
   </a>
</p>
