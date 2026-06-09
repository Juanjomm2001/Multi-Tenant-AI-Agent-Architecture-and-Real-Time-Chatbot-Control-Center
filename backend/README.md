# E-Commerce Hybrid AI Chatbot with Admin Dashboard (s240451)

## Description of the Project

[Cosechados](https://www.cosechados.es/) is an innovative online greengrocer dedicated to delivering fresh, high-quality agricultural products directly from farmers to consumers. As their operations grew, Cosechados needed a reliable tool to answer customer frequently asked questions (FAQs) and provide real-time information about orders, products, and stock availability.



To achieve accurate answering without hallucinations, we developed a **Hybrid AI Assistant**. The system uses an intelligent LLM Router to classify user queries and route them to the most appropriate data engine:
- **RAG (Retrieval-Augmented Generation)**: Used for unstructured queries like company history, return policies, or farmer biographies.
- **SQL (Relational Database)**: Used for exact, deterministic queries regarding product prices, origins, and stock levels to ensure zero hallucinations.
- **Hybrid (Both)**: Used when a query requires context from both the company's background and real-time inventory.

However, the management explicitly requested to avoid a simple "black box" AI system. They needed a transparent, easily monitorable solution. For this reason, a **Core feature of this project is the Admin Dashboard**. This dedicated control panel allows the Cosechados team to:
- Monitor and audit all customer-agent conversations in real-time.
- Easily view the underlying data sources (PDFs and Databases) feeding the RAG system.
- Analyze customer intents to better understand what products or features their clients are looking for.

## System Architecture

The system is designed as a modular, API-driven architecture consisting of the following components:
1. **Frontend (Streamlit)**: A web interface providing a Chat UI for end-users and an Admin Dashboard for managers to view conversation logs, available files, and live inventory.
2. **Backend API (FastAPI)**: A RESTful API that handles chat requests, logs conversations into a database, and serves admin data.
3. **AI Engine (LangChain + CampusAI)**:
   - **Router**: Uses the `Gemma 4` model to decide whether to query ChromaDB, SQLite, or both.
   - **Vector Store (ChromaDB)**: Ingests PDFs using PyMuPDF and `Nomic Embed Text` embeddings.
   - **Structured Data (SQLite)**: Stores real-time inventory and chat logs.

## How to Run

Before running, make sure to copy the `.env.example` file to `.env` and add your `CAMPUSAI_API_KEY`:
```bash
cp .env.example .env
```

### Option A: Run Locally (Development)

You will need to open two separate terminals.

**Terminal 1 (Backend):**
```powershell
# Initialize the databases (SQLite and ChromaDB)
python init_db.py

# Start the FastAPI server
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 (Frontend):**
```powershell
# Start the Streamlit application
python -m streamlit run app.py
```
The app will be available at `http://localhost:8501`.

### Option B: Run via Docker (Production)

**1. Build the Docker Image**
```powershell
docker build -t cosechados-ai .
```

**2. Run the Container**
```powershell
docker run --rm -p 8000:8000 -p 8501:8501 --env-file .env cosechados-ai
```
The UI will be available at `http://localhost:8501` and the API docs at `http://localhost:8000/docs`.

## API Documentation

The backend exposes the following endpoints (available via Swagger UI at `/docs`):

- **`POST /api/v1/chat`**
  - **Description**: Submits a user query to the hybrid agent.
  - **Body**: `{"query": "string", "session_id": "string", "history": []}`
  - **Returns**: The generated answer, source citations, and the tool used (`rag`, `inventory`, or `both`).

- **`GET /api/v1/admin/logs`**
  - **Description**: Retrieves all recorded chat sessions.
  - **Returns**: A list of objects containing `session_id`, `timestamp`, `user_query`, `bot_response`, and `tool_used`.

- **`GET /api/v1/admin/inventory`**
  - **Description**: Retrieves the current stock and pricing information.
  - **Returns**: A list of available products with origins, price per kg, and stock.

- **`GET /api/v1/admin/files`**
  - **Description**: Lists the PDF documents currently loaded into the RAG system.

## Description of Dataset

The system relies on a hybrid dataset:
1. **Unstructured Data (PDFs)**: Documents placed in the `data/` folder (e.g., `Cosechados Info.pdf`) containing company history, return policies, and farmer profiles. These are chunked and vectorized at runtime.
2. **Structured Data (SQLite)**: An `inventory.db` database automatically seeded at startup with agricultural products (e.g., Melon, Honey, Tomato), including their origin (e.g., Tomelloso, Spain), price per kg, and current stock level. 

## Evaluation and Results

The system was evaluated using both qualitative testing and automated unit tests to ensure reliability and robustness.

### Qualitative Evaluation
The LLM Router successfully distinguishes between different types of intents:
1. **RAG Queries**: When asked *"What is the return policy?"*, the router explicitly selects the `rag` tool, searches the PDF embeddings, and provides a factual summary without touching the SQL database.
2. **SQL/Inventory Queries**: When asked *"How much is the Honey and how much stock do we have?"*, the router selects the `inventory` tool, extracts "Honey", executes a SQL query `SELECT * FROM inventory WHERE product_name LIKE '%Honey%'`, and calculates the exact price without hallucinating numbers.
3. **Hybrid Queries**: When asked *"Tell me about David and the Tomato stock"*, the router selects `both`, pulling David's biography from the Vector DB and the live Tomato stock from SQLite, successfully merging them into a coherent answer.

### Quantitative / Automated Evaluation
We implemented a comprehensive test suite (`test_main.py`) using `pytest` and FastAPI's `TestClient`. 
- **API Tests**: Validates the correct structure and HTTP status codes of all admin endpoints (`/logs`, `/inventory`, `/files`).
- **Mocked LLM Tests**: To prevent unnecessary API credit consumption, the `/chat` endpoint tests utilize `pytest-mock` to intercept LLM calls, ensuring the routing logic and database logging mechanisms work perfectly under load.
