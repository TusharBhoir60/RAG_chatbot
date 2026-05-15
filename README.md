# 🤖 RAG Chatbot

![Architecture](https://img.shields.io/badge/Architecture-RAG-blue)
![Frontend](https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js)
![Backend](https://img.shields.io/badge/Backend-Python-3776AB?logo=python&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

An advanced, full-stack Retrieval-Augmented Generation (RAG) chatbot designed to ingest, process, and converse intelligently about your PDF documents. Built with a robust Python backend and a sleek, responsive Next.js frontend.

## ✨ Features

- **📄 PDF Ingestion & Validation:** Upload and process PDF documents with built-in validation.
- **🧠 Context-Aware Conversations:** Utilizes RAG to ground LLM responses in your specific documents.
- **💬 Real-time Chat Interface:** A streamlined, interactive UI mimicking modern chat applications.
- **📈 Streaming Responses:** Experience low-latency, token-by-token text streaming.
- **🗄️ Chat History:** Persists chat sessions using SQLite for easy retrieval later.
- **🐳 Dockerized:** Fully containerized with Docker Compose for seamless deployment and scaling.

## 🏗️ Architecture & Tech Stack

### Frontend (`/frontend`)
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** CSS / PostCSS (Tailwind compatible UI components)
- **Features:** Custom hooks (`useChatStream`), Toast notifications, Command Palette

### Backend (`/app`)
- **Language:** Python
- **Architecture:** Modular components (`ingestion`, `llm`, `retrieval`, `db`, `evaluation`)
- **Database:** SQLite (`/data/db/ragbot.sqlite3`) for conversation history
- **Document Storage:** Local file system (`/data/pdfs/`) 

### DevOps (`/docker`)
- **Orchestration:** Docker Compose

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- Docker & Docker Compose (optional, for containerized deployment)

### Local Development Setup

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/RAG_chatbot.git
cd RAG_chatbot
```

#### 2. Backend Setup
```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (assuming a requirements.txt exists or via pip)
pip install -r requirements.txt

# Start the API server
python app/api/main.py # Or uvicorn app.api.main:app --reload
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### 🐳 Docker Deployment

To run the entire stack using Docker:

```bash
docker-compose up --build
```

## 📁 Project Structure

```text
RAG_chatbot/
├── app/                  # Python Backend application code
│   ├── api/              # API endpoints (e.g., FastAPI)
│   ├── core/             # Core configurations & PDF validation
│   ├── db/               # SQLite session & history management
│   ├── ingestion/        # Document processing & chunking
│   ├── llm/              # LLM integration logic
│   ├── rag/              # RAG pipeline execution
│   └── retrieval/        # Vector search & retrieval modules
├── data/                 # Data storage (SQLite DB, PDFs)
├── docker/               # Docker configuration files
├── frontend/             # Next.js Frontend application
│   ├── src/app/          # Next.js App router pages
│   ├── src/components/   # Reusable UI components (Chat, Layout, UI)
│   └── src/hooks/        # Custom React hooks (useChatStream)
└── tests/                # Test suites
```

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Built with ❤️ by [Your Name/Handle]*
