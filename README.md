# App Scaffold

## Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + React Query
- **Backend**: Node.js + TypeScript + Fastify
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **ORM**: Prisma
- **Future Desktop**: Electron

## Getting Started

### 1. Install dependencies
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Environment variables
Copy `.env.example` to `.env` in both `frontend/` and `backend/` and fill in your Supabase credentials.

### 3. Run dev servers
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```
