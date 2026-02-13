# xFloor Memory SDK - React App

A comprehensive React application demonstrating the xFloor JavaScript SDK with full authentication and conversational AI capabilities.

## Features

### Authentication
- **Sign Up** - Create new user accounts with email or mobile number
- **Sign In** - Authenticate using email or mobile with password
- **User Session Management** - Secure Bearer token-based authentication
- **Auto-populated User Data** - Automatically uses authenticated user's ID and Floor ID

### Core SDK Features
1. **Query Conversations** - AI-powered chat interface with context memory and conversation history
2. **Create Events** - Add content/events to your Floor that becomes part of the knowledge base
3. **Conversation History** - Retrieve and view past conversations for authenticated users
4. **Pod Floor Information** - Display user's pod floor details after authentication

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (installed with Node.js)
- xFloor Bearer Token (from your dashboard)
- xFloor App ID (13-digit numeric value from developer registration)

## Installation

1. Install Node.js and npm (if not already installed):

macOS (Homebrew):
```bash
brew install node
```

Linux (Debian/Ubuntu):
```bash
sudo apt update && sudo apt install -y nodejs npm
```

Windows (PowerShell via winget):
```powershell
winget install OpenJS.NodeJS.LTS
```

Verify installation (all platforms):
```bash
node -v
npm -v
```

2. Install project dependencies:
```bash
npm install
```

3. Update the xFloor JS SDK to the latest published version:
```bash
npm install @xfloor/floor-memory-sdk-js@latest
npm ls @xfloor/floor-memory-sdk-js
```

4. Configure runtime credentials:

   Start the app and enter your Bearer Token, App ID, Pod Floor ID, and User ID in the frontend credentials form.

   You can also provide credentials via Vite environment variables:
   - `VITE_XFLOOR_BEARER_TOKEN`
   - `VITE_XFLOOR_APP_ID`
   - `VITE_XFLOOR_API_BASE_URL`

5. (Optional) Create a `.env` file for additional configuration:

macOS/Linux:
```bash
cp .env.example .env
```

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Add your xFloor variables if needed:
```
VITE_XFLOOR_BEARER_TOKEN=your_bearer_token_here
VITE_XFLOOR_APP_ID=your_app_id_here
VITE_XFLOOR_API_BASE_URL=https://appfloor.in
```

## Running the App

Start the development server:
```bash
npm run dev
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Building for Production

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
FloorMemorySamples/
├── src/
│   ├── components/
│   │   ├── SignIn.jsx               # Sign in component (email/mobile)
│   │   ├── SignUp.jsx               # Sign up component
│   │   ├── QueryConversation.jsx    # AI chat interface
│   │   ├── CreateEvent.jsx          # Create events/content
│   │   └── ConversationHistory.jsx  # View conversation history
│   ├── config/
│   │   ├── appConfig.js             # Runtime config (env/localStorage)
│   │   └── memoryClient.js          # SDK client singleton
│   ├── context/
│   │   └── AuthContext.jsx          # Authentication state management
│   ├── services/
│   │   └── authService.js           # Authentication API calls
│   ├── App.jsx                      # Main app component
│   ├── App.css                      # Styling
│   └── main.jsx                     # Entry point
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

## SDK Usage

### Initialize Client

The app uses a singleton pattern for the MemoryClient:

```javascript
import { MemoryClient } from '@xfloor/floor-memory-sdk-js';

const client = new MemoryClient();
```

### Query Conversations

```javascript
const result = await client.query({
  userId: "user_123",
  floorId: "floor_456",
  query: "What did we discuss last time?"
});
```

### Create Events

```javascript
const result = await client.createEvent({
  floorId: "floor_456",
  title: "Meeting Notes",
  content: "Discussed project timeline and deliverables"
});
```

### Get Conversations

```javascript
const conversations = await client.getConversations({
  userId: "user_123",
  floorId: "floor_456"
});
```

## Error Handling

The app implements comprehensive error handling for:
- Validation errors (4xx)
- Authentication failures (401/403)
- Server issues (5xx)

## Best Practices

- Single client instance is created and reused across the application
- Environment variables for sensitive API keys
- Try-catch blocks for all SDK operations
- User-friendly error messages

## Documentation

For more information about the xFloor JavaScript SDK, visit:
[https://docs.xfloor.ai/javascript-sdk-1930593m0](https://docs.xfloor.ai/javascript-sdk-1930593m0)

## License

MIT
