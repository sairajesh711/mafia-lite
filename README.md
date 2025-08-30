Mafia Night - A Real-Time Social Deduction Game
Mafia Night is a web-based, real-time multiplayer application for playing the classic social deduction game Mafia. This project's primary focus is on creating a seamless, high-quality user experience through exceptional design and robust real-time session management, allowing friends to play together from anywhere in the world.

The Product Vision: Your Perfect Game Night Host
Playing Mafia is about suspense, laughter, and shared moments with friends. The goal of this app is to be the perfect, invisible host for your game night. It handles all the boring, complicated rules so you and your friends can focus on what matters: bluffing, accusing, and creating memorable stories together. It's designed to make remote game nights feel as connected and exciting as playing in the same room.

The User Pain Point: The Chaos of Remote Mafia
Anyone who has tried to organize Mafia over a group chat knows the friction:

The Awkward Setup: The host has to privately message everyone their roles, which is slow and prone to mistakes.

The Confusion: Who's still in the game? Who voted for whom? Did the Doctor save the right person? Without a central board, the game quickly becomes confusing, especially for new players.

The Arguments: The game grinds to a halt over rule disputes or accusations of someone peeking at messages.

The Moderator Burden: One person has to sit out and be the "game master," missing out on the fun of playing.

Our Solution: An Effortless, Automated Game Master
This app removes every point of friction by acting as the game's central, trusted source of truth. It is designed to be so intuitive that it fades into the background, letting the social dynamics shine.

Instant & Secret Roles: At the start of the game, roles are assigned securely and revealed dramatically to each player.

A Clear View for Everyone: The interface provides a clean, shared view of who is in the game, who is under suspicion, and what phase you're in.

Guided Actions: The app guides players through each phase. During the day, it facilitates discussion and voting. At night, it prompts each special role to take their turn secretly and in the correct order.

Everyone Gets to Play: By automating the moderator's job, no one has to sit out. Everyone is part of the action from start to finish.

Key Features & Design Philosophy
Frictionless Lobby System: The host creates a game and gets a unique, shareable link. Friends can join instantly without needing accounts or complex lobby codes.

Context-Aware UI: The interface is intentionally minimalist. It only shows you the information and actions you need for the current moment, preventing information overload. A Villager sees a simple player list, while the Mafia sees their teammates highlighted.

Dramatic Reveals: The app is designed to build suspense. The results of the nightly actions and the daily vote are revealed with a moment of drama, enhancing the fun.

Shareable Game Summaries: At the end of the game, a fun, visual summary is generated (e.g., "The Villagers win after a 5-day standoff!"), which can be easily screenshotted and shared, preserving the memory of the game.

## Development Status

### ✅ Phase 1: Core Game Foundation (Completed)

**Architecture & Infrastructure**
- **Monorepo Setup**: TypeScript monorepo with pnpm workspaces
- **Strict Type Safety**: `exactOptionalPropertyTypes: true` with proper optional property handling
- **Development Tooling**: ESLint, Prettier, Husky pre-commit hooks, lint-staged
- **Package Structure**: 
  - `@mafia/contracts` - Shared types, Zod schemas, and client view redaction
  - `@mafia/engine` - Pure game logic and reducers

**Game Engine (Pure & Deterministic)**
- **Role System**: Data-driven role registry (Mafia, Detective, Doctor, Townsperson)
- **Night Resolution**: Deterministic action processing (KILL → PROTECT → INVESTIGATE)
- **Voting System**: Majority and plurality voting with tie handling
- **Victory Conditions**: Automatic game end detection
- **Phase Management**: Automatic phase transitions with timers
- **Privacy by Design**: Client view redaction prevents information leaks

**Testing & Quality**
- **9 Passing Tests**: Core game logic fully validated
- **Test Factories**: Clean, maintainable test helpers with proper typing
- **100% Build Success**: Strict TypeScript compilation
- **Type-Safe Contracts**: Runtime validation with Zod schemas

### 🚧 Next Phase: Real-Time Infrastructure

**Backend (In Progress)**
- Socket.IO server with Redis coordination
- Leader election and room management  
- JWT-based session handling
- Action validation and idempotency

**Frontend (Planned)**
- React + Vite client application
- Real-time Socket.IO integration
- Role-specific UI components
- Reconnection and refresh safety

## Technology Stack

**Monorepo & Build**
- **Package Manager**: pnpm with workspaces
- **Language**: TypeScript (strict mode)
- **Build Tool**: Native TypeScript compiler
- **Testing**: Vitest

**Backend (Planned)**
- **Runtime**: Node.js 18+
- **Framework**: Fastify or Express
- **Real-time**: Socket.IO
- **State**: Redis for coordination, in-memory for speed
- **Deploy**: Google Cloud Run

**Frontend (Planned)**
- **Framework**: React 18+ with Vite
- **Styling**: TBD (likely Tailwind CSS)
- **State Management**: Local state + Socket.IO
- **Deploy**: Vercel

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Development mode
pnpm run dev
```

## Project Principles

**Architecture**
- **Pure Core, Thin I/O**: Game logic is pure functions, network/DB layers are thin wrappers
- **Contracts First**: Single source of truth for types, validated at runtime
- **Privacy by Construction**: Server only sends data players should see

**Code Quality**
- **SOLID Principles**: Open/closed for roles, single responsibility modules
- **Deterministic**: Reproducible game outcomes, seeded RNG when needed  
- **Type Safety**: Strict TypeScript, no `any`, exactOptionalPropertyTypes enabled
- **Test Coverage**: Unit tests for all game logic, integration tests for real-time features