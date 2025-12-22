# pit • peak • buffalo

pit • peak • buffalo is a location-based social journaling platform inspired by Yik Yak, designed to let users post short, anonymous reflections tied to their physical location. Posts are categorized as the worst part about your day (pit), the best part about your day (peak), or the weirdest part about your day (buffalo).

Posts are intentionally short-lived. Each post includes an expiration timestamp and is excluded from feeds after it expires, keeping content local, timely, and lightweight (24 hours after posted).

The project is built as a full-stack web application with an emphasis on clean API design, type safety, and production-style architecture.

## Core Features

- Anonymous posting without user accounts
- Three enforced post categories: Pit, Peak, and Buffalo
- Ephemeral posts with expiration timestamps (24 hours after posted)
- Global feed when location is unavailable or when selected
- Nearby feed based on user geolocation and configurable radius
- Serverless API with database-backed persistence
- Strict runtime and compile-time validation

## Tech Stack

- Next.js (App Router)
- TypeScript
- React
- Prisma ORM
- PostgreSQL

## Architecture Overview

The application uses Next.js App Router to expose serverless API routes for creating and fetching posts. Prisma serves as the single source of truth for database access and schema enforcement.

Location-based feeds are implemented using bounding-box filtering rather than heavyweight geospatial libraries. Given a latitude, longitude, and radius, the backend computes a geographic bounding box and filters posts within that range. This approach keeps queries fast, portable, and easy to reason about while remaining accurate at neighborhood scale.

Expired posts are excluded at query time, ensuring that feeds only surface active content.

## API Behavior

- If latitude and longitude are not provided, the API returns a global feed of recent, unexpired posts
- If location parameters are provided, posts are filtered by both distance radius and expiration
- Post categories are validated against a strict union type to prevent invalid values
- All inputs are validated before database writes

## Data Model

Each post contains:
- Unique identifier
- Text content
- Category (Pit, Peak, or Buffalo)
- Latitude and longitude
- Creation timestamp
- Expiration timestamp

## Frontend Behavior

The frontend integrates the browser geolocation API and uses React hooks to manage asynchronous data fetching, radius changes, refresh behavior, loading states, and error handling. The UI is designed to degrade gracefully when location access is unavailable, falling back to the global feed.

## Project Status

Pit-Peak-Buffalo is an active, evolving project used to experiment with:
- Full-stack architecture decisions
- API design tradeoffs
- Location-based querying strategies
- Ephemeral feed mechanics
- Type safety and validation patterns

Future improvements may include moderation, voting, feed ranking, or user identity layers.

## Local Development

Install dependencies and start the development server:

npm install
npm run dev

The application will be available at http://localhost:3000.

## Motivation

Pit-Peak-Buffalo was built to explore how lightweight, proximity-based social experiences can encourage honest reflection without the pressure or permanence of traditional social networks. The project prioritizes simplicity, correctness, and clarity over feature bloat.
