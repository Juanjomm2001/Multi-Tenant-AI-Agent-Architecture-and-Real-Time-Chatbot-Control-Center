import os
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_openai import OpenAIEmbeddings

load_dotenv(override=True)

# Supabase REST API credentials (for Auth, Storage, and basic CRUD)
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")

# Supabase Postgres connection string (for PGVector / langchain-postgres)
# Example: postgresql://postgres:password@db.project.supabase.co:5432/postgres
POSTGRES_URL = os.getenv("SUPABASE_DB_URL")
if POSTGRES_URL:
    if POSTGRES_URL.startswith("postgresql://"):
        POSTGRES_URL = POSTGRES_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    
    # Supabase self-hosted external connections often fail if sslmode is not explicitly defined
    if "?" not in POSTGRES_URL:
        POSTGRES_URL += "?sslmode=disable"
    elif "sslmode" not in POSTGRES_URL:
        POSTGRES_URL += "&sslmode=disable"

def get_supabase_client() -> Client:
    """Returns the Supabase REST client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase credentials not found in environment variables.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_vector_store() -> SupabaseVectorStore:
    """Returns the PGVector store connected to Supabase Postgres."""
    if not POSTGRES_URL:
        raise ValueError("SUPABASE_DB_URL not found in environment variables.")
        
    api_key = os.getenv("CAMPUSAI_API_KEY") or "placeholder_key"
    api_url = os.getenv("CAMPUSAI_API_URL") or "https://api.placeholder.com/v1"
    embed_model_name = os.getenv("CAMPUSAI_EMBED_MODEL") or "text-embedding-3-small"
    
    embeddings = OpenAIEmbeddings(
        api_key=api_key,
        base_url=api_url,
        model=embed_model_name
    )
    
    # We use langchain_community SupabaseVectorStore which works over HTTPS (port 443)
    vector_store = SupabaseVectorStore(
        client=get_supabase_client(),
        embedding=embeddings,
        table_name="documents",
        query_name="match_documents"
    )
    return vector_store

