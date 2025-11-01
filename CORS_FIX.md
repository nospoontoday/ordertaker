# CORS Error Fix Guide

Fix the CORS (Cross-Origin Resource Sharing) error when accessing the app from your droplet IP.

---

## Problem

```
Access to fetch at 'http://localhost:5000/api/auth/login' from origin 'http://165.232.167.105' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
The 'Access-Control-Allow-Origin' header has a value 'http://localhost:3000' that is not equal 
to the supplied origin.
```

**Cause:** Backend CORS is configured for `http://localhost:3000` but frontend is accessing from `http://165.232.167.105`

---

## Solution

### Step 1: Update Backend Environment

SSH into your droplet:

```bash
ssh root@165.232.167.105
cd /opt/ordertakerapp
```

Edit the backend environment file:

```bash
nano backend/.env
```

**Find this line:**
```
FRONTEND_URL=http://localhost
```

**Change it to:**
```
FRONTEND_URL=http://165.232.167.105
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

### Step 2: Restart Backend Service

```bash
docker compose -f docker-compose.prod.yml restart backend
```

Wait a few seconds for the backend to restart:

```bash
sleep 5
```

---

### Step 3: Verify Fix

Try logging in again:

```
http://165.232.167.105
```

**Login with:**
```
Email: oliverjohnpr2013@gmail.com
Password: 123456
```

✅ If login works → CORS issue fixed!

---

## Alternative: Update docker-compose.prod.yml

If the above doesn't work, you can also update the docker-compose file:

```bash
nano docker-compose.prod.yml
```

**Find the backend service section:**
```yaml
backend:
  image: oliverjohnpr2013/ordertaker-backend:latest
  ...
  environment:
    NODE_ENV: production
    MONGODB_URI: mongodb://admin:password123@mongo:27017/ordertaker?authSource=admin
    PORT: 5000
    FRONTEND_URL: http://localhost
```

**Change `FRONTEND_URL` to:**
```yaml
FRONTEND_URL: http://165.232.167.105
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

**Restart services:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Verify CORS is Fixed

### Check Backend Logs

```bash
docker compose -f docker-compose.prod.yml logs backend
```

Should show the backend is running with the correct FRONTEND_URL.

### Test API Directly

```bash
curl -X POST http://165.232.167.105/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"oliverjohnpr2013@gmail.com","password":"123456"}'
```

Should return a token (not a CORS error).

---

## Complete Fix Workflow

```bash
# 1. SSH into droplet
ssh root@165.232.167.105
cd /opt/ordertakerapp

# 2. Update backend environment
nano backend/.env
# Change: FRONTEND_URL=http://localhost
# To: FRONTEND_URL=http://165.232.167.105

# 3. Restart backend
docker compose -f docker-compose.prod.yml restart backend

# 4. Wait for restart
sleep 5

# 5. Test login
# Open browser: http://165.232.167.105
# Try logging in
```

---

## Troubleshooting

### Still Getting CORS Error?

1. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
   - Clear all cache
   - Try again

2. **Check backend logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend
   ```

3. **Verify environment variable:**
   ```bash
   docker exec ordertaker-backend env | grep FRONTEND_URL
   ```
   Should show: `FRONTEND_URL=http://165.232.167.105`

4. **Restart all services:**
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d
   sleep 10
   ```

### CORS Still Not Working?

Check if backend code is using the environment variable correctly:

```bash
# View backend server.js
docker exec ordertaker-backend cat server.js | grep -A 5 "CORS\|cors"
```

The backend should be using `process.env.FRONTEND_URL` for CORS configuration.

---

## Prevention for Future Deployments

Update your environment files before deployment:

### `backend/.env.prod`

```bash
FRONTEND_URL=http://165.232.167.105
```

### `.env.local.prod`

```bash
NEXT_PUBLIC_API_URL=http://165.232.167.105/api
```

Then run deployment:

```bash
bash start-prod.sh
```

---

## Quick Reference

| Issue | Fix |
|-------|-----|
| CORS error on login | Update `FRONTEND_URL` in backend/.env |
| API calls blocked | Restart backend: `docker compose restart backend` |
| Still getting error | Clear browser cache and try again |
| Unsure of current URL | Check: `docker exec ordertaker-backend env \| grep FRONTEND_URL` |

---

**Last Updated:** November 1, 2024
