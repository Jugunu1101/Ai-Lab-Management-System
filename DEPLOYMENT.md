# Deployment & Orchestration Guide

This guide details how to build, orchestrate, and deploy the entire **AI-Powered Programming Lab Management Platform** in both **Local Testing** and **Hardened Production** environments.

---

## 1. Environments Overview

| Feature | Local / Testing (`docker-compose.yml`) | Hardened Production (`docker-compose.prod.yml`) |
|---|---|---|
| **Primary Goal** | Fast iteration, debugging, local development | Security, stability, isolation, high availability |
| **Port Exposure** | All ports open (80, 5173, 3000, 8000, 6379, 27017) | **Only 80 & 443 are public**; all internal services isolated |
| **Reverse Proxy** | Nginx on port 80 & 5173 | Nginx on port 80 & 443 with SSL/TLS (HTTPS) + ACME challenge |
| **Database Security** | Unauthenticated local connection | Password-protected MongoDB + Redis `requirepass` |
| **AI Service** | `AI_MOCK_MODE=true` by default | Live OpenAI API with fallback |
| **Resource Limits** | Unbounded | Hard CPU & RAM caps per container |
| **Logging** | Standard Docker stdout | `json-file` with strict 20MB log rotation (prevents disk fill) |
| **Restart Policy** | `unless-stopped` | `always` |

---

## 2. Hardened Production Deployment (Cloud / VPS)

Follow these steps to deploy on an Ubuntu / Debian cloud server (e.g. AWS EC2, DigitalOcean, Hetzner, Linode).

### Step 1: Server Preparation & Docker Installation

SSH into your production server:

```bash
# Update package repositories
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git

# Install official Docker CE and Compose plugin
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker service
sudo systemctl enable --now docker
```

### Step 2: Clone Repository & Configure Production Environment

```bash
# Clone the repository
git clone <your-repo-url> /opt/programming-lab
cd /opt/programming-lab

# Create production environment file from template
cp .env.production.example .env.production
```

Edit `.env.production`:
```bash
nano .env.production
```

Fill in your production values:
```env
DOMAIN=lab.yourdomain.com
NODE_ENV=production
APP_ENV=production
PORT=3000

# Generate a strong 64-character hex secret: openssl rand -hex 32
JWT_SECRET=your_generated_random_64_char_secret

# MongoDB Root Authentication
MONGO_ROOT_USER=labadmin
MONGO_ROOT_PASSWORD=your_strong_mongo_password
MONGODB_URI=mongodb://labadmin:your_strong_mongo_password@mongodb:27017/ai-lab?authSource=admin

# Redis Password
REDIS_PASSWORD=your_strong_redis_password
REDIS_URL=redis://redis:6379

# AI Service
OPENAI_API_KEY=sk-your-live-openai-api-key
AI_MOCK_MODE=false
CORS_ORIGIN=https://lab.yourdomain.com
```

### Step 3: Pre-cache Execution Sandbox Images

Student submissions run in isolated runner containers. Pre-pull them on the host so code runs instantly:

```bash
docker pull node:22-alpine
docker pull python:3.11-alpine
docker pull gcc:alpine
docker pull eclipse-temurin:21-alpine
```

### Step 4: Run the Production Deployment Script

We provide an automated deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

Or execute via Docker Compose directly:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

### Step 5: Seed Initial Administrator & Demo Data

Once containers are healthy, seed the database with pre-configured accounts:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

**Default Credentials:**
- **Admin**: `admin@lab.edu` | `Password@123`
- **Teacher**: `teacher@lab.edu` | `Password@123`
- **Student**: `student@lab.edu` | `Password@123`

*(Important: Change these passwords after initial login in production).*

### Step 6: SSL / HTTPS Configuration (Let's Encrypt)

If you have mapped a domain (e.g. `lab.yourdomain.com`) to your server IP:

1. Obtain your initial certificate using the pre-configured Certbot service:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm certbot certonly \
     --webroot --webroot-path=/var/www/certbot \
     --email admin@yourdomain.com --agree-tos --no-eff-email \
     -d lab.yourdomain.com
   ```

2. Replace the Nginx configuration with the SSL configuration:
   - Edit `frontend/nginx.ssl.conf` and update `yourdomain.com` with your actual domain.
   - Copy `frontend/nginx.ssl.conf` into the running container or rebuild:
     ```bash
     docker compose -f docker-compose.prod.yml exec frontend cp /app/nginx.ssl.conf /etc/nginx/conf.d/default.conf
     docker compose -f docker-compose.prod.yml exec frontend nginx -s reload
     ```

Certificates will automatically renew every 12 hours via the background `certbot` container.

---

## 3. Local Testing / Staging Deployment

For local testing on a development machine:

```bash
# 1. Create .env from template
cp .env.example .env

# 2. Build and launch all 5 containers
docker compose up -d --build

# 3. Seed database
docker compose exec backend npm run seed
```

### Local Test Endpoints:
- **Frontend App**: [http://localhost](http://localhost) (or [http://localhost:5173](http://localhost:5173))
- **Backend API**: [http://localhost:3000/api](http://localhost:3000/api)
- **Backend Health Probe**: [http://localhost:3000/health](http://localhost:3000/health)
- **AI Service OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Redis Server**: `localhost:6379`
- **MongoDB Database**: `localhost:27017`

---

## 4. Maintenance & Operations Cheatsheet

### Check Container Health & Status
```bash
docker compose -f docker-compose.prod.yml ps
```

### View Real-time Application Logs
```bash
# All containers
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Backend only
docker compose -f docker-compose.prod.yml logs -f backend

# AI microservice only
docker compose -f docker-compose.prod.yml logs -f ai-service
```

### Zero-Downtime Service Update (Rolling Restart)
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Backup Production MongoDB Database
```bash
docker compose -f docker-compose.prod.yml exec mongodb mongodump \
  --username labadmin --password your_strong_mongo_password --authenticationDatabase admin \
  --db ai-lab --out /data/db/backup_$(date +%Y%m%d)
```

### Stop Production Stack
```bash
docker compose -f docker-compose.prod.yml down
```
