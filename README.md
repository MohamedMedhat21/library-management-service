# Library Management System

A RESTful API built with **NestJS**, **TypeORM**, **MySQL**, and **Redis**, containerised with Docker Compose.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Database Migrations](#database-migrations)
- [Authentication](#authentication)
- [API Documentation](#api-documentation)
- [API Endpoints](#api-endpoints)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Upcoming Enhancements](#upcoming-enhancements)

---

## Prerequisites

| Tool                                   | Version |
| -------------------------------------- | ------- |
| Docker Desktop                         | 24+     |
| Node.js (for local dev without Docker) | 20+     |
| npm                                    | 10+     |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/library-management-service.git
cd library-management-service

# 2. Copy the environment file and set your credentials
cp .env.example .env

# 3. Start all services (app + MySQL + Redis)
docker compose up

# 4. In a separate terminal, run migrations
docker compose exec app npm run migration run

# 5. Open Swagger UI
open http://localhost:3000/api/docs
```

---

## Environment Variables

Copy `.env.example` to `.env`. All variables have safe defaults for local development.

```dotenv
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
# development / production
SERVER_ENV=development
SERVER_COUNTRY=EG
SERVER_TIMEZONE=Africa/Cairo

# MySQL
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=library_local_db
MYSQL_USER=user
MYSQL_PASSWORD=password

# mysql inside Docker, localhost otherwise
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USERNAME=user
DATABASE_PASSWORD=password
DATABASE_NAME=library_local_db

# redis inside Docker, localhost otherwise
REDIS_HOST=redis
REDIS_PORT=6379

# HTTP Basic Auth
API_AUTH_USERNAME=admin
API_AUTH_PASSWORD=changeme
```

> **Never commit your real `.env` file.** It is listed in `.gitignore`.

---

## Running the App

### Development (hot reload)

```bash
docker compose up
```

File changes on your machine trigger automatic reload via `nest start --watch`.

### Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Without Docker

```bash
npm install
npm run start:dev
```

Change `DATABASE_HOST=localhost` and `REDIS_HOST=localhost` to `localhost` in your `.env`.

---

## Database Migrations

```bash
npm run migration:run:dev        # development
npm run migration:run            # production (from compiled dist)
npm run migration:generate --name=name
npm run migration:create --name=name
npm run migration:revert
```

Inside Docker:

```bash
docker compose exec app npm run migration:run:dev
```

---

## Authentication

All API endpoints are protected with **HTTP Basic Authentication**.

Set your credentials in `.env`:

```dotenv
API_AUTH_USERNAME=admin
API_AUTH_PASSWORD=changeme
```

Include the credentials in every request:

```bash
# curl
curl -u admin:changeme http://localhost:3000/books

# Postman
# Authorization tab → Type: Basic Auth → fill in username and password
```

In Swagger UI (`http://localhost:3000/api/docs`), click **Authorize** and enter your credentials. Routes decorated with `@Public()` (currently only `GET /`) bypass authentication.

---

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Books

| Method   | Endpoint          | Description                          | Rate limit   |
| -------- | ----------------- | ------------------------------------ | ------------ |
| `POST`   | `/books`          | Add a new book                       | —            |
| `GET`    | `/books`          | List all books (Redis-cached 10 min) | 20 req / 60s |
| `GET`    | `/books?q={term}` | Search by title, author, or ISBN     | 20 req / 60s |
| `GET`    | `/books/:id`      | Get a book by ID                     | —            |
| `PATCH`  | `/books/:id`      | Update a book                        | —            |
| `DELETE` | `/books/:id`      | Soft-delete a book                   | —            |

**POST /books**

```json
// Request
{ "title": "Clean Code", "author": "Robert C. Martin", "isbn": "9780132350884", "availableQuantity": 5, "shelfLocation": "A3-12" }

// Response 201
{ "id": 1, "title": "Clean Code", "author": "Robert C. Martin", "isbn": "9780132350884", "availableQuantity": 5, "shelfLocation": "A3-12", "createdAt": "2026-01-01T10:00:00.000Z", "updatedAt": "2026-01-01T10:00:00.000Z" }
```

---

### Users

| Method   | Endpoint     | Description         |
| -------- | ------------ | ------------------- |
| `POST`   | `/users`     | Register a user     |
| `GET`    | `/users`     | List all users      |
| `GET`    | `/users/:id` | Get a user by ID    |
| `PATCH`  | `/users/:id` | Update user details |
| `DELETE` | `/users/:id` | Soft-delete a user  |

**POST /users**

```json
// Request
{ "name": "Ahmed Hassan", "email": "ahmed@example.com" }

// Response 201
{ "id": 3, "name": "Ahmed Hassan", "email": "ahmed@example.com", "registeredDate": "2026-01-15T10:00:00.000Z" }
```

---

### Borrowing

| Method | Endpoint                          | Description                    | Rate limit   |
| ------ | --------------------------------- | ------------------------------ | ------------ |
| `POST` | `/borrowing/checkout`             | Check out a book               | —            |
| `POST` | `/borrowing/:recordId/return`     | Return a book                  | —            |
| `GET`  | `/borrowing/users/:userId/active` | Books currently held by a user | —            |
| `GET`  | `/borrowing/overdue`              | All overdue borrowing records  | 10 req / 60s |

**POST /borrowing/checkout**

```json
// Request
{ "bookId": 1, "userId": 3, "loanDays": 14 }

// Response 201
{ "id": 12, "checkoutDate": "2026-01-15T09:00:00.000Z", "dueDate": "2026-01-29T09:00:00.000Z", "returnDate": null, "status": "checked_out" }
```

`loanDays` defaults to `14`. Uses a `pessimistic write lock` on `books.available_quantity`. Returns `400` if no copies available or the user already has the same book out. **Response** `201`: borrowing record with `status: "checked_out"`.

**POST /borrowing/:recordId/return —** atomically increments quantity and sets status: `"returned"`. Returns `400` if already returned.

**GET /borrowing/overdue —** before responding, bulk-updates any past-due `checked_out` records to `overdue`.

---

### Reports

| Method | Endpoint                                           | Description                                |
| ------ | -------------------------------------------------- | ------------------------------------------ |
| `GET`  | `/reports/analytics`                               | Analytics summary (defaults to last month) |
| `GET`  | `/reports/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` | Custom date range                          |
| `GET`  | `/reports/overdue-last-month/csv`                  | Overdue records as CSV download            |
| `GET`  | `/reports/borrowing-last-month/csv`                | All records as CSV download                |

**GET /reports/analytics**

```json
// Response 200
{
  "period": {
    "from": "2026-01-01T00:00:00.000Z",
    "to": "2026-01-31T23:59:59.000Z"
  },
  "totalCheckouts": 42,
  "totalReturned": 30,
  "totalOverdue": 5,
  "activeCheckouts": 7,
  "topUsers": [
    { "name": "Ahmed Hassan", "email": "ahmed@example.com", "checkouts": 8 }
  ],
  "topBooks": [
    { "title": "Clean Code", "isbn": "9780132350884", "checkouts": 6 }
  ]
}
```

---

### Error Envelope

All errors follow a consistent shape:

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Book #99 not found",
  "path": "/api/v1/books/99",
  "timestamp": "..."
}
```

---

## Running Tests

```bash
# Run all unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

`BooksService` is fully unit-tested: `create`, `findAll` (cache hit/miss/empty), `findOne`, `search`, `update`, `remove`.

---

## Project Structure

```
src/
├── auth/                           # Authentication logic (Guards & Strategies)
│   ├── basic-auth.strategy.ts
│   ├── basic-auth.guard.ts
│   └── auth.module.ts
├── common/                         # Shared decorators, filters, and modules
│   ├── decorators/
│   ├── filters/
│   │   └── global-exception.filter.ts
│   └── shared.module.ts
├── config/                         # Configuration files
│   ├── typeorm.ts                  # Database configuration
│   └── server.ts                   # Server-specific settings
├── core/                           # Main business logic domains
│   ├── books/
│   │   ├── controllers/            # books.controller.ts
│   │   ├── services/               # books.service.ts
│   │   ├── entities/               # book.entity.ts
│   │   └── dto/                    # create-book.dto.ts, update-book.dto.ts
│   ├── borrowing/
│   │   ├── controllers/            # borrowing.controller.ts
│   │   ├── services/               # borrowing.service.ts
│   │   ├── entities/               # borrowing-record.entity.ts
│   │   ├── enums/                  # Status enums
│   │   └── dto/                    # checkout-book.dto.ts
│   ├── reports/
│   │   ├── controllers/            # reports.controller.ts
│   │   ├── services/               # reports.service.ts
│   │   └── helpers/                # Data formatting helpers
│   └── users/
│       ├── controllers/            # users.controller.ts
│       ├── services/               # users.service.ts
│       ├── entities/               # user.entity.ts
│       └── dto/                    # create-user.dto.ts, update-user.dto.ts
├── infrastructure/                 # External services and system utilities
│   ├── cache/                      # Redis module, provider, and service
│   ├── database/
│   │   └── migrations/             # TypeORM migration files
│   └── utils/
│       └── http-logger.middleware.ts
├── app.module.ts                   # Main application module
└── main.ts                         # Application entry point
```

---

## Database Schema

The ERD is defined in `ERD.dbml`. Paste its contents into dbdiagram.io to render it interactively.

---

## Upcoming Enhancements

- [ ] lint migration (`ESLint` + `Prettier` to `Oxlint` + `Oxfmt`)
- [ ] Audit logs
- [ ] optimize docker image size
- [ ] CI/CD Workflows
- [ ] books pagination and sorting
