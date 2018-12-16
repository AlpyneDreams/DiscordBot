@echo off
title Bot
set PATH=%PATH%;C:\Users\jeffr\Documents\GitHub\Discord\ffmpeg\bin
:: node [--inspect] <config>
node index configs/config_selfbot.hjson
pause
