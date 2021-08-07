// easy shared variables
var g = {
    foundChannels: []
}


async function smartFindUser(e, input) {
    // trim & remove leading @ signs
    input = input.replace(/^@+/gi, '').trim()
    
    var result

    if (e.bot.client.users.cache.has(input)) {
        result = e.bot.client.users.cache[input]
    } else { 
        if (!result)
            result = e.bot.client.users.cache.find(u => u.username.toLowerCase() === input.toLowerCase())

        if (!result)
            result = e.bot.client.users.cache.find(u => u.tag.toLowerCase() === input.toLowerCase())

        if (!result && parseInt(result))
            result = await e.bot.client.users.fetch(input)
    }
    if (!result) return null
    else return await e.bot.client.users.fetch(result.id)
}

async function smartFindGuild(e, input) {
    input = input.toLowerCase()

    var result

    if (e.bot.client.guilds.cache.has(input)) {
        result = e.bot.client.guilds.cache[input]
    } else {
        result = e.bot.client.guilds.cache.find(g => g.name.toLowerCase().startsWith(input))

        if (!result && Number.isInteger(parseInt(input)))
            result = e.bot.client.guilds.cache.find(g => g.position === parseInt(input))
    }
    return result || null
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

    if (e.bot.client.channels.cache.has(input)) {
        return e.bot.client.channels.cache.get(input)
    } else {
        if (!result)
            result = e.bot.client.channels.cache.filter(u => u && u.name && u.name.toLowerCase() === input.toLowerCase())
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
    'help': {
        async execute(e) {
            e.con.group('Commands:')
            for (const cmd in commands) {
                let usage = commands[cmd].usage
                if (usage) {
                    e.con.log(`${cmd} ${usage}`)
                } else {
                    e.con.log(cmd)
                }
                
            }
            e.con.groupEnd()
        }
    },
    'eval': {
        args: 1,
        usage: '<expr>',
        async execute(e) {
            try {
                /* eslint-disable no-unused-vars */
                let user = g.user
                let channel = g.channel
                let res = eval(e.args[0])
                e.con.dir(eval(e.args[0]), {depth: 3})
                /* eslint-enable no-unused-vars */
            } catch (err) {
                e.con.error(err)
            }
        }
    },
    'echo': {
        args: 1,
        usage: '<text>',
        async execute(e) {
            e.con.log(e.args[0])
        }
    },
    'user': {
        args: 1,
        usage: '<name|id>',
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
    'guild': {
        args: 1,
        usage: '<name|id>',
        async execute(e) {
            var guild = await smartFindGuild(e, e.args[0])
            if (guild) {
                g.guild = guild
                e.send(`Found ${guild.name} <${guild.id}>`)
            } else {
                e.send(`No guild found: '${e.args[0]}'`)
            }
        }
    },
    'list': {
        async execute(e) {
            if (!g.guild) return e.send('No guild selected.')
            let channels = []
            for (const [, cat] of g.guild.channels.cache.sort((a, b) => a.position - b.position).filter(ch => ch.type === 'category' || !ch.parent)) {
                channels.push(cat)
                if (cat.children) for (const [, c] of cat.children.sort((a, b) => a.position - b.position)) {
                    channels.push(c)
                }
            }
            // Assert: correct # of channels
            e.con.assert(
                channels.length === g.guild.channels.cache.size,
                'Channels command missed %d channels',
                g.guild.channels.cache.size - channels.length
            )
            for (const c of channels) {
                if (c.type === 'category') {
                    e.con.groupEnd()
                    e.con.group(`=== ${c.name} ===`)
                } else if (c.type === 'text') {
                    e.con.log(`#${c.name}`)
                } else  if (c.type === 'voice') {
                    e.con.group(`🔊${c.name}`)
                    for (const [, m] of c.members) {
                        let symbols = ''
                        symbols += m.deaf ? e.plainText ? ' [🎧❌]' : ' 🎧'.red : ' 🎧'.green
                        symbols += m.mute ? e.plainText ? ' [🎤❌]' : ' 🎤'.red : ' 🎤'.green
                        e.con.log(` @${m.user.username}`.cyan + symbols)
                    }
                    e.con.groupEnd()
                } else {
                    e.con.log(c.name)
                }
            }
            e.con.groupEnd()
        }
    },
    'channel': {
        args: [0, 1],
        usage: '[name|id]',
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
                    g.channel = null
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
                    if (g.channel.guild) g.guild = g.channel.guild
                }
            } else {
                e.send(`No channel found: '${e.args[0]}'`)
            }
        }
    },
    'send': {
        args: 1,
        usage: '<message>',
        execute(e) {
            if (g.user && !g.channel) g.channel = g.user.dmChannel
            if (!g.channel) return e.send('No channel selected.')
            var msg = e.args[0]
            // contrived way to allow $$ to escape
            var resolve = (name, val) => msg = msg.replace(`${name}`, val).replace(`$${val}`, `$${name}`)
            resolve('$channel', g.channel)
            resolve('$user', g.user)
            g.channel.send(msg)
        }
    },
    'report': {
        reload: true,
        execute(e) {
            const report = [
                {name: "Channels", count: e.client.channels.cache.size},
                {name: "Emojis", count: e.client.emojis.size},
                {name: "Guilds", count: e.client.guilds.cache.size},
                {name: "Presences", count: e.client.presences.size},
                {name: "Users", count: e.client.users.cache.size},
                {name: "Voice Broadcasts", count: e.client.broadcasts.length},
                {name: "Voice Connections", count: e.client.voiceConnections .size}
            ]
            e.con.table(report)

            var guildReport = []
            for (var guild of e.client.guilds.cache.values()) {
                guildReport.push({
                    name: guild.name,
                    members: guild.members.cache.size,
                    presences: guild.presences.size
                })
            }
            guildReport = guildReport.sort((a, b) => b.members - a.members)
            e.con.table(guildReport)

            var channelReport = []
            for (var channel of e.client.channels.cache.values()) {
                if (!channel.messages.cache) continue
                channelReport.push({
                    name: channel.name,
                    messages: channel.messages.cache.size
                })
            }
            channelReport = channelReport.sort((a, b) => b.messages - a.messages).slice(0, 16)
            e.con.table(channelReport)
        }
    },

    async restart(e) {
        await e.bot.destroy()
        process.exit(64) // indicates to launch script we want to restart
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