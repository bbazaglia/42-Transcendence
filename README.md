# Pong Tournament

A single-page application for playing Pong tournaments with multiple players.

## Features

- **Live Pong Game**: Play Pong against another player using the same keyboard
- **Tournament System**: Organize tournaments with multiple players
- **Registration System**: Players can register with custom aliases
- **Matchmaking**: Automatic tournament bracket generation and match scheduling
- **Single Page Application**: Full client-side routing with browser back/forward support

## Controls

- **Player 1**: W (up) / S (down)
- **Player 2**: Up Arrow / Down Arrow

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Build

To build for production:
```bash
npm run build
```

## Technology Stack

- **Frontend**: TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **Game Engine**: HTML5 Canvas with requestAnimationFrame
- **Routing**: Custom client-side router

## Project Structure

```
src/
├── App.ts              # Main application class
├── Router.ts           # Client-side routing
├── TournamentManager.ts # Tournament logic and bracket generation
├── GameManager.ts      # Pong game logic and rendering
├── main.ts            # Application entry point
└── style.css          # Global styles with Tailwind CSS
```

## Game Rules

- First player to reach 5 points wins
- Ball bounces off paddles and walls
- Ball angle changes based on where it hits the paddle
- Both players have identical paddle speed for fair play

## Tournament System

- Supports 4, 8, or 16 players
- Single elimination bracket
- Random player seeding
- Automatic winner advancement
- Clear match scheduling and results display 