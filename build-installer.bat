@echo off
REM ===========================================================================
REM  build-installer.bat - Build the Xplorer NSIS installer and copy the
REM  setup .exe into the repository root.
REM
REM  - Produces ONLY the NSIS bundle (no MSI/WiX): the installer runs per-user
REM    and needs NO administrator rights.
REM  - Pure batch (cmd) - does NOT use PowerShell, so it is unaffected by
REM    restrictive PowerShell execution policies (e.g. AllSigned enforced via
REM    Group Policy, where "-ExecutionPolicy Bypass" is ignored).
REM  - Uses ALL CPU cores for the Rust compile (Cargo default; made explicit
REM    here via CARGO_BUILD_JOBS so it is easy to override).
REM  - Loads a portable MSVC toolchain via devcmd.bat when no system-wide
REM    Visual Studio C++ Build Tools are installed. Override its path with the
REM    XPLORER_DEVCMD_BAT environment variable.
REM
REM  Usage:  double-click, or run  build-installer.bat  from a terminal.
REM          Override cores with:  set CARGO_BUILD_JOBS=8 && build-installer.bat
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
echo Building Xplorer NSIS installer with %CARGO_BUILD_JOBS% parallel Cargo jobs...
echo.

call pnpm.cmd tauri build --bundles nsis
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo Build FAILED with exit code %RC%.
  endlocal & exit /b %RC%
)

REM --- Copy the freshly built installer into the repository root. -------------
set "NSIS_DIR=%~dp0apps\src-tauri\target\release\bundle\nsis"
set "SETUP="
for /f "delims=" %%F in ('dir /b /a-d /o-d "%NSIS_DIR%\*-setup.exe" 2^>nul') do (
  if not defined SETUP set "SETUP=%%F"
)
if not defined SETUP (
  echo.
  echo Build reported success but no NSIS setup .exe was found in:
  echo   %NSIS_DIR%
  endlocal & exit /b 1
)

copy /y "%NSIS_DIR%\%SETUP%" "%~dp0%SETUP%" >nul
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo Build succeeded: %SETUP% ^(in repository root^)
) else (
  echo Build succeeded but copying the installer to the repo root FAILED ^(code %RC%^).
)

endlocal & exit /b %RC%
