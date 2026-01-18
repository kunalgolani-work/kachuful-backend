# Quick deployment script for Kachuful backend (PowerShell)

Write-Host "🚀 Kachuful Backend Deployment Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
}

# Add all files
Write-Host "📝 Adding files to Git..." -ForegroundColor Yellow
git add .

# Commit
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Deploy Kachuful backend to production"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No changes to commit" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Ready to push to GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create repository at: https://github.com/new"
Write-Host "2. Run: git remote add origin https://github.com/YOUR_USERNAME/kachuful-backend.git"
Write-Host "3. Run: git push -u origin main"
Write-Host ""
Write-Host "Then deploy to Railway:" -ForegroundColor Cyan
Write-Host "1. Go to: https://railway.app"
Write-Host "2. New Project → Deploy from GitHub"
Write-Host "3. Select your repository"
Write-Host "4. Add MONGODB_URI environment variable"
Write-Host ""
