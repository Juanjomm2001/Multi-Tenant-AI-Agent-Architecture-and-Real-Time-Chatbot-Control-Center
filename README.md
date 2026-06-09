# OmniChannel Multi-Tenant AI Agent Architecture and Real-Time Chatbot Control Center

This enterprise-grade codebase contains the complete multi-tenant AI system architecture designed for context-aware customer interaction, dynamic lead generation, and real-time conversational auditing. Built to serve modern e-commerce environments, it integrates a client-facing conversational interface with a comprehensive administration dashboard to manage, analyze, and optimize customer journeys.

The system is structured into two core components:
1. **Frontend (/frontend)**: A production-ready Next.js application built with Tailwind CSS, utilizing a premium responsive layout tailored for organic/bio brands. It features automated light/dark themes, an interactive onboarding funnel for lead capture, and a live agent simulation interface.
2. **Backend (/backend)**: A high-performance FastAPI service orchestrated with LangChain and Supabase. It implements a multi-tenant PGVector database framework to partition knowledge bases, store chat histories, capture analytics, and ingest client documents asynchronously.

---

## Prerequisites

Ensure you have the following software installed:
- Node.js (v18 or higher) and npm
- Python (v3.10 or higher) and pip
- An active Supabase instance with the pgvector extension enabled.

---

## Local Development Setup

### 1. Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install the required dependencies:
   ```bash
   python -m venv venv
   # On Windows (PowerShell/CMD)
   .\venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate

   pip install -r requirements.txt
   ```
3. Set up your environment variables. Create a `.env` file in the `backend/` directory referencing `.env.example`:
   ```env
   CAMPUSAI_API_KEY="your-api-key"
   CAMPUSAI_API_URL="https://api.campus.ai/v1"
   CAMPUSAI_MODEL="gpt-4o"
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   SUPABASE_DB_URL="postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"
   ```
4. Start the local server:
   ```bash
   python -m uvicorn main:app --reload
   ```
   The API will be live at `http://127.0.0.1:8000`.

---

### 2. Frontend (Next.js)
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Set up your client environment variables. Create a `.env.local` file in the `frontend/` directory using `.env.example` as a template:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   NEXT_PUBLIC_PYTHON_API_URL="http://127.0.0.1:8000"
   NEXT_PUBLIC_DEMO_TENANT_ID="your-demo-tenant-id"
   ```
4. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000/demo`.

---

## Environment Variables and Security

The root `.gitignore` file is configured to prevent all `.env` and `.env.local` files from being tracked in git history. This protects sensitive developer API keys, database connection strings, and service role keys. 

Do not force-add or bypass these restrictions in your commits.

---

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI router and API endpoints
│   ├── rag_agent.py         # Multi-tenant LangChain RAG agent logic
│   ├── supabase_client.py   # Supabase client setup and PGVector store configuration
│   ├── init_schema.sql      # Supabase database schema definitions (SQL)
│   └── requirements.txt     # Python requirements
│
├── frontend/
│   ├── app/
│   │   ├── demo/
│   │   │   └── page.tsx     # Client-facing interactive demo chat interface
│   │   └── dashboard/       # Lead capture and conversation audit dashboard
│   ├── components/          # Reusable Next.js UI elements
│   └── package.json         # Node.js configuration and dependencies
│
└── .gitignore               # Root level ignore rules for Git version control
```
