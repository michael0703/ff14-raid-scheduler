@echo off
echo VITE_DB_ADAPTER=local > .env.local
echo [Local Dev] Created .env.local (OFFLINE mode)
npx vite
pause
