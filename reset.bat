@echo off
REM Script de Reset - SAEV Backend

echo ==========================================
echo    SAEV Backend - Reset
echo ==========================================
echo.
echo [AVISO] Este script ira:
echo   - Parar e remover container MySQL
echo   - Remover node_modules
echo   - Remover arquivo .env
echo   - Remover yarn.lock
echo.
echo Deseja continuar? (S/N)
set /p CONFIRM=

if /i not "%CONFIRM%"=="S" (
    echo Cancelado.
    pause
    exit /b 0
)

echo.
echo [INFO] Parando container MySQL...
docker-compose down -v 2>nul
echo [OK] Container parado

echo.
echo [INFO] Removendo dependencias...
if exist node_modules rmdir /s /q node_modules
if exist yarn.lock del yarn.lock
if exist .env del .env
echo [OK] Limpeza concluida

echo.
echo [OK] Reset concluido!
echo.
echo Para reinstalar: setup.bat
echo.
pause
