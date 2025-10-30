# Docker Commands Reference

## Development Mode (Hot Reload - No Rebuild Needed)

### Start Development Environment
```bash
docker compose -f docker-compose.dev.yml up -d
```

### Stop Development Environment
```bash
docker compose -f docker-compose.dev.yml down
```

### View Logs
```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f app
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f mongo
```

### Restart Services
```bash
docker compose -f docker-compose.dev.yml restart app
docker compose -f docker-compose.dev.yml restart backend
```

**Note**: In development mode, code changes are automatically detected and hot-reloaded. No rebuild needed!

---

## Production Mode (Requires Rebuild)

### Start Production Environment
```bash
docker compose up -d
```

### Rebuild and Start
```bash
docker compose up -d --build
```

### Stop Production Environment
```bash
docker compose down
```

---

## Useful Commands

### Execute Commands Inside Container
```bash
# Backend seed admin
docker exec ordertaker-backend node scripts/seedAdmin.js

# Backend shell
docker exec -it ordertaker-backend sh

# App shell
docker exec -it ordertaker-app sh
```

### Check Running Containers
```bash
docker ps
```

### Remove All Containers and Volumes (Clean Start)
```bash
docker compose -f docker-compose.dev.yml down -v
```

---

## Current Setup

- **MongoDB**: Port 27017
- **Backend API**: Port 5000
- **Next.js App**: Port 3000

### Access URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- MongoDB: mongodb://admin:password123@localhost:27017/ordertaker
