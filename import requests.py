import requests
import json
import time

# ======== 修改这里 ========
API_URL = "https://llm.chutes.ai/v1/chat/completions"  # 你的chutes endpoint
API_KEY = "cpk_724fa280b3254bfbae113acab68373e5.222def67407b56dea6d82490041412aa.COLX5INUpTaXlSl3p9KAHQAukvEXF2hY"

payload = {
    "model": "openai/gpt-oss-120b-TEE",   # 按你实际模型改
    "messages": [
        {"role": "user", "content": "Say hello"}
    ],
    "temperature": 0.7
}

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
# ==========================

start = time.time()

try:
    response = requests.post(
        API_URL,
        headers=headers,
        json=payload,
        timeout=30
    )

    print("Status:", response.status_code)
    print("Time:", round(time.time() - start, 2), "s")

    # 优先打印原始内容（Chutes报错很重要）
    print("\nRaw Response:")
    print(response.text)

    # 如果是JSON再美化
    try:
        data = response.json()
        print("\nFormatted JSON:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except:
        pass

except Exception as e:
    print("Error:", e)