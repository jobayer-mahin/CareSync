@echo off
@REM ----------------------------------------------------------------------------
@REM CareSync Maven Wrapper (Windows)
@REM   mvnw.cmd clean test
@REM Downloads Maven on first use (see .mvn\wrapper\maven-wrapper.properties).
@REM ----------------------------------------------------------------------------
setlocal
set "BASE_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%BASE_DIR%.mvn\wrapper\mvnw.ps1" %*
exit /b %ERRORLEVEL%
