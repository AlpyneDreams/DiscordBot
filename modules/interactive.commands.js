// easy shared variables
var g = {
    foundChannels: []
}


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
    
    var index = parseInt(input)
    if (index && index > 0 && index <= g.foundChannels.length) {
        return g.foundChannels[index - 1]
    }

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
            result = e.bot.client.channels.filter(u => u && u.name && u.name.toLowerCase() === input.toLowerCase())
        }

    if (!result) return null

    else if (result instanceof Map && result.size === 1) {
        result = result.first()
    }
    return result
}

function channelString(c) {
    var name = c.type === 'text' ? '#' + c.name : c.name
    var inGuild = c.guild ? ` in ${c.guild.name}` : ''
    return `${c.constructor.name}: ${name}${inGuild} <#${c.id}>`
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
        args: [0, 1],
        async execute(e) {

            if (e.args.length === 0) {
                e.send(`Last search found ${g.foundChannels.length} channels:`)
                for (const [i, c] of g.foundChannels.entries()) {
                    e.send(`  ${i + 1}: ${channelString(c)}`)                    
                }
                return
            }

            var channel = await smartFindChannels(e, e.args[0])
            
            if (channel) {
                g.channel = channel
                if (channel instanceof Map) {
                    e.send(`Found ${channel.size} channels: `)
                    g.foundChannels = []
                    for (var c of channel.values()) {
                        var length = g.foundChannels.push(c)
                        e.send(`  ${length}: ${channelString(c)}`)
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
    'list': {
        execute(e) {
            if (!g.channel) return e.send('No channel selected.')
            e.send(g.channel.members.map(x => x.user ? x.user.username : null).join(', '))
        }
    },
    'report': {
        reload: true,
        execute(e) {
            const report = [
                {name: "Channels", count: e.client.channels.size},
                {name: "Emojis", count: e.client.emojis.size},
                {name: "Guilds", count: e.client.guilds.size},
                {name: "Presences", count: e.client.presences.size},
                {name: "Users", count: e.client.users.size},
                {name: "Voice Broadcasts", count: e.client.broadcasts.length},
                {name: "Voice Connections", count: e.client.voiceConnections .size}
            ]
            console.table(report)

            var guildReport = []
            for (var guild of e.client.guilds.values()) {
                guildReport.push({
                    name: guild.name,
                    members: guild.members.size,
                    presences: guild.presences.size
                })
            }
            guildReport = guildReport.sort((a, b) => b.members - a.members)
            console.table(guildReport)

            var channelReport = []
            for (var channel of e.client.channels.values()) {
                if (!channel.messages) continue
                channelReport.push({
                    name: channel.name,
                    messages: channel.messages.size
                })
            }
            channelReport = channelReport.sort((a, b) => b.messages - a.messages).slice(0, 16)
            console.table(channelReport)
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


module.exports = {interactiveCommands: commands, filename: module.filename}