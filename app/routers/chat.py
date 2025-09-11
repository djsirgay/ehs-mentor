from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.ai.bedrock_client import chat as bedrock_chat

router = APIRouter()

class ChatIn(BaseModel):
    prompt: str

@router.post("/chat")
def chat_endpoint(payload: ChatIn):
    try:
        reply = bedrock_chat(payload.prompt)
        return {"reply": reply}
    except Exception as e:
        # Чтобы не падать 500 без объяснения
        raise HTTPException(status_code=500, detail=str(e))
