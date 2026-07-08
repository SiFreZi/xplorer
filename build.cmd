@echo off
REM ===========================================================================
REM  build.cmd - Build BOTH the standalone Xplorer .exe AND the NSIS installer
REM  in a SINGLE Tauri build, then copy both into the repository root.
REM
REM  A single `tauri build --bundles nsis` already compiles the release exe
REM  (apps\src-tauri\target\release\xplorer.exe) and then bundles it into the
REM  NSIS installer -- so there is no need to run two separate builds, which
REM  would recompile/relink the ~51 MB binary twice and bump the version twice.
REM
REM  - Produces ONLY the NSIS bundle (no MSI/WiX): the installer runs per-user
REM    and needs NO administrator rights.
REM  - Pure batch (cmd) - unaffected by restrictive PowerShell execution
REM    policies (e.g. AllSigned enforced via Group Policy).
REM  - Uses ALL CPU cores for the Rust compile (Cargo default; made explicit
REM    here via CARGO_BUILD_JOBS so it is easy to override).
REM  - Loads a portable MSVC toolchain via devcmd.bat when no system-wide
REM    Visual Studio C++ Build Tools are installed. Override its path with the
REM    XPLORER_DEVCMD_BAT environment variable.
REM
REM  Usage:  double-click, or run  build.cmd  from a terminal.
REM          Override cores with:  set CARGO_BUILD_JOBS=8 && build.cmd
REM ===========================================================================
setlocal enableextensions

cd /d "%~dp0"

if not defined CARGO_BUILD_JOBS set "CARGO_BUILD_JOBS=%NUMBER_OF_PROCESSORS%"

REM --- Increment the app version (patch) once before building. ---------------
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
echo Building Xplorer exe + NSIS installer with %CARGO_BUILD_JOBS% parallel Cargo jobs...
echo.

call pnpm.cmd tauri build --bundles nsis
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
if errorlevel 1 (
  echo.
  echo Failed to copy xplorer.exe to the repository root.
  endlocal & exit /b 1
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
  echo Build succeeded -- both artifacts are in the repository root:
  echo   xplorer.exe
  echo   %SETUP%
) else (
  echo Build succeeded but copying the installer to the repo root FAILED ^(code %RC%^).
)

endlocal & exit /b %RC%
