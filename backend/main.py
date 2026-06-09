from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from rag_agent import MultiTenantRAGAgent

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SaaS Multi-Tenant RAG API")

# Add CORS middleware to allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (change to specific domains in production)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods including OPTIONS
    allow_headers=["*"],
)
rag_agent = MultiTenantRAGAgent()

class ChatRequest(BaseModel):
    tenant_id: str
    session_id: str
    customer_id: Optional[str] = None
    query: str
    history: List[Dict[str, Any]] = []

@app.post("/api/v1/chat")
def chat_endpoint(request: ChatRequest):
    result = rag_agent.ask(
        tenant_id=request.tenant_id,
        session_id=request.session_id,
        customer_id=request.customer_id,
        query=request.query,
        history=request.history
    )
    return result

class IngestRequest(BaseModel):
    tenant_id: str
    knowledge_item_id: str
    file_url: str
    metadata: dict = {}

@app.post("/api/v1/ingest")
def ingest_endpoint(request: IngestRequest, background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(
            rag_agent.ingest_document,
            tenant_id=request.tenant_id,
            knowledge_item_id=request.knowledge_item_id,
            file_url=request.file_url,
            metadata=request.metadata
        )
        return {"status": "processing", "message": "Document ingestion started in the background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Note: We removed the /admin/ endpoints because the Next.js Dashboard 
# will fetch data (chats, documents, tenants) directly from Supabase using the JS client.
