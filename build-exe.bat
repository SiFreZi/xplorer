@echo off
REM ===========================================================================
REM  build-exe.bat - Build the standalone Xplorer .exe (no installer bundles).
REM
REM  - Pure batch (cmd) - does NOT use PowerShell, so it is unaffected by
REM    restrictive PowerShell execution policies (e.g. AllSigned enforced via
REM    Group Policy, where "-ExecutionPolicy Bypass" is ignored).
REM  - Uses ALL CPU cores for the Rust compile (Cargo default; made explicit
REM    here via CARGO_BUILD_JOBS so it is easy to override).
REM  - Loads a portable MSVC toolchain via devcmd.bat when no system-wide
REM    Visual Studio C++ Build Tools are installed. Override its path with the
REM    XPLORER_DEVCMD_BAT environment variable.
REM
REM  Usage:  double-click, or run  build-exe.bat  from a terminal.
REM          Override cores with:  set CARGO_BUILD_JOBS=8 && build-exe.bat
REM ===========================================================================
setlocal enableextensions

cd /d "%~dp0"

if not defined CARGO_BUILD_JOBS set "CARGO_BUILD_JOBS=%NUMBER_OF_PROCESSORS%"

REM --- Increment the app version (patch) before building. --------------------
call node "%~dp0scripts\bump-version.mjs"
if errorlevel 1 (
  echo.
  echo Version bump FAILED.
  endlocal & exit /b 1
)

REM --- Load the MSVC build environment (portable toolchain) if available. -----
set "DEVCMD=%XPLORER_DEVCMD_BAT%"
if not defined DEVCMD set "DEVCMD=%USERPROFILE%\BuildTools\devcmd.bat"
if exist "%DEVCMD%" (
  echo Loading portable MSVC environment: %DEVCMD%
  call "%DEVCMD%"
) else (
  echo No portable MSVC env at "%DEVCMD%" ^(set XPLORER_DEVCMD_BAT to override^); assuming MSVC is already on PATH.
)

REM devcmd.bat may change the current directory; move to the Tauri app folder.
cd /d "%~dp0apps"

echo.
echo Building Xplorer with %CARGO_BUILD_JOBS% parallel Cargo jobs...
echo.

call pnpm.cmd tauri build --no-bundle
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo Build FAILED with exit code %RC%.
  endlocal & exit /b %RC%
)

REM --- Copy the freshly built exe into the repository root. -------------------
set "EXE=%~dp0apps\src-tauri\target\release\xplorer.exe"
if not exist "%EXE%" (
  echo.
  echo Build reported success but the exe was not found at:
  echo   %EXE%
  endlocal & exit /b 1
)

copy /y "%EXE%" "%~dp0xplorer.exe" >nul
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo Build succeeded: xplorer.exe ^(in repository root^)
) else (
  echo Build succeeded but copying the exe to the repo root FAILED ^(code %RC%^).
)

endlocal & exit /b %RC%
