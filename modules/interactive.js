require('../bot/util/prompt.js')

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
        commands[name] = new Command(commands[name], theModule)
    }
}

module.exports._commands = commands

// analogous to DiscordBot.executeCommand
console.readline.on('line', async (rawCommand) => {
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

        var send = mg => console.log(`[${name}] ${mg}`.magenta.bold)
        var msg = {
            content: rawCommand,
            client: _bot.client,
            send,
            channel: {send}
        }

        await cmd.invoke(_bot, fullCommand, msg, false)
    } else if (rawCommand.trim() !== '') {
        console.log(`[Commands] Invalid Command: ${name}`)
    }

    console.readline.prompt()
})


process.stdin.resume()
