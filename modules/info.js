
function dateTimeString(date) {
    var timestamp = ("00" + date.getHours()).slice(-2)
    timestamp += ':' + ("00" + date.getMinutes()).slice(-2)
    timestamp += ':' + ("00" + date.getSeconds()).slice(-2)

    // generate a datestamp
    // months start from 0 because javascript was designed by gibbons
    var datestamp = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()

    return `${datestamp}, ${timestamp}`
}

module.exports.commands = {
    "invite.inspect": {
        args: 1, usage: "<invite>",
        tags: 'owner',
        reload: true,
        async execute(e) {
            
            var invite

            try {
                invite = await e.client.fetchInvite(e.args[0])
            } catch (ex) {
                if(ex.name == 'DiscordAPIError')
                    return e.channel.sendMessage(`Error: \`${e.args[0]}\` does not resolve as a valid invite code.`)
            }
            var guild = invite.guild
            
            if (e.client.guilds.cache.has(guild.id)) {
                var invites = await e.client.guilds.cache.get(guild.id).fetchInvites()
                invite = invites.get(invite.code)
            }


            var channel = invite.channel

            var embed = {
                color: 7506394,
                thumbnail: {url: `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`},
                fields: [
                    {name: "Server",    value: guild.name, inline: true},
                    {name: "Channel",   value: '`#' + channel.name + '`', inline: true},
                ]
            }

            if (invite.inviter) {
                var user = invite.inviter
                embed.author = {
                    name: `@${user.username}#${user.discriminator}`,
                    icon_url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                }
                //embed.fields.unshift({name: "Invite Creator", value: `<@${user.id}>`})
            }

            if (invite.createdAt) {
                embed.fields.push({name: "Created", value: `\`${dateTimeString(invite.createdAt)}\``, inline: true})
            }

            if (invite.maxAge > 0) {
                embed.timestamp = invite.expiresTimestamp
                embed.footer = {text: "Expires"}                

                embed.fields.push({name: "Expires", value: `\`${dateTimeString(invite.expiresAt)}\``, inline: true})

            } else if (invite.createdAt) {
                embed.footer = {text: "This invite will not expire."}
                
                embed.fields.push({name: "Expires", value: "`[Never]`", inline: true})
            }

            if (guild.splash) {
                embed.image = {url: `https://cdn.discordapp.com/splashes/${guild.id}/${guild.splash}.png`}
            }
            
            e.channel.send('', {embed})
        }
    }
}