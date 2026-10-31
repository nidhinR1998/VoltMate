@echo off
title VoltMate APK Build ^& Git Push Pipeline
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-and-deploy.ps1" %*
pause

