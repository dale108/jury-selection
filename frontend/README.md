# Voir Dire Frontend

React + TypeScript + Vite frontend for the voir-dire application.

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173` and proxy API requests to `http://localhost:8000`.

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   ├── services/       # API and WebSocket clients
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── package.json
├── vite.config.ts
└── tsconfig.json
```

