require('../bot/util/prompt.js')

const Command = require('../bot/Command.js')
const getPrettyStatus = require('../modules_selfbot/logging.js').getPrettyStatus

var _bot


// easy shared variables
var g = {}

async function smartFindUser(e, input) {
    // trim & remove leading @ signs
    input = input.replace(/^@+/gi, '').trim()
    
    var result

    if (e.bot.client.users.has(input)) {
        result = e.bot.client.users[input]
    } else { 
        if (!result)
            result = e.bot.client.users.find(u => u.username.toLowerCase() === input.toLowerCase())

        if (!result)
            user = e.bot.client.users.find(u => u.tag.toLowerCase() === input.toLowerCase())

        if (!result && parseInt(result))
            result = await e.bot.client.fetchUser(input)
    }
    if (!result) return null
    else return await e.bot.client.fetchUser(result.id)
}

async function smartFindChannels(e, input) {
    input = input.replace(/^#+/gi, '').trim()
    
    var result

    if (input.startsWith('@')) {
        var user = await smartFindUser(e, input)
        if (user) return user
    }

    if (e.bot.client.channels.has(input)) {
        return e.bot.client.channels.get(input)
    } else {
        if (!result)
            result = e.bot.client.channels.filter(u => u && u.name.toLowerCase() === input.toLowerCase())
        }

    if (!result) return null

    else if (result instanceof Map && result.size === 1) {
        result = result.first()
    }
    return result
}

const commands = {
    'eval': {
        args: 1,
        async execute(e) {
            try {
                var user = g.user
                var channel = g.channel
                var res = eval(e.args[0])
                console.dir(eval(e.args[0]), {depth: 3})
            } catch (err) {
                console.error(err)
            }
        }
    },
    'echo': {
        args: 1,
        async execute(e) {
            console.log(e.args[0])
        }
    },
    'user': {
        args: 1,
        async execute(e) {
            var user = await smartFindUser(e, e.args[0])
            if (user) {
                g.user = user
                e.send(`Found @${user.tag} <@${user.id}>`)
            } else {
                e.send(`No user found: '${e.args[0]}'`)
            }
        }
    },
    'channel': {
        args: 1,
        async execute(e) {
            var channel = await smartFindChannels(e, e.args[0])
            if (channel) {
                g.channel = channel
                if (channel instanceof Map) {
                    e.send(`Found ${channel.size} channels: `)
                    for (var c of channel.values()) {
                        var name = c.type === 'text' ? '#' + c.name : c.name
                        var inGuild = c.guild ? ` in ${c.guild.name}` : ''
                        e.send(`  ${c.constructor.name}: ${name}${inGuild} <#${c.id}>`)
                    }
                } else if (channel.username) {
                    e.send(`Selected DM channel with @${channel.tag} ${channel}`)
                } else {
                    var name = channel.type === 'text' ? '#' + channel.name : channel.name
                    e.send(`Selected channel ${name} ${channel}`)
                }
            } else {
                e.send(`No channel found: '${e.args[0]}'`)
            }
        }
    },
    'send': {
        args: 1,
        execute(e) {
            if (!g.channel) return e.send('No channel selected.')
            var msg = e.args[0]
            // contrived way to allow $$ to escape
            var resolve = (name, val) => msg = msg.replace(`${name}`, val).replace(`$${val}`, `$${name}`)
            resolve('$channel', g.channel)
            resolve('$user', g.user)
            g.channel.send(msg)
        }
    },
    async exit(e) {
        await e.bot.destroy()
        process.exit(0)
    }
}

// aliases
commands.say = commands.send
commands.quit = commands.exit

module.exports.init = (theBot, theModule) => {
    _bot = theBot

    for (name in commands) {
        //console.log("[Commands] Registering Command: " + name)
        commands[name] = new Command(commands[name], theModule)
    }
}

module.exports._commands = commands

console.readline.on('line', async (rawCommand) => {
    var fullCommand = rawCommand.split(' ')
    var name = fullCommand[0]
    
    if (name in commands) {
        var cmd = commands[name]
        var send = mg => console.log(`[${name}] ${mg}`.magenta.bold)
        var msg = {
            content: rawCommand,
            send,
            channel: {send}
        }
        
        await cmd.invoke(_bot, fullCommand, msg, false)
    } else {
        console.log(`[Commands] Invalid Command: ${name}`)
    }

    console.readline.prompt()
})


process.stdin.resume()
