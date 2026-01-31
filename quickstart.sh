#!/bin/bash
# Quick Start Script for AUS Property Intelligence DB

set -e

echo "🚀 Starting AUS Property Intelligence Database..."
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Install with: npm install -g pnpm"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker"
    exit 1
fi

echo "✅ All prerequisites met"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo ""

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d
echo "✅ Docker services started"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo "   - Adminer: localhost:8080"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10
echo "✅ Services ready"
echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
pnpm db:migrate
echo "✅ Migrations complete"
echo ""

# Seed database
echo "🌱 Seeding database with demo data..."
pnpm db:seed
echo "✅ Database seeded"
echo ""

# Start development services
echo "🚀 Starting development services..."
echo ""
echo "Available commands:"
echo "  • pnpm dev          → Start all services"
echo "  • pnpm dev:api      → Start API only"
echo "  • pnpm dev:web      → Start web only"
echo "  • pnpm dev:workers  → Start workers only"
echo ""
echo "API Documentation:"
echo "  → http://localhost:3001/api/docs"
echo ""
echo "Frontend:"
echo "  → http://localhost:3000"
echo ""
echo "Admin Dashboard:"
echo "  → http://localhost:3000/admin"
echo ""

# Start services
pnpm dev
