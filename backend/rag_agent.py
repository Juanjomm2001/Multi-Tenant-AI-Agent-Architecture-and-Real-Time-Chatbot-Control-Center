import os
import json
import httpx
import fitz
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from supabase_client import get_supabase_client, get_vector_store

class MultiTenantRAGAgent:
    def __init__(self):
        self.api_key = os.getenv("CAMPUSAI_API_KEY") or "placeholder_key"
        self.api_url = os.getenv("CAMPUSAI_API_URL") or "https://api.placeholder.com/v1"
        self.model_name = os.getenv("CAMPUSAI_MODEL") or "placeholder_model"
        
        self.llm = ChatOpenAI(
            api_key=self.api_key,
            base_url=self.api_url,
            model=self.model_name,
            temperature=0
        )
        
        self.supabase = get_supabase_client()
        self.vector_store = get_vector_store()
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=200)

    def ask(self, tenant_id: str, session_id: str, customer_id: str, query: str, history: list) -> dict:
        # 1. Save user query to Supabase messages
        self._save_message(tenant_id, session_id, customer_id, "user", query)

        # 2. Perform Vector Search filtered by tenant_id
        # Generar embeddings usando el modelo de texto
        from langchain_openai import OpenAIEmbeddings
        embed_model = OpenAIEmbeddings(
            api_key=self.api_key,
            base_url=self.api_url,
            model=os.getenv("CAMPUSAI_EMBED_MODEL", "text-embedding-3-small")
        )
        query_embedding = embed_model.embed_query(query)
        
        # Llamar a Supabase RPC directamente saltándonos el bug de langchain-community
        rpc_response = self.supabase.rpc(
            "match_documents",
            {
                "query_embedding": query_embedding,
                "match_count": 4,
                "filter": {"tenant_id": tenant_id}
            }
        ).execute()

        # Parsear la respuesta en objetos Document
        docs = []
        for row in rpc_response.data:
            docs.append(Document(page_content=row["content"], metadata=row["metadata"]))
            
        context = "\n\n".join(doc.page_content for doc in docs)
        citations = [doc.metadata.get("knowledge_item_id", "unknown") for doc in docs]
        
        # 3. Generate response using LLM
        history_str = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in history]) if history else "No previous context."
        
        prompt = (
            f"You are a helpful and professional AI assistant.\n"
            f"Keep your response concise and direct to the point.\n"
            f"CRITICAL INSTRUCTION: You MUST reply in the EXACT SAME LANGUAGE that the user used in their Question.\n\n"
            f"Answer ONLY from the context below. If you don't know, say you don't know based on the provided documents.\n\n"
            f"Chat History:\n{history_str}\n\n"
            f"Context from Knowledge Base:\n{context}\n\n"
            f"User Question: {query}"
        )
        
        response = self.llm.invoke(prompt)
        answer = response.content
        
        # 4. Save AI response to Supabase messages
        self._save_message(tenant_id, session_id, customer_id, "assistant", answer, citations)

        return {
            "answer": answer,
            "citations": citations
        }

    def _save_message(self, tenant_id: str, session_id: str, customer_id: str, role: str, content: str, citations: list = None):
        """Helper to ensure conversation exists and save the message."""
        # Check if conversation exists
        conv_res = self.supabase.table("conversations").select("id").eq("session_id", session_id).execute()
        
        if not conv_res.data:
            # Create conversation
            data = {"session_id": session_id, "tenant_id": tenant_id}
            if customer_id:
                data["customer_id"] = customer_id
            new_conv = self.supabase.table("conversations").insert(data).execute()
            conv_id = new_conv.data[0]["id"]
        else:
            conv_id = conv_res.data[0]["id"]
            
        # Insert message
        msg_data = {
            "conversation_id": conv_id,
            "role": role,
            "content": content,
            "citations": citations or []
        }
        self.supabase.table("messages").insert(msg_data).execute()

    def ingest_document(self, tenant_id: str, knowledge_item_id: str, file_url: str, metadata: dict):
        """Downloads, chunks and vectorizes a document, saving it to Supabase PGVector."""
        print(f"[Ingest] Iniciando procesamiento de documento: {file_url}")
        try:
            # 1. Download file
            response = httpx.get(file_url, follow_redirects=True, timeout=60.0)
            response.raise_for_status()
            
            content = ""
            
            # 2. Extract text (supports PDF or fallback to raw text)
            if file_url.lower().endswith(".pdf") or "pdf" in metadata.get("contentType", "").lower() or b"%PDF" in response.content[:10]:
                print(f"[Ingest] Detectado PDF. Extrayendo texto...")
                doc = fitz.open(stream=response.content, filetype="pdf")
                for page in doc:
                    content += page.get_text("text") + "\n\n"
            else:
                print(f"[Ingest] Detectado archivo de texto plano.")
                content = response.text
                
            if not content.strip():
                raise ValueError("El documento extraído está vacío.")

            print(f"[Ingest] Vectorizando {len(content)} caracteres...")
            
            # 3. Chunking
            chunks = self.text_splitter.split_text(content)
            docs = []
            for chunk in chunks:
                chunk_meta = metadata.copy()
                chunk_meta["tenant_id"] = tenant_id
                chunk_meta["knowledge_item_id"] = knowledge_item_id
                docs.append(Document(page_content=chunk, metadata=chunk_meta))
                
            # 4. Save to pgvector
            if docs:
                self.vector_store.add_documents(docs)
                
            # 5. Update status to completed
            self.supabase.table("knowledge_items").update({"status": "completed"}).eq("id", knowledge_item_id).execute()
            print(f"[Ingest] Éxito. Documento {knowledge_item_id} vectorizado.")

        except Exception as e:
            print(f"[Ingest] Error durante la vectorización: {e}")
            self.supabase.table("knowledge_items").update({"status": "error"}).eq("id", knowledge_item_id).execute()