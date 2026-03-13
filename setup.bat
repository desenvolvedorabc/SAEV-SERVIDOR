@echo off
setlocal enabledelayedexpansion
REM Script de Setup e Inicializacao - SAEV Backend
REM Execute este script para configurar e iniciar o backend automaticamente

echo ==========================================
echo    SAEV Backend - Setup e Inicializacao
echo ==========================================
echo.

REM Verificar Node.js
echo [INFO] Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado
    echo   Instale Node.js 22.x LTS: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set "NODE_MAJOR=%%a"
set "NODE_MAJOR=%NODE_MAJOR:~1%"
if %NODE_MAJOR% LSS 22 (
    echo [ERRO] Node.js %NODE_MAJOR%.x encontrado, mas e necessario Node.js 22 ou superior
    echo   Versao atual:
    node -v
    echo   Instale Node.js 22.x LTS: https://nodejs.org/
    pause
    exit /b 1
)
node -v
echo [OK] Node.js encontrado
echo.

REM Verificar Yarn
echo [INFO] Verificando Yarn...
where yarn >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [AVISO] Yarn nao encontrado. Instalando...
    call npm install -g yarn
    if %ERRORLEVEL% NEQ 0 (
        echo [ERRO] Falha ao instalar Yarn
        pause
        exit /b 1
    )
)
call yarn --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Yarn nao esta disponivel
    pause
    exit /b 1
)
echo [OK] Yarn encontrado
echo.

REM Verificar Docker
echo [INFO] Verificando Docker...
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Docker nao encontrado
    echo   Instale Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
docker ps >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Docker nao esta rodando
    echo   Inicie o Docker Desktop e execute este script novamente
    pause
    exit /b 1
)
echo [OK] Docker rodando
echo.

echo ==========================================
echo    Instalando Dependencias
echo ==========================================
echo.

call yarn install
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao instalar dependencias
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas
echo.

echo ==========================================
echo    Configurando Ambiente
echo ==========================================
echo.

if exist .env (
    echo [OK] Arquivo .env ja existe
) else (
    if exist .env.example (
        echo [INFO] Criando arquivo .env...
        copy .env.example .env >nul
        echo [OK] Arquivo .env criado
    ) else (
        echo [ERRO] Arquivo .env.example nao encontrado
        pause
        exit /b 1
    )
)
echo.

echo ==========================================
echo    Iniciando MySQL
echo ==========================================
echo.

docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao iniciar MySQL
    echo [INFO] Se a porta 3306 esta ocupada por outro MySQL, pare-o com: net stop MySQL
    pause
    exit /b 1
)
echo [OK] Container MySQL iniciado
echo.

echo [INFO] Aguardando MySQL ficar pronto...
set /a RETRY_COUNT=0
set /a MAX_RETRIES=60

:wait_mysql
docker exec db mysqladmin ping -h localhost -u root -papp --silent >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] MySQL esta pronto!
    goto mysql_ready
)
echo|set /p="."
timeout /t 1 /nobreak >nul
set /a RETRY_COUNT+=1
if %RETRY_COUNT% LSS %MAX_RETRIES% goto wait_mysql

echo.
echo [ERRO] Timeout aguardando MySQL
pause
exit /b 1

:mysql_ready
echo.
echo.

echo ==========================================
echo    Iniciando Backend (primeira vez)
echo ==========================================
echo.
echo [INFO] Iniciando servidor em background para executar as migrations...

REM Iniciar backend em background para criar as tabelas via migrations
start "SAEV-Backend" /B cmd /c "yarn start:dev > .backend-init.log 2>&1"

echo [INFO] Aguardando backend criar as tabelas (migrations)...
set /a RETRY_COUNT=0
set /a MAX_RETRIES=120

:wait_backend
curl -s http://localhost:3003/api >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend esta pronto!
    goto backend_ready
)
echo|set /p="."
timeout /t 2 /nobreak >nul
set /a RETRY_COUNT+=1
if %RETRY_COUNT% LSS %MAX_RETRIES% goto wait_backend

echo.
echo [AVISO] Timeout aguardando backend. Tentando executar seeds mesmo assim...

:backend_ready
echo.
echo.

echo ==========================================
echo    Executando Scripts SQL (Seeds)
echo ==========================================
echo.

for %%f in (sql\*.sql) do (
    echo [INFO] Executando: %%~nxf
    docker exec -i db mysql -uroot -papp saev < "%%f" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [AVISO] Falha ao executar %%~nxf - pode ser dependencia de dados faltantes
    )
)
echo [OK] Scripts SQL processados
echo.

REM Parar o processo background antes de iniciar em modo interativo
echo [INFO] Parando instancia de background...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3003 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>nul
)
timeout /t 3 /nobreak >nul

echo ==========================================
echo    Iniciando Backend
echo ==========================================
echo.
echo [INFO] O servidor sera iniciado em modo desenvolvimento...
echo [INFO] Acesse a documentacao Swagger em: http://localhost:3003/api
echo.

REM Iniciar o servidor em modo interativo
call yarn start:dev
