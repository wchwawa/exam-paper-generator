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
from dotenv import load_dotenv
import PyPDF2  # 添加PDF解析库

# 加载.env文件中的环境变量
load_dotenv()

# 检查是否成功加载了API密钥
openai_api_key = os.environ.get("OPENAI_API_KEY")
langchain_key = os.getenv("LANGCHAIN_API_KEY")

# 如果没有从.env文件加载到，可以手动设置

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "exam_generator"
llm = ChatOpenAI(model="gpt-4", temperature=0)
# 如需在 Notebook / REPL 中看流程图，请打开下面的 import
# from IPython.display import Image, display


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

def supervisor_assign_questions(supervisor_state: SupervisorState) -> List[WeeklyState]:
    """
    一次性为 12 周分配题目，返回 12 个 WeeklyState
    """
    # 假装做一次 LLM 调用
    mcq_total = supervisor_state["statistics"]["total_multiple_choice"]
    essay_total = supervisor_state["statistics"]["total_essay"]
    weekly_states: List[WeeklyState] = []
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
        response_json = json.loads(response_content)
    except json.JSONDecodeError:
        response_json = {}
    
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
            assigned = {
                "multiple_choice": assigned_raw.get("multiple_choice", 0),
                "essay": assigned_raw.get("essay", 0),
            }
        else:
            # fallback：如果 LLM 没给这周，均分
            assigned = {
                "multiple_choice": mcq_total // total_weeks,
                "essay": essay_total // total_weeks
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


def weekly_generate_questions(weekly_state: WeeklyState) -> WeeklyState:
    """
    生成本周的题目，根据 assigned_questions 的要求生成选择题和问答题
    """
    # 获取当前周号和主题
    week_num = weekly_state["week_number"]
    topics = weekly_state["topics"]
    
    # 获取要生成的题目数量
    mcq_count = weekly_state["assigned_questions"]["multiple_choice"]
    essay_count = weekly_state["assigned_questions"]["essay"]
    
    # 从supervisor_state中获取原始内容
    week_content = ""
    if "supervisor_state" in weekly_state:
        input_json = weekly_state.get("supervisor_state", {}).get("input_json", {})
        week_key = f"week{week_num}"
        if week_key in input_json:
            week_content = input_json[week_key].get("content", "")
    
    # 构建结构化输出的提示，要求LLM以JSON格式返回
    prompt = f"""
    作为一位教育专家，请为第{week_num}周的内容生成题目。
    
    本周主题包括: {', '.join(topics)}
    
    以下是本周的讲义内容:
    {week_content[:3000]}  # 限制内容长度以避免超出token限制
    
    请生成：
    - {mcq_count}道选择题
    - {essay_count}道问答题
    
    请以下面的JSON格式返回结果：
    {{
        "multiple_choice": [
            {{
                "question": "问题内容",
                "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
                "answer": "正确选项（如A）",
                "explanation": "解析说明"
            }}
            // 更多选择题...
        ],
        "essay": [
            {{
                "question": "问题内容",
                "answer": "参考答案"
            }}
            // 更多问答题..
        ]
    }}
    
    确保所有题目都与本周主题相关，并提供完整的答案和解析。
    基于提供的讲义内容出题，不要编造不相关的内容。
    """
    
    # 调用OpenAI生成题目
    response = llm.invoke(prompt)
    
    # 尝试解析JSON响应
    try:
        # 修复：正确处理AIMessage对象
        response_content = response.content if hasattr(response, 'content') else str(response)
        questions_data = json.loads(response_content)
        
        # 处理选择题
        for i, mcq in enumerate(questions_data.get("multiple_choice", [])):
            weekly_state["generated_questions"].append({
                "question": f"[Week{week_num}] 选择题 #{i+1}: {mcq.get('question', '')}",
                "options": mcq.get("options", []),
                "answer": mcq.get("answer", ""),
                "explanation": mcq.get("explanation", ""),
                "q_type": "multiple_choice"
            })
        
        # 处理问答题
        for i, essay in enumerate(questions_data.get("essay", [])):
            weekly_state["generated_questions"].append({
                "question": f"[Week{week_num}] 问答题 #{i+1}: {essay.get('question', '')}",
                "answer": essay.get("answer", ""),
                "q_type": "essay"
            })
    except json.JSONDecodeError:
        # 如果JSON解析失败，使用备用方案
        print(f"第{week_num}周题目生成的JSON解析失败，使用备用方案")
        
        # 备用方案：创建简单的占位题目
        for i in range(mcq_count):
            weekly_state["generated_questions"].append({
                "question": f"[Week{week_num}] 选择题 #{i+1}: 关于{'/'.join(topics)}的问题",
                "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
                "answer": "A",
                "explanation": "解析说明",
                "q_type": "multiple_choice"
            })
        
        for i in range(essay_count):
            weekly_state["generated_questions"].append({
                "question": f"[Week{week_num}] 问答题 #{i+1}: 请讨论{'/'.join(topics)}的重要性",
                "answer": f"关于{'/'.join(topics)}的参考答案",
                "q_type": "essay"
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
    汇总所有周的结果，返回一个符合你所需结构的 testPaper
    并将其写到 JSON 文件或直接在 Python 层面返回给前端
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

    # 遍历所有周的题目，把它们整合到一个大的 question[] 列表
    for week_state in manager_state["weekly_states"]:
        for q in week_state["generated_questions"]:

            # 根据 q_type 区分：是 multiple_choice 还是 essay
            if q["q_type"] == "multiple_choice":
                # 将 MCQ 题型转换到你想要的字段
                # q["options"] 里一般形如 ["A. Paris", "B. Rome", ...]
                # 我们需要拆分出 optionId、optionTitle、optionValue、explanation
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
                    "mcqOptions": mcq_options
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
                }
                testPaper["question"].append(new_question)
                question_id_counter += 1

    # 这里你可以把 testPaper 直接写入文件，也可以返回
    with open("complete_exam_paper.json", "w", encoding="utf-8") as f:
        json.dump(testPaper, f, ensure_ascii=False, indent=2)
    print("=== Final Test Paper ===")
    print(json.dumps(testPaper, ensure_ascii=False, indent=2))

    # 如果你仍想把 manager_state 往下传递，可以把 testPaper 存在 manager_state 里
    # 或者在此仅返回 manager_state
    # 如下，我演示把 testPaper 附加到 manager_state 里：
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

# Week1 ~ Week12
for i in range(1, 13):
    builder.add_node(f"week_{i}_node", weekly_node_fn(i))

# 连线：START -> supervisor_node
builder.add_edge(START, "supervisor_node")

# supervisor_node -> week_1_node ... week_12_node (并行)
for i in range(1, 13):
    builder.add_edge("supervisor_node", f"week_{i}_node")

# week_1_node..week_12_node -> manager_collect_node
for i in range(1, 13):
    builder.add_edge(f"week_{i}_node", "manager_collect_node")

# manager_collect_node -> END
builder.add_edge("manager_collect_node", END)

# 编译图
graph = builder.compile()

# 如果你想在 Notebook 中可视化:
display(Image(graph.get_graph().draw_mermaid_png()))



if __name__ == "__main__":
    # 解析PDF内容
    pdf_path = "/root/langchain-academy/exam-paper-generator/check/Lecture-3.pdf"
    pdf_content = extract_text_from_pdf(pdf_path)
    
    # 一个示例输入 JSON
    input_data = {
        "week1": {
            "lectureTitle": "how to radix conversion",
            "abstract": "how to radix conversion",
            "keyPoints": ["1st component", "2nd component", "Signed_integer"],
            "content": pdf_content,  # 使用从PDF提取的内容
        },
        "week2": {
            "lectureTitle": "Test Paper",
            "abstract": "Abstract",
            "keyPoints": ["Key Point 1", "Key Point 2", "Key Point 3"],
            "content": "Content.........",
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
    sup_state = parse_input_json_to_supervisor_state(input_data, total_weeks=12, total_mcq=10, total_essay=3)

    # 构造初始 ManagerState
    init_manager_state: ManagerState = {
        "supervisor_state": sup_state,
        "weekly_states": []
    }

    # 注意：CompiledStateGraph 没有 run(...) 方法，直接调用 graph(...) 即可
    final_state: ManagerState = graph.invoke(init_manager_state)
