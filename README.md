# pit • peak • buffalo

pit • peak • buffalo is a location-based, anonymous social journaling platform inspired by proximity-driven apps like Yik Yak. It allows users to post short, ephemeral reflections tied to their physical location, without accounts or persistent identity.

Posts are categorized as:

- Pit – the worst or most frustrating part of your day
- Peak – the best or most positive part of your day
- Buffalo – something strange, unexpected, or bizarre that happened

All posts are intentionally short-lived and expire 24 hours after creation. This keeps content local, timely, and lightweight.

The project is built as a full-stack web application with an emphasis on clean API design, type safety, and production-style architecture.

## Core Features

- Anonymous posting without user accounts
- Three enforced post categories: Pit, Peak, Buffalo
- Ephemeral posts with expiration timestamps (24 hours)
- Location-based feed using user geolocation
- Global feed fallback when location is unavailable or a global radius is selected
- Serverless API with database-backed persistence
- Strict runtime and compile-time validation

## Tech Stack

- Next.js (App Router)
- TypeScript
- React
- Prisma ORM
- PostgreSQL

## Architecture Overview

The application uses the Next.js App Router to expose serverless API routes for creating and fetching posts. Prisma acts as the single source of truth for database access and schema enforcement.

Location-based feeds are implemented using bounding-box filtering rather than heavyweight geospatial libraries. Given a latitude, longitude, and radius, the backend computes a geographic bounding box and filters posts within that range. This approach keeps queries fast, portable, and easy to reason about while remaining accurate at neighborhood scale.

Expired posts are excluded at query time, ensuring that feeds only surface active content.

## API Behavior

- If latitude and longitude are not provided, the API returns a global feed of recent, unexpired posts
- If location parameters are provided, posts are filtered by distance radius and expiration
- Post categories are validated against a strict union type
- All inputs are validated before database writes

## Data Model

Each post includes:

- Unique identifier
- Text content
- Category (Pit, Peak, or Buffalo)
- Latitude and longitude
- Creation timestamp
- Expiration timestamp

## Frontend Behavior

The frontend integrates the browser Geolocation API and uses React hooks to manage asynchronous data fetching, radius selection, refresh behavior, loading states, and error handling.

When location access is unavailable, the UI degrades gracefully by falling back to the global feed.

## Project Status

pit • peak • buffalo is an active, evolving project focused on:

- Full-stack application architecture
- API design tradeoffs
- Location-based querying strategies
- Ephemeral feed mechanics
- Type safety and validation patterns

Future improvements may include moderation tools, voting mechanisms, feed ranking, or optional identity layers.

## Local Development

npm install  
npm run dev

The application will be available at http://localhost:3000.

## Motivation

The project prioritizes simplicity, correctness, and clarity over feature bloat. By keeping scope intentionally tight, the system remains easy to reason about while still surfacing realistic product and engineering constraints.
