@echo off
title Bot
set PATH=%PATH%;C:\Users\jeffr\Documents\GitHub\Discord\ffmpeg\bin
:: node [--inspect] <config>
:restart
node index.js configs/config.hjson
if %errorlevel% equ 64 goto restart
pause
