
var bot
exports.init = function(e) {bot = e}

exports.events = {
    ready() {
        console.log(`Ready. Handling ${bot.client.guilds.size} guilds.`)

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

function getDefaultHelp(e, modulename = '', checkTags = true) {
    var bot = e.bot

    var cmdList = []
    for (var c in bot.commands) {
        var cmd = bot.commands[c]

        if (modulename != '' && cmd.module.name != modulename)
            continue

        // exclude commands the the user can't use
        if ((cmd.tags.length <= 0) || (bot.tagManager.hasTags(e, cmd.tags) && checkTags)) {
            cmdList.push(c)
        }


    }

    return	(modulename == '' ? "Commands: ```" : 'Commands from module: `' + modulename + '` ```')
            + (cmdList.length > 0 ? cmdList.sort().join(', ') : "[no commands]")
            + "```\nUse `"
            + bot.config.commandPrefix + "help <command>` for information on a specific command,\n"
            + "Use `"
            + bot.config.commandPrefix + "help.all` for a detailed list of all commands."
}

exports.commands = {
    "ping": {
        help: "Pong!",
        async execute(e) {
            var msg = await e.channel.send("Pong!")
            var delay = new Date(msg.createdTimestamp).getTime() - new Date(e.createdTimestamp).getTime()
            msg.edit(`Pong! Delay: ${delay} ms`)
        }
    },
    "echo": {
        args: 1,
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
        execute(e) {

            var bot = e.bot

            if (e.args.length <= 0) {
                // same as 'commands'
                e.channel.send(getDefaultHelp(e))
            } else if (e.args[0] === '--min') {
                e.channel.send(getDefaultHelp(e, '', false))
            } else {
                if (bot.commands[e.args[0]]) {

                    var cmd = bot.commands [e.args[0]]
                    var usage = cmd.usage || ""

                    e.channel.send(
                        "```css\n"
                            + bot.config.commandPrefix + e.args[0] + "\n\t"
                            + "Purpose: " + cmd.help
                            + "\n\tUsage:   " + bot.config.commandPrefix + e.args[0] + " " + usage
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
                if (bot.commands[i].tags && !bot.tagManager.hasTags(e, bot.commands[i].tags))
                    continue
                // Add a newline and a tab only if the command has a help text
                var description = bot.commands[i].help ? "\n\t" + bot.commands[i].help : ""
                str += "```css\n" + bot.config.commandPrefix + i + description + "```"
            }
            e.author.send(str)

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
                e.channel.send(getDefaultHelp(e, e.args[0]))
            } else {
                e.channel.send(getDefaultHelp(e))
            }
        }
    },

    "modules": {
        help: "Lists all modules.",
        tags: 'owner',
        execute(e) {
            e.channel.send("Modules:```" + Object.keys(e.bot.modules).sort().join(', ') + "```")
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

            // get a list of all existing tags
            var tags = []
            for (var c in e.bot.commands) {
                var cmd = e.bot.commands[c]
                if (cmd.tags) {
                    if (Array.isArray(cmd.tags)) {
                        for (var tag of tags) {
                            if (!tags.includes(tag)) tags.push(tag)
                        }
                    } else {
                        if (!tags.includes(cmd.tags)) tags.push(cmd.tags)
                    }
                }
            }
            e.channel.send("Existing Tags: `" + tags.sort().join(', ') + "`")

        }
    },

    "install": {
        description: "Sends a link to add this bot to your server.",
        requirements: 'bot',
        async execute(e) {
            var app = await e.client.fetchApplication()
            e.channel.send(`https://discordapp.com/api/oauth2/authorize?client_id=${app.id}&scope=bot&permissions=0`)
        }
    }
}
