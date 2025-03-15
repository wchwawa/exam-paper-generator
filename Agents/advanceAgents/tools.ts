import { 
  DynamicStructuredTool 
} from "@langchain/core/tools";
import { z } from "zod";
import agentClient from "../../utils/openai/agentClient";

const llm = agentClient;

// 定义生成试题工具
export const generateExamQuestions = new DynamicStructuredTool({
  name: "generate_exam_questions",
  description: "based on the week number, topics and content",
  schema: z.object({
    week_num: z.number().describe("week number"),
    topics: z.array(z.string()).describe("topics"),
    mcq_count: z.number().describe("multiple choice questions count"),
    essay_count: z.number().describe("essay questions count"),
    content: z.string().describe("week content")
  }),
  func: async ({ week_num, topics, mcq_count, essay_count, content }) => {
    const prompt = `generate the questions for week ${week_num}.
      
      topics: ${topics.join(', ')}
      
      content:
      ${content.substring(0, 3000)}
      
      please generate ${mcq_count} multiple choice questions and ${essay_count} essay questions.
      
      return the questions in JSON format:
      {
          "multiple_choice": [
              {
                  "question": "question content",
                  "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
                  "answer": "A",
                  "explanation": "explanation"
              }
          ],
          "essay": [
              {
                  "question": "question content",
                  "answer": "reference answer"
              }
          ]
      }
      `;
    
    const response = await llm.invoke(prompt);
    return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  }
});

// 定义检查题目质量工具
export const checkQuestionsQuality = new DynamicStructuredTool({
  name: "check_questions_quality",
  description: "check the quality of the questions and provide suggestions",
  schema: z.object({
    questions_json: z.string().describe("JSON format questions string"),
    week_num: z.number().describe("week number"),
    topics: z.array(z.string()).describe("topics"),
    mcq_count: z.number().describe("expected multiple choice questions count"),
    essay_count: z.number().describe("expected essay questions count")
  }),
  func: async ({ questions_json, week_num, topics, mcq_count, essay_count }) => {
    try {
      const questions = JSON.parse(questions_json);
      
      const response = await llm.invoke(
        `check the quality of the questions for week ${week_num}.
        
        topics: ${topics.join(', ')}
        
        questions:
        ${questions_json}
        
        please check:
        1. whether the questions are related to the topics
        2. whether the multiple choice questions have a clear correct answer
        3. whether the essay questions have a clear reference answer
        4. whether the questions are of appropriate difficulty
        5. whether the number of multiple choice questions is ${mcq_count}
        6. whether the number of essay questions is ${essay_count}
        
        if there are any issues, please point them out and provide suggestions. if there are no issues, please confirm that the quality is good.
        `
      );
      
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (e) {
      return "title JSON format error, please regenerate";
    }
  }
});