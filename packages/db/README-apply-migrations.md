Apply manual SQL migrations

Because Docker/psql may not be available in some environments, this repo includes a manual SQL migration and a PowerShell script to apply it.

Steps:

1. Ensure Postgres is running and reachable (via Docker or installed locally).
2. Set `DATABASE_URL` environment variable, for example in PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/aus_property_db'
```

3. From project root run:

```powershell
cd packages/db
pwsh ./scripts/apply_migration.ps1
```

Note: `psql` must be installed and available in PATH for the script to work.

After applying SQL, run Prisma generate in your Node environment to refresh client:

```bash
# from project root
pnpm --filter packages/db prisma generate
```

Or, if you use npx/prisma directly:

```bash
npx prisma generate --schema packages/db/prisma/schema.prisma
```
