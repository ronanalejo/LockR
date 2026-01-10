# Add .gitkeep to all empty directories in the project structure

$folders = @(
    "config",
    "config/environments",
    "backend/nodejs/config",
    "backend/nodejs/controllers",
    "backend/nodejs/models",
    "backend/nodejs/routes",
    "backend/nodejs/middleware",
    "backend/nodejs/services",
    "backend/nodejs/utils",
    "backend/nodejs/tests/unit",
    "backend/nodejs/tests/integration",
    "backend/nodejs/tests/fixtures",
    "backend/php/config",
    "backend/php/controllers",
    "backend/php/models",
    "backend/php/api",
    "backend/php/includes",
    "backend/php/middleware",
    "backend/php/services",
    "backend/php/utils",
    "backend/php/routes",
    "backend/php/tests/unit",
    "backend/php/tests/integration",
    "backend/php/tests/fixtures",
    "backend/uploads/receipts",
    "backend/uploads/profile-pictures",
    "backend/uploads/floor-plans",
    "backend/uploads/temp",
    "backend/logs",
    "frontend/src/components/common",
    "frontend/src/components/auth",
    "frontend/src/components/student",
    "frontend/src/components/osas",
    "frontend/src/components/finance",
    "frontend/src/components/ui",
    "frontend/src/pages/auth",
    "frontend/src/pages/student",
    "frontend/src/pages/osas",
    "frontend/src/pages/finance",
    "frontend/src/hooks",
    "frontend/src/context",
    "frontend/src/services",
    "frontend/src/utils",
    "frontend/src/constants",
    "frontend/src/assets/css",
    "frontend/src/assets/images/logos",
    "frontend/src/assets/images/icons",
    "frontend/src/assets/images/floor-plans",
    "frontend/src/assets/images/backgrounds",
    "frontend/src/assets/fonts",
    "frontend/tests/components",
    "frontend/tests/pages",
    "frontend/tests/hooks",
    "frontend/tests/utils",
    "database/migrations",
    "database/seeds",
    "database/backups",
    "shared/constants",
    "shared/types",
    "docs",
    "scripts",
    "cloudflare",
    "testing/postman",
    "testing/phpunit",
    "testing/jest"
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        New-Item -Path "$folder/.gitkeep" -ItemType File -Force | Out-Null
        Write-Host "Added .gitkeep to $folder" -ForegroundColor Green
    } else {
        Write-Host "Folder not found: $folder" -ForegroundColor Yellow
    }
}

Write-Host "`nDone! All .gitkeep files created." -ForegroundColor Cyan