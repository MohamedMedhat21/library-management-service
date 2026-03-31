# Library Management System

A RESTful API built with **NestJS**, **TypeORM**, **MySQL**, and **Redis**, containerised with Docker Compose.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Database Migrations](#database-migrations)
- [API Documentation](#api-documentation)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)

---

## Prerequisites

| Tool | Version |
|------|---------|
| Docker Desktop | 24+ |
| Node.js (for local dev without Docker) | 20+ |
| npm | 10+ |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/library-management-service.git
cd library-management-service

# 2. Copy the environment file
cp .env.example .env
# Edit .env if you need to change any defaults

# 3. Start all services (app + MySQL + Redis)
docker compose up

# 4. In a separate terminal, run migrations
docker compose exec app npm run migration run

# 5. Open Swagger UI
open http://localhost:3000/api/docs
```

---

## Environment Variables

Copy `.env.example` to `.env` before starting. All variables have safe defaults for local development.

```dotenv
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
SERVER_ENV=development
SERVER_COUNTRY=EG
SERVER_TIMEZONE=Africa/Cairo

# MySQL
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=library_local_db
MYSQL_USER=user
MYSQL_PASSWORD=password

# App DB config (used by TypeORM)
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USERNAME=user
DATABASE_PASSWORD=password
DATABASE_NAME=library_local_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

> **Never commit your real `.env` file.** It is listed in `.gitignore` by default.

---

## Running the App

### Development (with hot reload)

```bash
docker compose up
```

The app mounts your local source into the container and runs `nest start --watch`, so every file save triggers an automatic reload — exactly like running `npm run start:dev` locally.

### Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Without Docker (local Node.js)

```bash
npm install
npm run start:dev
```

Make sure MySQL and Redis are reachable and your `.env` points to them (change `DATABASE_HOST` and `REDIS_HOST` to `localhost`).

---

## Database Migrations

All migration commands work cross-platform (Windows, Mac, Linux):

```bash
# Run all pending migrations
npm run migration run

# Create a blank migration file
npm run migration create src/infrastructure/database/migrations/your-migration-name

# Generate a migration from entity changes
npm run migration generate src/infrastructure/database/migrations/your-migration-name

# Revert the last migration
npm run migration revert
```

Inside Docker:

```bash
docker compose exec app npm run migration run
```

---

## API Documentation

Interactive Swagger UI is available once the app is running:

```
http://localhost:3000/api/docs
```

You can try every endpoint directly from the browser — all request bodies have example values pre-filled.

---

## API Endpoints

### Books

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/books` | Add a new book |
| `GET` | `/books` | List all books |
| `GET` | `/books?q={term}` | Search by title, author, or ISBN |
| `GET` | `/books/:id` | Get a book by ID |
| `PATCH` | `/books/:id` | Update a book |
| `DELETE` | `/books/:id` | Soft-delete a book |

**Rate limit:** `GET /books` — 20 requests per 60 seconds.

#### POST /books — request body

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "9780132350884",
  "availableQuantity": 5,
  "shelfLocation": "A3-12"
}
```

#### GET /books — response

```json
[
  {
    "id": 1,
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "isbn": "9780132350884",
    "availableQuantity": 4,
    "shelfLocation": "A3-12",
    "createdAt": "2026-01-01T10:00:00.000Z",
    "updatedAt": "2026-01-02T09:00:00.000Z"
  }
]
```

---

### users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users` | Register a user |
| `GET` | `/users` | List all users |
| `GET` | `/users/:id` | Get a user by ID |
| `PATCH` | `/users/:id` | Update user details |
| `DELETE` | `/users/:id` | Soft-delete a user |

#### POST /users — request body

```json
{
  "name": "Ahmed Hassan",
  "email": "ahmed@example.com"
}
```

#### GET /users/:id — response

```json
{
  "id": 3,
  "name": "Ahmed Hassan",
  "email": "ahmed@example.com",
  "registeredDate": "2026-01-01T10:00:00.000Z",
  "createdAt": "2026-01-01T10:00:00.000Z",
  "updatedAt": "2026-01-01T10:00:00.000Z"
}
```

---

### Borrowing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/borrowing/checkout` | Check out a book |
| `POST` | `/borrowing/:recordId/return` | Return a book |
| `GET` | `/borrowing/users/:userId/active` | Books currently held by a user |
| `GET` | `/borrowing/overdue` | All overdue borrowing records |

**Rate limit:** `GET /borrowing/overdue` — 10 requests per 60 seconds.

#### POST /borrowing/checkout — request body

```json
{
  "bookId": 1,
  "userId": 3,
  "loanDays": 14
}
```

#### POST /borrowing/checkout — response

```json
{
  "id": 12,
  "checkoutDate": "2026-01-15T09:00:00.000Z",
  "dueDate": "2026-01-29T09:00:00.000Z",
  "returnDate": null,
  "status": "checked_out",
  "book": { "id": 1, "title": "Clean Code" },
  "user": { "id": 3, "name": "Ahmed Hassan" }
}
```

#### GET /borrowing/overdue — response

```json
[
  {
    "id": 8,
    "checkoutDate": "2025-12-01T09:00:00.000Z",
    "dueDate": "2025-12-15T09:00:00.000Z",
    "returnDate": null,
    "status": "overdue",
    "book": { "id": 2, "title": "The Pragmatic Programmer" },
    "user": { "id": 5, "name": "Sara Ali" }
  }
]
```

---

### Error responses

All errors follow a consistent shape:

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Book #99 not found",
  "path": "/books/99",
  "timestamp": "2026-01-15T09:00:00.000Z"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Validation error or business rule violation |
| `404` | Resource not found |
| `409` | Duplicate ISBN / email, or FK constraint |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

---

## Project Structure

```
src/
├── books/
│   ├── controllers/   books.controller.ts
│   ├── services/      books.service.ts
│   ├── entities/      book.entity.ts
│   └── dto/           create-book.dto.ts  update-book.dto.ts
├── users/
│   ├── controllers/   users.controller.ts
│   ├── services/      users.service.ts
│   ├── entities/      user.entity.ts
│   └── dto/           create-user.dto.ts  update-user.dto.ts
├── borrowing/
│   ├── controllers/   borrowing.controller.ts
│   ├── services/      borrowing.service.ts
│   ├── entities/      borrowing-record.entity.ts
│   └── dto/           checkout-book.dto.ts
├── common/
│   └── filters/       global-exception.filter.ts
├── config/
│   ├── typeorm.ts
│   └── server.ts
├── infrastructure/
│   └── database/
│       └── migrations/
└── main.ts
```