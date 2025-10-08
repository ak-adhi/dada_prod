from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from llm_manager import LLMManager

app = FastAPI()
llm = LLMManager()

@app.get("/health/{model}")
async def health(model: str):
    healthy = await llm.health(model)
    if not healthy:
        raise HTTPException(status_code=503, detail=f"{model} is unavailable")
    return {"model": model, "healthy": True}

@app.post("/query/{model}")
async def query(model: str, payload: dict):
    prompt = payload.get("prompt", "")
    response = await llm.get_response(model, prompt)
    return {"response": response}

@app.post("/stream/{model}")
async def stream(model: str, payload: dict):
    prompt = payload.get("prompt", "")
    async def event_generator():
        async for chunk in llm.stream_response(model, prompt):
            yield f"data: {chunk}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")
