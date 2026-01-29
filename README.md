# Rinse Frontend

A cyberpunk-terminal themed React application for managing Soulseek downloads with real-time progress updates.

## Features

- **Search Page**: Search for individual items or batch lists with suggestions for already downloaded content
- **Items Page**: Filterable table view of all downloaded items using Tanstack Table
- **Lists Page**: Card-based view of download lists with progress indicators
- **Individual Item/List Pages**: Detailed views with metadata and download options
- **Profile Page**: Placeholder for external service connections (Tidal, Beatport, etc.)
- **Real-time Updates**: WebSocket connection for live download progress

## Design

The UI features a distinctive cyberpunk-terminal aesthetic:
- Deep dark greys (#0a0a0a, #111111, #1a1a1a) for background layers
- Terminal green (#00ff00, #00cc00) for highlights and accents
- Space Mono monospace font for terminal feel
- Outfit for refined UI text
- Animated scan lines and CRT effects
- Glow effects on hover
- Grid patterns and terminal borders

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast builds
- **React Router** for navigation
- **Tanstack Query** for data fetching
- **Tanstack Table** for filterable tables
- **Zustand** for state management
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons

## Getting Started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Update the API URL in `.env`:
   ```
   VITE_API_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   bun dev
   ```

5. Build for production:
   ```bash
   bun run build
   ```

## Project Structure

```
src/
├── components/       # Reusable components (Sidebar, Layout)
├── pages/           # Page components (Search, Items, Lists, etc.)
├── hooks/           # Custom React hooks (useWebSocket)
├── store/           # Zustand state management
├── lib/             # Utilities and API client
├── types/           # TypeScript type definitions
└── index.css        # Global styles and Tailwind configuration
```

## API Integration

The frontend connects to the Rust backend API for:
- Searching and downloading items from Soulseek
- Managing lists of downloads
- Real-time progress updates via WebSocket
- Batch operations on items and lists

## Deployment

Ready for deployment to Netlify or any static hosting service. Build outputs to the `dist/` directory.

```bash
bun run build
```

The `dist` folder can be deployed directly.
