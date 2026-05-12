<div align="center">

```
██████╗  █████╗  ██████╗     ██████╗██╗  ██╗ █████╗ ████████╗██████╗  ██████╗ ████████╗
██╔══██╗██╔══██╗██╔════╝    ██╔════╝██║  ██║██╔══██╗╚══██╔══╝██╔══██╗██╔═══██╗╚══██╔══╝
██████╔╝███████║██║  ███╗   ██║     ███████║███████║   ██║   ██████╔╝██║   ██║   ██║   
██╔══██╗██╔══██║██║   ██║   ██║     ██╔══██║██╔══██║   ██║   ██╔══██╗██║   ██║   ██║   
██║  ██║██║  ██║╚██████╔╝   ╚██████╗██║  ██║██║  ██║   ██║   ██████╔╝╚██████╔╝   ██║   
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═════╝  ╚═════╝    ╚═╝   
```

# Full-Stack RAG Chatbot
### Enterprise-grade Document Intelligence 
**A complete, production-ready Retrieval-Augmented Generation system**  
**with real-time streaming, chat history, and semantic PDF retrieval.**

<br/>

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=for-the-badge&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-DB-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Status](https://img.shields.io/badge/Status-In%20Development-FFB800?style=for-the-badge)

<br/>

<img src="https://img.shields.io/badge/Architecture-RAG%20Pipeline-00D4FF?style=flat-square"/>
<img src="https://img.shields.io/badge/Latency-Streaming-00FF88?style=flat-square"/>
<img src="https://img.shields.io/badge/Database-SQLite-00D4FF?style=flat-square"/>
<img src="https://img.shields.io/badge/Vector%20Search-Semantic-00D4FF?style=flat-square"/>
<img src="https://img.shields.io/badge/Deployment-Containerized-FF4444?style=flat-square"/>

</div>

---

## What This Is

Interacting with long, complex PDF documents requires more than just standard keyword search. This project provides a complete **Retrieval-Augmented Generation (RAG) system** that acts as an intelligent assistant, grounding its answers directly in your uploaded documents. 

By chunking, embedding, and storing text inside a high-speed retrieval system, the LLM reads exactly the right paragraphs before formulating a response. With a robust Python backend and a highly responsive Next.js frontend, this project bridges the gap between raw data and actionable AI insights.

> **Note:** This project is designed to be easily extensible. You can plug in any LLM provider (OpenAI, Anthropic, local models) or vector database based on your scaling needs.

---

## Demo

The frontend mimics modern conversational interfaces, keeping track of conversation history and displaying citations or sources alongside the generated responses.

```
┌─────────────────────────────────────────────────────────────────────┐
│  RAG Chatbot          [● CONNECTED]             [Upload PDF 📄]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User 👤: Can you summarize the findings on page 14?                │
│                                                                     │
│  AI 🤖: Based on the provided document, the key findings are:       │
│  1. Overall efficiency increased by 22%                             │
│  2. Latency dropped to < 200ms                                      │
│                                                                     │
│  [Source: Annual_Report.pdf - Page 14]                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Message...                                             [ Send 🚀 ] │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 14 + React)             │
│   ChatUI  ·  Streaming Hooks  ·  Command Palette  · Layout  │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket / HTTP Stream
┌────────────────────────▼────────────────────────────────────┐
│                      API LAYER (FastAPI)                    │
│   Chat router  ·  File upload hooks  ·  History Endpoints   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    RAG PIPELINE (Python)                    │
│                                                             │
│   Document Ingestion            LLM Integration             │
│   (PDF Parsing/Chunking)        (Prompting & Generation)    │
│            │                             ▲                  │
│            ▼                             │                  │
│  Vector Retrieval Engine ───────────────┘                   │
│  (Semantic text embedding search)                           │
└───────────┬──────────────────────────────┬──────────────────┘
            │                              │
┌───────────▼─────────┐        ┌───────────▼───────────┐
│     SQLITE DB       │        │    FILE STORAGE       │
│   (ragbot.sqlite3)  │        │   (/data/pdfs)        │
│   Chats, Prompts    │        │   Raw Documents       │
└─────────────────────┘        └───────────────────────┘
```

---

## Project Structure

```
RAG_chatbot/
│
├── app/                            # Python Backend
│   ├── api/main.py                 # FastAPI Application 
│   ├── core/                       # App configuration, validation
│   ├── db/                         # Relational database (SQLite/SQLAlchemy)
│   ├── ingestion/                  # Doc parsers, chunking strategies
│   ├── retrieval/                  # Vector indexing and search
│   ├── llm/                        # LLM provider connections
│   ├── rag/pipeline.py             # Main execution orchestrator
│   └── evaluation/                 # Accuracy & performance testing
│
├── frontend/                       # Web Frontend
│   ├── src/app/                    # Next.js App Router (Pages, CSS)
│   ├── src/components/             # UI Components (Chat list, Sidebar)
│   ├── src/hooks/useChatStream.ts  # Custom logic for token streaming
│   ├── src/lib/                    # API clients, utilities
│   └── package.json                # Node dependencies
│
├── data/                           # Persistence Layer
│   ├── db/ragbot.sqlite3           # Local SQLite instance
│   └── pdfs/                       # Uploaded document artifacts
│
├── docker/                         # Containerization
│   └── docker-compose.yml          # Stack orchestration
│
└── tests/                          # Automated backend testing
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js, React, Tailwind | Highly interactive chat UI with streaming |
| Backend | Python 3.9+, FastAPI | High performance async API & logic pipeline |
| Persistence | SQLite | Session state and conversation history |
| Orchestration | Docker Compose | One-click localized deployment |
| Architecture | RAG (Retrieval-Augmented Generation) | Semantic knowledge injection for LLMs |

---

## The RAG Process

| Component | Design |
|---|---|
| **Ingestion** | Parses PDF files, strips artifacts, layout-aware splitting. |
| **Embedding** | Chunks are converted into dense embeddings (e.g. text-embedding-ada-002, local MPNet). |
| **Retrieval** | Top-K similarity search to find the chunks most relevant to the user query. |
| **Generation** | The retrieved context is stuffed into a secure LLM prompt alongside the user message. |
| **Streaming** | Generator yields text token-by-token directly to the React frontend UI. |

---

## Setup

### Prerequisites

```bash
Python 3.9+
Node.js 18+
Docker & Compose (Optional)
```

### Option 1: Docker Deployment (Recommended)

```bash
git clone https://github.com/your-username/RAG_chatbot.git
cd RAG_chatbot

docker-compose -f docker/docker-compose.yml up --build
```
> The Frontend will launch at `http://localhost:3000` and the API at `http://localhost:8000`.

### Option 2: Manual Local Setup

#### Backend

```bash
# From project root
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt

# Start FastAPI server
python app/api/main.py
```

#### Frontend

```bash
# New terminal
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend connects to the local backend automatically.

---

## Key Design Decisions

**Why Next.js & React?**  
Next.js provides an incredibly robust foundation for real-time web applications. Handling Server-Sent Events (SSE) or WebSockets for token streams provides a snappy user experience.

**Why custom SQLite instead of managed DBs?**  
To keep the barrier to entry low. Utilizing SQLite means the tool is fully contained locally and ensures privacy. It can easily swap to PostgreSQL or MySQL via SQLAlchemy configuration.

**How does streaming work?**  
The Python backend uses asynchronous generators to incrementally return responses from the LLM. The frontend’s `useChatStream` hook processes these chunks in real-time, avoiding the 10-30 second "hang" normally associated with large generation tasks.

---

## Roadmap

- [x] Initial FastAPI routing architecture
- [x] Next.js frontend with Tailwind and layout blocks
- [x] RAG ingestion, PDF splitting, and text cleaning
- [x] Chat interface with basic messaging
- [ ] SSE or WebSocket streaming token integration
- [ ] Vector database integration (ChromaDB / Qdrant)
- [ ] SQLite session memory and history retention
- [ ] Docker environment complete setup
- [ ] Automated evaluation pipelines
- [ ] Multi-document semantic search support

---

## Requirements

```
# Core backend requirements (from inference to execution)
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
langchain>=0.1.0
pydantic>=2.0.0
sqlalchemy>=2.0.0
python-multipart
```

---

<div align="center">

**RAG Chatbot · AI System · Next.js + Python**  
*Enterprise Document Intelligence Engine*

</div>
