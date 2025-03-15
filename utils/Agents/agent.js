"use strict";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-pro", // Note: using gemini-pro as gemini-1.5-pro might not be available
    temperature: 0,
    maxRetries: 2,
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const aiMsg = await llm.invoke([
    [
      "system",
      "You are a helpful assistant that translates English to Chinese. Translate the user sentence.",
    ],
    ["human", "I love programming."],
  ]);

  console.log(aiMsg);
}

main().catch(console.error);
