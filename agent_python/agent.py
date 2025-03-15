import json
import operator
from typing import Annotated, List, Dict
from typing_extensions import TypedDict, Literal
from langgraph.graph import END, StateGraph, START
from IPython.display import Image, display
# langgraph 核心
import os, getpass
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv, find_dotenv
import PyPDF2  # 添加PDF解析库
from langgraph.prebuilt import create_react_agent
from langchain.tools import tool
from tavily import TavilyClient

# 尝试查找并加载.env文件
# 加载环境变量
load_dotenv()

# 初始化OpenAI客户端
llm = ChatOpenAI(model="gpt-4", temperature=0)

# 初始化Tavily客户端
tavily_api_key = os.environ.get("TAVILY_API_KEY")
tavily = TavilyClient(api_key=tavily_api_key)

###############################################################################
# 2.1) 解析输入 JSON 的函数
###############################################################################

def parse_input_json_to_supervisor_state(input_json: dict, total_weeks: int = 12, total_mcq: int = None, total_essay: int = None) -> "SupervisorState":
    """
    给定一个形如：
{
    week1:{
        "lectureTitle": "Test Paper",
        "abstract": "Abstract",
        "keyPoints": ["Key Point 1", "Key Point 2", "Key Point 3"],
        "content": "Content.........",
    },
    week2:{
        "lectureTitle": "Test Paper",
        "abstract": "Abstract",
        "keyPoints": ["Key Point 1", "Key Point 2", "Key Point 3"],
        "content": "Content.........",
    },
    ...
    week12:{
        "lectureTitle": "Test Paper",
        "abstract": "Abstract",
        "keyPoints": ["Key Point 1", "Key Point 2", "Key Point 3"],
        "content": "Content.........",
    },
    
    weekly_topics的输出格式为：
    [
        ["Key Point 1", "Key Point 2", "Key Point 3"],  # week1的关键点
        ["Key Point 1", "Key Point 2", "Key Point 3"],  # week2的关键点
        ...
        ["Key Point 1", "Key Point 2", "Key Point 3"]   # week12的关键点
    ]
    如果某周没有关键点，则使用讲座标题，如果也没有讲座标题，则为空列表。
    """
    # 从 JSON 中拿到统计信息
    if total_mcq is None:
        total_mcq = input_json.get("number_of_MCQ", 10)
    if total_essay is None:
        total_essay = input_json.get("number_of_Essay", 3)
    
    overall_number = total_mcq + total_essay

    # 从每个 weekN 提取内容，组装成周数据
    weekly_topics: List[List[str]] = []
    for i in range(1, total_weeks + 1):
        wkey = f"week{i}"
        if wkey in input_json:
            week_data = input_json[wkey]
            # 从每周数据中提取关键点作为主题
            if isinstance(week_data.get("keyPoints"), list):
                weekly_topics.append(week_data["keyPoints"])
            else:
                # 如果没有关键点，尝试使用讲座标题
                if "lectureTitle" in week_data:
                    weekly_topics.append([week_data["lectureTitle"]])
                else:
                    weekly_topics.append([])
        else:
            # 如果这个周缺失，则用空
            weekly_topics.append([])

    # 示例输出：
    # {
    #     "total_weeks": 12,
    #     "statistics": {
    #         "total_multiple_choice": 10,
    #         "total_essay": 3,
    #         "overall_number": 13
    #     },
    #     "weekly_topics": [
    #         ["COMPUTER SYSTEM"],  # week1
    #         ["Key Point 1", "Key Point 2", "Key Point 3"],  # week2
    #         [],  # week3 (如果没有数据)
    #         ...
    #         ["Key Point 1", "Key Point 2", "Key Point 3"]  # week12
    #     ],
    #     "input_json": {...}  # 原始输入的JSON数据
    # }
    supervisor_state: SupervisorState = {
        "total_weeks": total_weeks,
        # 题目的统计信息
        "statistics": {
            "total_multiple_choice": total_mcq,
            "total_essay": total_essay,
            "overall_number": overall_number
        },
        # 这里保存解析后的周主题
        "weekly_topics": weekly_topics,
        # 原始 JSON 也保存在这里（以防需要）
        "input_json": input_json
    }
    return supervisor_state


###############################################################################
# 2.2) 业务逻辑与 State 定义
###############################################################################

class QuestionOutputState(TypedDict):
    """单个题目的输出：题面、答案及类型"""
    question: str
    answer: str
    q_type: Literal["multiple_choice", "essay"]
    learning_link: str  # 添加学习链接字段

class WeeklyState(TypedDict):
    """
    WeeklyState 用来记录某一周的任务分配以及该周实际产出的题目信息：
    1. week_number: 当前是第几周
    2. topics: 当周的主题
    3. assigned_questions: 分配下来要生成的题目数量
    4. generated_questions: 该周实际生成的题目信息
    """
    week_number: int
    topics: List[str]
    assigned_questions: Dict[Literal["multiple_choice","essay"], int]
    generated_questions: Annotated[List[QuestionOutputState], operator.add]

class StatisticsState(TypedDict):
    """记录整体题目统计信息"""
    total_multiple_choice: int
    total_essay: int
    overall_number: int

class SupervisorState(TypedDict):
    """
    SupervisorState 用来记录管理者对整学期(12 周)的整体分配计划：
    - total_weeks: 总周数（默认为12）
    - statistics: 题目的统计信息(选择题总数、问答题总数等)
    - weekly_topics: 每周的主题(可以是二维列表或其他形式)
    - input_json: 原始输入(可选，用于保留上下文)
    """
    total_weeks: int
    statistics: StatisticsState
    weekly_topics: List[List[str]]
    input_json: Dict  # 如果需要额外存储

class ManagerState(TypedDict):
    supervisor_state: SupervisorState
    weekly_states: Annotated[List[WeeklyState], operator.add]
    testPaper: Dict = {}  # 可选，用于存储最终结果



###############################################################################
# building the graph
###############################################################################
def supervisor_assign_questions(supervisor_state: SupervisorState) -> List[WeeklyState]:

    # 假装做一次 LLM 调用
    mcq_total = supervisor_state["statistics"]["total_multiple_choice"]
    essay_total = supervisor_state["statistics"]["total_essay"]
    weekly_states: List[WeeklyState] = []
    #need recreate the prompt
    prompt = f"""
    You are a teacher responsible for assigning the number of questions to each of 12 weeks.
    You are given the following information:
    - The total number of questions is {mcq_total + essay_total}.
    - The number of multiple choice questions is {mcq_total}.
    - The number of essay questions is {essay_total}.
    - We have {supervisor_state["total_weeks"]} weeks in total.
    - The weekly topics are: {supervisor_state["weekly_topics"]}
    
    Weekly topics 的输出格式为：
    [
        ["Key Point 1", "Key Point 2", "Key Point 3"],  # week1的关键点
        ["Key Point 1", "Key Point 2", "Key Point 3"],  # week2的关键点
        ...
        ["Key Point 1", "Key Point 2", "Key Point 3"]   # week12的关键点
    ]

    Requirement:
    - The output format should be a valid JSON file with 12 weeks.
    - The sum of all the questions for each weekshould be equal to {mcq_total + essay_total}.
    - The sum of multiple choice questions for each week should be equal to {mcq_total}.
    - The sum of essay questions for each week should be equal to {essay_total}.


    Example output:
    {{
        "week1": {{
            "topics": ["Intro", "Basics"],
            "assigned_questions": {{
                "multiple_choice": 4,
                "essay": 2
            }}
        }},
        ...
    }}
    """
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    questions_distribution_raw = llm.invoke(prompt)
    print(questions_distribution_raw)
    # 修复：正确处理AIMessage对象
    if hasattr(questions_distribution_raw, 'content'):
        response_content = questions_distribution_raw.content
    else:
        response_content = str(questions_distribution_raw)
        
    try:
        # 提取JSON部分
        import re
        json_match = re.search(r'```json\n(.*?)\n```', response_content, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
            response_json = json.loads(json_str)
        else:
            # 尝试直接解析
            response_json = json.loads(response_content)
    except json.JSONDecodeError as e:
        print(f"JSON解析错误: {e}")
        # 如果解析失败，创建一个默认分配
        response_json = {}
        total_weeks = supervisor_state["total_weeks"]
        for i in range(1, total_weeks + 1):
            response_json[f"week{i}"] = {
                "topics": supervisor_state["weekly_topics"][i-1],
                "assigned_questions": {
                    "multiple_choice": mcq_total // total_weeks,
                    "essay": essay_total // total_weeks
                }
            }
    
    total_weeks = supervisor_state["total_weeks"]

    weekly_states: List[WeeklyState] = []
    
    for i in range(1, total_weeks + 1):
        week_key = f"week{i}"
        if week_key in response_json:
            # 如果 LLM 给了对应周的分配
            info = response_json[week_key]
            # 如果 LLM 不给 topics，就 fallback 用原始 input_json 里的
            topics = info.get("topics", supervisor_state["weekly_topics"][i-1])
            assigned_raw = info.get("assigned_questions", {})
            
            # 确保分配了题目数量
            mcq = assigned_raw.get("multiple_choice", mcq_total // total_weeks)
            essay = assigned_raw.get("essay", essay_total // total_weeks)
            
            # 验证题目数量大于0
            if mcq <= 0:
                mcq = max(1, mcq_total // total_weeks)
            if essay <= 0:
                essay = max(1, essay_total // total_weeks)
                
            assigned = {
                "multiple_choice": mcq,
                "essay": essay
            }
        else:
            # fallback：如果 LLM 没给这周，均分
            mcq = max(1, mcq_total // total_weeks)
            essay = max(1, essay_total // total_weeks)
            assigned = {
                "multiple_choice": mcq,
                "essay": essay
            }
            topics = supervisor_state["weekly_topics"][i-1]
        
        w_state = WeeklyState(
            week_number=i,
            topics=topics,
            assigned_questions=assigned,
            generated_questions=[]
        )
        weekly_states.append(w_state)
    return weekly_states


# 定义生成试题工具
@tool
def generate_exam_questions(week_num: int, topics: list, mcq_count: int, essay_count: int, content: str) -> str:
    """
    根据周次、主题和内容生成试卷题目
    
    Args:
        week_num: 周次
        topics: 主题列表
        mcq_count: 选择题数量
        essay_count: 问答题数量
        content: 周内容
        
    Returns:
        JSON格式的题目字符串
    """
    prompt=f"""生成第{week_num}周的试题。
        
        主题: {', '.join(topics)}
        
        内容:
        {content[:3000]}
        
        请生成{mcq_count}道选择题和{essay_count}道问答题。
        
        以JSON格式返回:
        {{
            "multiple_choice": [
                {{
                    "question": "问题内容",
                    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
                    "answer": "A",
                    "explanation": "解析说明"
                }}
            ],
            "essay": [
                {{
                    "question": "问题内容",
                    "answer": "参考答案"
                }}
            ]
        }}
        """
    response = llm.invoke(
        prompt
    )
    return response.content
@tool
def check_questions_quality(questions_json: str, week_num: int, topics: list, mcq_count: int, essay_count: int) -> str:
    """
    检查生成的题目质量并提供修改建议
    
    Args:
        questions_json: JSON格式的题目字符串
        week_num: 周次
        topics: 主题列表
        mcq_count: 期望的选择题数量
        essay_count: 期望的问答题数量
        
    Returns:
        检查结果和修改建议
    """
    try:
        questions = json.loads(questions_json)
        
        response = llm.invoke(
            f"""检查第{week_num}周的试题质量。
            
            主题: {', '.join(topics)}
            
            题目:
            {questions_json}
            
            请检查:
            1. 题目是否与主题相关
            2. 选择题是否有明确的正确答案
            3. 问答题是否有清晰的参考答案
            4. 题目难度是否合适
            5. 选择题数量是否为{mcq_count}道
            6. 问答题数量是否为{essay_count}道
            
            如果有问题，请指出并提供修改建议。如果没有问题，请确认质量良好。
            """
        )
        return response.content
    except json.JSONDecodeError:
        return "题目JSON格式有误，请重新生成"

# 添加Tavily搜索工具
@tool
def find_learning_resources(question: str, topic: str) -> str:
    """
    查找与题目相关的YouTube学习资源
    
    Args:
        question: 题目内容
        topic: 题目主题
        
    Returns:
        JSON格式的YouTube链接和描述
    """
    search_query = f"YouTube tutorial {topic} {question}"
    try:
        search_result = tavily.search(
            query=search_query,
            search_depth="advanced",
            include_domains=["youtube.com"],
            max_results=1
        )
        
        if search_result and "results" in search_result and len(search_result["results"]) > 0:
            link = search_result["results"][0].get("url", "")
            title = search_result["results"][0].get("title", "")
            return json.dumps({"link": link, "title": title})
        else:
            return json.dumps({"link": "", "title": "未找到相关资源"})
    except Exception as e:
        print(f"搜索资源时出错: {e}")
        return json.dumps({"link": "", "title": "搜索过程中出错"})

def weekly_generate_questions(weekly_state: WeeklyState) -> WeeklyState:
    """
    使用ReAct代理生成本周的题目
    """
    # 获取基本信息
    week_num = weekly_state["week_number"]
    topics = weekly_state["topics"]
    mcq_count = weekly_state["assigned_questions"]["multiple_choice"]
    essay_count = weekly_state["assigned_questions"]["essay"]
    
    # 获取周内容
    week_content = ""
    if "supervisor_state" in weekly_state:
        input_json = weekly_state.get("supervisor_state", {}).get("input_json", {})
        week_key = f"week{week_num}"
        if week_key in input_json:
            week_content = input_json[week_key].get("content", "")
    
    # 创建ReAct代理 - 移除查找学习资源工具
    tools = [generate_exam_questions, check_questions_quality]  # 移除find_learning_resources
    react_agent = create_react_agent(model=llm, tools=tools)
    
    # 准备系统提示和用户指令
    system_prompt = f"""你是一位专业的教育专家，负责为第{week_num}周的内容生成高质量试题。
    
    请按照以下步骤操作:
    1. 使用generate_exam_questions工具生成初始题目
    2. 使用check_questions_quality工具检查题目质量
    3. 如有需要，重新生成或修改题目
    4. 最终输出包含题目和学习资源链接的JSON格式数据
    
    确保所有题目都与本周主题相关，并提供完整的答案和解析。
    """
    
    user_instruction = f"""请为第{week_num}周生成试题：
    - 主题: {', '.join(topics)}
    - 选择题数量: {mcq_count}
    - 问答题数量: {essay_count}
    - 周内容: {week_content[:500]}...
    """
    
    # 准备输入
    inputs = {
        "messages": [
            ("system", system_prompt),
            ("user", user_instruction)
        ]
    }
    
    # 执行代理
    result = react_agent.invoke(inputs)
    
    # 从结果中提取最终JSON
    final_output = ""
    for message in result.get("messages", []):
        if isinstance(message, tuple) and message[0] == "ai":
            final_output = message[1]
        elif hasattr(message, "content"):
            final_output = message.content
    
    # 处理选择题和问答题时，先不添加学习资源链接
    try:
        # 尝试从输出中提取JSON部分
        import re
        json_match = re.search(r'```json\n(.*?)\n```', final_output, re.DOTALL)
        if json_match:
            questions_json = json_match.group(1)
        else:
            # 尝试直接解析
            questions_json = final_output
            
        questions_data = json.loads(questions_json)
        
        # 处理选择题
        for i, mcq in enumerate(questions_data.get("multiple_choice", [])):
            weekly_state["generated_questions"].append({
                "question": f"[Week{week_num}] 选择题 #{i+1}: {mcq.get('question', '')}",
                "options": mcq.get("options", []),
                "answer": mcq.get("answer", ""),
                "explanation": mcq.get("explanation", ""),
                "q_type": "multiple_choice",
                "learning_link": ""  # 空字符串，稍后填充
            })
        
        # 处理问答题
        for i, essay in enumerate(questions_data.get("essay", [])):
            weekly_state["generated_questions"].append({
                "question": f"[Week{week_num}] 问答题 #{i+1}: {essay.get('question', '')}",
                "answer": essay.get("answer", ""),
                "q_type": "essay",
                "learning_link": ""  # 空字符串，稍后填充
            })
    except Exception as e:
        # 如果出现任何异常，使用备用方案
        print(f"第{week_num}周题目处理失败: {e}，使用备用方案")
        
        # 备用方案
        for i in range(mcq_count):
            weekly_state["generated_questions"].append({
                "question": f"[Week{week_num}] 选择题 #{i+1}: 关于{'/'.join(topics)}的问题",
                "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
                "answer": "A",
                "explanation": "解析说明",
                "q_type": "multiple_choice",
                "learning_link": ""
            })
        
        for i in range(essay_count):
            weekly_state["generated_questions"].append({
                "question": f"[Week{week_num}] 问答题 #{i+1}: 请讨论{'/'.join(topics)}的重要性",
                "answer": f"关于{'/'.join(topics)}的参考答案",
                "q_type": "essay",
                "learning_link": ""
            })
    
    return weekly_state

def extract_text_from_pdf(pdf_path):
    """从PDF文件中提取文本内容"""
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page_num in range(len(reader.pages)):
                text += reader.pages[page_num].extract_text() + "\n"
        return text
    except Exception as e:
        print(f"PDF解析错误: {e}")
        return "无法解析PDF内容"

def manager_collect_questions(manager_state: ManagerState) -> ManagerState:
    """
    汇总所有周的结果，并为每个题目查找学习资源
    """
    # 这里假设我们统一设置
    paper_id = "123"
    paper_title = "Test Paper"

    # 准备一个空的试卷结构
    testPaper = {
        "paperId": paper_id,
        "paperTitle": paper_title,
        "question": []
    }

    # 为了给 questionId 编号，这里建一个计数器
    question_id_counter = 1
    
    # 为每个题目查找学习资源
    print("正在查找所有题目的学习资源...")
    all_questions = []
    for week_state in manager_state["weekly_states"]:
        all_questions.extend(week_state["generated_questions"])
    
    # 为每个题目添加学习资源
    for q in all_questions:
        topic = ""
        if q["q_type"] == "multiple_choice":
            topic = q["question"].split(": ")[1] if ": " in q["question"] else q["question"]
        else:
            topic = q["question"].split(": ")[1] if ": " in q["question"] else q["question"]
            
        # 调用Tavily搜索
        search_query = f"YouTube tutorial {topic}"
        try:
            search_result = tavily.search(
                query=search_query,
                search_depth="advanced",
                include_domains=["youtube.com"],
                max_results=1
            )
            
            if search_result and "results" in search_result and len(search_result["results"]) > 0:
                q["learning_link"] = search_result["results"][0].get("url", "")
            else:
                q["learning_link"] = ""
        except Exception as e:
            print(f"搜索资源时出错: {e}")
            q["learning_link"] = ""

    # 遍历所有周的题目，把它们整合到一个大的 question[] 列表
    for week_state in manager_state["weekly_states"]:
        for q in week_state["generated_questions"]:
            # 根据 q_type 区分：是 multiple_choice 还是 essay
            if q["q_type"] == "multiple_choice":
                # 将 MCQ 题型转换到你想要的字段
                mcq_options = []
                for opt_str in q.get("options", []):
                    # 假设 opt_str 形如 "A. Paris"
                    # 做一个简单 split
                    split_opt = opt_str.split(".", 1)
                    if len(split_opt) == 2:
                        opt_id_part = split_opt[0].strip()  # "A"
                        opt_title_part = split_opt[1].strip()  # "Paris"
                    else:
                        # 如果分割不符合预期，就给个默认
                        opt_id_part = "X"
                        opt_title_part = opt_str

                    mcq_options.append({
                        "optionId": opt_id_part,
                        "optionTitle": opt_title_part,
                        "optionValue": opt_title_part,
                        "explanation": ""  # 如果选项级别无额外解释，就留空
                    })

                new_question = {
                    "questionId": str(question_id_counter),
                    "questionTitle": q["question"],
                    "questionType": "mcq",
                    "answer": q["answer"],
                    "userAnswer": "",   # 先留空或默认值
                    "hint": q["explanation"],  # 这里把整个question-level的explanation放在hint上
                    "mcqOptions": mcq_options,
                    "learningResource": q.get("learning_link", "")  # 添加学习资源链接
                }
                testPaper["question"].append(new_question)
                question_id_counter += 1

            elif q["q_type"] == "essay":
                # 对于简答题
                new_question = {
                    "questionId": str(question_id_counter),
                    "questionTitle": q["question"],
                    "questionType": "short-answer",
                    "userAnswer": "",  # 先留空或默认值
                    "explanation": q["answer"],  # 简答题的答案放在 explanation
                    "learningResource": q.get("learning_link", "")  # 添加学习资源链接
                }
                testPaper["question"].append(new_question)
                question_id_counter += 1

    # 这里你可以把 testPaper 直接写入文件，也可以返回
    with open("complete_exam_paper.json", "w", encoding="utf-8") as f:
        json.dump(testPaper, f, ensure_ascii=False, indent=2)
    print("=== Final Test Paper ===")
    print(json.dumps(testPaper, ensure_ascii=False, indent=2))

    # 如果你仍想把 manager_state 往下传递，可以把 testPaper 存在 manager_state 里
    manager_state["testPaper"] = testPaper

    return manager_state

###############################################################################
# 2.3) langgraph 并行流程
###############################################################################

def supervisor_node_fn(manager_state: ManagerState) -> ManagerState:
    """
    对应 'supervisor_node' 的逻辑：
    - 调用 supervisor_assign_questions
    - 写回 manager_state
    """
    all_w = supervisor_assign_questions(manager_state["supervisor_state"])
    
    # 为每个周状态添加对supervisor_state的引用，以便访问原始内容
    for week_state in all_w:
        week_state["supervisor_state"] = manager_state["supervisor_state"]
    
    manager_state["weekly_states"] = all_w
    return manager_state


def weekly_node_fn(week_index: int):
    """
    返回一个可调用函数, 在执行时对 manager_state 里的第 i 周进行题目生成
    """
    def run(manager_state: ManagerState) -> Dict:
        old_week_state = manager_state["weekly_states"][week_index - 1]
        new_week_state = weekly_generate_questions(old_week_state)
        # 只返回更新的周状态，而不是整个manager_state
        return {"weekly_states": [new_week_state]}
    return run


def manager_collect_node_fn(manager_state: ManagerState) -> ManagerState:
    """
    最后汇总所有周的结果
    """
    return manager_collect_questions(manager_state)


# 构建图
builder = StateGraph(ManagerState)

# 添加节点
builder.add_node("supervisor_node", supervisor_node_fn)
builder.add_node("manager_collect_node", manager_collect_node_fn)

# 获取实际周数
def build_graph_with_weeks(total_weeks=12):
    # Week1 ~ Week{total_weeks}
    for i in range(1, total_weeks + 1):
        builder.add_node(f"week_{i}_node", weekly_node_fn(i))

    # 连线：START -> supervisor_node
    builder.add_edge(START, "supervisor_node")

    # supervisor_node -> week_1_node ... week_{total_weeks}_node (并行)
    for i in range(1, total_weeks + 1):
        builder.add_edge("supervisor_node", f"week_{i}_node")

    # week_1_node..week_{total_weeks}_node -> manager_collect_node
    for i in range(1, total_weeks + 1):
        builder.add_edge(f"week_{i}_node", "manager_collect_node")

    # manager_collect_node -> END
    builder.add_edge("manager_collect_node", END)

    # 编译图
    return builder.compile()

# 在主函数中调用
if __name__ == "__main__":
    # 解析PDF内容
    
    # 一个示例输入 JSON
    input_data = {
        "week1": {
            "lectureTitle": "电动汽车的环境影响",
            "abstract": "本周讲座探讨电动汽车的环境效益，包括零尾气排放、噪音污染减少以及对城市空气质量的积极影响。",
            "keyPoints": ["零尾气排放", "噪音污染减少", "城市空气质量改善"],
            "content": "Lets examine the merits of electric cars through a structured lens, focusing on their environmental, practical, and technological dimensions. First, consider their environmental impact: electric vehicles (EVs) produce zero tailpipe emissions. Unlike gasoline engines, which release carbon dioxide and particulates—contributing to phenomena like urban smog—EVs operate on battery-powered motors. In a city like Los Angeles, widespread EV adoption could measurably reduce air pollution, offering a practical case study in emissions control. Next, assess their acoustic footprint. EVs are significantly quieter than combustion vehicles, lacking the mechanical roar of pistons and exhausts.",
        },
        "week2": {
            "lectureTitle": "电动汽车的经济性分析",
            "abstract": "本周讲座分析电动汽车的经济效益，包括运营成本、维护费用以及长期投资回报率。",
            "keyPoints": ["运营成本分析", "维护费用比较", "长期投资回报"],
            "content": "Economically, EVs present a compelling argument. Though their purchase price often exceeds that of gasoline cars, operational costs are lower. Electricity trumps gasoline in per-mile expense—think $500 annually for a Tesla Model 3 versus $1,500 for a gas equivalent. Maintenance further tilts the scale: no oil changes or complex transmissions mean savings, with data suggesting $4,600 less over a vehicles life. Now, infrastructure: charging networks are scaling up. By 2025, Teslas Supercharger count exceeds 2,000 globally, yet gaps persist—rural drivers face 'range anxiety' where urbanites dont.",
        },
        # ...
        "week12": {
            "lectureTitle": "Test Paper",
            "abstract": "Abstract",
            "keyPoints": ["Key Point 1", "Key Point 2", "Key Point 3"],
            "content": "Content.........",
        },
    }

    # 解析输入 JSON，构造 SupervisorState
    sup_state = parse_input_json_to_supervisor_state(input_data)
    
    # 获取实际周数
    total_weeks = sup_state["total_weeks"]
    
    # 构建并编译图
    graph = build_graph_with_weeks(total_weeks)
    
    # 可视化
    display(Image(graph.get_graph().draw_mermaid_png()))
    
    # 构造初始 ManagerState
    init_manager_state: ManagerState = {
        "supervisor_state": sup_state,
        "weekly_states": []
    }

    # 执行图
    final_state: ManagerState = graph.invoke(init_manager_state)
