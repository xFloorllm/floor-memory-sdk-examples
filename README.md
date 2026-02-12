# xFloor Memory SDK Examples (Java, TypeScript, JavaScript, Python)

Consolidated guide for the examples in:
`https://github.com/xFloorllm/floor-memory-sdk-examples/tree/main`

## Repository Layout

- `java/` - React frontend + Java (Spring Boot) backend using Java SDK
- `js/` - React app using JavaScript SDK directly in browser
- `python/` - React frontend + Python (FastAPI) backend using Python SDK
- `ts/` - React + TypeScript app using TypeScript SDK directly in browser

## Common Requirements

- xFloor Bearer token
- xFloor App ID
- Node.js 18+ and npm (all examples use a Vite frontend)

## Java SDK Example

- Path: `java/`
- SDK docs: https://docs.xfloor.ai/java-sdk-1930594m0
- SDK source: https://github.com/xFloorllm/floor-memory-sdk-client/tree/main/java
- SDK artifact: `ai.xfloor.sdk:floor-memory-sdk-client` (see `java/server/pom.xml` for version)

### Run

```bash
cd java
npm install
```

Terminal 1 (Java server):

```bash
npm run dev:server
```

Terminal 2 (frontend):

```bash
npm run dev
```

Open: `http://localhost:3000`

## JavaScript SDK Example

- Path: `js/`
- SDK package: `@xfloor/floor-memory-sdk-js`
- SDK docs: https://docs.xfloor.ai/javascript-sdk-1930593m0
- SDK source: https://github.com/xFloorllm/floor-memory-sdk-client

### Run

```bash
cd js
npm install
npm run dev
```

Before running, configure credentials in `js/src/config/appConfig.js`:

- `BEARER_TOKEN`
- `APP_ID`
- optional `API_BASE_URL` (default `https://appfloor.in`)

## TypeScript SDK Example

- Path: `ts/`
- SDK package: `@xfloor/floor-memory-sdk-ts`
- SDK docs: https://docs.xfloor.ai/typescript-sdk-1930595m0
- SDK source: https://github.com/xFloorllm/floor-memory-sdk-client

### Run

```bash
cd ts
npm install
npm run dev
```

Configure credentials in `ts/src/config/appConfig.ts`:

- `BEARER_TOKEN`
- `APP_ID`
- optional `API_BASE_URL` (default `https://appfloor.in`)

## Python SDK Example

- Path: `python/`
- SDK docs: https://docs.xfloor.ai/python-sdk-1930592m0
- SDK source: https://github.com/xFloorllm/floor-memory-sdk-client
- Server dependency source:
  `git+https://github.com/xFloorllm/floor-memory-sdk-client.git@main#subdirectory=python`

### Run

```bash
cd python
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
```

Terminal 1 (Python server):

```bash
source .venv/bin/activate
uvicorn server.main:app --reload --port 8000
```

Terminal 2 (frontend):

```bash
npm run dev
```

Open: `http://localhost:3000`

## Capabilities Covered Across Examples

- Query conversations with memory context
- Create events (text and/or files)
- Fetch recent events
- View conversation history and threads
- Fetch/edit floor information
- User authentication flows (sign up/sign in/send validation code)

## Notes

- Java and Python examples route browser requests through a backend (`/memory/*` endpoints).
- JS and TS examples call xFloor SDKs directly from the frontend.
- Event ingestion is asynchronous; newly created events may take time before appearing in query results.
