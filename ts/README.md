# xFloor Memory SDK - TypeScript React App

A React + TypeScript application demonstrating the xFloor TypeScript SDK with authentication, conversational AI, event creation, and recent activity browsing.

## Features

- Query conversations with memory context
- Create events (text + media)
- View recent events from a floor
- Edit pod floor metadata
- Manual credential onboarding (Bearer token, App ID, Floor ID, User ID)
- Light/dark theme toggle

## Prerequisites

- Node.js 18+
- npm
- xFloor Bearer token
- xFloor App ID

## Installation

```bash
npm install
```

## Configuration

You can use either approach:

1. Enter credentials in the app's initial screen.
2. Configure defaults in `src/config/appConfig.ts`.

```ts
export const APP_CONFIG = {
  BEARER_TOKEN: 'your_token',
  APP_ID: '1234567890123',
  API_BASE_URL: 'https://appfloor.in',
};
```

## Run

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Build

```bash
npm run build
npm run preview
```

## SDK Reference

- TypeScript SDK docs: https://docs.xfloor.ai/typescript-sdk-1930595m0
- SDK source: https://github.com/xFloorllm/floor-memory-sdk-client
