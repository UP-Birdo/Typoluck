@echo off
rem Startet den lokalen Test-Server fuer Typoluck.
rem Doppelklick genuegt; das Fenster bleibt offen, Beenden mit Strg+C.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Lokal-Starten.ps1"
pause
