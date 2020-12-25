const streamBuffers = require('stream-buffers')
const stripANSI = require('strip-ansi')

//const DiscordBot = require('../bot/DiscordBot.js')
const Command = require('../bot/Command.js')
//const getPrettyStatus = require('../modules_selfbot/logging.js').getPrettyStatus

/** @type {DiscordBot} */
var _bot

const cmdModule = require('./interactive.commands.js')
var commands = cmdModule.interactiveCommands

module.exports.init = (theBot, theModule) => {
    _bot = theBot

    for (const name in commands) {
        //console.log("[Commands] Registering Command: " + name)
        commands[name] = new Command(commands[name], theModule, name)
    }
}

module.exports._commands = commands

// analogous to DiscordBot.executeCommand
async function executeCommand(rawCommand, msgEvent = null) {
    var fullCommand = rawCommand.split(' ')
    var name = fullCommand[0]
    
    if (name in commands) {
        var cmd = commands[name]

        // commands with {reload: true} will always reload
        // their module before executing. use only for
        // development and debugging purposes
        if (cmd.reload) {
            try {
                delete require.cache[cmdModule.filename]
                commands = require('./interactive.commands.js').interactiveCommands
                _bot.modules.interactive.init(_bot, _bot.modules.interactive)

                cmd = commands[name]
            } catch (e) {
                console.error(e.stack)
            }
        }

        let send = mg => console.log(`[${name}] ${mg}`.magenta.bold)
        let msg = {
            content: rawCommand,
            client: _bot.client,
            plainText: false, // supports ANSI by default
            send,
            con: console
        }
        if (msgEvent) {
            // if invoked from discord we need a more complicated logging system
            msg = Object.assign(msg, msgEvent)
            let outStream = new streamBuffers.WritableStreamBuffer({
                initialSize: 4096,
                incrementAmount: 4096
            })
            msg.con = new console.Console({stdout: outStream, colorMode: false})
            msg.send = mg => msg.con.log(mg)
            msg.plainText = true // ANSI codes will be ignored

            await cmd.invoke(_bot, fullCommand, msg, false)
            
            if (outStream.size() > 0) {
                let out = outStream.getContentsAsString('utf8')
                msg.channel.send(stripANSI(out), {code: true, split: true})
            }
        } else {
            // invoke normally
            await cmd.invoke(_bot, fullCommand, msg, false)
        }
    } else if (rawCommand.trim() !== '') {
        if (msgEvent) {
            msgEvent.channel.send(`\`⚠️[Commands] Invalid Command: ${name}\``)
        } else {
            console.log(`[Commands] Invalid Command: ${name}`)
        }
    }

    console.readline.prompt()
}

module.exports.commands = {
    "c": {
        tags: 'owner',
        args: 1,
        execute(e) {
            executeCommand(e.args[0], e)
        }
    }
}


// prevent duplicate event listener registration
console.readline.listeners('line').forEach(fn => {
	if (fn.name === 'executeCommand') {
		console.readline.off('line', fn)
	}
})

// analogous to DiscordBot.executeCommand
console.readline.on('line', executeCommand)


process.stdin.resume()
