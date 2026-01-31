# Apply manual SQL migrations to the DATABASE_URL.
# Usage (PowerShell):
#   $env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/aus_property_db'
#   ./apply_migration.ps1

param(
  [string]$MigrationFile = "./prisma/migrations/0001_add_webhook_delivery.sql"
)

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL environment variable is not set. Export it before running this script."
  exit 1
}

# Parse DATABASE_URL into psql connection parameters
# Expected: postgresql://user:password@host:port/dbname
$uri = [System.Uri]::new($env:DATABASE_URL)
$userInfo = $uri.UserInfo.Split(":")
$user = $userInfo[0]
$pass = $userInfo[1]
$host = $uri.Host
$port = $uri.Port
$db = $uri.AbsolutePath.TrimStart('/')

# Write temporary SQL to a file with same path
$absMigration = Resolve-Path -Path $MigrationFile
Write-Host "Applying migration: $absMigration to $host:$port/$db"

$env:PGPASSWORD = $pass
$cmd = "psql -h $host -U $user -p $port -d $db -f `"$absMigration`""

Write-Host "Running: $cmd"

# Execute
Invoke-Expression $cmd

if ($LASTEXITCODE -ne 0) {
  Write-Error "psql returned non-zero exit code: $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host "Migration applied successfully."
