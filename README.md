# Moswords Monorepo

Full-stack messaging platform scaffold with AI co-pilot, realtime presence, media dashboard, and plugin-ready architecture.

## Project structure

```
.
├── client/   # React + Vite frontend
└── server/   # Express + Socket.IO backend
```

## Getting started

### Prerequisites

- Node.js 18+
- npm 9+

### Environment variables

Create `.env` files at the repo root or inside each package using the template below:

```
PORT=5000
MONGO_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=supersecret
OPENAI_KEY=sk-...
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
ALLOWED_ORIGIN=http://localhost:5173
```

### Install dependencies

```
npm install --prefix server
npm install --prefix client
```

### Run in development

From the repository root:

```
npm run dev
```

Or run each service individually:

```
npm run dev --prefix server
npm run dev --prefix client
```

### Production builds

```
npm run build --prefix client
```

The backend is ready for deployment on Render/Railway. The frontend is Vercel-friendly.

## Docker Compose

A reference `docker-compose.yml` is included for local orchestration (MongoDB, Redis, MinIO-compatible S3).

## File dashboard highlights

- Upload multiple assets with optional Sharp-powered optimization (10–100% quality slider or keep originals).
- Stream progress updates over Socket.IO so collaborators can track uploads in real time.
- Filter by personal library, channel, DM, or media type and download curated selections as a ZIP archive.
- Remove assets you own (or as an admin) with signed URLs that expire hourly for safer sharing.

## Testing

Add your preferred test runner (Jest, Vitest, etc.) as the project evolves.

## License

MIT
