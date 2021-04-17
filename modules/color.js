
/** Glossary:
 * 
 * "color role" = the role that determines the user's color
 * "cosmetic role" = a role that starts with '#' (used by this module to set colors)
 */

var RichEmbed = require('discord.js').RichEmbed

let enabledGuilds = []

module.exports.init = (bot, m) => {
    enabledGuilds = m.profile.guilds
}

module.exports.defaultProfile = {guilds: []}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

// when user has no color role, find the best cosmetic role
function bestCosmeticRole(member, botMember) {

    var possibleRoles = member.roles.cache.filter(x => x.name.startsWith('#'))

    // filter out roles we that outrank the bot
    possibleRoles = possibleRoles.filter(
        x => x.comparePositionTo(botMember.highestRole) <= 0
    )

    if (possibleRoles.size > 1) {		
        // filter out ones that don't match username
        possibleRoles = possibleRoles.filter(
            x => x.name.toLowerCase() == '#' + member.user.username.toLowerCase()
        )

        if (possibleRoles.size > 1) {
            // sort roles by position
            possibleRoles = possibleRoles.sort((x, y) => x.comparePositionTo(y))
        }
    }

    if (possibleRoles.size >= 1)
        return possibleRoles.first()

    return null
}


module.exports.defaultCommand = {
    requirements: 'guild',
    guild: enabledGuilds
}

module.exports.commands = {
    "color": {
        reload: true,
        args: 1,
        async execute(e) {
            if (!e.profile.guilds.includes(e.guild.id))
                return e.channel.send("Error: The color command is not enabled on this server.")
            
            var botMember = await e.guild.members.fetch(e.client.user)
            if (!botMember.hasPermission('MANAGE_ROLES'))
                return e.channel.send("Error: This bot does not have the `Manage Roles` permission in this guild.")

            var reason = "User set a custom color."

            var rgb = hexToRgb(e.args[0])
            if (!rgb) return e.channel.send("Error: Color must be of the format `#XXXXXX`")

            if (e.args[0][0] !== '#') e.args[0] = '#' + e.args[0]

            if (e.args[0] == '#000000' || e.args[0].toLowerCase() == '#ffffff') {
                e.channel.send("Your color will be reset.")
            } else {
                let embed = new RichEmbed({
                    title: "Setting Color",
                    description: `\`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\``
                })
                embed.setColor([rgb.r, rgb.g, rgb.b])
                e.channel.send("", {embed})
            }

            var minPosition = 0
            // first, find the color role
            var role = e.member.colorRole

            // check that we can make a cosmetic role above their color role
            if (role && role.comparePositionTo(botMember.highestRole) > 0)
                return e.channel.send("Error: Your color is set by a role that outranks this bot.")

            if (role && !role.name.startsWith('#')) {
                // otherwise create a new role
                minPosition = role.position
                role = null

            } else if (!role) {
                // user has no color role, requires insight
                role = bestCosmeticRole(e.member, botMember)
            }

            if (!role) {
                role = await e.guild.createRole({
                    name: '#' + e.author.username,
                    color: e.args[0],
                    position: minPosition
                }, reason)
                e.member.addRole(role, reason)
            } else if (role) {
                role.setColor(e.args[0], reason)
            }

        }
    }
}
// for inferior dialects
module.exports.commands.colour = module.exports.commands.color
