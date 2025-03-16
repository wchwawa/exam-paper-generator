import { 
  Annotation, 
  StateGraph, 
  START, 
  END
} from "@langchain/langgraph";
import { 
  ChatOpenAI 
} from "@langchain/openai";
import agentClient from "../../utils/openai/agentClient";
import { 
  HumanMessage, 
  SystemMessage,
} from "@langchain/core/messages";
import { 
  createReactAgent 
} from "@langchain/langgraph/prebuilt";
import { 
  ToolNode 
} from "@langchain/langgraph/prebuilt";
import { 
  DynamicStructuredTool 
} from "@langchain/core/tools";
import { generateExamQuestions, checkQuestionsQuality } from "@/Agents/advanceAgents/tools";
import { v4 as uuidv4 } from 'uuid';
// 初始化 OpenAI 客户端
const llm = agentClient;

// 定义类型和状态
// 这些类型对应 Python 代码中的 TypedDict 类

// 单个题目的输出类型
type QuestionType = "multiple_choice" | "essay";

interface QuestionOutputState {
  question: string;
  answer: string;
  q_type: QuestionType;
  learning_link: string;
  options?: string[];  // 选择题选项
  explanation?: string; // 解释
}

// 统计信息类型
interface StatisticsState {
  total_multiple_choice: number;
  total_essay: number;
  overall_number: number;
}

// 周状态类型
interface WeeklyState {
  week_number: number;
  topics: string[];
  assigned_questions: {
    multiple_choice: number;
    essay: number;
  };
  generated_questions: QuestionOutputState[];
  supervisor_state?: SupervisorState; // 可选引用
}

// 管理者状态类型
interface SupervisorState {
  total_weeks: number;
  statistics: StatisticsState;
  weekly_topics: string[][];
  input_json: Record<string, any>;
}

// 使用 Annotation 定义状态
const WeeklyStateAnnotation = Annotation.Root({
  week_number: Annotation<number>(),
  topics: Annotation<string[]>(),
  assigned_questions: Annotation<{
    multiple_choice: number;
    essay: number;
  }>(),
  generated_questions: Annotation<QuestionOutputState[]>({
    default: () => [],
    reducer: (curr, update) => [...curr, ...update]
  }),
  supervisor_state: Annotation<SupervisorState | undefined>()
});

// 管理者状态注解
const ManagerStateAnnotation = Annotation.Root({
  supervisor_state: Annotation<SupervisorState>(),
  weekly_states: Annotation<WeeklyState[]>({
    default: () => [],
    reducer: (curr, update) => {
      // 如果更新包含单个周状态，将其添加到现有数组
      if (Array.isArray(update) && update.length === 1) {
        const updatedState = update[0];
        const index = curr.findIndex(s => s.week_number === updatedState.week_number);
        
        if (index >= 0) {
          // 更新现有周状态
          const newStates = [...curr];
          newStates[index] = updatedState;
          return newStates;
        } else {
          // 添加新周状态
          return [...curr, updatedState];
        }
      }
      // 如果是完整替换，直接返回更新值
      return update;
    }
  }),
  testPaper: Annotation<Record<string, any>>({
    default: () => ({}),
    reducer: (curr, update) => ({ ...curr, ...update })
  })
});

/**
 * 解析输入 JSON 到 SupervisorState
 */
function parseInputJsonToSupervisorState(
  input_json: Record<string, any>, 
  total_weeks?: number, 
  total_mcq?: number, 
  total_essay?: number
): SupervisorState {
  // 从 JSON 中获取统计信息
  if (total_mcq === undefined) {
    total_mcq = input_json.number_of_MCQ || 10;
  }
  if (total_essay === undefined) {
    total_essay = input_json.number_of_Essay || 3;
  }
  
  const overall_number = (total_mcq || 0) + (total_essay || 0);

  // 从每个 weekN 提取内容，组装成周数据
  const weekly_topics: string[][] = [];
  for (let i = 1; i <= (total_weeks || 3); i++) {
    const wkey = `week${i}`;
    if (wkey in input_json) {
      const week_data = input_json[wkey];
      // 从每周数据中提取关键点作为主题
      if (Array.isArray(week_data.keyPoints)) {
        weekly_topics.push(week_data.keyPoints);
      } else {
        // 如果没有关键点，尝试使用讲座标题
        if ("lectureTitle" in week_data) {
          weekly_topics.push([week_data.lectureTitle]);
        } else {
          weekly_topics.push([]);
        }
      }
    } else {
      // 如果这个周缺失，则用空
      weekly_topics.push([]);
    }
  }

  // 构建 SupervisorState
  const supervisor_state: SupervisorState = {
    total_weeks: total_weeks || 3,
    statistics: {
      total_multiple_choice: total_mcq || 10,
      total_essay: total_essay || 3,
      overall_number
    },
    weekly_topics,
    input_json
  };
  
  return supervisor_state;
}

/**
 * 分配问题到各周
 */
async function supervisorAssignQuestions(supervisor_state: SupervisorState): Promise<WeeklyState[]> {
  const mcq_total = supervisor_state.statistics.total_multiple_choice;
  const essay_total = supervisor_state.statistics.total_essay;
  const weekly_states: WeeklyState[] = [];
  
  // 创建提示
  const prompt = `
  You are a teacher responsible for assigning the number of questions to each of 12 weeks.
  You are given the following information:
  - The total number of questions is ${mcq_total + essay_total}.
  - The number of multiple choice questions is ${mcq_total}.
  - The number of essay questions is ${essay_total}.
  - We have ${supervisor_state.total_weeks} weeks in total.
  - The weekly topics are: ${JSON.stringify(supervisor_state.weekly_topics)}
  
  Weekly topics 的输出格式为：
  [
      ["Key Point 1", "Key Point 2", "Key Point 3"],  # week1's key points
      ["Key Point 1", "Key Point 2", "Key Point 3"],  # week2's key points
      ...
      ["Key Point 1", "Key Point 2", "Key Point 3"]   # week12's key points
  ]

  Requirement:
  - The output format should be a valid JSON file with 12 weeks.
  - The sum of all the questions for each weekshould be equal to ${mcq_total + essay_total}.
  - The sum of multiple choice questions for each week should be equal to ${mcq_total}.
  - The sum of essay questions for each week should be equal to ${essay_total}.


  Example output:
  {
      "week1": {
          "topics": ["Intro", "Basics"],
          "assigned_questions": {
              "multiple_choice": 4,
              "essay": 2
          }
      },
      ...
  }
  `;
  
  // 使用 LLM 生成分配
  const miniLLM = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  const questions_distribution_raw = await miniLLM.invoke(prompt);
  
  // 处理 LLM 响应
  let response_content = "";
  if (typeof questions_distribution_raw.content === 'string') {
    response_content = questions_distribution_raw.content;
  } else {
    response_content = JSON.stringify(questions_distribution_raw);
  }
  
  let response_json: Record<string, any> = {};
  try {
    // 尝试提取 JSON 部分
    const json_match = response_content.match(/```json\n([\s\S]*?)\n```/);
    if (json_match && json_match[1]) {
      response_json = JSON.parse(json_match[1]);
    } else {
      // 尝试直接解析
      response_json = JSON.parse(response_content);
    }
  } catch (e) {
    console.log(`JSON解析错误: ${e}`);
    // 如果解析失败，创建一个默认分配
    response_json = {};
    const total_weeks = supervisor_state.total_weeks;
    for (let i = 1; i <= total_weeks; i++) {
      response_json[`week${i}`] = {
        topics: supervisor_state.weekly_topics[i-1],
        assigned_questions: {
          multiple_choice: Math.floor(mcq_total / total_weeks),
          essay: Math.floor(essay_total / total_weeks)
        }
      };
    }
  }
  
  // 构建周状态
  const total_weeks = supervisor_state.total_weeks;
  for (let i = 1; i <= total_weeks; i++) {
    const week_key = `week${i}`;
    let topics: string[] = [];
    let assigned: { multiple_choice: number; essay: number };
    
    if (week_key in response_json) {
      // 如果 LLM 给了对应周的分配
      const info = response_json[week_key];
      // 如果 LLM 不给 topics，就 fallback 用原始 input_json 里的
      topics = info.topics || supervisor_state.weekly_topics[i-1];
      const assigned_raw = info.assigned_questions || {};
      
      // 确保分配了题目数量
      let mcq = assigned_raw.multiple_choice || Math.floor(mcq_total / total_weeks);
      let essay = assigned_raw.essay || Math.floor(essay_total / total_weeks);
      
      // 验证题目数量大于0
      if (mcq <= 0) {
        mcq = Math.max(1, Math.floor(mcq_total / total_weeks));
      }
      if (essay <= 0) {
        essay = Math.max(1, Math.floor(essay_total / total_weeks));
      }
      
      assigned = {
        multiple_choice: mcq,
        essay: essay
      };
    } else {
      // fallback：如果 LLM 没给这周，均分
      const mcq = Math.max(1, Math.floor(mcq_total / total_weeks));
      const essay = Math.max(1, Math.floor(essay_total / total_weeks));
      assigned = {
        multiple_choice: mcq,
        essay: essay
      };
      topics = supervisor_state.weekly_topics[i-1];
    }
    
    // 创建周状态
    const w_state: WeeklyState = {
      week_number: i,
      topics,
      assigned_questions: assigned,
      generated_questions: []
    };
    
    weekly_states.push(w_state);
  }
  
  return weekly_states;
}



/**
 * 使用 ReAct 代理生成本周的题目
 */
async function weeklyGenerateQuestions(weekly_state: WeeklyState): Promise<WeeklyState> {
  // 获取基本信息
  const week_num = weekly_state.week_number;
  const topics = weekly_state.topics;
  const mcq_count = weekly_state.assigned_questions.multiple_choice;
  const essay_count = weekly_state.assigned_questions.essay;
  
  // 获取周内容
  let week_content = "";
  if (weekly_state.supervisor_state) {
    const input_json = weekly_state.supervisor_state.input_json;
    const week_key = `week${week_num}`;
    if (week_key in input_json) {
      week_content = input_json[week_key].content || "";
    }
  }
  
  // 创建 ReAct 代理
  const tools = [generateExamQuestions, checkQuestionsQuality];
  const toolNode = new ToolNode(tools);
  
  const react_agent = createReactAgent({
    llm,
    tools
  });
  
  // 准备系统提示和用户指令
  const system_prompt = `you are a professional education expert, responsible for generating high-quality questions for the content of week ${week_num}.
  
  please follow the following steps:
  1. use the generate_exam_questions tool to generate initial questions
  2. use the check_questions_quality tool to check the quality of the questions
  3. if needed, regenerate or modify the questions
  4. finally, output the questions and learning resource links in JSON format
  
  ensure all questions are related to the week's topic and provide complete answers and explanations.
  `;
  
  const user_instruction = `please generate questions for week ${week_num}:
  - topics: ${topics.join(', ')}
  - multiple choice questions count: ${mcq_count}
  - essay questions count: ${essay_count}
  - week content: ${week_content.substring(0, 500)}...
  `;
  
  // 准备输入
  const inputs = {
    messages: [
      new SystemMessage(system_prompt),
      new HumanMessage(user_instruction)
    ]
  };
  
  // 执行代理
  const result = await react_agent.invoke(inputs);
  
  // 从结果中提取最终 JSON
  let final_output = "";
  const messages = result.messages;
  if (messages && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (typeof lastMessage.content === 'string') {
      final_output = lastMessage.content;
    } else {
      final_output = JSON.stringify(lastMessage.content);
    }
  }
  
  // 处理选择题和问答题
  try {
    // 尝试从输出中提取 JSON 部分
    let questions_json = final_output;
    const json_match = final_output.match(/```json\n([\s\S]*?)\n```/);
    if (json_match && json_match[1]) {
      questions_json = json_match[1];
    }
    
    const questions_data = JSON.parse(questions_json);
    
    // 处理选择题
    if (Array.isArray(questions_data.multiple_choice)) {
      for (let i = 0; i < questions_data.multiple_choice.length; i++) {
        const mcq = questions_data.multiple_choice[i];
        weekly_state.generated_questions.push({
          question: `[Week${week_num}] multiple choice question #${i+1}: ${mcq.question || ''}`,
          options: mcq.options || [],
          answer: mcq.answer || "",
          explanation: mcq.explanation || "",
          q_type: "multiple_choice",
          learning_link: ""  // 空字符串，稍后填充
        });
      }
    }
    
    // 处理问答题
    if (Array.isArray(questions_data.essay)) {
      for (let i = 0; i < questions_data.essay.length; i++) {
        const essay = questions_data.essay[i];
        weekly_state.generated_questions.push({
          question: `[Week${week_num}] essay question #${i+1}: ${essay.question || ''}`,
          answer: essay.answer || "",
          q_type: "essay",
          learning_link: ""  // 空字符串，稍后填充
        });
      }
    }
  } catch (e) {
    // 如果出现任何异常，使用备用方案
    console.log(`week ${week_num} questions processing failed: ${e}, using backup plan`);
    
    // 备用方案
    for (let i = 0; i < mcq_count; i++) {
      weekly_state.generated_questions.push({
        question: `[Week${week_num}] multiple choice question #${i+1}: about ${topics.join('/')}`,
        options: ["A. option1", "B. option2", "C. option3", "D. option4"],
        answer: "A",
        explanation: "explanation",
        q_type: "multiple_choice",
        learning_link: ""
      });
    }
    
    for (let i = 0; i < essay_count; i++) {
      weekly_state.generated_questions.push({
        question: `[Week${week_num}] essay question #${i+1}: please discuss the importance of ${topics.join('/')}`,
        answer: `reference answer about ${topics.join('/')}`,
        q_type: "essay",
        learning_link: ""
      });
    }
  }
  
  return weekly_state;
}

/**
 * 汇总所有周的结果
 */
async function managerCollectQuestions(manager_state: typeof ManagerStateAnnotation.State): Promise<typeof ManagerStateAnnotation.State> {
  // 这里假设我们统一设置
  const paper_id = uuidv4();
  const paper_title = "Test Paper";

  // 准备一个空的试卷结构
  const testPaper: Record<string, any> = {
    paperId: paper_id,
    paperTitle: paper_title,
    question: []
  };

  // 为了给 questionId 编号，这里建一个计数器
  let question_id_counter = 1;
  
  // 为每个题目查找学习资源
  console.log("finding learning resources for all questions...");
  const all_questions: QuestionOutputState[] = [];
  for (const week_state of manager_state.weekly_states) {
    all_questions.push(...week_state.generated_questions);
  }
  
  // 为每个题目添加学习资源 (这里简化处理，不实际调用 Tavily API)
  for (const q of all_questions) {
    // 在实际应用中，这里应该调用搜索 API
    q.learning_link = `https://www.youtube.com/results?search_query=${encodeURIComponent(q.question)}`;
  }

  // 遍历所有周的题目，把它们整合到一个大的 question[] 列表
  for (const week_state of manager_state.weekly_states) {
    for (const q of week_state.generated_questions) {
      // 根据 q_type 区分：是 multiple_choice 还是 essay
      if (q.q_type === "multiple_choice") {
        // 将 MCQ 题型转换到你想要的字段
        const mcq_options = [];
        for (const opt_str of q.options || []) {
          // 假设 opt_str 形如 "A. Paris"
          // 做一个简单 split
          const split_opt = opt_str.split(".", 1);
          if (split_opt.length === 2) {
            const opt_id_part = split_opt[0].trim();  // "A"
            const opt_title_part = split_opt[1].trim();  // "Paris"
            
            mcq_options.push({
              optionId: opt_id_part,
              optionTitle: opt_title_part,
              optionValue: opt_title_part,
              explanation: ""  // 如果选项级别无额外解释，就留空
            });
          } else {
            // 如果分割不符合预期，就给个默认
            mcq_options.push({
              optionId: "X",
              optionTitle: opt_str,
              optionValue: opt_str,
              explanation: ""
            });
          }
        }

        const new_question = {
          questionId: String(question_id_counter),
          questionTitle: q.question,
          questionType: "mcq",
          answer: q.answer,
          userAnswer: "",   // 先留空或默认值
          hint: q.explanation || "",  // 这里把整个question-level的explanation放在hint上
          mcqOptions: mcq_options,
          learningResource: q.learning_link  // 添加学习资源链接
        };
        
        testPaper.question.push(new_question);
        question_id_counter += 1;
      } else if (q.q_type === "essay") {
        // 对于简答题
        const new_question = {
          questionId: String(question_id_counter),
          questionTitle: q.question,
          questionType: "short-answer",
          userAnswer: "",  // 先留空或默认值
          explanation: q.answer,  // 简答题的答案放在 explanation
          learningResource: q.learning_link  // 添加学习资源链接
        };
        
        testPaper.question.push(new_question);
        question_id_counter += 1;
      }
    }
  }

  // 这里你可以把 testPaper 直接写入文件，也可以返回
  console.log("=== Final Test Paper ===");
  console.log(JSON.stringify(testPaper, null, 2));

  // 更新 manager_state 中的 testPaper
  return {
    ...manager_state,
    testPaper
  };
}

/**
 * 对应 'supervisor_node' 的逻辑：
 * - 调用 supervisor_assign_questions
 * - 写回 manager_state
 */
async function supervisorNodeFn(manager_state: typeof ManagerStateAnnotation.State): Promise<typeof ManagerStateAnnotation.State> {
  const all_w = await supervisorAssignQuestions(manager_state.supervisor_state);
  
  // 为每个周状态添加对supervisor_state的引用，以便访问原始内容
  for (const week_state of all_w) {
    week_state.supervisor_state = manager_state.supervisor_state;
  }
  
  return {
    ...manager_state,
    weekly_states: all_w
  };
}

/**
 * 返回一个可调用函数, 在执行时对 manager_state 里的第 i 周进行题目生成
 */
function weeklyNodeFn(week_index: number) {
  return async (manager_state: typeof ManagerStateAnnotation.State): Promise<Partial<typeof ManagerStateAnnotation.State>> => {
    const old_week_state = manager_state.weekly_states[week_index - 1];
    const new_week_state = await weeklyGenerateQuestions(old_week_state);
    // 只返回更新的周状态，而不是整个manager_state
    return {
      weekly_states: [new_week_state]
    };
  };
}

/**
 * 最后汇总所有周的结果
 */
async function managerCollectNodeFn(manager_state: typeof ManagerStateAnnotation.State): Promise<typeof ManagerStateAnnotation.State> {
  return await managerCollectQuestions(manager_state);
}

/**
 * 构建图并返回编译后的图
 * 注意：这里的StateGraph API使用可能需要根据实际的@langchain/langgraph版本进行调整
 * 当前代码可能存在类型错误，需要参考最新的API文档进行修改
 */
function buildGraphWithWeeks(total_weeks: number) {
  // 构建图
  const builder = new StateGraph(ManagerStateAnnotation);

  // 添加节点
  builder.addNode("supervisor_node", supervisorNodeFn);
  builder.addNode("manager_collect_node", managerCollectNodeFn);

  // Week1 ~ Week{total_weeks}
  for (let i = 1; i <= total_weeks; i++) {
    builder.addNode(`week_${i}_node`, weeklyNodeFn(i));
  }

  // 定义节点名称
  const supervisorNode = "supervisor_node";
  const managerCollectNode = "manager_collect_node";

  // 连线：START -> supervisor_node
  // @ts-ignore - 忽略类型错误，实际使用时需要根据API文档调整
  builder.addEdge(START, supervisorNode);

  // supervisor_node -> week_1_node ... week_{total_weeks}_node (并行)
  for (let i = 1; i <= total_weeks; i++) {
    const weekNode = `week_${i}_node`;
    // @ts-ignore - 忽略类型错误，实际使用时需要根据API文档调整
    builder.addEdge(supervisorNode, weekNode);
  }

  // week_1_node..week_{total_weeks}_node -> manager_collect_node
  for (let i = 1; i <= total_weeks; i++) {
    const weekNode = `week_${i}_node`;
  
    // @ts-ignore - 忽略类型错误，实际使用时需要根据API文档调整
    builder.addEdge(weekNode, managerCollectNode);
  }

  // manager_collect_node -> END
  // @ts-ignore - 忽略类型错误，实际使用时需要根据API文档调整
  builder.addEdge(managerCollectNode, END);

  return builder.compile();
}


// 主函数
async function callAgentCluster(input: any, total_weeks: number, total_mcq: number, total_essay: number) {

  const sup_state = parseInputJsonToSupervisorState(input, total_weeks, total_mcq, total_essay);
  
  
  const graph = buildGraphWithWeeks(total_weeks);
  
  console.log("Graph built successfully");
  
  const init_manager_state = {
    supervisor_state: sup_state,
    weekly_states: []
  };

  const final_state = await graph.invoke(init_manager_state);
  
  console.log("Final state:", JSON.stringify(final_state, null, 2));
  
  return final_state;
}


export {
  callAgentCluster
};
