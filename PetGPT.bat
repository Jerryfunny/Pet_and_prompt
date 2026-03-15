@echo off
chcp 65001 >nul

:: 动态路径（核心）
set "ROOT_DIR=%~dp0"
set "WEB_DIR=%ROOT_DIR%prompt\"

:: 目录校验（仅保留必要容错）
if not exist "%WEB_DIR%" (echo 目录不存在：%WEB_DIR% & pause & exit/b 1)

:: 1. Web服务（install+dev 同一窗口）
:: 第一次使用下方替换为：start "Web服务" cmd.exe /k "cd /d ""%WEB_DIR%"" && pnpm install && pnpm build && pnpm dev"

start "Web服务" cmd.exe /k "cd /d ""%WEB_DIR%packages\web"" && pnpm dev"


:: 2. PetGPT（独立窗口）
start "PetGPT" cmd.exe /k "cd /d ""%ROOT_DIR%"" && conda activate petgpt && python main.py"
