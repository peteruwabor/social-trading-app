# Gioat - Monorepo

A pnpm workspaces monorepo for the Gioat investment platform.

## 📦 Packages

| Package | Description |
|---------|-------------|
| `api` | NestJS 12 API with TypeScript 5 |
| `common` | Shared utilities and types |
| `db` | PostgreSQL migrations and schema |
| `tests` | Jest root for unit and E2E tests |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL 15+

### Environment Setup

1. Copy the environment template:
```bash
cp env.sample .env
```

2. Update `.env` with your PostgreSQL credentials:
```bash
# PostgreSQL connection
PGHOST=localhost
PGPORT=5432
PGDATABASE=gioat_dev
PGUSER=gioat
PGPASSWORD=gioat_dev_pwd

# SnapTrade Configuration
SNAPTRADE_CLIENT_ID=your-client-id
SNAPTRADE_CONSUMER_KEY=your-consumer-key

# Security Configuration
VAULT_KEY=your-64-character-hex-key
```

3. Install dependencies:
```bash
pnpm install
```

### Database Setup

1. Create a local PostgreSQL database:
```bash
# macOS examples — adapt for Windows/Linux
# 1. initialise the data directory (if Postgres.app, click "Initialize")
brew services start postgresql@17           # if Homebrew install

# 2. create isolated user/db for gioat
psql -U $(whoami) -d postgres <<'SQL'
create user gioat password 'gioat_dev_pwd';
create database gioat_dev owner gioat;
\q
SQL

# 3. verify
psql -U gioat -d gioat_dev -c '\dt'
```

2. Run the database setup script:
```bash
cd packages/tests && node setup-db.ts
```

### Development

```bash
# Start API in development mode
pnpm dev

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e
```

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Runs NestJS API in watch mode |
| `pnpm test` | Runs Jest tests with coverage |
| `pnpm format` | Formats code with Prettier |
| `pnpm prisma:migrate` | Runs Prisma migrations in development mode |

## 🛠️ Development

### API Development

The API is built with NestJS 12 and TypeScript 5. It's located in `packages/api/`.

```bash
# Start API in development mode
pnpm --filter api dev

# Build API
pnpm --filter api build

# Run API tests
pnpm --filter api test
```

### PostgreSQL Integration

The API includes a typed PostgreSQL service wrapper with helper methods:

```typescript
import { PostgresService } from './lib/postgres.service';

// Insert a new user
const user = await PostgresService.insert('users', { email: 'user@example.com' });

// Select users with filters
const users = await PostgresService.select('users', { email: 'user@example.com' });

// Update user data
const updatedUsers = await PostgresService.update('users', 
  { id: 'user-id' }, 
  { email: 'new@example.com' }
);
```

### Authentication

The API includes an AuthGuard stub for development:

```typescript
import { AuthGuard } from './lib/auth.guard';

@Controller('protected')
@UseGuards(AuthGuard)
export class ProtectedController {
  // Routes are automatically authenticated with demo user
  // req.user = { id: 'seed-user', email: 'demo@gioat.app' }
}
```

### Database Migrations

Database migrations are managed through Prisma and located in `prisma/schema.prisma`.

```bash
# Apply migrations to database
pnpm prisma:migrate

# Generate Prisma client
pnpm db:generate

# Open Prisma Studio
pnpm db:studio

# Push schema changes without migrations
pnpm db:push
```

### Shared Utilities

Common utilities and types are in `packages/common/` and can be imported by other packages.

```typescript
import { formatDate, generateId, isValidEmail } from '@gioat/common';
```

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests for specific package
pnpm --filter api test
pnpm --filter tests test
```

### E2E Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run specific E2E test
pnpm test:e2e broker-connection.e2e.spec.ts
```

## 📁 Project Structure

```
gioat_project/
├── packages/
│   ├── api/                 # NestJS API
│   │   ├── src/
│   │   │   ├── lib/         # Shared services (PostgresService, AuthGuard, etc.)
│   │   │   ├── modules/     # Feature modules
│   │   │   └── main.ts
│   │   └── package.json
│   ├── common/              # Shared utilities
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   ├── db/                  # Database migrations
│   │   ├── migrations/
│   │   └── package.json
│   └── tests/               # Test suite
│       ├── unit/            # Unit tests
│       ├── e2e/             # E2E tests
│       └── package.json
├── pnpm-workspace.yaml
└── package.json
```

## 🔧 Configuration

### PostgreSQL

The application connects to PostgreSQL using the following environment variables:

- `PGHOST` - Database host (default: localhost)
- `PGPORT` - Database port (default: 5432)
- `PGDATABASE` - Database name
- `PGUSER` - Database user
- `PGPASSWORD` - Database password

### SnapTrade

For broker integration, configure SnapTrade credentials:

- `SNAPTRADE_CLIENT_ID` - SnapTrade client ID
- `SNAPTRADE_CONSUMER_KEY` - SnapTrade consumer key

### Security

For token encryption:

- `VAULT_KEY` - 64-character hex key for AES-256-GCM encryption