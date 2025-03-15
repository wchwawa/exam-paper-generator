"use strict";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { tool } from "@langchain/core/tools";
import dotenv from "dotenv";
import { z } from "zod";
import * as tslab from "tslab";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
dotenv.config();

/**
 * Logger class for structured logging with different log levels and file output
 */
class Logger {
  private logLevel: "debug" | "info" | "warn" | "error";
  private logToFile: boolean;
  private logFilePath: string = "";
  private sessionId: string;

  constructor(
    options: {
      logLevel?: "debug" | "info" | "warn" | "error";
      logToFile?: boolean;
      logDir?: string;
    } = {}
  ) {
    this.logLevel = options.logLevel || "info";
    this.logToFile = options.logToFile || false;
    this.sessionId = new Date().toISOString().replace(/[:.]/g, "-");

    if (this.logToFile) {
      const logDir = options.logDir || "./logs";
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
      this.logFilePath = path.join(logDir, `agent-${this.sessionId}.log`);
      this.info(`Logging session started: ${this.sessionId}`);
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level as keyof typeof levels] >= levels[this.logLevel];
  }

  private formatMessage(level: string, message: string): string {
    return `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}`;
  }

  private log(level: string, message: string | object): void {
    if (!this.shouldLog(level)) return;

    const formattedMsg =
      typeof message === "string"
        ? this.formatMessage(level, message)
        : this.formatMessage(level, JSON.stringify(message, null, 2));

    console.log(formattedMsg);

    if (this.logToFile) {
      appendFileSync(this.logFilePath, formattedMsg + "\n");
    }
  }

  debug(message: string | object): void {
    this.log("debug", message);
  }

  info(message: string | object): void {
    this.log("info", message);
  }

  warn(message: string | object): void {
    this.log("warn", message);
  }

  error(message: string | object | unknown): void {
    if (message instanceof Error) {
      this.log("error", {
        message: message.message,
        stack: message.stack,
        name: message.name,
      });
    } else {
      this.log("error", message as string | object);
    }
  }

  logToolCall(toolName: string, inputs: any): void {
    this.info(`Tool Call: ${toolName}`);
    this.debug({ inputs });
  }

  logToolResponse(toolName: string, response: any): void {
    this.info(`Tool Response: ${toolName}`);
    this.debug({ tool: toolName, response });
  }

  logAgentStep(step: number, message: any): void {
    if (!message) {
      this.info(`Agent Step ${step}: undefined message`);
      return;
    }

    this.info(`Agent Step ${step}: ${message.role || "unknown"}`);

    if (message?.content) {
      this.info(
        `Content: ${
          typeof message.content === "string"
            ? message.content.substring(0, 100) + "..."
            : JSON.stringify(message.content).substring(0, 100) + "..."
        }`
      );
      this.debug({ content: message.content });
    }

    if (message?.tool_calls?.length > 0) {
      this.info(
        `Tool Calls: ${message.tool_calls.map((tc: any) => tc.name).join(", ")}`
      );
      this.debug({ tool_calls: message.tool_calls });
    }
  }

  saveOutput(filename: string, content: string): void {
    const outputDir = "./outputs";
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, filename);
    writeFileSync(outputPath, content);
    this.info(`Output saved to ${outputPath}`);
  }
}

async function agent_call(
  llm: ChatGoogleGenerativeAI,
  docs: Document[],
  logger: Logger
) {
  logger.info("Initializing teacher-student agent");

  // implement a teacher-student agent
  const context = `
    You are a part of a AI agent that help students learn knowledge by providing exercies questions. 
    I would give you a series of learning resources and you need to provide me a series of quesitons 
    and answers based on the learning resources.
    Your final output should be a JSON object with the following format:
     {
         "multiple_choice": [
             {
                 "question": "Question content",
                 "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"], 
                 "answer": "Correct option (e.g. A)",
                 "explanation": "Detailed explanation"
             }
             // More multiple choice questions...
         ],
         "essay": [
             {
                 "question": "Question content",
                 "answer": "Reference answer"
             }
             // More essay questions...
         ]
     }
    
  `;

  const extract_prompt = `
    You are a tool of this AI Agent. Please extract the key points mentioned in the learning resources. 
    Here are the learning resources:
  `;

  const review_prompt = `
    You are a tool of this AI Agent. Please review the quesitons and answers provided by the other tools, 
    decide if the quesitons and answers are correct and complete. If not, please provide some feedback 
    to the other tools.
  `;

  const question_prompt = `
    You are a tool of this AI Agent. Please provide me a series of quesitons and answers based on the 
    key points extracted from the learning resources and the outputs of other tools.
    
    Please return results in the following JSON format:
     {
         "multiple_choice": [
             {
                 "question": "Question content",
                 "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"], 
                 "answer": "Correct option (e.g. A)",
                 "explanation": "Detailed explanation"
             }
             // More multiple choice questions...
         ],
         "essay": [
             {
                 "question": "Question content",
                 "answer": "Reference answer"
             }
             // More essay questions...
         ]
     }
     
     Please ensure all questions are relevant to given topics and provide complete answers and explanations.
  `;
  logger.debug("Setting up agent tools");

  const extract_tool = tool(
    async (input: { docs: string }) => {
      logger.logToolCall("extract_tool", "Docs");

      // Access the learning resources from the input object
      const learningResources = input.docs;

      // Invoke the LLM with the provided context and prompt
      const response = await llm.invoke(
        `${context}${extract_prompt}\n\n${learningResources}`
      );

      logger.logToolResponse("extract_tool", response.content);
      return response.content;
    },
    {
      name: "extract_tool",
      description: "Extract the key points from the learning resources",
      schema: z.object({
        // Update the schema to expect an object with a learning_resources property
        docs: z
          .string()
          .describe("The learning resources to extract key points from."),
      }),
    }
  );

  const question_tool = tool(
    async (input: { key_points: string; questions: string }) => {
      logger.logToolCall("question_tool", input);

      const response = await llm.invoke(
        `${context}${question_prompt}\n\nKey Points: ${input.key_points}\n\nQuestions: ${input.questions}`
      );

      logger.logToolResponse("question_tool", response.content);
      return response.content;
    },
    {
      name: "question_tool",
      description: "Generate questions based on key points",
      schema: z.object({
        key_points: z
          .string()
          .describe("The key points to generate questions from"),
        questions: z
          .string()
          .describe("The questions and answers generated by the question_tool"),
      }),
    }
  );

  const review_tool = tool(
    async (input: { key_points: string; questions: string }) => {
      logger.logToolCall("review_tool", input);

      const response = await llm.invoke(
        `${context}${review_prompt}\n\nKey Points: ${input.key_points}\n\nQuestions: ${input.questions}`
      );

      logger.logToolResponse("review_tool", response.content);
      return response.content;
    },
    {
      name: "review_tool",
      description: "Review generated questions and answers",
      schema: z.object({
        key_points: z
          .string()
          .describe("The key points to review the questions and answers"),
        questions: z.string().describe("The questions and answers to review"),
      }),
    }
  );

  // Generate a unique thread ID for this agent run
  const threadId = `thread-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
  logger.info(`Using thread ID: ${threadId}`);

  const agentCheckpointer = new MemorySaver();
  logger.info("Creating React agent");
  const agent = createReactAgent({
    llm: llm,
    tools: [extract_tool, question_tool, review_tool],
    checkpointSaver: agentCheckpointer,
  });

  // Convert Document objects to a string
  const docsContent = docs
    .map(
      (doc) =>
        `Document: ${doc.metadata?.source || "Unknown"}\n${doc.pageContent}`
    )
    .join("\n\n");
  logger.debug(`Document content length: ${docsContent.length} characters`);

  logger.info("Starting agent execution");
  let inputs = {
    messages: [
      { role: "system", content: context },
      { role: "user", content: docsContent },
    ],
  };
  let finalOutput: any;
  let stream = await agent.stream(inputs, {
    streamMode: "values",
    configurable: {
      thread_id: threadId,
    },
  });
  try {
    for await (const { messages } of stream) {
      let msg = messages[messages?.length - 1];
      if (msg?.content) {
        console.log(msg.content);
        finalOutput = msg;
      } else if (msg?.tool_calls?.length > 0) {
        console.log(msg.tool_calls);
      } else {
        console.log(msg);
        finalOutput = msg;
      }
      console.log("-----\n");
    }
    // Save final output to file
    if (finalOutput?.content) {
      logger.info("Saving final output to file");
      logger.saveOutput("output.txt", finalOutput.content);
    } else {
      logger.info("No content to save in final output");
    }

    return JSON.stringify(finalOutput);
  } catch (error) {
    logger.error("Error during agent execution");
    logger.error(error);
    throw error;
  }
}

async function main() {
  // Initialize logger
  const logger = new Logger({
    logLevel: "info",
    logToFile: true,
    logDir: "./logs/agents",
  });

  logger.info("Starting agent application");

  try {
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-pro", // Note: using gemini-pro as gemini-1.5-pro might not be available
      temperature: 0,
      maxRetries: 2,
      apiKey: process.env.GOOGLE_API_KEY,
    });

    logger.info("Loading PDF documents");

    // Define the PDF files to load
    const pdfFiles = [
      "./utils/Agents/dataset/Computational Geometry/Art Gallery Lecture 1 Feb 27.pdf",
      "./utils/Agents/dataset/Computational Geometry/Lecture 2 Sweep Line Mar 6.pdf",
      "./utils/Agents/dataset/Computational Geometry/Lecture 3 Convex Hull Mar 13.pdf",
    ];

    // Load all PDF files and combine their documents
    let allDocs: Document[] = [];
    for (const pdfFile of pdfFiles) {
      const loader = new PDFLoader(pdfFile);
      const docs = await loader.load();
      logger.info(`Loaded ${docs.length} pages from ${pdfFile}`);
      allDocs.push(...docs);
    }

    logger.info(`Loaded a total of ${allDocs.length} pages from all PDFs`);

    const result = await agent_call(llm, allDocs, logger);

    if (result) {
      logger.info("Application completed successfully");
    } else {
      logger.error("Application failed");
    }
  } catch (error) {
    logger.error("Application failed with error");
    logger.error(error);
  }
}

main().catch((error) => {
  console.error("Unhandled exception:", error);
});
