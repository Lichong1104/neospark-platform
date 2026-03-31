# local_oauth_proxy.py
# 本地 OAuth 代理 — 将 localhost:9100 的请求透传到远程服务器
# 用法: pip install httpx fastapi uvicorn && python local_oauth_proxy.py

import httpx
import uvicorn
import logging
from fastapi import FastAPI, Request
from fastapi.responses import Response

TARGET = "http://116.204.67.82:9100"

# 服务器 FRONTEND_BASE_URL 是 3001，本地前端跑在 3000，按需重写
LOCAL_FRONTEND_PORT = "3000"
SERVER_FRONTEND_PORT = "3001"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("proxy")

app = FastAPI()

HOP_BY_HOP = {"host", "content-length", "transfer-encoding", "connection", "keep-alive"}


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
)
async def proxy(request: Request, path: str):
    url = f"{TARGET}/{path}"
    if request.url.query:
        url += f"?{request.url.query}"

    req_headers = {
        k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP
    }

    async with httpx.AsyncClient(follow_redirects=False, timeout=30.0) as client:
        resp = await client.request(
            method=request.method,
            url=url,
            headers=req_headers,
            content=await request.body(),
        )

    # 使用 multi_items 保留多个 set-cookie
    resp_header_list = [
        (k, v)
        for k, v in resp.headers.multi_items()
        if k.lower() not in {"transfer-encoding", "connection"}
    ]

    # 重写前端端口
    if LOCAL_FRONTEND_PORT != SERVER_FRONTEND_PORT:
        resp_header_list = [
            (k, v.replace(f"localhost:{SERVER_FRONTEND_PORT}", f"localhost:{LOCAL_FRONTEND_PORT}"))
            if k.lower() == "location" else (k, v)
            for k, v in resp_header_list
        ]

    response = Response(content=resp.content, status_code=resp.status_code)
    response.raw_headers = [(k.encode(), v.encode()) for k, v in resp_header_list]
    return response


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9100)
