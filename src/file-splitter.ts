/**
 * JSON File Size Management Utilities for GPT Crawler
 *
 * This utility provides functions to split large JSON files into smaller chunks
 * that comply with ChatGPT's file upload limits and optimize for better performance.
 *
 * ChatGPT File Limits (as of 2024):
 * - 2M tokens per file (for text/document files)
 * - 512MB per file (hard limit)
 * - Up to 20 files per GPT
 * - 10GB per user, 100GB per organization
 */

import { readFile, writeFile } from "fs/promises";
import { isWithinTokenLimit } from "gpt-tokenizer";
import path from "path";

// ChatGPT file upload limits
export const CHATGPT_LIMITS = {
  MAX_TOKENS_PER_FILE: 2_000_000, // 2M tokens per file
  MAX_BYTES_PER_FILE: 512 * 1024 * 1024, // 512MB per file
  MAX_FILES_PER_GPT: 20, // 20 files per GPT
  RECOMMENDED_TOKENS_PER_FILE: 1_800_000, // Leave some buffer
  RECOMMENDED_BYTES_PER_FILE: 450 * 1024 * 1024, // Leave some buffer (450MB)
} as const;

export interface SplitOptions {
  /** Maximum tokens per file (default: 1.8M for safety buffer) */
  maxTokensPerFile?: number;
  /** Maximum bytes per file (default: 450MB for safety buffer) */
  maxBytesPerFile?: number;
  /** Maximum number of files to generate (default: 20) */
  maxFiles?: number;
  /** Prefix for output files (default: input filename without extension) */
  outputPrefix?: string;
  /** Output directory (default: same as input file) */
  outputDir?: string;
  /** Whether to preserve array structure vs split into objects (default: false) */
  preserveArrayStructure?: boolean;
  /** Minimum items per file to avoid tiny files (default: 1) */
  minItemsPerFile?: number;
}

export interface FileInfo {
  filename: string;
  path: string;
  itemCount: number;
  estimatedTokens: number;
  fileSizeBytes: number;
  fileSizeMB: number;
}

export interface SplitResult {
  success: boolean;
  inputFile: string;
  outputFiles: FileInfo[];
  totalItems: number;
  totalEstimatedTokens: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  averageTokensPerFile: number;
  averageSizeMBPerFile: number;
  withinChatGPTLimits: boolean;
  warnings: string[];
  summary: string;
}

/**
 * Calculate estimated tokens and file size for content
 */
export function analyzeContent(content: any): {
  estimatedTokens: number;
  fileSizeBytes: number;
  fileSizeMB: number;
} {
  const jsonString = JSON.stringify(content, null, 2);
  const fileSizeBytes = Buffer.byteLength(jsonString, "utf-8");
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  // Use gpt-tokenizer to get accurate token count
  const tokenCount = isWithinTokenLimit(jsonString, Infinity);
  const estimatedTokens = typeof tokenCount === "number" ? tokenCount : 0;

  return {
    estimatedTokens,
    fileSizeBytes,
    fileSizeMB,
  };
}

/**
 * Check if content fits within ChatGPT limits
 */
export function isWithinChatGPTLimits(
  estimatedTokens: number,
  fileSizeBytes: number,
): { withinLimits: boolean; issues: string[] } {
  const issues: string[] = [];

  if (estimatedTokens > CHATGPT_LIMITS.MAX_TOKENS_PER_FILE) {
    issues.push(
      `Exceeds ChatGPT token limit: ${estimatedTokens.toLocaleString()} > ${CHATGPT_LIMITS.MAX_TOKENS_PER_FILE.toLocaleString()}`,
    );
  }

  if (fileSizeBytes > CHATGPT_LIMITS.MAX_BYTES_PER_FILE) {
    issues.push(
      `Exceeds ChatGPT file size limit: ${(fileSizeBytes / 1024 / 1024).toFixed(
        1,
      )}MB > ${CHATGPT_LIMITS.MAX_BYTES_PER_FILE / 1024 / 1024}MB`,
    );
  }

  return {
    withinLimits: issues.length === 0,
    issues,
  };
}

/**
 * Intelligently split array content into chunks based on limits
 */
export function splitIntoChunks(
  items: any[],
  maxTokensPerFile: number,
  maxBytesPerFile: number,
  minItemsPerFile: number = 1,
): any[][] {
  const chunks: any[][] = [];
  let currentChunk: any[] = [];
  let currentTokens = 0;
  let currentBytes = 0;

  // Start with estimated overhead for JSON array structure
  const arrayOverhead = 10; // Rough estimate for [], commas, etc.

  for (const item of items) {
    const itemString = JSON.stringify(item, null, 2);
    const itemBytes = Buffer.byteLength(itemString, "utf-8");
    const tokenCount = isWithinTokenLimit(itemString, Infinity);
    const itemTokens = typeof tokenCount === "number" ? tokenCount : 0;

    // Check if adding this item would exceed limits
    const wouldExceedTokens = currentTokens + itemTokens > maxTokensPerFile;
    const wouldExceedBytes = currentBytes + itemBytes > maxBytesPerFile;

    // If we have items and adding this would exceed limits, finish current chunk
    if (
      currentChunk.length >= minItemsPerFile &&
      (wouldExceedTokens || wouldExceedBytes)
    ) {
      chunks.push([...currentChunk]);
      currentChunk = [];
      currentTokens = arrayOverhead;
      currentBytes = arrayOverhead;
    }

    currentChunk.push(item);
    currentTokens += itemTokens;
    currentBytes += itemBytes;
  }

  // Add the last chunk if it has items
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split a large JSON file into smaller files that comply with ChatGPT limits
 */
export async function splitJSONFile(
  inputFilePath: string,
  options: SplitOptions = {},
): Promise<SplitResult> {
  const {
    maxTokensPerFile = CHATGPT_LIMITS.RECOMMENDED_TOKENS_PER_FILE,
    maxBytesPerFile = CHATGPT_LIMITS.RECOMMENDED_BYTES_PER_FILE,
    maxFiles = CHATGPT_LIMITS.MAX_FILES_PER_GPT,
    preserveArrayStructure = false,
    minItemsPerFile = 1,
    outputDir = path.dirname(inputFilePath),
    outputPrefix = path.basename(inputFilePath, path.extname(inputFilePath)),
  } = options;

  const warnings: string[] = [];

  try {
    // Read and parse the input file
    const fileContent = await readFile(inputFilePath, "utf-8");
    let data: any;

    try {
      data = JSON.parse(fileContent);
    } catch (error) {
      return {
        success: false,
        inputFile: inputFilePath,
        outputFiles: [],
        totalItems: 0,
        totalEstimatedTokens: 0,
        totalSizeBytes: 0,
        totalSizeMB: 0,
        averageTokensPerFile: 0,
        averageSizeMBPerFile: 0,
        withinChatGPTLimits: false,
        warnings: [`Failed to parse JSON: ${error}`],
        summary: "Failed to parse input file as JSON",
      };
    }

    // Analyze the input file
    const inputAnalysis = analyzeContent(data);
    const inputLimitsCheck = isWithinChatGPTLimits(
      inputAnalysis.estimatedTokens,
      inputAnalysis.fileSizeBytes,
    );

    // If file is already within limits, no need to split
    if (inputLimitsCheck.withinLimits) {
      return {
        success: true,
        inputFile: inputFilePath,
        outputFiles: [],
        totalItems: Array.isArray(data) ? data.length : 1,
        totalEstimatedTokens: inputAnalysis.estimatedTokens,
        totalSizeBytes: inputAnalysis.fileSizeBytes,
        totalSizeMB: inputAnalysis.fileSizeMB,
        averageTokensPerFile: inputAnalysis.estimatedTokens,
        averageSizeMBPerFile: inputAnalysis.fileSizeMB,
        withinChatGPTLimits: true,
        warnings: [
          "File is already within ChatGPT limits - no splitting needed",
        ],
        summary: "No splitting required - file is within limits",
      };
    }

    // Ensure data is an array for splitting
    const items = Array.isArray(data) ? data : [data];

    if (items.length === 0) {
      warnings.push("Input file contains empty array");
    }

    // Split into chunks
    const chunks = splitIntoChunks(
      items,
      maxTokensPerFile,
      maxBytesPerFile,
      minItemsPerFile,
    );

    // Check if we'll exceed max files limit
    if (chunks.length > maxFiles) {
      warnings.push(
        `Generated ${chunks.length} files, but ChatGPT limit is ${maxFiles} files per GPT`,
      );
      warnings.push(
        `Consider increasing maxTokensPerFile or maxBytesPerFile to generate fewer files`,
      );
    }

    // Generate output files
    const outputFiles: FileInfo[] = [];
    let totalEstimatedTokens = 0;
    let totalSizeBytes = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const fileNumber = i + 1;
      const filename = `${outputPrefix}-${fileNumber}.json`;
      const filePath = path.join(outputDir, filename);

      // Prepare content for file
      const fileContent = preserveArrayStructure
        ? chunk
        : chunk.length === 1
          ? chunk[0]
          : chunk;
      const contentString = JSON.stringify(fileContent, null, 2);

      // Analyze this file
      const analysis = analyzeContent(fileContent);

      // Write the file
      await writeFile(filePath, contentString, "utf-8");

      // Track file info
      const fileInfo: FileInfo = {
        filename,
        path: filePath,
        itemCount: chunk.length,
        estimatedTokens: analysis.estimatedTokens,
        fileSizeBytes: analysis.fileSizeBytes,
        fileSizeMB: analysis.fileSizeMB,
      };

      outputFiles.push(fileInfo);
      totalEstimatedTokens += analysis.estimatedTokens;
      totalSizeBytes += analysis.fileSizeBytes;

      // Check if this file exceeds limits
      const limitsCheck = isWithinChatGPTLimits(
        analysis.estimatedTokens,
        analysis.fileSizeBytes,
      );
      if (!limitsCheck.withinLimits) {
        warnings.push(`File ${filename}: ${limitsCheck.issues.join(", ")}`);
      }
    }

    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    const averageTokensPerFile =
      outputFiles.length > 0
        ? Math.round(totalEstimatedTokens / outputFiles.length)
        : 0;
    const averageSizeMBPerFile =
      outputFiles.length > 0 ? totalSizeMB / outputFiles.length : 0;

    // Check overall compliance
    const allFilesCompliant = outputFiles.every((file) => {
      const check = isWithinChatGPTLimits(
        file.estimatedTokens,
        file.fileSizeBytes,
      );
      return check.withinLimits;
    });

    const summary =
      `Split ${items.length} items into ${outputFiles.length} files. ` +
      `Average: ${averageTokensPerFile.toLocaleString()} tokens, ${averageSizeMBPerFile.toFixed(
        1,
      )}MB per file. ` +
      `${
        allFilesCompliant
          ? "✅ All files within ChatGPT limits"
          : "⚠️ Some files exceed limits"
      }`;

    return {
      success: true,
      inputFile: inputFilePath,
      outputFiles,
      totalItems: items.length,
      totalEstimatedTokens,
      totalSizeBytes,
      totalSizeMB,
      averageTokensPerFile,
      averageSizeMBPerFile,
      withinChatGPTLimits: allFilesCompliant && outputFiles.length <= maxFiles,
      warnings,
      summary,
    };
  } catch (error) {
    return {
      success: false,
      inputFile: inputFilePath,
      outputFiles: [],
      totalItems: 0,
      totalEstimatedTokens: 0,
      totalSizeBytes: 0,
      totalSizeMB: 0,
      averageTokensPerFile: 0,
      averageSizeMBPerFile: 0,
      withinChatGPTLimits: false,
      warnings: [`Error processing file: ${error}`],
      summary: `Failed to split file: ${error}`,
    };
  }
}

/**
 * Analyze a JSON file without splitting it
 */
export async function analyzeJSONFile(filePath: string): Promise<{
  success: boolean;
  filePath: string;
  itemCount: number;
  estimatedTokens: number;
  fileSizeBytes: number;
  fileSizeMB: number;
  withinChatGPTLimits: boolean;
  limitIssues: string[];
  recommendations: string[];
}> {
  try {
    const fileContent = await readFile(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    const analysis = analyzeContent(data);
    const limitsCheck = isWithinChatGPTLimits(
      analysis.estimatedTokens,
      analysis.fileSizeBytes,
    );

    const recommendations: string[] = [];

    if (!limitsCheck.withinLimits) {
      recommendations.push("File exceeds ChatGPT limits - consider splitting");

      if (analysis.estimatedTokens > CHATGPT_LIMITS.MAX_TOKENS_PER_FILE) {
        const suggestedChunks = Math.ceil(
          analysis.estimatedTokens / CHATGPT_LIMITS.RECOMMENDED_TOKENS_PER_FILE,
        );
        recommendations.push(
          `Recommended: Split into ~${suggestedChunks} files based on token count`,
        );
      }

      if (analysis.fileSizeBytes > CHATGPT_LIMITS.MAX_BYTES_PER_FILE) {
        const suggestedChunks = Math.ceil(
          analysis.fileSizeBytes / CHATGPT_LIMITS.RECOMMENDED_BYTES_PER_FILE,
        );
        recommendations.push(
          `Recommended: Split into ~${suggestedChunks} files based on file size`,
        );
      }
    } else {
      recommendations.push(
        "File is within ChatGPT limits - no splitting needed",
      );
    }

    return {
      success: true,
      filePath,
      itemCount: Array.isArray(data) ? data.length : 1,
      estimatedTokens: analysis.estimatedTokens,
      fileSizeBytes: analysis.fileSizeBytes,
      fileSizeMB: analysis.fileSizeMB,
      withinChatGPTLimits: limitsCheck.withinLimits,
      limitIssues: limitsCheck.issues,
      recommendations,
    };
  } catch (error) {
    return {
      success: false,
      filePath,
      itemCount: 0,
      estimatedTokens: 0,
      fileSizeBytes: 0,
      fileSizeMB: 0,
      withinChatGPTLimits: false,
      limitIssues: [`Failed to analyze file: ${error}`],
      recommendations: ["Fix file format issues before analyzing"],
    };
  }
}

/**
 * Batch analyze multiple JSON files
 */
export async function analyzeMultipleFiles(filePaths: string[]): Promise<{
  totalFiles: number;
  totalItems: number;
  totalEstimatedTokens: number;
  totalSizeMB: number;
  filesWithinLimits: number;
  filesExceedingLimits: number;
  fileAnalyses: Awaited<ReturnType<typeof analyzeJSONFile>>[];
  overallRecommendations: string[];
}> {
  const analyses = await Promise.all(filePaths.map(analyzeJSONFile));

  const successfulAnalyses = analyses.filter((a) => a.success);
  const totalItems = successfulAnalyses.reduce(
    (sum, a) => sum + a.itemCount,
    0,
  );
  const totalEstimatedTokens = successfulAnalyses.reduce(
    (sum, a) => sum + a.estimatedTokens,
    0,
  );
  const totalSizeMB = successfulAnalyses.reduce(
    (sum, a) => sum + a.fileSizeMB,
    0,
  );
  const filesWithinLimits = successfulAnalyses.filter(
    (a) => a.withinChatGPTLimits,
  ).length;
  const filesExceedingLimits = successfulAnalyses.filter(
    (a) => !a.withinChatGPTLimits,
  ).length;

  const overallRecommendations: string[] = [];

  if (filesExceedingLimits > 0) {
    overallRecommendations.push(
      `${filesExceedingLimits} files exceed ChatGPT limits and should be split`,
    );
  }

  if (successfulAnalyses.length > CHATGPT_LIMITS.MAX_FILES_PER_GPT) {
    overallRecommendations.push(
      `You have ${successfulAnalyses.length} files, but ChatGPT limit is ${CHATGPT_LIMITS.MAX_FILES_PER_GPT} files per GPT`,
    );
    overallRecommendations.push(
      "Consider combining smaller files or using multiple GPTs",
    );
  }

  if (totalSizeMB > 10 * 1024) {
    // 10GB user limit
    overallRecommendations.push(
      "Total size exceeds ChatGPT's 10GB per user limit",
    );
  }

  if (overallRecommendations.length === 0) {
    overallRecommendations.push("All files are within ChatGPT limits");
  }

  return {
    totalFiles: filePaths.length,
    totalItems,
    totalEstimatedTokens,
    totalSizeMB,
    filesWithinLimits,
    filesExceedingLimits,
    fileAnalyses: analyses,
    overallRecommendations,
  };
}
