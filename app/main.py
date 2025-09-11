from fastapi import FastAPI
from app.routers import recommend, assignments, chat, documents, upload

app = FastAPI(title="EHS Mentor")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(recommend.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
