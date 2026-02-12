# xFloor Memory SDK Demo (React + Python SDK)

This project now keeps the existing React frontend, but routes all xFloor SDK calls through a Python server that uses the official Python SDK.

## What Changed

- Frontend UI/components are unchanged.
- Browser no longer calls the JavaScript SDK directly.
- A new FastAPI server (`server/main.py`) uses `xfloor_memory_sdk` for all SDK operations.
- Frontend calls server routes under `/memory/*`.

## SDK + Docs

- Python SDK docs: https://docs.xfloor.ai/python-sdk-1930592m0
- SDK source repo (includes Python client): https://github.com/xFloorllm/floor-memory-sdk-client

## Project Structure

```text
.
├── server/
│   ├── main.py                # FastAPI server using xfloor_memory_sdk
│   └── requirements.txt
├── src/
│   ├── components/            # Existing UI components (unchanged behavior)
│   ├── config/
│   │   ├── appConfig.js       # App config + server base path
│   │   └── memoryClient.js    # Frontend adapter to Python server
│   └── services/
│       └── authService.js     # Auth + floor operations via Python server
└── vite.config.js             # Dev proxy for /memory -> localhost:8000
```

## Prerequisites

- Node.js 18+
- Python 3.9+
- `git` (required because Python SDK dependency is installed from GitHub)

## Setup

1. Install frontend dependencies:

```bash
npm install
```

2. Create and activate a Python virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Install server dependencies:

```bash
pip install -r server/requirements.txt
```

## Configuration

### Frontend

Edit `src/config/appConfig.js`:

- `APP_ID` is required.
- `BEARER_TOKEN` is optional if you enter credentials in the app UI.

Optional env override for server base URL:

```bash
# .env
VITE_MEMORY_SERVER_BASE_URL=/memory
```

### Server (optional env vars)

- `XFLOOR_API_BASE_URL` (default: `https://appfloor.in`)
- `CORS_ALLOWED_ORIGINS` (comma-separated, defaults to localhost dev origins)
- `XFLOOR_VERIFY_SSL` (default: `true`)
- `XFLOOR_SSL_CA_CERT` (optional absolute path to CA bundle PEM file)

## Run

Terminal 1 (server):

```bash
source .venv/bin/activate
uvicorn server.main:app --reload --port 8000
```

Terminal 2 (frontend):

```bash
npm run dev
```

Open: `http://localhost:3000`

## Server Endpoints Used by Frontend

- `POST /memory/query`
- `POST /memory/events`
- `GET /memory/recent-events`
- `GET /memory/floors/{floor_id}`
- `POST /memory/floors/{floor_id}/edit`
- `GET /memory/conversations`
- `GET /memory/threads`
- `POST /memory/auth/sign-up`
- `POST /memory/auth/sign-in/email`
- `POST /memory/auth/sign-in/mobile`
- `POST /memory/auth/send-validation-code`

## Notes

- Event ingestion is asynchronous on xFloor; successful create event means accepted/queued.
- If newly added content does not appear immediately in query results, refresh recent events or retry after a short delay.

## SSL Troubleshooting (macOS / Python 3.12)

If you see `CERTIFICATE_VERIFY_FAILED` from the server:

1. Run the macOS certificate installer for your Python build (recommended):

```bash
open "/Applications/Python 3.12/Install Certificates.command"
```

2. Restart the server.

If your environment uses a custom corporate/root CA:

```bash
export XFLOOR_SSL_CA_CERT=/absolute/path/to/ca-bundle.pem
```

Temporary debug-only workaround (not recommended for production):

```bash
export XFLOOR_VERIFY_SSL=false
```
