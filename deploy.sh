#!/bin/bash
# Quick deployment script for Kachuful backend

echo "🚀 Kachuful Backend Deployment Script"
echo "======================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git initialized"
fi

# Add all files
echo "📝 Adding files to Git..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "Deploy Kachuful backend to production" || echo "⚠️  No changes to commit"

echo ""
echo "✅ Ready to push to GitHub!"
echo ""
echo "Next steps:"
echo "1. Create repository at: https://github.com/new"
echo "2. Run: git remote add origin https://github.com/YOUR_USERNAME/kachuful-backend.git"
echo "3. Run: git push -u origin main"
echo ""
echo "Then deploy to Railway:"
echo "1. Go to: https://railway.app"
echo "2. New Project → Deploy from GitHub"
echo "3. Select your repository"
echo "4. Add MONGODB_URI environment variable"
echo ""
