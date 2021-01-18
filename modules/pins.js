
module.exports.defaultProfile = {
    channels: {}
}

let bot
module.exports.init = function (e) { bot = e }

module.exports.commands = {

    "pins.count": {
        args: [0, 1],
        usage: '[channel]',
        reload: true,
        async execute(e) {

            let channel = e.mentions.channels.size > 0 ? e.mentions.channels.first() : e.channel

            let pins = await channel.fetchPinnedMessages()
            e.channel.send(`${channel} has ${pins.size} pinned messages`)

            
        }
    },

    "pins.watch": {
        args: [1, 2],
        help: 'Watches pinned messages from <#source> and posts them in [#destination]',
        usage: '<#source> [#destination]',
        tags: 'admin',
        reload: true,
        async execute(e) {

            if (e.mentions.channels.size <= 0) return await e.channel.send("You must #mention at least one channel.")

            let [src, dest] = e.mentions.channels.first(2)
            dest = dest || e.channel
            
            e.profile.channels[src.id] = e.profile.channels[src.id] || {
                count: 0,
                cache: [],
                lastPinAt: 0,
                boards: []
            }
            let channelProf = e.profile.channels[src.id]

            if (channelProf.boards.includes(dest.id)) {
                await e.channel.send(`You are already recording pinned messages in ${src} to ${dest}.`)
            } else {
                channelProf.boards.push(dest.id)
                e.bot.profile.save()
                await e.channel.send(`Watching for pinned messages from ${src}, will post them in ${dest}.`)
                channelProf.lastPinAt = e.channel.lastPinAt
                src.fetchPinnedMessages().then(pins => {
                    channelProf.count = pins.size
                    channelProf.cache = pins.map(msg => msg.id)
                    console.info(`[PINS] Initial count ${pins.size} pins in #${src.name}`)
                })
            }

        }
    },

    "pins.info": {
        help: 'Info about pin monitoring on this server',
        tags: 'admin',
        reload: true,
        async execute(e) {

            let showAll = false
            if (e.args[0] == 'global') {
                showAll = true
            }

            if (e.guild) {
                // filter our watched channels to ones that are in this guild
                let guildChannels = Object.keys(e.profile.channels).filter(id => e.guild.channels.has(id) || showAll)

                if (guildChannels.length > 0) {

                    let msg = showAll ? 'Global Watch List:\n' : 'Currently watching pins in the following channels:\n'

                    for (let id of guildChannels) {
                        let prof = e.profile.channels[id]
                        let boards = prof.boards.map(b => `<#${b}>`)
                        msg += `- From <#${id}> to ${boards.join(', ')}.\n`
                    }

                    await e.channel.send(msg)
                } else {
                    await e.channel.send(`No channel's pins are being watched in this server.`)
                }
            }

        }
    },

    "pins.unwatch": {
        args: [1, 2],
        help: 'Stop posting pinned messages from <#source> in [#destination]',
        usage: '<#source> [#destination]',
        tags: 'admin',
        reload: true,
        async execute(e) {

            if (e.mentions.channels.size <= 0) return await e.channel.send("You must #mention at least one channel.")

            let [src, dest] = e.mentions.channels.first(2)
            dest = dest || e.channel

            if (!(src.id in e.profile.channels)) return await e.channel.send(`The channel ${src} isn't currently being watched.`)
                        
            let channelProf = e.profile.channels[src.id]

            let index = channelProf.boards.indexOf(dest.id)

            if (index != -1) {
                // remove this channel.
                channelProf.boards.splice(index, 1)
                await e.channel.send(`No longer watching pins from ${src} in ${dest}`)
                if (channelProf.boards.length > 0) {
                    await e.channel.send(`Still recording pins from ${src} to ${channelProf.boards.map(id => `<#${id}>`)}`)
                } else {
                    // stop tracking this channel
                    delete e.profile.channels[src.id]
                }

                e.bot.profile.save()
            } else {
                await e.channel.send(`Pins from ${src} are not being recorded in ${dest}.`)
            }

        }
    },

    "pins.clear": {
        args: [0, 1],
        help: 'Removes all pinned messages from <#channel>',
        usage: '<#channel>',
        tags: 'admin',
        reload: true,
        async execute(e) {
            if (e.mentions.channels.size <= 0) return e.channel.send("You must #mention one channel.")

            let src = e.mentions.channels.first()

            let pins = await src.fetchPinnedMessages()
            e.channel.send(`Deleting ${pins.size} pinned messages from ${src}`)
            console.info(`Beginning ${pins.size} pinned message purge in #${src.name} (${src.id}).`, 'Deleted Pins')
            if (src.guild) console.info(`(In guild ${src.guild} - ${src.guild.id})`, 'Deleted Pins')

            for (let pin of pins.array()) {
                let author = pin.author ? ` by user ${pin.author.username} (${pin.author.id})` : ''
                console.info(`Unpinning message ${pin.id}${author}: ${pin.content}`, 'Deleted Pins')
                pin.unpin()
            }

            console.info(`End of pinned message purge.`, 'Deleted Pins')

        }
    },

    "pins.archive": {
        args: [1, 2],
        help: 'Posts all the pinned messages from <#source> in [#destination]',
        usage: '<#source> [#destination]',
        tags: 'admin',
        reload: true,
        async execute(e) {

            if (e.mentions.channels.size <= 0) return await e.channel.send("You must #mention at least one channel.")

            let [src, dest] = e.mentions.channels.first(2)
            dest = dest || e.channel

            let pins = await src.fetchPinnedMessages()
            await e.channel.send(`Recording ${pins.size} pinned messages from ${src} to channel ${dest}. This may take a minute.`)

            //console.dir(pins)

            let numSent = 0

            for (let msg of pins.array().reverse()) {
                
                let embed = generateEmbed(msg)

                await dest.send('', {embed})
                numSent++
                
            }

            await e.channel.send(`Archived ${numSent} of ${pins.size} pinned messages from ${src} to channel ${dest}`)


        }
    },

    "message.embed": {
        tags: 'owner',
        args: 2,
        async execute(e) {
            let channelID = e.args[0], msgID = e.args[1]
            let msg = await e.client.channels.get(channelID).fetchMessage(msgID)
            
            e.channel.send('', {embed: generateEmbed(msg)})
        }
    }

}

module.exports.events = {
    ready() {
        let profile = bot.profile.modules.pins
        if (Object.keys(profile.channels).length > 0) {
            console.info(`[PINS] Querying pins in ${Object.keys(profile.channels).length} channels`)
        }
        let missedChannels = []

        // For each channel we're watching
        for (let id in profile.channels) {
            if (bot.client.channels.has(id)) {
                let channel = bot.client.channels.get(id)
                let channelProf = profile.channels[id]

                if (!channel) {
                    missedChannels.push(id)
                    continue
                }

                channelProf.lastPinAt = channel.lastPinAt
                channel.fetchPinnedMessages().then(pins => {
                    channelProf.count = pins.size
                    channelProf.cache = pins.map(msg => msg.id)
                    console.info(`[PINS] #${channel.name}: ${pins.size} pins`)
                })
            } else {
                missedChannels.push(id)
            }
        }

        bot.profile.save()

        if (missedChannels.length > 0) {
            console.warn(`[PINS] Couldn't find channels: ${missedChannels.join(', ')}`)
        }
    },

    channelPinsUpdate(channel, time) {        
        let profile = bot.profile.modules.pins

        // only watched channels
        if (!(channel.id in profile.channels)) return

        let channelProf = profile.channels[channel.id]

        console.info(`[PINS] Pins update in #${channel.name}.`)
        
        channel.fetchPinnedMessages().then(pins => {
            if (!channelProf.lastPinAt || channelProf.lastPinAt < time) {

                let foundNewPins = 0

                for (let pinId of pins.keys()) {
                    let pin = pins.get(pinId)
                    if (!pin) continue
                    // if pin isn't cached it must be new
                    if (!channelProf.cache.includes(pin.id)) {

                        foundNewPins++

                        channelProf.cache.push(pin.id)
                        let embed = generateEmbed(pin)
                        for (let id of channelProf.boards) {
                            if (!bot.client.channels.has(id)) {
                                console.warn(`[PINS] Cannot find board channel ${id} for #${channel.name}`)
                                continue
                            }

                            bot.client.channels.get(id).send('', { embed })
                        }
                    }
                }

                console.info(`[PINS] Got ${foundNewPins} new pins in #${channel.name} [Total: ${pins.size}]`)

                if (pins.size == 50) {
                    let lastPinnedMessage = pins.last()
                    console.info(`[PINS] Maxed out 50 pins. Unpinning message ${lastPinnedMessage.id}`)
                    lastPinnedMessage.unpin()
                }

            } else if (pins.size < channelProf.count) {
                channelProf.cache = pins.map(msg => msg.id)

                let removedPins = channelProf.count - pins.size
                console.info(`[PINS] Unpinned ${removedPins} messages in #${channel.name} [Total: ${pins.size}]`)
            }
            
            channelProf.lastPinAt = time
            channelProf.count = pins.size
        })

    }
}

function generateEmbed(msg) {
    let embed = {
        timestamp: msg.createdAt.toString(),
        author: {
            name: msg.member ? msg.member.displayName : msg.author.username,
            //url: msg.url,
            icon_url: msg.author.displayAvatarURL
        },
        // Unicode FE0E makes the emoji render as text if possible
        description: msg.content + `\n[📌\uFE0E](${msg.url})`,
        fields: []
    }

    if (msg.attachments.size > 0 && msg.attachments.first().height) {
        
        let attachment = msg.attachments.first()

        if (['mp4', 'webm', 'mov'].some(extension => attachment.filename.endsWith(extension))) {
            // can't add videos to embeds, must attach separately
            embed.file = attachment.proxyURL
            
            embed.description = msg.content + `\n[[Video]](${attachment.proxyURL})` + embed.description.slice(msg.content.length)
        } else {
            embed.image = {
                url: attachment.proxyURL,
                width: attachment.width,
                height: attachment.height
            }
        }

    } else if (msg.embeds.length > 0) {

        let emb = msg.embeds[0]

        let description = emb.description || ''

        // videos don't show description
        //if (emb.type == 'video') description = ''

        if (emb.type == 'article' || emb.type == 'video' || emb.type == 'image') {

            // media embeds just get one big image

            let embImg = emb.image || emb.thumbnail
            if (embImg)
                embed.image = {
                    url: embImg.url
                }
        } else {
            // typically copy thumbnail and image
            if (emb.thumbnail) embed.thumbnail = { url: emb.thumbnail.url }
            if (emb.image) embed.image = { url: emb.image.url }

        }

        if (emb.type != 'image') {

            // title will be either title or author
            let title = `[${emb.title||"Link"}](${emb.url})`

            // author instead of title with optional url
            if (emb.author && !emb.title)
                title = emb.author.url ? `**[${emb.author.name}](${emb.author.url})**` : `**${emb.author.name}**`

            // use fields to represent embeds
            embed.fields.push({
                // field name is providor name, footer text, or 'Embed'
                name: emb.provider ? emb.provider.name :
                    emb.footer && emb.footer.text ? emb.footer.text :
                        'Embed',

                // field value is embed title and description
                value: title + '\n\n' + description
            })
        }

    }

    return embed
}

module.exports.generateEmbed = generateEmbed
