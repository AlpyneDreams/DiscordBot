const DOGZONE_GUILD = '615407840257114132'
const CHANNEL_GENERAL = '615407840747716609' //'615407840747716609'
const CHANNEL_GENERAL_PINS = '704467171081977856'
const CHANNEL_COUNTING = '706032875044208680'

const generateEmbed = require('./pins').generateEmbed

let generalChannelNumPins = 0

var bot
module.exports.init = function (e) { bot = e }

let lastUserInCounting = ''

function checkChannelPins(channel) {
	
	if (!channel || !channel.fetchPinnedMessages) return

    channel.fetchPinnedMessages().then(pins => {

        if (pins.size > generalChannelNumPins) {

            let numNewPins = pins.size - generalChannelNumPins

            console.info(`[DOGZONE] Got ${numNewPins} new pins in general`)

            generalChannelNumPins = pins.size

            for (let i = 0; i < numNewPins; i++) {

                let embed = generateEmbed(pins.array()[i])
                bot.client.channels.get(CHANNEL_GENERAL_PINS).send('', { embed })

            }



        }

    }) //.error(console.warn)
}

// hourly check for new pins since discord doesn't always send the events
setInterval(() => {
    let channel = bot.client.channels.get(CHANNEL_GENERAL)

    console.info(`[DOGZONE] Scheduled pin update check.`)

    checkChannelPins(channel)
}, 3600000 )

module.exports.commands = {

    checkpins: {
        tags: "owner",
        execute(e) {
            if (e.guild.id != DOGZONE_GUILD) return
			
			if (e.args[0] && parseInt(e.args[0]) != NaN) {
				generalChannelNumPins -= parseInt(e.args[0])
			}
			
            let channel = bot.client.channels.get(CHANNEL_GENERAL)
            console.info(`[DOGZONE] Manual pin update check.`)
            checkChannelPins(channel)
        }
    },

    writepin: {
        tags: "owner",
        args: 1,
        async execute(e) {
            if (e.guild.id != DOGZONE_GUILD) return

            let channel = bot.client.channels.get(CHANNEL_GENERAL)
            let msg = channel.fetchMessage(e.args[0]).then(msg => {
                let embed = generateEmbed(msg)
                bot.client.channels.get(CHANNEL_GENERAL_PINS).send('', { embed })
            }).catch(err => {
                e.channel.send(`Could not find message ${e.args[0]}`)
                console.warn(err)
            })
        }
    }

}

module.exports.events = {

    ready() {

        bot.client.channels.get(CHANNEL_GENERAL).fetchPinnedMessages().then(pins => {

            generalChannelNumPins = pins.size

            console.info(`[DOGZONE] Found ${generalChannelNumPins} pinned messages in general.`)

        })

    },

    async message(msg) {

        // bot channel
        //if (msg.channel.id != '615418331083833375') return
        
        if (msg.guild && msg.guild.id != '615407840257114132') return
        if (msg.author && msg.author.id == msg.client.user.id) return

		
		if (msg.channel && msg.channel.id == CHANNEL_COUNTING && msg.author) {
			if (msg.author.id == lastUserInCounting) {
				msg.delete().catch(console.warn)

				msg.author.send('You are not allowed to double-post in <#706032875044208680>.').catch(console.error)
			}
			
			lastUserInCounting = msg.author.id
		}
		
        /*if (msg.content.match(/terro\b/gi)) {

            if (!msg.content.match(/funny\s*terro/gi)) {
                
                if (msg.author)
                    msg.author.send('you must refer to `Terro` as `Funny Terro` - no exceptions').catch(console.error)

            }
        }*/
        
        if (msg.cleanContent.match(/:s+n+r+f+:/gi)) {

            console.info('[Dogzone] FOUND SNOT CAT')

            msg.delete().catch(console.warn)

            if (msg.author)
                msg.author.send('snot cat is gross and not accepted').catch(console.error)

        }

    },

    channelPinsUpdate(channel, time) {

        if (channel.id != CHANNEL_GENERAL) return

        console.info(`[DOGZONE] Pins update in general`)

        checkChannelPins(channel)

    },

    channelUpdate(oldChannel, newChannel) {
                
        if (!newChannel.guild) return

        let loggerChannel = newChannel.guild.channels.get('615440527428419584')

        if (newChannel.guild.id != '615407840257114132') return
        if (newChannel.parentID == oldChannel.parentID && newChannel.position == oldChannel.position) return

        let info = `${newChannel}\n`

        if (newChannel.parentID != oldChannel.parentID) {
            
            if (!newChannel.parent || !oldChannel.parent) {

                info += `Category: \`${oldChannel.parentID} -> ${newChannel.parentID}\`\n`

            } else {

                info += `Category: \`${oldChannel.parent.name} -> ${newChannel.parent.name}\`\n`

            }
            
        }

        if (newChannel.position != oldChannel.position) {
            info += `Position: \`${oldChannel.position} -> ${newChannel.position}\`\n`
        }

        console.info(`Channel ${newChannel.name} has been moved.`)

        loggerChannel.send('', { embed: { 
            title: 'Channel Moved',
            description: info,
            color: 16755200
        } })

    }

}