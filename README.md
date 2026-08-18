# PortScale PaaS

PortScale is a mini serverless Platform-as-a-Service (PaaS) inspired by Heroku and Vercel. 
It automates deploying applications from GitHub repositories by building Docker images and routing traffic via a Traefik reverse proxy.

## Architecture

```
                       +-------------------+
                       |                   |
    User Traffic ----> |   Traefik Proxy   | -----> Deployed App Container 1 (app1.localhost)
                       |   (port 80/443)   | -----> Deployed App Container 2 (app2.localhost)
                       |                   |
                       +---------+---------+
                                 |
                                 | (dynamic routing config via Docker tags)
                                 |
                       +---------v---------+
    GitHub Webhooks -> |                   |
    User API Calls --> |   Control Plane   |
                       |   (FastAPI)       |
                       +---------+---------+
                                 |
                                 v
                       +-------------------+
                       |   Redis & Celery  | ---> Worker (Builds & runs Docker containers)
                       +-------------------+
```

## Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+ (for Dashboard)
- GitHub Account (for OAuth Apps)

## Quick Start

1. **Clone and Configure**
   ```bash
   git clone <repo>
   cd PortScale
   cp .env.example .env
   ```
   Fill in `.env` with your GitHub OAuth App credentials.

2. **Start Infrastructure**
   ```bash
   docker-compose up -d --build
   ```

3. **Access Services**
   - Control Plane API: `http://localhost:8000/docs`
   - Dashboard: `http://localhost:3000`
   - Traefik Dashboard: `http://localhost:8080`

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string |
| `REDIS_URL` | Redis URL for Celery and WebSockets |
| `GITHUB_CLIENT_ID` | GitHub OAuth App ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Secret |
| `JWT_SECRET` | Secret for encoding API tokens |
| `NEXTAUTH_SECRET` | Secret for Next.js Auth sessions |

## Troubleshooting
- **Docker API Errors**: Ensure `/var/run/docker.sock` is mounted correctly and has permissions.
- **Webhook Not Firing**: Ensure your local instance is exposed to the internet (e.g. using ngrok) if you are testing real GitHub webhooks.
