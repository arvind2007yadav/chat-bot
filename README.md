# 🤖 Batiora AI Chat Agent

An AI-powered conversational assistant that helps customers discover products using  
**LLM reasoning + Tool usage + Vector Search**

Built with:

- Gemini LLM
- LangGraph Agent Workflow
- MongoDB Atlas Vector Search

---

## 🚀 What This Agent Does

When a customer asks:

> "Show me a wooden sofa"

The AI:

1. Understands the intent  
2. Decides whether inventory lookup is needed  
3. Uses a custom tool (`item_lookup`)  
4. Searches MongoDB using:
   - Vector similarity
   - Text fallback  
5. Returns intelligent recommendations  

---

## 🧠 Architecture Overview

```mermaid
flowchart LR

User[Customer Query] --> UI[Chat UI]
UI --> API[API Layer]
API --> Agent[callAgent]

Agent --> LG[LangGraph Workflow]

LG --> LLM[Gemini LLM]

LLM --> Decision{Tool Needed?}

Decision -->|Yes| Tool[item_lookup Tool]
Decision -->|No| Response[Final Response]

Tool --> Vector[MongoDB Vector Search]
Vector --> LG

LG --> Response
Response --> UI
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|------|------------|
| LLM | Gemini |
| Agent Framework | LangGraph |
| Embeddings | Gemini Embeddings |
| Database | MongoDB Atlas |
| Search | Vector + Text |
| Tooling | LangChain Tools |
| State | MongoDB Checkpoint |

---

## 🔄 Agent Tool Loop

```mermaid
sequenceDiagram

participant User
participant Agent
participant Gemini
participant Tool
participant MongoDB

User->>Agent: Ask Furniture Question
Agent->>Gemini: Understand Intent

Gemini->>Agent: Needs Tool

Agent->>Tool: item_lookup(query)
Tool->>MongoDB: Vector Search

MongoDB-->>Tool: Results
Tool-->>Agent: Product Data

Agent->>Gemini: Summarize
Gemini-->>Agent: Final Answer

Agent-->>User: Recommendation
```

---

## 🧩 Core Components

### 1. callAgent()

Main orchestrator that:

- Maintains conversation state
- Runs LangGraph workflow
- Handles retries
- Produces final response

---

### 2. LangGraph Workflow

Handles:

- AI reasoning
- Tool execution
- State persistence

Flow:

```
Agent → Tool → Agent → Final Answer
```

---

### 3. item_lookup Tool

Searches Batiora inventory using:

- Vector similarity search
- Regex fallback search

Returns:

```json
{
  "results": [],
  "searchType": "vector | text",
  "count": 10
}
```

---

### 4. MongoDB Vector Search

Used for:

- Semantic product discovery
- Natural language queries
- Similarity matching

---

## 🧍 Customer Journey

```mermaid
journey
    title Customer Journey with Batiora AI
    section Discovery
      Visit Website: 5: Customer
      Opens Chat: 5: Customer
    section Interaction
      Ask Product Question: 5: Customer
      AI Understands Need: 5: AI
    section Intelligence
      AI Searches Inventory: 5: AI
      Matches Products: 5: AI
    section Outcome
      AI Recommends: 5: AI
      Customer Buys / Explores: 5: Customer
```

---

## 📁 Project Flow

```mermaid
flowchart TD

Frontend --> API
API --> callAgent
callAgent --> LangGraph
LangGraph --> Gemini
Gemini --> ToolDecision

ToolDecision -->|Yes| item_lookup
item_lookup --> MongoDB_Vector_Search
MongoDB_Vector_Search --> LangGraph

ToolDecision -->|No| FinalResponse
LangGraph --> FinalResponse
```

---

## 🛠 Setup

### 1. Install dependencies

```bash
npm install
```

---

### 2. Add environment variables

Create `.env`

```
GOOGLE_API_KEY=your_key
GOOGLE_CHAT_MODEL=gemini-2.5-flash
GOOGLE_EMBEDDING_MODEL=gemini-embedding-001
```

---

### 3. Run

```bash
npm run dev
```

---

## 🔮 Future Enhancements

- Multi-tool support  
- Order placement agent  
- Pricing intelligence  
- Conversational checkout  

---

## 🏷 Use Cases

- E-commerce chat assistant  
- Inventory discovery  
- Product recommendation engine  
- AI sales assistant  

---

## 🏁 Outcome

This project enables:

- Natural language product search  
- Intelligent inventory lookup  
- AI-powered recommendations  
- Tool-based reasoning  

---
