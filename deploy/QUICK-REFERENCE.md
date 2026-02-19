# ZekiKod Production Deployment - Quick Reference

## Current Status

✅ **Backend**: http://localhost:3008
✅ **Frontend**: http://localhost:7007

## Quick Commands

### Start Services
```bash
pm2 start ecosystem.config.js --env production
```

### Stop Services
```bash
pm2 stop all
```

### Restart Services
```bash
pm2 restart all
```

### View Status
```bash
pm2 status
# or
deploy\status.bat
```

### View Logs
```bash
pm2 logs                    # All logs
pm2 logs zekikod-backend    # Backend only
pm2 logs zekikod-frontend   # Frontend only
```

### Real-time Monitoring
```bash
pm2 monit
```

## Health Checks

### Backend Health
```bash
curl http://localhost:3008/api/health
```

### Frontend Check
```bash
curl http://localhost:7007
```

## File Locations

- **Backend Code**: `apps/server/dist/`
- **Frontend Code**: `apps/ui/dist/`
- **Logs**: `deploy/logs/`
- **Data**: `data/`
- **PM2 Config**: `ecosystem.config.js`

## Troubleshooting

### Backend Not Starting
1. Check logs: `pm2 logs zekikod-backend`
2. Verify port 3008 is not in use: `netstat -ano | findstr :3008`
3. Check Node.js version: `node --version` (should be 18+)

### Frontend Not Loading
1. Check logs: `pm2 logs zekikod-frontend`
2. Verify dist folder exists: `dir apps\ui\dist`
3. Check port 7007 is not in use: `netstat -ano | findstr :7007`

### WebSocket Issues
1. Backend must be running on port 3008
2. Check firewall allows port 3008
3. Verify WebSocket connection at: ws://localhost:3008/ws

## Auto-start on Boot

Run once (as Administrator or current user):
```bash
deploy\setup-startup.bat
```

This adds PM2 to Windows startup items.

## IIS Deployment (Alternative)

If you want to use IIS instead of PM2 for frontend:

1. Install IIS features (Windows features)
2. Install URL Rewrite and ARR modules
3. Copy `apps\ui\dist` to IIS web root
4. Create new IIS site pointing to that folder
5. Backend still runs via PM2 on port 3008

See `deploy\README.md` for detailed IIS setup.

## Updates

```bash
# Pull latest code
git pull

# Rebuild
npm run build:packages
npm run build:server
npm run build

# Restart services
pm2 restart all

# If frontend changed, no further action needed
# (PM2 serves from dist folder automatically)
```

## Backup

Important directories to backup:
- `data/` - User settings, credentials, sessions
- `.automaker/` - Project-specific data (if exists)

## Support

- Logs: `deploy\logs/`
- PM2 Dashboard: `pm2 monit`
- Backend Health: http://localhost:3008/api/health
