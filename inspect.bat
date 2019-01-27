@echo off
title Selfbot
set PATH=%PATH%;C:\Users\jeffr\Documents\GitHub\Discord\ffmpeg\bin
node --inspect index configs/config_selfbot.hjson
pause
