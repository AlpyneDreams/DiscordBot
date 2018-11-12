
const util = require('util')
const Discord = require('discord.js')

// rgb -> hex -> int
function color(r, g, b) {
	return 	parseInt(	('0' + r.toString(16)).slice(-2) +
						('0' + g.toString(16)).slice(-2) +
						('0' + b.toString(16)).slice(-2), 16)
}

var recentKicks = []
function wasRemoved(id) {
	var x = recentKicks.indexOf(id)
	if (x != -1) {
		//recentKicks.splice(x, 1)
		return true
	}

	return false
}

// have to export these the old fashioned way for now
var channels = {}
var webhooks = {}
var bot, mod
module.exports.init = function(e, m) {
	bot = e, mod = m
	channels = m.profile

	console.log(`[admin] Registered ${Object.keys(m.profile).length} server admin profile(s).`)
}

function getLog(guild) {
	if (!guild) return null
	if (!(guild.id in channels)) return null
	if (!('channels' in channels[guild.id])) return null

	return bot.client.channels.get(channels[guild.id].channels[0])
}

async function sendEmbed(channel, embed, repeat = true) {
	embed = Object.assign({
		timestamp: new Date(),
		color: 7506394 // blurple
	}, embed)

	if (!repeat) {
		channel.sendEmbed(embed).catch(err => console.error(err.stack))
		return
	}


	for (var chan of channels[channel.guild.id].channels) {
		bot.client.channels.get(chan).sendEmbed(embed).catch(err => console.error(err.stack))
	}
}

module.exports.events = {

	messageUpdate(prev, msg) {
		if (msg.author.id == bot.client.user.id) return

		var log = getLog(msg.guild)
		if (!log) return
		if (msg.channel.id == log.id) return
		if (msg.content == prev.content) return

		sendEmbed(log, {
			author: {
				name: msg.member.nickname,
				icon_url: msg.author.displayAvatarURL
			},
			color: color(255, 200, 0),
			timestamp: msg.editedAt,
			footer: {
				text: `✏️️ Message Edited`,
				icon_url: ''
			},
			description: `\`New:\` ${msg.cleanContent}\n\`Old:\` ${prev.cleanContent}\n\n*in ${msg.channel}*`
		}, false)

	},

	messageDelete(msg) {

		var log = getLog(msg.guild)
		if (!log) return
		if (msg.author.id == bot.client.user.id) return

		sendEmbed(log, {
			color: color(255, 0, 0),
			description: msg.content + '\n\n*in ' + msg.channel.toString() + '*' || '',
			author: {
				name: msg.member.nickname || msg.author.username,
				icon_url: msg.author.displayAvatarURL
			},
			footer: {
				text: `❌ Message Deleted`,
				icon_url: ''
			}
		}, false)

	},

	messageDeleteBulk(msgs) {
		var log = getLog(msgs.first().guild)
		if (!log) return

		sendEmbed(log, {
			title: 'Bulk Deletion',
			description: `${msgs.size} messages were deleted.`,
			color: color(255, 0, 0),
			footer: {
				text: `❌ Messages Deleted`,
				icon_url: ''
			}
		}, false)
	},

	channelCreate(channel) {
		var log = getLog(channel.guild)
		if (!log) return

		sendEmbed(log, {
			title: 'Channel Created',
			description: `${channel}`,
			color: color(0, 255, 0),
		})
	},

	channelDelete(channel) {
		var log = getLog(channel.guild)
		if (!log) return

		sendEmbed(log, {
			title: 'Channel Removed',
			description: `#${channel.name}`,
			color: color(255, 0, 0),
		})
	},

	channelUpdate(old, channel) {
		var log = getLog(channel.guild)
		if (!log) return

		if (channel.name != old.name) {
			sendEmbed(log, {
				title: `Channel Renamed`,
				description: `\`New:\` ${channel}\n\`Old:\` #${old.name}`
			})

		}

	},

	guildMemberUpdate(old, member) {
		var log = getLog(member.guild)
		if (!log) return

		if (member.nickname != old.nickname) {
			sendEmbed(log, {
				author: {
					name: member.user.username,
					icon_url: member.user.displayAvatarURL
				},
				fields: [ {
						name: 'Before',
						value: old.nickname || member.user.username,
						inline: true
					}, {
						name: 'After',
						value: member.nickname || member.user.username,
						inline: true
					}
				],
				footer: {
					text: 'Nickname Updated'
				}
			}, false)

		}

	},

	guildMemberAdd(member) {
		var greet = (channels[member.guild.id] || {}).greet
		if (greet) {
			bot.client.channels.get(greet.channel).send(greet.message.replace('{user}', member.toString()))
		}

		var log = getLog(member.guild)
		if (!log) return

		sendEmbed(log, {
			author: {
				name: member.user.username,
				icon_url: member.user.displayAvatarURL
			},
			color: color(166, 166, 166),
			footer: {
				text: `➕ User Joined`,
				icon_url: ''
			}
		})
	},

	guildMemberRemove(member) {
		console.log(`guildMemberRemove`)

		var log = getLog(member.guild)
		if (!log) return
		if (wasRemoved(member.id)) return

		sendEmbed(log, {
			author: {
				name: member.user.username,
				icon_url: member.user.displayAvatarURL
			},
			color: color(166, 166, 166),
			footer: {
				text: `➖ User Left`,
				icon_url: ''
			}
		})
	},

	guildBanAdd(guild, user) {
		var log = getLog(guild)
		if (!log) return

		recentKicks.push(user.id)
		sendEmbed(log, {
			color: color(255, 0, 0),
			author: {
				name: user.username,
				icon_url: user.displayAvatarURL
			},
			footer: {
				text: `❌ User Banned`,
				icon_url: ''
			}
		})
	},

	guildBanRemove(guild, user) {
		var log = getLog(guild)
		if (!log) return

		sendEmbed(log, {
			color: color(0, 255, 0),
			author: {
				name: user.username,
				icon_url: user.displayAvatarURL
			},
			footer: {
				text: `✔️️ User Unbanned`,
				icon_url: ''
			}
		})
	},

	guildDelete(guild) {
		var log = getLog(guild)
		if (!log) return

		var hook = new Discord.WebhookClient(bot.profile.modules.admin[guild.id].webhook.id, bot.profile.modules.admin[guild.id].webhook.token)
		hook.send('I have been removed from this server. You may now delete this webhook.')

		delete bot.profile.modules.admin[guild.id]
		bot.profile.save()
	}

}

module.exports.commands = {

	'log.create': {
		tags: 'admin',
		usage: '<channel>',
		args: [0, 1],
		async execute(e) {
			var log = e.channel
			if (e.mentions.channels.size > 0) {
				log = e.mentions.channels.first()
			}

			var webhook = await log.createWebhook(e.client.user.username, e.client.user.displayAvatarURL)
			webhook.edit(e.client.user.username, e.client.user.displayAvatarURL)

			e.bot.profile.modules.admin[e.guild.id] = {
				channels: [log.id],
				webhook: {
					id: webhook.id,
					token: webhook.token
				}
			}
			e.bot.profile.save()

			log.send(`Registered ${log} as this server's moderation log channel.`)
		}
	},

	'log.stop': {
		tags: 'admin',
		execute(e) {
			if (e.profile[e.guild.id] && e.profile[e.guild.id].channels) {
				delete e.profile[e.guild.id].channels
				e.channel.send('All logging has been stopped.')
			}
		}
	},

	'log.list': {
		tags: 'admin',
		execute(e) {
			if (!e.profile[e.guild.id] || !e.profile[e.guild.id].channels) {
				return
			}

			var text = 'Logging Channels: ```\n'
			for (var channel of e.profile[e.guild.id].channels) {
				text += bot.client.channels.get(channel).name + '\n'
			}
			e.channel.send(text + '```')
		}
	},

	'log.echo.here': {
		execute(e) {
			if (!channels[e.guild.id]) return
			var idx = channels[e.guild.id].channels.indexOf()

			if (idx != -1) {
				if (idx == 0) return
				channels[e.guild.id].channels.splice(idx, 1)
				e.channel.send("Log messages from this server will no longer be echoed here.")
				return
			}

			channels[e.guild.id].channels.push(e.channel.id)
			e.channel.send("Log messages from this server will be echoed to this channel.")
		}
	},

	'log': {
		args: 1,
		tags: 'mod',
		usage: '<message>',
		execute(e) {
			var log = getLog(e.guild)
			if (!log) return

			sendEmbed(log, {
				author: {
					name: e.author.username,
					icon_url: e.author.displayAvatarURL
				},
				footer: {
					text: '💡 Admin Message'
				},
				description: e.args[0]
			})

		}
	},

	'log.debug': {
		execute(e) {
			e.channel.sendCode('js', util.inspect(e.profile[e.guild.id]))
		}
	},

	'greet': {
		tags: 'admin',
		usage: `[ clear | <channel> [message] ]`,
		help: 'Wildcards: {user}',
		reload: true,
		args: [0, 2],
		execute(e) {
			e.profile[e.guild.id] = e.profile[e.guild.id] || {}
			var profile = e.profile[e.guild.id]

			if (e.args.length == 0) { // !greet
				if (profile.greet) {
					e.channel.send(`New users will be greeted in <#${profile.greet.channel}> with the following message: \`${profile.greet.message}\`\nExample:`)
					e.channel.send(profile.greet.message.replace('{user}', e.member.toString()))
				} else {
					e.channel.send('Greeting messages are disabled.')
				}
			} else if (e.args[0] == 'clear') { // !greet clear
				profile.greet = {}
				e.channel.send('Greeting messages disabled.')
			} else { // greet <channel> [message]
				// check for channel mention
				var [m, id] = e.args[0].match(/<#(\d+)>/) || [null]
				if (!m) return
				var chan = e.bot.client.channels.get(id)
				if (!chan) return

				profile.greet = {
					channel: id,
					message: e.args[1] || (profile.greet || {}).message || '[No Greet Message]'
				}
				e.channel.send(`New users will be greeted in <#${profile.greet.channel}> with the following message: \`${profile.greet.message}\`\nExample:`)
				e.channel.send(profile.greet.message.replace('{user}', e.member.toString()))
			}

			e.bot.profile.save()
		}
	},

	'channels': {
		tags: 'admin',
		execute(e) {
			var msg = "```xl\n"

			var chans = e.guild.channels.array().filter(a => a.type == 'text').sort((a, b) => {
				return a.position - b.position
			})

			for (var channel of chans) {
				msg += `${channel.id}\t#${channel.name}\n`
			}


			e.channel.send(msg + '```')
		}
	}
}
