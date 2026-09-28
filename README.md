# 🏸 Badminton Live — Real-Time Tournament Management & BWF Scoring Platform

A complete, production-ready full-stack badminton tournament system featuring BWF-compliant live scoring, WebSockets real-time broadcasts, visual knockout & round-robin brackets, public tournament views, administrative control console, security audit logging, derived statistics, dynamic QR codes, and Docker production deployment.

---

## 📋 Table of Contents
1. [Requirements](#1-requirements)
2. [Local Setup](#2-local-setup)
3. [Installing Dependencies](#3-installing-dependencies)
4. [Starting Docker](#4-starting-docker)
5. [Starting Development Environment](#5-starting-development-environment)
6. [Database Migration](#6-database-migration)
7. [Seed Data](#7-seed-data)
8. [Test Accounts](#8-test-accounts)
9. [Production Build](#9-production-build)
10. [Production Deployment](#10-production-deployment)
11. [Environment Variables](#11-environment-variables)
12. [Database Backup](#12-database-backup)
13. [Database Restore](#13-database-restore)
14. [Updating Application](#14-updating-application)
15. [Troubleshooting](#15-troubleshooting)
16. [Creating the First Tournament](#16-creating-the-first-tournament)

---

## 1. Requirements
* **Node.js**: v20.x or higher
* **npm**: v10.x or higher
* **Docker & Docker Compose**: Docker v24.x+ with Compose v2.x+
* **PostgreSQL**: v16.x (provided via Docker Compose or native instance)
* **OS**: Linux (Ubuntu 20.04/22.04 LTS recommended for deployment), macOS, or Windows 10/11 with WSL2

---

## 2. Local Setup
Clone the repository and enter the directory:
```bash
git clone https://github.com/your-org/badminton-live.git
cd badminton-live
```
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

---

## 3. Installing Dependencies
Install all monorepo workspace dependencies:
```bash
npm install
```

---

## 4. Starting Docker
Start the PostgreSQL database container:
```bash
docker compose up -d postgres
```
Verify PostgreSQL health:
```bash
docker compose ps
```

---

## 5. Starting Development Environment
Start both API backend (port 4000) and Vite frontend (port 5173) in parallel:
```bash
npm run dev
```
Or start individually:
```bash
# Terminal 1 — Backend API
npm run dev --workspace=apps/api

# Terminal 2 — Frontend Web
npm run dev --workspace=apps/web
```

---

## 6. Database Migration
Run Prisma schema migrations:
```bash
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
```
Generate Prisma Client:
```bash
npx prisma generate --schema=packages/database/prisma/schema.prisma
```

---

## 7. Seed Data
Seed default accounts, tournaments, categories, courts, teams, players, and sample matches:
```bash
npx tsx packages/database/src/seed.ts
```

---

## 8. Test Accounts
| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `admin@badminton.live` | `AdminPassword123!` | Full System & Security Control |
| **TOURNAMENT_ADMIN** | `tournament@badminton.live` | `AdminPassword123!` | Tournament, Fixture & Court Admin |
| **SCORER** | `scorer@badminton.live` | `ScorerPassword123!` | Live Scorer Console Access |
| **VIEWER** | N/A (Public) | Public Access | Read-Only Scores & WebSockets |

---

## 9. Production Build
Compile all TypeScript packages and build production assets:
```bash
# Build packages
npm run build --workspace=packages/database
npm run build --workspace=packages/scoring
npm run build --workspace=packages/shared

# Build apps
npm run build --workspace=apps/api
npm run build --workspace=apps/web
```

---

## 10. Production Deployment
Deploy full production stack via Docker Compose (Postgres, API, Nginx Web Server):
```bash
# Build and run containers in background
docker compose up -d --build
```
Verify all 3 services (`badminton-live-db`, `badminton-live-api`, `badminton-live-web`) are healthy:
```bash
docker compose ps
```

---

## 11. Environment Variables
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Environment mode (`development` / `production`) |
| `PORT` | `4000` | Express API internal port |
| `HTTP_PORT` | `80` | Public Nginx web server port |
| `CORS_ORIGIN` | `http://localhost` | Allowed CORS origin domain |
| `POSTGRES_DB` | `badminton_live` | PostgreSQL database name |
| `POSTGRES_USER` | `badminton` | PostgreSQL database user |
| `POSTGRES_PASSWORD` | Secret string | PostgreSQL database password |
| `DATABASE_URL` | Connection string | Prisma database connection URL |
| `JWT_SECRET` | Secret string | Access token signing key |
| `JWT_REFRESH_SECRET` | Secret string | Refresh token signing key |

---

## 12. Database Backup
Run the automated PostgreSQL backup procedure script:

**Linux / macOS:**
```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

**Windows PowerShell:**
```powershell
.\scripts\backup-db.ps1
```
Backups are saved to `./backups/badminton_live_backup_YYYYMMDD_HHMMSS.sql`.

---

## 13. Database Restore
Restore PostgreSQL from a SQL backup file:

**Linux / macOS:**
```bash
chmod +x scripts/restore-db.sh
./scripts/restore-db.sh ./backups/badminton_live_backup_20260925_000000.sql
```

**Windows PowerShell:**
```powershell
.\scripts\restore-db.ps1 -BackupFile .\backups\badminton_live_backup_20260925_000000.sql
```

---

## 14. Updating Application
To pull latest updates and deploy zero-downtime container updates:
```bash
git pull origin main
docker compose up -d --build
docker compose exec api npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma
```

---

## 15. Troubleshooting
* **Database Connection Issues**: Verify Postgres status via `docker compose logs postgres`.
* **WebSocket Connection Drops**: Ensure Nginx configuration includes `Upgrade` and `Connection` headers for `/socket.io/`.
* **Port Conflicts**: Change `HTTP_PORT=80` or `PORT=4000` in `.env`.
* **Prisma Schema Drift**: Reset development database via `npx prisma migrate reset`.

---

