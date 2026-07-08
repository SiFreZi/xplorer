#!/usr/bin/env pwsh
# Build the standalone Xplorer executable (no installer bundles).
#
# On machines without a system-wide Visual Studio "Desktop development with C++"
# install, a portable MSVC toolchain (e.g. installed via PortableBuildTools) can be
# loaded automatically. Point XPLORER_DEVCMD at its devcmd.ps1, otherwise the default
# "$HOME\BuildTools\devcmd.ps1" is used. If neither exists, the build proceeds
# assuming the MSVC linker is already on PATH.
#
# Run with:  pnpm run tauri:build:exe
$ErrorActionPreference = 'Stop'
# Native tools (vite/pnpm) legitimately write to stderr; don't treat that as a failure.
$PSNativeCommandUseErrorActionPreference = $false

# Cargo already compiles crates in parallel across all cores. Make it explicit and
# allow callers (e.g. build.bat) to override via CARGO_BUILD_JOBS.
if (-not $env:CARGO_BUILD_JOBS) { $env:CARGO_BUILD_JOBS = "$env:NUMBER_OF_PROCESSORS" }
Write-Output "Using CARGO_BUILD_JOBS=$($env:CARGO_BUILD_JOBS) parallel jobs."

$devcmd = if ($env:XPLORER_DEVCMD) { $env:XPLORER_DEVCMD } else { Join-Path $HOME 'BuildTools\devcmd.ps1' }
if (Test-Path $devcmd) {
  Write-Output "Loading portable MSVC environment: $devcmd"
  . $devcmd
} else {
  Write-Output "No portable MSVC env at '$devcmd' (set XPLORER_DEVCMD to override); assuming MSVC is already on PATH."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot 'apps')
& pnpm.cmd tauri build --no-bundle
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$exe = Join-Path $repoRoot 'apps\src-tauri\target\release\xplorer.exe'
if (-not (Test-Path $exe)) {
  Write-Output "Build reported success but the exe was not found at: $exe"
  exit 1
}

# Copy the freshly built exe into the repository root for easy access.
$dest = Join-Path $repoRoot 'xplorer.exe'
Copy-Item -Path $exe -Destination $dest -Force
Write-Output "Built application: $dest"
exit 0
