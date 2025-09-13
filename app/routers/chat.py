from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.ai.bedrock_client import chat as bedrock_chat

router = APIRouter()

class ChatIn(BaseModel):
    message: str

@router.post("/chat/reply")
def chat_reply(payload: ChatIn):
    try:
        reply = bedrock_chat(payload.message)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
