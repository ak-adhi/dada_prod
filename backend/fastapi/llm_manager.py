import httpx
from typing import AsyncGenerator

class LLMManager:
    """Handles multiple LLM endpoints."""
    def __init__(self, llm_map: dict = None):
        # llm_map maps model name to its Docker service URL
        self.llm_map = llm_map or {
            "mistral_7b": "http://mistral_7b:8080",
            # add more here later
        }

    async def health(self, model: str) -> bool:
        base_url = self.llm_map.get(model)
        if not base_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{base_url}/health")
                return resp.status_code == 200
        except Exception:
            return False

    async def get_response(self, model: str, prompt: str) -> str:
        base_url = self.llm_map.get(model)
        async with httpx.AsyncClient(timeout=120) as client:
            payload = {"prompt": prompt, "temperature": 0.7}
            resp = await client.post(f"{base_url}/completion", json=payload)
            data = resp.json()
            return data.get("content", "")

    async def stream_response(self, model: str, prompt: str) -> AsyncGenerator[str, None]:
        base_url = self.llm_map.get(model)
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"{base_url}/completion", json={"prompt": prompt, "stream": True}) as resp:
                async for line in resp.aiter_lines():
                    if line.strip():
                        yield line