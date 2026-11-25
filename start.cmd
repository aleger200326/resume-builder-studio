@echo off
cd /d "%~dp0"
set PORT=4174
echo Open http://127.0.0.1:4174/
node --watch server.mjs
if errorlevel 1 pause
