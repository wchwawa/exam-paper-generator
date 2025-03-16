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
    topics: z.array(z.string()).describe("topics"),
    mcq_count: z.number().describe("multiple choice questions count"),
    essay_count: z.number().describe("essay questions count"),
    content: z.string().describe("week content")
  }),
  func: async ({ topics, mcq_count, essay_count, content }) => {
    const prompt = `
    ## Role ##
    You are a proficient assistant to help students review knowledge by generating comprehensive questions, answers and explanations based on the given materials. 

    ## Target ##
    Please provide me a series of quesitons and answers based on the topics and the content, the number of questions must align with the given number.

    ## Task ##
    1. I would give you a series of topics and the content, you need to fully understand all of them.
    2. Provide ${mcq_count} MCQ quesitons and ${essay_count} short-answer questions, fully based on the given materials.
    3. Figure out each option of the MCQ with an detailed explanation, try to cover all the important knowledge points from the key points. 
    4. Figure out the outline and skill of the short-answer question and explain the improvements for user's answer.
    5. Generate a suitable hint for each question, it should be helpful when user wants to know more about the solution or knowledge points.
    6. Ensure the number of questions is align with the given number, ${mcq_count} for MCQ and ${essay_count} for short-answer.

    ## Rule ##
    1. All the questions should be from the key points and you need to cover all the important knowledge points.
    2. The explanation must be detailed enough, about why this option is wrong for the question, and some possible ambiguous knowledge points.
    3. Please ensure all questions are relevant to given topics and provide complete answers and explanations.
    4. The hint couldn't directly provide the answer.

    ## Output JSON format ##
    {
        "multiple_choice": [
        {
            "question": "Question content",
            "options": [
            {
                "option": "A. Option 1",
                "explanation": "Explanation for option A"
            },
            {
                "option": "B. Option 2",
                "explanation": "Explanation for option B"
            },
            {
                "option": "C. Option 3",
                "explanation": "Explanation for option C"
            },
            {
                "option": "D. Option 4",
                "explanation": "Explanation for option D"
            }
            ],
            "answer": "Correct option (e.g. A)",
            "hint": "Hint for the question (when user wants to know more about the solution or knowledge points)"
        }
        // More multiple choice questions...
        ],
        "short-answer": [
        {
            "question": "Question content",
            "answer": "Reference answer",
            "hint": "Hint for the question (when user wants to know more about the solution or knowledge points)"
        }
        // More essay questions...
        ]
    }

    ## Material ##
    topics: ${topics.join(', ')}

    content: ${content}
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
        `
        ## Target ##
        Check the quality of the questions for week ${week_num}, and generate feedback.
        
        ## Task ##
        please check:
        1. whether the questions are related to the topics
        2. whether the multiple choice questions have a clear correct answer
        3. whether the essay questions have a clear reference answer
        4. whether the questions are of appropriate difficulty
        5. whether the number of multiple choice questions is ${mcq_count}
        6. whether the number of essay questions is ${essay_count}
        
        ## Output should contain ##
        1. If there are any issues, please point them out and provide suggestions. 
        2. If there are no issues, please confirm that whether the quality is good or not and point out.
        3. Point out whether the number of questions is correct.
        
        ## Material ##
        topics: ${topics.join(', ')}
        
        questions: ${questions_json}        
        `
      );
      
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (e) {
      return "title JSON format error, please regenerate";
    }
  }
});

export const responseFormatTool = new DynamicStructuredTool({
  name: "response_format_tool",
  description: "Before you return the final response, you need to format the response to the JSON format with this tool",
  schema: z.object({
    response: z.string().describe("response")
  }),
  func: async ({ response }) => {
    try {
      const response = await llm.invoke(`
           ## Output JSON format ##
    {
        "multiple_choice": [
        {
            "question": "Question content",
            "options": [
            {
                "option": "A. Option 1",
                "explanation": "Explanation for option A"
            },
            {
                "option": "B. Option 2",
                "explanation": "Explanation for option B"
            },
            {
                "option": "C. Option 3",
                "explanation": "Explanation for option C"
            },
            {
                "option": "D. Option 4",
                "explanation": "Explanation for option D"
            }
            ],
            "answer": "Correct option (e.g. A)",
            "hint": "Hint for the question (when user wants to know more about the solution or knowledge points)"
        }
        // More multiple choice questions...
        ],
        "short-answer": [
        {
            "question": "Question content",
            "answer": "Reference answer",
            "hint": "Hint for the question (when user wants to know more about the solution or knowledge points)"
        }
        // More essay questions...
        ]
    }
      `);
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (e) {
      return "title JSON format error, please regenerate";
    }
  }
});