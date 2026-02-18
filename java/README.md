# xFloor Memory SDK Demo Java

This project keeps the existing React frontend and routes all xFloor calls through a Java server built on the official Java SDK.

## What Changed

- Frontend UI/components are unchanged.
- Browser no longer calls SDKs directly.
- `server/` now contains a Spring Boot backend that calls the xFloor Java SDK.
- Frontend calls backend routes under `/memory/*`.

## SDK + Docs

- Java SDK docs: https://docs.xfloor.ai/java-sdk-1930594m0
- Java SDK source: https://github.com/xFloorllm/floor-memory-sdk-client/tree/main/java
- Maven artifact used by server: `ai.xfloor.sdk:floor-memory-sdk-client:1.0.9`

## Updating SDK Version

If the Java SDK version changes, update this project in this order:

1. Update dependency version in `server/pom.xml`:

```xml
<dependency>
  <groupId>ai.xfloor.sdk</groupId>
  <artifactId>floor-memory-sdk-client</artifactId>
  <version>NEW_VERSION</version>
</dependency>
```

2. If you built SDK locally (not yet published), install it to local Maven cache first:

```bash
cd /path/to/floor-memory-sdk-client/java/server
mvn clean install -DskipTests
```

3. Rebuild this backend with the new SDK:

```bash
npm run dev:server -- clean package
```

4. Restart the Java server:

```bash
npm run dev:server
```

5. Verify startup and a quick endpoint call (for example, credentials flow / floor info fetch).

6. Update this README artifact line to match the actual version in `server/pom.xml`.

## Project Structure

```text
.
├── server/
│   ├── pom.xml
│   └── src/main/java/...      # Spring Boot server using floor-memory-sdk-client
├── src/
│   ├── components/            # Existing UI components (unchanged behavior)
│   ├── config/
│   │   ├── appConfig.js       # App config + server base path
│   │   └── memoryClient.js    # Frontend adapter to backend routes
│   └── services/
│       └── authService.js     # Auth + floor operations via backend routes
└── vite.config.js             # Dev proxy for /memory and /health -> localhost:8000
```

## Prerequisites

- Node.js 18+ (includes `npm`)
- Java 17+ (`JAVA_HOME` recommended)
- A Maven runtime:
  - Maven 3.8+ available as `mvn`, or
  - the bundled Maven Wrapper under `server/` (`mvnw` / `mvnw.cmd`)
- Internet access on first run (to download npm packages and Maven dependencies)

If Maven is installed but not available as `mvn`, set Maven path (macOS/Linux):

```bash
export MAVEN_HOME=/absolute/path/to/apache-maven-3.9.x
export PATH="$MAVEN_HOME/bin:$PATH"
```

Set Maven path (Windows PowerShell):

```powershell
$env:MAVEN_HOME="C:\apache-maven-3.9.x"
$env:Path="$env:MAVEN_HOME\bin;$env:Path"
```

Set Maven path (Windows cmd):

```cmd
set MAVEN_HOME=C:\apache-maven-3.9.x
set PATH=%MAVEN_HOME%\bin;%PATH%
```

You can persist these in your shell profile (`~/.zshrc`, `~/.bashrc`, PowerShell profile, or system/user environment variables).
When running `npm run dev:server`, if `mvn` is unavailable the launcher automatically falls back to Maven Wrapper (`mvnw`/`mvnw.cmd`).

## Setup

1. Install frontend dependencies:

```bash
npm install
```

2. (Optional) Build backend once:

```bash
npm run dev:server -- clean package
```

This uses installed Maven when available, otherwise Maven Wrapper.

## Configuration

### Frontend

Edit `src/config/appConfig.js`:

- `APP_ID` is required.
- `BEARER_TOKEN` is optional if you enter credentials in the app UI.

Optional env override for backend base path:

```bash
# .env
VITE_MEMORY_SERVER_BASE_URL=/memory
```

### Server (optional env vars)

- `XFLOOR_API_BASE_URL` (default: `https://appfloor.in`)
- `CORS_ALLOWED_ORIGINS` (comma-separated, defaults to localhost dev origins)
- `XFLOOR_VERIFY_SSL` (default: `true`, supports `false/0/no/off`)
- `XFLOOR_SSL_CA_CERT` (optional absolute path to a CA cert bundle; falls back to `SSL_CERT_FILE`)

## Run

Terminal 1 (Java server):

```bash
npm run dev:server
```

Notes:
- `dev:server` is cross-platform (Windows, Linux, macOS).
- It checks `mvn`/`mvn.cmd` first (including `$MAVEN_HOME/bin` if set), then falls back to wrapper (`mvnw`/`mvnw.cmd`).

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
- If newly added content does not appear immediately in query results, retry after a short delay or refresh recent events.

## SSL Troubleshooting (Java)

If TLS verification fails:

1. Provide your CA bundle:

```bash
export XFLOOR_SSL_CA_CERT=/absolute/path/to/ca-bundle.pem
```

2. Restart the Java server.

Temporary debug-only workaround (not recommended for production):

```bash
export XFLOOR_VERIFY_SSL=false
```
