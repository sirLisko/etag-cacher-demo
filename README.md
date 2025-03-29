# EtagCacher Demo

A demonstration of efficient polling and cache invalidation with RTK Query and ETag caching.

## Overview

This project showcases the implementation of an efficient data polling mechanism using ETag caching with RTK Query. The EtagCacher utility helps manage API polling while reducing unnecessary network requests.

### Key Features

- **ETag-based caching**: Uses HTTP ETags to determine if data has changed on the server
- **Smart polling**: Only fetches new data when ETags change or when specific conditions are met
- **Optimized network usage**: Reduces bandwidth by avoiding full data fetches when unnecessary
- **RTK Query integration**: Seamlessly works with Redux Toolkit Query for state management

## How it Works

1. When you add or update a todo item, polling is automatically triggered
2. The EtagCacher monitors server responses for ETag changes
3. If all todos are completed or a new ETag is received, polling stops
4. There's a 2-second delay on adding a todo before the server updates the ETag after changes (simulating real-world conditions)

## Project Structure

- `src/api/eTagCacher.ts` - The core EtagCacher implementation
- `src/api/todosApi.ts` - RTK Query API setup with EtagCacher integration
- `src/mocks/server.ts` - Mock server implementation with ETag support
- `src/App.tsx` - React components for the Todo app UI

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm run dev
```

## How to Use

1. Add new todos using the form
2. Mark todos as completed using the checkboxes
3. Watch the polling indicator in the top right to see when polling is active
4. Notice how polling stops when all todos are completed or after the server updates its ETag

## Testing

The project includes a comprehensive test suite for the EtagCacher utility using Vitest.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch
```

## Technologies Used

- React + TypeScript
- Redux Toolkit Query
- MSW (Mock Service Worker)
- Vite
- Vitest (for testing)
