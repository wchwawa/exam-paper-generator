import { ChatOpenAI } from "@langchain/openai";

const agentClient = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
  maxRetries: 3,
  apiKey: process.env.OPENAI_API_KEY
})

export default agentClient;