
const readline = require('readline')
const rl = readline.createInterface(process.stdin, process.stdout)

rl.setPrompt("> ")

process.stdin.pause()

var _log = console.log
var _error = console.error

/* eslint-disable no-unused-vars */

console.log = function(msg) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    _log(...arguments)
    if (!process.stdin.isPaused())
        rl.prompt(true)
}


console.error = function(msg) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    _error(...arguments)
    if (!process.stdin.isPaused())
        rl.prompt(true)
}

/* eslint-enable no-unused-vars */

console.readline = rl