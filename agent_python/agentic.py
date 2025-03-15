from openai import OpenAI
import os
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


try:
    res = client.chat.completions.create(model="gpt-3.5-turbo",   # 先用 gpt-3.5-turbo 测试最基本功能
    messages=[{"role": "user", "content": "你好，测试一下 API"}])
    print("OpenAI 调用成功！结果：", res)
except Exception as e:
    print("OpenAI 调用失败：", e)
