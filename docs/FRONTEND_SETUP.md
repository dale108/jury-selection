# Frontend Setup Guide

## Project Structure

The frontend should be created in a `frontend/` directory at the root of the project:

```
voir-dire/
├── frontend/          ← React + Vite frontend goes here
├── gateway/
├── services/
├── shared/
├── scripts/
└── ...
```

## Manual Setup Steps

Since `npm create vite` can hang, here's how to set it up manually:

### Option 1: Manual Vite Setup (Recommended)

```bash
# Navigate to project root
cd /Users/daleberg/voir-dire

# Create frontend directory
mkdir frontend
cd frontend

# Initialize npm project
npm init -y

# Install Vite and React dependencies
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
npm install react react-dom

# Install additional dependencies we'll need
npm install react-router-dom axios
npm install -D @types/node
```

### Option 2: Use npx with explicit flags

```bash
cd /Users/daleberg/voir-dire
npx --yes create-vite@latest frontend --template react-ts
cd frontend
npm install
```

### Option 3: Clone a template and modify

```bash
cd /Users/daleberg/voir-dire
git clone https://github.com/vitejs/vite.git --depth=1 --branch=main /tmp/vite-template
cp -r /tmp/vite-template/packages/create-vite/template-react-ts frontend
cd frontend
npm install
```

## After Setup

Once the frontend directory is created, you'll need to:

1. **Update `vite.config.ts`** to proxy API requests to the gateway
2. **Configure TypeScript** paths if needed
3. **Set up the project structure** (components, services, types, etc.)

## Recommended Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── sessions/
│   │   ├── jurors/
│   │   ├── audio/
│   │   ├── transcripts/
│   │   └── common/
│   ├── services/
│   │   ├── api.ts
│   │   └── websocket.ts
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Development

Once set up, run the frontend with:

```bash
cd frontend
npm run dev
```

The frontend will typically run on `http://localhost:5173` (Vite's default port).

## Integration with Backend

The frontend will connect to the backend API Gateway at `http://localhost:8000/api`.

Make sure:
- Backend services are running (`docker compose up`)
- CORS is configured in the gateway (already done)
- Frontend proxies API requests correctly

