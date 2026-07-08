@echo off
REM ===========================================================================
REM  build-exe.bat - Build the standalone Xplorer .exe (no installer bundles).
REM
REM  - Uses ALL CPU cores for the Rust compile (Cargo default; made explicit
REM    here via CARGO_BUILD_JOBS so it is easy to override).
REM  - Delegates to the "tauri:build:exe" pnpm task, which loads a portable
REM    MSVC toolchain (scripts/build-exe.ps1) when no system-wide Visual Studio
REM    C++ Build Tools are installed.
REM
REM  Usage:  double-click, or run  build-exe.bat  from a terminal.
REM          Override cores with:  set CARGO_BUILD_JOBS=8 && build-exe.bat
REM ===========================================================================
setlocal

cd /d "%~dp0"

if not defined CARGO_BUILD_JOBS set "CARGO_BUILD_JOBS=%NUMBER_OF_PROCESSORS%"
echo Building Xplorer with %CARGO_BUILD_JOBS% parallel Cargo jobs...
echo.

call pnpm run tauri:build:exe
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo Build succeeded: xplorer.exe ^(in repository root^)
) else (
  echo Build FAILED with exit code %RC%.
)

endlocal & exit /b %RC%
