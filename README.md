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

In Swagger UI, click the **Authorize** button at the top right and enter your credentials. All subsequent requests will include them automatically.

---

## API Documentation

Interactive Swagger UI:

```
http://localhost:3000/api/docs
```

All endpoints have documented request bodies, query parameters, and every possible response status code with example payloads.

---

## API Endpoints

### Books

| Method | Endpoint | Description | Rate limit |
|--------|----------|-------------|------------|
| `POST` | `/books` | Add a new book | — |
| `GET` | `/books` | List all books | 20 req / 60s |
| `GET` | `/books?q={term}` | Search by title, author, or ISBN | 20 req / 60s |
| `GET` | `/books/:id` | Get a book by ID | — |
| `PATCH` | `/books/:id` | Update a book | — |
| `DELETE` | `/books/:id` | Soft-delete a book | — |

**POST /books**
```json
// Request
{ "title": "Clean Code", "author": "Robert C. Martin", "isbn": "9780132350884", "availableQuantity": 5, "shelfLocation": "A3-12" }

// Response 201
{ "id": 1, "title": "Clean Code", "author": "Robert C. Martin", "isbn": "9780132350884", "availableQuantity": 5, "shelfLocation": "A3-12", "createdAt": "2026-01-01T10:00:00.000Z", "updatedAt": "2026-01-01T10:00:00.000Z" }
```

---

### Borrowers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/borrowers` | Register a borrower |
| `GET` | `/borrowers` | List all borrowers |
| `GET` | `/borrowers/:id` | Get a borrower by ID |
| `PATCH` | `/borrowers/:id` | Update borrower details |
| `DELETE` | `/borrowers/:id` | Soft-delete a borrower |

**POST /borrowers**
```json
// Request
{ "name": "Ahmed Hassan", "email": "ahmed@example.com" }

// Response 201
{ "id": 3, "name": "Ahmed Hassan", "email": "ahmed@example.com", "registeredDate": "2026-01-15T10:00:00.000Z" }
```

---

### Borrowing

| Method | Endpoint | Description | Rate limit |
|--------|----------|-------------|------------|
| `POST` | `/borrowing/checkout` | Check out a book | — |
| `POST` | `/borrowing/:recordId/return` | Return a book | — |
| `GET` | `/borrowing/borrowers/:borrowerId/active` | Books currently held by a borrower | — |
| `GET` | `/borrowing/overdue` | All overdue borrowing records | 10 req / 60s |

**POST /borrowing/checkout**
```json
// Request
{ "bookId": 1, "borrowerId": 3, "loanDays": 14 }

// Response 201
{ "id": 12, "checkoutDate": "2026-01-15T09:00:00.000Z", "dueDate": "2026-01-29T09:00:00.000Z", "returnDate": null, "status": "checked_out" }
```

---

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/reports/analytics` | Borrowing analytics summary (defaults to last month) |
| `GET` | `/reports/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` | Analytics for a custom date range |
| `GET` | `/reports/overdue-last-month/csv` | Download overdue borrows of last month as CSV |
| `GET` | `/reports/overdue-last-month/xlsx` | Download overdue borrows of last month as XLSX |
| `GET` | `/reports/borrowing-last-month/csv` | Download all borrows of last month as CSV |
| `GET` | `/reports/borrowing-last-month/xlsx` | Download all borrows of last month as XLSX |

**GET /reports/analytics**
```json
// Response 200
{
  "period": { "from": "2026-01-01T00:00:00.000Z", "to": "2026-01-31T23:59:59.000Z" },
  "totalCheckouts": 42,
  "totalReturned": 30,
  "totalOverdue": 5,
  "activeCheckouts": 7,
  "topBorrowers": [
    { "name": "Ahmed Hassan", "email": "ahmed@example.com", "checkouts": 8 }
  ],
  "topBooks": [
    { "title": "Clean Code", "isbn": "9780132350884", "checkouts": 6 }
  ]
}
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
| `401` | Missing or invalid Basic Auth credentials |
| `404` | Resource not found |
| `409` | Duplicate ISBN / email, or FK constraint |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

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

Unit tests cover the `BooksService` module with the following cases:

- `create` — success, duplicate ISBN conflict
- `findAll` — returns list, returns empty array
- `findOne` — found, not found
- `search` — matching results, no results
- `update` — success, book not found, ISBN conflict
- `remove` — success, book not found

---

## Project Structure

```
src/
├── auth/
│   ├── basic-auth.strategy.ts
│   ├── basic-auth.guard.ts
│   └── auth.module.ts
├── books/
│   ├── controllers/    books.controller.ts
│   ├── services/       books.service.ts
│   ├── entities/       book.entity.ts
│   └── dto/            create-book.dto.ts  update-book.dto.ts
├── borrowers/
│   ├── controllers/    borrowers.controller.ts
│   ├── services/       borrowers.service.ts
│   ├── entities/       borrower.entity.ts
│   └── dto/            create-borrower.dto.ts  update-borrower.dto.ts
├── borrowing/
│   ├── controllers/    borrowing.controller.ts
│   ├── services/       borrowing.service.ts
│   ├── entities/       borrowing-record.entity.ts
│   └── dto/            checkout-book.dto.ts
├── reports/
│   ├── controllers/    reports.controller.ts
│   └── services/       reports.service.ts
├── common/
│   └── filters/        global-exception.filter.ts
├── config/
│   ├── typeorm.ts
│   └── server.ts
├── infrastructure/
│   └── database/
│       └── migrations/
└── main.ts
```