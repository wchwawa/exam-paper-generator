import { ChatOpenAI } from "@langchain/openai";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const agentClient = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.OPENAI_API_KEY,
});

// const agentClient = new ChatGoogleGenerativeAI({
//   modelName: "gemini-2.0-flash-lite",
//   temperature: 0,
//   maxRetries: 2,
//   apiKey: process.env.GOOGLE_API_KEY,
// });

export default agentClient;
