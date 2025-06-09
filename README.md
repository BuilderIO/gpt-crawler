🧠 GPT Crawler
Crawl a site to generate knowledge files that you can use to create your own custom GPT from one or more URLs.
https://private-user-images.githubusercontent.com/844291/282893436-feb8763a-152b-4708-9c92-013b5c70d2f2.gif?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NDk0Nzg2NzEsIm5iZiI6MTc0OTQ3ODM3MSwicGF0aCI6Ii84NDQyOTEvMjgyODkzNDM2LWZlYjg3NjNhLTE1MmItNDcwOC05YzkyLTAxM2I1YzcwZDJmMi5naWY_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjUwNjA5JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI1MDYwOVQxNDEyNTFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1hOWNlZmU1ZmM5NzYwNWU5YmJjMjk2NDRjZWEyZTc1OWYwNzNmOWIzNzgxYzljOTI0ZWM2MTIxNTczZWMyZTQ0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.JYEtXFx72aDGXuWOfnWYwmFk0vGysdVfXtDV3A18tYw

💡 What does this do?
This tool scrapes content from a website (like docs or guides) and saves it in a format suitable for uploading to OpenAI as a custom GPT or Assistant. Great for building support bots or FAQ helpers!

📦 Example
This project crawled the Builder.io docs and generated a file that was uploaded to create a custom GPT that answers integration questions.

💡 Try it out: Ask the GPT questions like “How do I use Builder.io with React?”

⚠️ Note: You may need a paid ChatGPT plan to access custom GPTs.

🚀 Get Started
🖥️ Running Locally
1. Clone the repository
✅ Requires Node.js >= 16

bash
Copier
Modifier
git clone https://github.com/builderio/gpt-crawler
cd gpt-crawler
2. Install dependencies
bash
Copier
Modifier
npm i
3. Configure the crawler
Edit config.ts to set the website you want to crawl.

Example configuration for Builder.io docs:

ts
Copier
Modifier
export const defaultConfig: Config = {
  url: "https://www.builder.io/c/docs/developers",
  match: "https://www.builder.io/c/docs/**",
  selector: `.docs-builder-container`,
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
};
🔍 Tips:

url: Starting point of your crawl.

match: Which URLs should be followed (wildcards allowed).

selector: CSS selector to extract page content (inspect elements in your browser to find the right one).

maxPagesToCrawl: Prevent runaway crawling.

outputFileName: Where your data will be saved.

📄 More options available in config.ts:

ts
Copier
Modifier
type Config = {
  url: string;
  match: string;
  selector: string;
  maxPagesToCrawl: number;
  outputFileName: string;
  resourceExclusions?: string[]; // Optional: skip images, videos, etc.
  maxFileSize?: number;          // Optional: limit output size (in MB)
  maxTokens?: number;            // Optional: limit output by token count
};
⚠️ Got file size issues? Use maxFileSize or maxTokens to split or reduce your data.

4. Run the crawler
bash
Copier
Modifier
npm start
📝 This generates output.json in the project root.

🐳 Alternative Methods
Run in a Container with Docker
Go to containerapp/

Edit the config.ts file (same format as above)

Run Docker (assumes Dockerfile is present)

📁 Output will be saved in the data/ folder.

Run as an API Server
Useful for on-demand or dynamic crawling from another app.

Install dependencies

bash
Copier
Modifier
npm i
Start the server

bash
Copier
Modifier
npm run start:server
🌐 Default port is 3000

API endpoints:

POST /crawl: Send your config JSON to this endpoint to start crawling.

GET /api-docs: Swagger UI for the API documentation.

🛠️ Customize environment:
Copy .env.example → .env and update variables like port.

⬆️ Upload Your Data to OpenAI
After crawling, you'll get a file like output.json. Upload this to OpenAI to use in either:

1. Create a Custom GPT (ChatGPT UI)
Great for shareable chatbots with a friendly interface.

Steps:

Go to https://chat.openai.com/

Click your name (bottom-left)

Choose My GPTs → Create a GPT

Click Configure

Under Knowledge, click Upload a file

Upload your output.json

⚠️ Got a "file too large" error?
Use maxFileSize or maxTokens in your config to split it.

2. Create a Custom Assistant (API access)
Ideal for integrating knowledge into your product or support flows.

Steps:

Go to https://platform.openai.com/assistants

Click + Create

Choose Upload and add your output.json

🤝 Contributing
Got suggestions, improvements, or bugfixes?
Pull requests welcome!

📌 Additional Suggestions
✅ Add a LICENSE file if you're accepting contributions.

🧪 Include a test run or example site with the repo to demonstrate functionality.

📖 Add links to documentation for config.ts or crawling best practices.

🛡️ Add basic error handling tips (e.g. when the selector returns no content).



<p align="center">
   <a href="https://www.builder.io/m/developers">
      <picture>
         <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/844291/230786554-eb225eeb-2f6b-4286-b8c2-535b1131744a.png">
         <img width="250" alt="Made with love by Builder.io" src="https://user-images.githubusercontent.com/844291/230786555-a58479e4-75f3-4222-a6eb-74c5af953eac.png">
       </picture>
   </a>
</p>
