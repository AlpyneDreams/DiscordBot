
var bot
exports.init = function(e) {bot = e}

exports.events = {
    ready() {
        console.log(`Ready. Handling ${bot.client.guilds.cache.size} guilds.`)

        if (bot.client.user.bot) {
            bot.client.user.setActivity(bot.config.commandPrefix + "help", {type: "LISTENING"})
        } else {
            // prevent selfbot from interfering with status
            bot.client.ws.send({op: 3, d: {activities: [], status: "idle", afk: true, since: Date.now() - 600000}})
        }
    },

    disconnect(e) {
        if (e.wasClean) {
            console.info("Disconnected from Discord [Code: " + e.code + "]")
            if (e.reason) console.info('Reason: "' + e.reason + '"')
        } else {
            console.warn("Disconnected from Discord [Code: " + e.code + "]")
            if (e.reason) console.warn('Reason: "' + e.reason + '"')
        }
    },

    warn(msg) {
        console.warn(`[Discord] ${msg}`)
    },

    error(err) {
        console.error(`[Discord] ${err.name}: ${err.message}`)
    },

    guildCreate(guild) {
        console.info('Joined guild "' + guild.name + '" #' + guild.id)
    },

    guildDelete(guild) {
        console.info('Left guild "' + guild.name + '" #' + guild.id)
    },

}

function getDefaultHelp(e, modulename = '', minTags = false) {
    let bot = e.bot

    let checkGuilds = minTags || !e.bot.tagManager.hasTags(e, ['owner'])

    let embed = {
        title: 'Commands:',
        description: 'The command prefix is `' + e.bot.config.commandPrefix + '`',
        fields: []
    }

    let footnote = false

    for (let m of Object.values(bot.modules)) {
        if (modulename !== '' && m.name !== modulename)
            continue

        let cmdList = []
        let restrictedCmdList = []

        for (let c in m.commands) {

            let cmd = bot.commands[c]

            // exclude commands the the user can't use. don't check requirements.
            // second part of this condition means exclude showing any commands with tags if minTags
            if (cmd.canInvoke(e.bot, e, !minTags, false, checkGuilds) && !(minTags && cmd.tags.length > 0)) {
                
                if (cmd.guild !== null && !cmd.module.defaultCommand?.guild) {
                    c += '*'
                    footnote = true
                }

                if (cmd.tags.length === 0) {
                    cmdList.push(c)
                } else {
                    restrictedCmdList.push(c)
                }
            }
        }

        if (cmdList.length === 0 && restrictedCmdList.length === 0) continue

        let value = cmdList.length > 0 ? '```\n' + cmdList.sort().join('\n') + '```' : '\n'

        if (restrictedCmdList.length > 0) value += '```\n' + restrictedCmdList.sort().join('\n') + '```'

        let name = m.name

        if (m.defaultCommand?.guild) {
            name += '*'
            footnote = true
        }

        embed.fields.push({
            name,
            value,
            inline: true
        })
    }

    embed.fields.push({
        name: 'Help',
        value:    'Use `' + e.commandPrefix + 'help <command>` for information on a specific command,\n'
                + 'Use `' + (e.bot.config.commandPrefix || e.commandPrefix) + 'help.all` for a detailed list of all commands.'
    })

    if (footnote) {
        embed.footer = {
            text: '*Restricted by server.'
        }
    }

    return {embed}
}

exports.commands = {
    "ping": {
        help: "Pong!",
        interaction: true,
        async execute(e) {
            var msg = await e.channel.send("Pong!")
            var delay = new Date(msg.createdTimestamp).getTime() - new Date(e.createdTimestamp).getTime()
            msg.edit(`Pong! Delay: ${delay} ms`)
        }
    },
    "echo": {
        args: 1,
        interaction: true,
        options: {
            message: {type: 'string', description: 'Message to repeat.', required: true}
        },
        help: "Repeat a message.",
        usage: "<message>",
        tags: 'admin',
        execute(e) {
            e.channel.send(e.args[0])
        }
    },
    "help": {
        help: "Provides information on commands and features.",
        usage: "[command]",
        interaction: false,
        options: {
            command: {type: 'string', description: 'Get help about a specific command.', required: false}
        },
        execute(e) {

            var bot = e.bot

            if (e.args.length <= 0) {
                // same as 'commands'
                e.channel.send('',getDefaultHelp(e))
            } else if (e.args[0] === '--min') {
                e.channel.send('', getDefaultHelp(e, '', true))
            } else {
                if (bot.commands[e.args[0]]) {

                    var cmd = bot.commands [e.args[0]]
                    var usage = cmd.usage || ""

                    e.channel.send(
                        "```css\n"
                            + e.commandPrefix + e.args[0] + "\n\t"
                            + "Purpose: " + cmd.help
                            + "\n\tUsage:   " + e.commandPrefix + e.args[0] + " " + usage
                            + "```"
                    )

                } else {
                    e.channel.send('"' + e.args[0] + '" is not a recognized command.')
                }

            }
        }
    },
    "help.all": {
        help: "Provides detailed information on commands and features.",
        execute(e) {
            var bot = e.bot
            var str = ''
            for (var i in bot.commands) {
                // skip commands the user can't use
                if (!bot.commands[i].canInvoke(e.bot, e, true, false, true))
                    continue
                // Add a newline and a tab only if the command has a help text
                var description = bot.commands[i].help ? "\n\t" + bot.commands[i].help : ""
                str += e.commandPrefix + i + description + '\n'
            }
            e.author.send(str, {split: true, code: true})

            if (e.channel.type != 'dm') {
                e.channel.send("<@" + e.author.id + ">: Check your private messages.")
            }
        }
    },
    "commands": {
        help: "Lists all commands.",
        usage: "[module]",
        execute(e) {
            if (e.args[0]) {
                // Show commands for only one specific module
                e.channel.send('', getDefaultHelp(e, e.args[0]))
            } else {
                e.channel.send('', getDefaultHelp(e))
            }
        }
    },

    "modules": {
        help: "Lists all modules.",
        tags: 'owner',
        execute(e) {
            e.channel.send('', {
                embed: {
                    title: 'Modules:',
                    description: "```" + Object.values(e.bot.modules).map(m => m.name).sort().join('\n') + "```"
                }
                
            })
        }
    },

    "tags": {
        help: "Shows the permission tags you have and lists all other tags that exist.",
        tags: 'admin',
        execute(e) {
            var userTags = e.bot.tagManager.getTags(e)
            if (userTags.length > 0) {
                e.channel.send("Your tags: `" + e.bot.tagManager.getTags(e).join(', ') + "`")
            } else {
                e.channel.send("You have no tags.")
            }

            // get the set of all existing tags
            let tags = new Set()
            for (var c in e.bot.commands) {
                let cmd = e.bot.commands[c]
                if (cmd.tags) {
                    for (let tag of cmd.tags)
                        tags.add(tag)
                }
            }
            e.channel.send("Existing Tags: `" + Array.from(tags).sort().join(', ') + "`")

        }
    },

    "invite": {
        help: "Sends a link to add this bot to your server.",
        interaction: true,
        requirements: 'bot',
        async execute(e) {
            var app = await e.client.fetchApplication()
            e.channel.send(`https://discordapp.com/api/oauth2/authorize?client_id=${app.id}&scope=bot%20applications.commands&permissions=0`)
        }
    }
}
