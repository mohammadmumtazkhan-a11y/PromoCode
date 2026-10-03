@echo off
cd /d "%~dp0"
echo Loading demo referral data (the app must be running)...
node scripts\seed_referral_demo.js
echo.
echo Done. Refresh http://localhost:5173/growth/referral-tracking
pause
