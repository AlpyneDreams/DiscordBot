const readline = require('readline')
const rl = readline.createInterface(process.stdin, process.stdout)

rl.setPrompt('Prompt$ ')
rl.prompt()

console.log('test')

setInterval(function() {
    console.log("[TEST] log msg")
}, 3000)

rl.on('line', line => {
    console.log("---" + line + "---")
    rl.prompt()
})