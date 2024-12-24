import { Config } from "./src/config";

export const defaultConfig: Config = {
  // url: "http://localhost:8000/sitemap.xml",
  url: "https://docs.trychroma.com",
  match: "https://docs.trychroma.com/**",
  maxPagesToCrawl: 99999, // Pratik olarak sınırsız
  pagesPerFile: 100,
  batchDelay: 50000, // 60 seconds delay between batches
  outputFileName: "markdown_output/chromadb-docs.md",
  maxTokens: 2000000,
  maxConcurrency: 5, // Limit concurrent requests
  openai: {
    enabled: true,
    model: "gpt-4o-mini",
    prompt: {
      system:
        "You are a technical content analyzer and formatter. Format the scraped content into a structured markdown format following this exact structure:\n\n1. Basic Information (Required):\n- Title of the document/page where you can create a good title based on input document and context\n- Processing style: 'technical'\n\n2. Main Sections (Required):\n- Summary: A concise overview of the main content\n- Tags: Relevant technical topics and concepts as a comma-separated list\n- Key Points: Bullet points of main technical takeaways\n- Formatted Text: The main content properly formatted\n\n3. Optional Sections (Include if relevant):\n- Research Implications: Bullet points of research-related insights\n- Code Snippets: Code examples in triple backtick blocks\n- Technical Concepts: Bullet points of technical terminology and concepts\n- Market Insights: Bullet points of market-related information\n- Strategic Implications: Bullet points of strategic considerations\n\nFormat the output exactly like this:\n\nTitle: [Document Title]\nProcessing Style: technical\n--------------------------------------------------------------------------------\nSummary:\n[Concise summary of the content]\n\nTags:\n[Comma-separated list of relevant technical tags]\n\nKey Points:\n- [Key point 1]\n- [Key point 2]\n- [Additional key points...]\n\nFormatted Text:\n[Main content with proper markdown formatting]\n\n[Optional sections if relevant]\n================================================================================\n",
      temperature: 0.3,
      maxTokens: 4096,
    },
    costPerInputToken: 0.3, // Cost per 1M input tokens in USD
    costPerOutputToken: 0.6, // Cost per 1M output tokens in USD
  },
};
