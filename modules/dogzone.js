const DOGZONE_GUILD = '615407840257114132'
const CHANNEL_GENERAL = '615407840747716609' //'615407840747716609'
const CHANNEL_GENERAL_PINS = '704467171081977856'
const CHANNEL_COUNTING = '706032875044208680'

const ROLE_PENDING_USER = '774817475136585768'		// "skills wallets"
const ROLE_APPROVED_USER = '774813850108166144'		// "HM's Most Loyal"

const generateEmbed = require('./pins').generateEmbed

let generalChannelNumPins = 0

var bot
module.exports.init = function (e) { bot = e }

let lastUserInCounting = ''

function checkChannelPins(channel) {
	
	if (!channel || !channel.fetchPinned) return

    channel.messages.fetchPinned().then(pins => {

        if (pins.size > generalChannelNumPins) {

            let numNewPins = pins.size - generalChannelNumPins

            console.info(`[DOGZONE] Got ${numNewPins} new pins in general`)

            generalChannelNumPins = pins.size

            for (let i = 0; i < numNewPins; i++) {

                let embed = generateEmbed(pins.array()[i])
                bot.client.channels.cache.get(CHANNEL_GENERAL_PINS).send('', { embed })

            }



        }

    }) //.error(console.warn)
}

// hourly check for new pins since discord doesn't always send the events
/*setInterval(() => {
    let channel = bot.client.channels.cache.get(CHANNEL_GENERAL)

    console.info(`[DOGZONE] Scheduled pin update check.`)

    checkChannelPins(channel)
}, 3600000 )*/

module.exports.defaultProfile = {
	rejections: {}
}

function lookupUser(userRef, e) {
	
}

module.exports.defaultCommand = {
	guild: DOGZONE_GUILD
}

module.exports.commands = {

    checkpins: {
        tags: "owner",
        execute(e) {
			if (e.args[0] && parseInt(e.args[0]) != NaN) {
				generalChannelNumPins -= parseInt(e.args[0])
			}
			
            let channel = bot.client.channels.cache.get(CHANNEL_GENERAL)
            console.info(`[DOGZONE] Manual pin update check.`)
            checkChannelPins(channel)
        }
    },

    writepin: {
        tags: "owner",
        args: 1,
        async execute(e) {
            let channel = bot.client.channels.cache.get(CHANNEL_GENERAL)
            let msg = channel.messages.fetch(e.args[0]).then(msg => {
                let embed = generateEmbed(msg)
                bot.client.channels.cache.get(CHANNEL_GENERAL_PINS).send('', { embed })
            }).catch(err => {
                e.channel.send(`Could not find message ${e.args[0]}`)
                console.warn(err)
            })
        }
    },
	
	pending: {
        async execute(e) {
			if (!e.member.hasPermission('MANAGE_ROLES')) return
			
			
			if (e.guild.members.cache.size < e.guild.memberCount) {
				e.channel.send('Fetching members...')
				
				let handler = (members, guild) => {
					console.log(`${guild.name}: ${members.length} member chunk`)
				}
				
				e.client.on('guildMembersChunk', handler)
				
				await e.guild.members.fetch().catch((err) => {
					console.error(err)
					console.warn('Ensure client.options.ws.intents has flag GUILD_MEMBERS (1 << 1) set.')
				})
				
				e.client.off('guildMembersChunk', handler)
			}
			
			let pending = e.guild.members.cache.filter(m => m.roles.cache.has(ROLE_PENDING_USER) && !m.roles.cache.has(ROLE_APPROVED_USER))
			let numRejections = pending.sweep(m => m.id in e.profile.rejections)
			let totalRejections = Object.keys(e.profile.rejections).length
			
			e.channel.send('', {
				embed: {
					title: 'Pending Approvals',
					description: pending.map(m => `<@${m.id}> (${m.user.tag})`).join('\n'),
					footer: {
						text: numRejections > 0 ? `${numRejections} users are hidden from this list because they have been rejected (use '--rejections' to see all ${totalRejections} rejections)` : undefined
					}
				}
			})
			
		}
	},
	
	reject: {
		usage: '<user> <reason>',
		args: [0, 2],
		//reload: true,
		async execute(e) {
			if (!e.member.hasPermission('MANAGE_ROLES')) return
			
			if (e.args.length < 2) return e.channel.send('You must specify a user and a reason. (Usage: `reject <user> <reason>`)')
			
			let userRef = e.args[0]
			let reason = e.args[1]
			
			let user
			if (e.mentions.users.size > 0) {
				if (e.mentions.users.size > 1) return e.channel.send("Too many users mentioned, don't know who to reject.")
				user = e.mentions.users.first()
			} else {
				// user id
				if (!Number.isNaN(parseInt(userRef))) {
					console.log(parseInt(userRef))
					try {
						user = await e.client.users.fetch(userRef)
					} catch (err) {
						return e.channel.send(`Unknown user ID \`${userRef}\`.`)
					}
				} else {
					// search for a user
					if (e.guild.members.cache.size < e.guild.memberCount) await e.guild.members.fetchs()
					
					let tag = userRef.trim().toLowerCase()
					if (tag.startsWith('@')) tag = tag.slice(1)
					if (tag.match(/#\d{4}$/)) {
						// search by tag (username#0000)
						user = e.guild.members.cache.find(m => m.user.tag.toLowerCase() === tag)
					}
					if (!user) {
						// search by username
						user = e.guild.members.cache.find(m => m.user.username.toLowerCase() === tag)
						if (!user) return e.channel.send(`Unknown user \`@${userRef}\``)
					}
				
					user = user.user
				}
			}
			
			if (reason === '--unreject') {
				
				if (!(user.id in e.profile.rejections)) return e.channel.send(`This user has not been rejected.`)
				
				delete e.profile.rejections[user.id]
				
				bot.profile.save()
				
				return e.channel.send('', {embed: {
					description: `Removed rejection status for user <@${user.id}> (${user.username}#${user.discriminator}).`
				}})
			}
			
			let updated = null
			if (user.id in e.profile.rejections) {
				updated = e.profile.rejections[user.id].reason
			}
			
			e.profile.rejections[user.id] = {
				reason,
				tag: user.tag,
				time: Date.now()
			}
			
			bot.profile.save()
			
			e.channel.send('', {
				embed: {
					description: !updated ? `Rejected user <@${user.id}> (${user.username}#${user.discriminator}) with reason: \`${reason}\`.`
										  : `Changed user <@${user.id}> (${user.username}#${user.discriminator}) rejection reason from \`${updated}\` to \`${reason}\`.`
				}
			})

		}
	},
	
	unreject: {
		usage: '<user>',
		args: 1,
		async execute(e) {
			return bot.executeCommand(`reject ${e.args[0]} --unreject`, e)
		}
	},
	
	rejections: {
		async execute(e) {
			if (!e.member.hasPermission('MANAGE_ROLES')) return
			
			e.channel.send('', {
				embed: {
					title: 'Rejections',
					description: Object.entries(e.profile.rejections).map(m => `<@${m[0]}> (${m[1].tag}) - \`${m[1].reason}\``).join('\n')
				}
			})

		}
	}
}

module.exports.events = {

    ready() {

        /*bot.client.channels.cache.get(CHANNEL_GENERAL).messages.fetchPinned().then(pins => {

            generalChannelNumPins = pins.size

            console.info(`[DOGZONE] Found ${generalChannelNumPins} pinned messages in general.`)

        })*/

    },

    async message(msg) {

        // bot channel
        //if (msg.channel.id != '615418331083833375') return
        
        if (msg.guild && msg.guild.id != '615407840257114132') return
        if (msg.author && msg.author.id == msg.client.user.id) return

		
		if (msg.channel && msg.channel.id == CHANNEL_COUNTING && msg.author) {
			if (msg.author.id == lastUserInCounting) {
				msg.delete().catch(console.warn)

				msg.author.send('Everyone must take turns in <#706032875044208680>.').catch(console.error)
			} else {
                lastUserInCounting = msg.author.id
            }	
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
	
	// TODO: remove this path altogether
    channelPinsUpdate(channel, time) {

        return

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
		let report = false

        if (newChannel.parentID != oldChannel.parentID) {
			
			report = true // should be logged to server
            
            if (!newChannel.parent || !oldChannel.parent) {

                info += `Category: \`${oldChannel.parentID} -> ${newChannel.parentID}\`\n`

            } else {

                info += `Category: \`${oldChannel.parent.name} -> ${newChannel.parent.name}\`\n`

            }
            
        }

        if (newChannel.position != oldChannel.position) {
            info += `Position: \`${oldChannel.position} -> ${newChannel.position}\`\n`
        }

        console.info(`Channel ${newChannel.name} has been moved.\n` + info)
		
		if (report)
			loggerChannel.send('', { embed: { 
				title: 'Channel Moved',
				description: info,
				color: 16755200
			} })

    }

}