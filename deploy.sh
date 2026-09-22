#!/usr/bin/env bash
set -e

# ==============================================================================
# Production Deployment Script — AI Programming Lab Platform
# ==============================================================================

echo "========================================================"
echo " Starting AI Programming Lab Production Deployment"
echo "========================================================"

# 1. Verify Prerequisites
command -v docker >/dev/null 2>&1 || { echo "Error: docker is not installed. Aborting." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Error: docker compose plugin is not installed. Aborting." >&2; exit 1; }

# 2. Check Environment Configuration
if [ ! -f ".env.production" ]; then
    if [ -f ".env" ]; then
        echo "Using existing .env file for deployment."
        ENV_FILE=".env"
    else
        echo "Creating .env.production from template..."
        cp .env.production.example .env.production
        echo "Please edit .env.production with your production secrets, then re-run this script."
        exit 1
    fi
else
    ENV_FILE=".env.production"
fi

# 3. Pre-cache Sandbox Execution Images on Host
echo ""
echo "--> Pre-caching sandbox runner images on host..."
docker pull node:22-alpine
docker pull python:3.11-alpine
docker pull gcc:alpine
docker pull eclipse-temurin:21-alpine

# 4. Build and Launch Containers
echo ""
echo "--> Building and starting production containers..."
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --build

# 5. Wait for Services to Become Healthy
echo ""
echo "--> Waiting for all services to pass health checks..."
sleep 10
docker compose -f docker-compose.prod.yml ps

# 6. Seed Database if requested
read -p "Do you want to seed the database with initial Admin/Teacher/Student accounts? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "--> Running database seed..."
    docker compose -f docker-compose.prod.yml exec backend npm run seed
fi

# 7. Final Verification
echo ""
echo "========================================================"
echo " DEPLOYMENT COMPLETE & OPERATIONAL!"
echo "========================================================"
echo "Services status:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Access your platform:"
echo "- Web Application: http://your-server-ip (or your configured domain)"
echo "- Health Check:    http://your-server-ip/health"
echo "========================================================"
