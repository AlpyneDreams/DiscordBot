
module.exports.defaultProfile = {
    channels: {}
}

let bot
module.exports.init = function (e) { bot = e }

function checkChannelPins(channel) {

    if (!channel || !channel.fetchPinnedMessages) return

    channel.fetchPinnedMessages().then(pins => {

        if (pins.size > generalChannelNumPins) {

            let numNewPins = pins.size - generalChannelNumPins

            console.info(`[PINS] Got ${numNewPins} new pins in ${channel}`)

            generalChannelNumPins = pins.size

            for (let i = 0; i < numNewPins; i++) {

                let embed = generateEmbed(pins.array()[i])
                bot.client.channels.get(CHANNEL_GENERAL_PINS).send('', { embed })

            }



        }

    }) //.error(console.warn)
}


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
        desciption: 'Watches pinned messages from <#source> and posts them in [#destination]',
        usage: '<#source> [#destination]',
        tags: 'admin',
        reload: true,
        async execute(e) {

            if (e.mentions.channels.size <= 0) return await e.channel.send("You must #mention at least one channel.")

            let [src, dest] = e.mentions.channels.first(2)
            dest = dest || e.channel
            
            e.profile.channels[src.id] = e.profile.channels[src.id] || {
                count: 0,
                boards: []
            }
            let channelProf = e.profile.channels[src.id]

            if (channelProf.boards.includes(dest.id)) {
                await e.channel.send(`You are already recording pinned messages in ${src} to ${dest}.`)
            } else {
                channelProf.boards.push(dest.id)
                e.bot.profile.save()
                await e.channel.send(`Watching for pinned messages from ${src}, will post them in ${dest}.`)
                e.channel.fetchPinnedMessages().then(pins => {
                    channelProf.count = pins.size
                    console.info(`[PINS] Initial count ${channelProf.count} pins in #${src.name}`)
                })
            }

        }
    },

    "pins.unwatch": {
        args: [1, 2],
        desciption: 'Stop posting pinned messages from <#source> in [#destination]',
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
                await e.channel.send(`No longer watching pins from ${src} to ${dest}.`)
                if (channelProf.boards.length > 0) {
                    await e.channel.send(`Still recording pins from ${src} to: ${channelProf.boards.map(c => c.name)}`)
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
        desciption: 'Removes all pinned messages from <#channel>',
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
        desciption: 'Posts all the pinned messages from <#source> in [#destination]',
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
    }

}

module.exports.events = {
    channelPinsUpdate(channel, time) {
        let p = bot.profile.modules.pins

        if (!(channel.id in p.channels)) return 

        let channelProf = p.channels[channel.id]

        channel.fetchPinnedMessages().then(pins => {

        })

    }
}

let generateEmbed = function(msg) {
    let embed = {
        timestamp: msg.createdAt.toString(),
        author: {
            name: msg.member ? msg.member.displayName : msg.author.username,
            //url: msg.url,
            icon_url: msg.author.displayAvatarURL
        },
        description: msg.content + `\n[📌\uFE0E](${msg.url})`
    }

    if (msg.attachments.size > 0 && msg.attachments.first().height) {

        embed.image = {
            url: msg.attachments.first().proxyURL
        }

    } else if (msg.embeds.length > 0) {

        let emb = msg.embeds[0]

        let description = emb.description || ''

        // videos don't show description
        if (emb.type == 'video') desciption = ''

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
            let title = `[${emb.title}](${emb.url})`

            // author instead of title with optional url
            if (emb.author && !emb.title)
                title = emb.author.url ? `**[${emb.author.name}](${emb.author.url})**` : `**${emb.author.name}**`

            // use fields to represent embeds
            embed.fields = [
                {
                    // field name is providor name, footer text, or 'Embed'
                    name: emb.provider ? emb.provider.name :
                        emb.footer && emb.footer.text ? emb.footer.text :
                            'Embed',

                    // field value is embed title and description
                    value: title + '\n\n' + description
                }
            ]
        }

    }

    return embed
}

module.exports.generateEmbed = generateEmbed
