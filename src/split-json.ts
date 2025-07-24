#!/usr/bin/env node

/**
 * CLI utility for splitting large JSON files for ChatGPT compatibility
 * 
 * Usage examples:
 *   npx tsx src/split-json.ts output.json
 *   npx tsx src/split-json.ts output.json --max-tokens 1500000
 *   npx tsx src/split-json.ts output.json --analyze-only
 *   npx tsx src/split-json.ts output.json --output-dir ./split-files
 */

import { program } from "commander";
import { 
  splitJSONFile, 
  analyzeJSONFile, 
  analyzeMultipleFiles, 
  CHATGPT_LIMITS,
  type SplitOptions 
} from "./file-splitter.js";
import { glob } from "glob";
import path from "path";

// Configure CLI
program
  .name("split-json")
  .description("Split large JSON files into ChatGPT-compatible chunks")
  .version("1.0.0");

program
  .argument("<files...>", "JSON file(s) to process (supports glob patterns)")
  .option("--analyze-only", "Only analyze files without splitting")
  .option("--max-tokens <number>", `Maximum tokens per file (default: ${CHATGPT_LIMITS.RECOMMENDED_TOKENS_PER_FILE.toLocaleString()})`, 
    (value) => parseInt(value), CHATGPT_LIMITS.RECOMMENDED_TOKENS_PER_FILE)
  .option("--max-size <number>", `Maximum MB per file (default: ${CHATGPT_LIMITS.RECOMMENDED_BYTES_PER_FILE / 1024 / 1024})`, 
    (value) => parseFloat(value), CHATGPT_LIMITS.RECOMMENDED_BYTES_PER_FILE / 1024 / 1024)
  .option("--max-files <number>", `Maximum number of output files (default: ${CHATGPT_LIMITS.MAX_FILES_PER_GPT})`, 
    (value) => parseInt(value), CHATGPT_LIMITS.MAX_FILES_PER_GPT)
  .option("--output-dir <directory>", "Output directory for split files")
  .option("--output-prefix <prefix>", "Prefix for output files")
  .option("--preserve-array", "Keep array structure in output files", false)
  .option("--min-items <number>", "Minimum items per file (default: 1)", (value) => parseInt(value), 1)
  .option("--verbose", "Show detailed output", false);

interface CliOptions {
  analyzeOnly?: boolean;
  maxTokens: number;
  maxSize: number;
  maxFiles: number;
  outputDir?: string;
  outputPrefix?: string;
  preserveArray: boolean;
  minItems: number;
  verbose: boolean;
}

async function main() {
  const options = program.opts<CliOptions>();
  const filePatterns = program.args;
  
  if (filePatterns.length === 0) {
    console.error("❌ No files specified");
    program.help();
    return;
  }
  
  // Resolve file patterns to actual file paths
  const allFiles: string[] = [];
  for (const pattern of filePatterns) {
    try {
      const matches = await glob(pattern, { absolute: true });
      if (matches.length === 0) {
        console.warn(`⚠️  No files found matching pattern: ${pattern}`);
      }
      allFiles.push(...matches);
    } catch (error) {
      console.error(`❌ Error processing pattern "${pattern}": ${error}`);
    }
  }
  
  if (allFiles.length === 0) {
    console.error("❌ No valid files found");
    return;
  }
  
  // Remove duplicates
  const uniqueFiles = [...new Set(allFiles)];
  
  console.log(`\n🔍 Processing ${uniqueFiles.length} file(s)...\n`);
  
  if (options.analyzeOnly) {
    await analyzeFiles(uniqueFiles, options);
  } else {
    await splitFiles(uniqueFiles, options);
  }
}

async function analyzeFiles(filePaths: string[], options: CliOptions) {
  console.log("📊 File Analysis Report");
  console.log("=".repeat(50));
  
  if (filePaths.length === 1) {
    // Single file analysis
    const analysis = await analyzeJSONFile(filePaths[0]);
    
    if (!analysis.success) {
      console.error(`❌ Failed to analyze ${filePaths[0]}`);
      console.error(`   ${analysis.limitIssues.join(", ")}`);
      return;
    }
    
    console.log(`📁 File: ${path.basename(analysis.filePath)}`);
    console.log(`   Items: ${analysis.itemCount.toLocaleString()}`);
    console.log(`   Tokens: ${analysis.estimatedTokens.toLocaleString()}`);
    console.log(`   Size: ${analysis.fileSizeMB.toFixed(1)} MB`);
    console.log(`   ChatGPT Compatible: ${analysis.withinChatGPTLimits ? "✅ Yes" : "❌ No"}`);
    
    if (analysis.limitIssues.length > 0) {
      console.log(`   Issues:`);
      analysis.limitIssues.forEach(issue => console.log(`     • ${issue}`));
    }
    
    console.log(`   Recommendations:`);
    analysis.recommendations.forEach(rec => console.log(`     • ${rec}`));
    
  } else {
    // Multiple files analysis
    const batchAnalysis = await analyzeMultipleFiles(filePaths);
    
    console.log(`📊 Summary:`);
    console.log(`   Total Files: ${batchAnalysis.totalFiles}`);
    console.log(`   Total Items: ${batchAnalysis.totalItems.toLocaleString()}`);
    console.log(`   Total Tokens: ${batchAnalysis.totalEstimatedTokens.toLocaleString()}`);
    console.log(`   Total Size: ${batchAnalysis.totalSizeMB.toFixed(1)} MB`);
    console.log(`   Files Within Limits: ${batchAnalysis.filesWithinLimits}/${batchAnalysis.totalFiles}`);
    console.log(`   Files Exceeding Limits: ${batchAnalysis.filesExceedingLimits}/${batchAnalysis.totalFiles}`);
    
    console.log(`\n💡 Recommendations:`);
    batchAnalysis.overallRecommendations.forEach(rec => console.log(`   • ${rec}`));
    
    if (options.verbose) {
      console.log(`\n📋 Individual File Details:`);
      batchAnalysis.fileAnalyses.forEach(analysis => {
        if (analysis.success) {
          const status = analysis.withinChatGPTLimits ? "✅" : "❌";
          console.log(`   ${status} ${path.basename(analysis.filePath)}: ${analysis.estimatedTokens.toLocaleString()} tokens, ${analysis.fileSizeMB.toFixed(1)} MB`);
        }
      });
    }
  }
  
  console.log(`\n💾 ChatGPT File Limits Reference:`);
  console.log(`   Max Tokens/File: ${CHATGPT_LIMITS.MAX_TOKENS_PER_FILE.toLocaleString()}`);
  console.log(`   Max Size/File: ${CHATGPT_LIMITS.MAX_BYTES_PER_FILE / 1024 / 1024} MB`);
  console.log(`   Max Files/GPT: ${CHATGPT_LIMITS.MAX_FILES_PER_GPT}`);
  console.log(`   Max User Storage: 10 GB`);
  console.log(`   Max Org Storage: 100 GB`);
}

async function splitFiles(filePaths: string[], options: CliOptions) {
  console.log("✂️  File Splitting Report");
  console.log("=".repeat(50));
  
  const splitOptions: SplitOptions = {
    maxTokensPerFile: options.maxTokens,
    maxBytesPerFile: options.maxSize * 1024 * 1024, // Convert MB to bytes
    maxFiles: options.maxFiles,
    outputDir: options.outputDir,
    outputPrefix: options.outputPrefix,
    preserveArrayStructure: options.preserveArray,
    minItemsPerFile: options.minItems
  };
  
  let totalInputFiles = 0;
  let totalOutputFiles = 0;
  let totalProcessedItems = 0;
  let successfulSplits = 0;
  
  for (const filePath of filePaths) {
    totalInputFiles++;
    console.log(`\n📁 Processing: ${path.basename(filePath)}`);
    
    const result = await splitJSONFile(filePath, splitOptions);
    
    if (!result.success) {
      console.error(`   ❌ Failed: ${result.summary}`);
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => console.error(`     ${warning}`));
      }
      continue;
    }
    
    successfulSplits++;
    totalOutputFiles += result.outputFiles.length;
    totalProcessedItems += result.totalItems;
    
    if (result.outputFiles.length === 0) {
      console.log(`   ✅ ${result.summary}`);
    } else {
      console.log(`   ✅ Split into ${result.outputFiles.length} files`);
      console.log(`   📊 ${result.totalItems.toLocaleString()} items, ${result.totalEstimatedTokens.toLocaleString()} total tokens, ${result.totalSizeMB.toFixed(1)} MB`);
      console.log(`   📈 Average: ${result.averageTokensPerFile.toLocaleString()} tokens/file, ${result.averageSizeMBPerFile.toFixed(1)} MB/file`);
      console.log(`   ${result.withinChatGPTLimits ? "✅" : "⚠️"} ChatGPT Compatible: ${result.withinChatGPTLimits ? "Yes" : "Some files exceed limits"}`);
      
      if (options.verbose) {
        console.log(`   📄 Output Files:`);
        result.outputFiles.forEach(file => {
          console.log(`     • ${file.filename}: ${file.itemCount} items, ${file.estimatedTokens.toLocaleString()} tokens, ${file.fileSizeMB.toFixed(1)} MB`);
        });
      }
    }
    
    if (result.warnings.length > 0) {
      console.log(`   ⚠️  Warnings:`);
      result.warnings.forEach(warning => console.log(`     • ${warning}`));
    }
  }
  
  // Final summary
  console.log(`\n📋 Final Summary:`);
  console.log(`   Input Files Processed: ${successfulSplits}/${totalInputFiles}`);
  console.log(`   Output Files Generated: ${totalOutputFiles}`);
  console.log(`   Total Items Processed: ${totalProcessedItems.toLocaleString()}`);
  
  if (totalOutputFiles > CHATGPT_LIMITS.MAX_FILES_PER_GPT) {
    console.log(`\n⚠️  Warning: Generated ${totalOutputFiles} files, but ChatGPT limit is ${CHATGPT_LIMITS.MAX_FILES_PER_GPT} files per GPT`);
    console.log(`   Consider using multiple ChatGPTs or increasing file size limits to generate fewer files.`);
  }
  
  console.log(`\n💡 Next Steps:`);
  console.log(`   1. Review the generated files`);
  console.log(`   2. Upload files to ChatGPT (max ${CHATGPT_LIMITS.MAX_FILES_PER_GPT} files per GPT)`);
  console.log(`   3. If you have more than ${CHATGPT_LIMITS.MAX_FILES_PER_GPT} files, create multiple GPTs`);
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parseAsync(process.argv).catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
}
