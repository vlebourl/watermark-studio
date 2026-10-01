@echo off
if exist "%~dp0node_modules\electron\dist\electron.exe" (
  pushd "%~dp0"
  start "Watermark Studio" "%~dp0node_modules\electron\dist\electron.exe" .
  popd
) else (
  start "Watermark Studio" "%~dp0release\win-unpacked\Watermark Studio.exe"
)
