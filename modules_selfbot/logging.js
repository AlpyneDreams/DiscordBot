
var colors = require('ansi-colors')

module.exports.defaultProfile = {
    notedUsers: [],
    notedGuilds: [],
}

var profile
module.exports.init = function(bot, mod) {
    profile = mod.profile
}

var lastPresenceUpdate = {id: null}

var presenceStrings = {
    "online": "ONLINE".green,
    "offline": "OFFLINE".grey,
    "dnd": "DND".red,
    "idle": "IDLE".yellow
}

function getPrettyStatus(status) {
    if (status in presenceStrings) return presenceStrings[status]
    else return status.toUpperCase()
}

module.exports.getPrettyStatus = getPrettyStatus

function bell() {
    process.stdout.write('\u0007')
}


function getGuildFolder(guild) {
    if (guild && guild.name)
        return `Guilds/${guild.name}-${guild.id}`
    else if (guild.id)
        return `Guilds/${guild.id}`
    else
        return `Guilds/[undefined]`
}

function getChannelFolder(channel) {
    switch (channel.type) {
        case 'dm':
            return `Private Messages/${channel.recipient.username}-${channel.recipient.id}`
        case 'group':
            return `Group Chats/${channel.name}-${channel.id}`
        default: // text, voice, category
            return getGuildFolder(channel.guild) + `/#${channel.name}-${channel.id}`
    }
}

/* typingStart + typingStop
 *	- by noted users
 * 	- DMs to noted users
 *	- in noted guilds
 */

function onTypingStartStop(channel, user, stop = false) {
    var noted = user.id in profile.notedUsers
				|| (channel.guild && channel.guild.id in profile.notedGuilds) 
				|| (channel.type === 'dm' && channel.recipient.id in profile.notedUsers)
		
	// only log noted event to reduce clutter
    if (!noted) return

    var color = stop ? 'grey' : 'cyan'
    var event = stop ? 'STOP' : 'START'

    if (channel.type === 'dm') {
        console.spew(
            `[TYPING ${event}] ${user.username} in a DM channel`[color],
            {path: getChannelFolder(channel), echo: noted}
        )
    } else if (channel.guild && channel.guild.id in profile.notedGuilds) {
        console.spew(
            `[TYPING ${event}] ${user.username} in #${channel.name}`[color],
            {path: getChannelFolder(channel), echo: noted}
        )
    }
}

var antiDupe = {
    presence: {
        song: ""
    }
}

const {GuildMember} = require('discord.js')

module.exports.events = {
	
	/* presenceUpdate
	 * 	- noted users
	 *	- in noted guilds (no bell)
	 */
    presenceUpdate(old, cur) {
        var noted = cur.user.id in profile.notedUsers || cur.guild.id in profile.notedGuilds
		// only beep for noted users
        var important =  cur.user.id in profile.notedUsers
		
        if (!noted) return
		
        const color = important ? 'cyan' : 'reset'

        if (cur.presence.status !== old.presence.status) {
            if (important) bell()

            const oldStatus = getPrettyStatus(old.presence.status)
            const newStatus = getPrettyStatus(cur.presence.status)

            console.spew(
                `[STATUS] {0} [{1}] -> [{2}]`.format(cur.user.username, oldStatus, newStatus)[color].bold,
                {path: 'Presence'}
            )
        } else if (cur.presence.game) {
            var activity = cur.presence.game
            if (activity.type === 2) { // 2 = Listening
                const track = `{state} - {details}`.format(activity)
				
                if (antiDupe.presence.song !== track) {
                    console.spew(
                        `[STATUS] {0} started listening to {1}`.format(cur.user.username, track.bgGreen.bold)[color].bold,
                        {path: 'Presence'}
                    )
                    antiDupe.presence.song = track
                }
            }
        }
    },

	/* voiceState Update
	 *  - noted users
	 *  - or in noted guilds (no bell)
	 */
    voiceStateUpdate(oldMember, newMember) {
        var noted = newMember.user.id in profile.notedUsers || newMember.guild.id in profile.notedGuilds
		// only beep for noted users
        var important =  newMember.user.id in profile.notedUsers

        if (!noted) return

        if (oldMember.voiceChannelID !== newMember.voiceChannelID) {
            if (important) bell()
            if (!newMember.voiceChannelID) {
				// voice left
                var channel = oldMember.voiceChannel || {name: '[unkown channel]'}
                console.log(`[VOICE LEAVE] ${newMember.user.username} left channel ${channel.name}`)
            } else  if (!oldMember.voiceChannelID) {
				// voice joined
                console.log(`[VOICE JOIN] ${newMember.user.username} joined channel ${newMember.voiceChannel.name}`)		
            } else {
				// voice moved
                console.log(`[VOICE MOVE] ${newMember.user.username} moved from ${oldMember.voiceChannel.name} to ${newMember.voiceChannel.name}`)
            }
        }
    },

    guildMemberUpdate(old, cur) {
        if (cur.user.id === cur.client.user.id && old.nickname !== cur.nickname) {
            console.log(`[NICKNAME CHANGE] ${cur.user.username}: ${old.nickname || null} -> ${cur.nickname || null}`, getGuildFolder())
        }
    },

    guildBanAdd(guild, user) {
		// echo if noted guild or noted user
        var noted = guild.id in profile.notedGuilds || user.id in profile.notedUsers

        console.spew(
            `[BAN ADD] ${guild.name} banned ${user.tag}`.magenta,
            {path: getGuildFolder(guild), echo: noted}
        )
    },

	// guildJoin and guildDelete are logged for all guilds due to rarity
	 
    guildDelete(guild) {
        console.log(`[GUILD JOINED] ${guild.name || `[${guild.id}]`}`.magenta, getGuildFolder(guild))
    },
	
    guildDelete(guild) {
        console.log(`[GUILD LEFT] ${guild.name || `[${guild.id}]`}`.magenta, getGuildFolder(guild))
    },

    typingStart(channel, user) {
        onTypingStartStop(channel, user, false)		
    },

    typingStop(channel, user) {
        onTypingStartStop(channel, user, true)
    },

    message(msg) {
	
        try {
            var folder = getChannelFolder(msg.channel)
            var noted = Object.keys(profile.notedUsers).includes(msg.author.id)
	
            if (msg.guild) {
                noted = noted || Object.keys(profile.notedGuilds).includes(msg.guild.id)
            }

            if (msg.channel.type === 'dm' && msg.channel.recipient.id in profile.notedUsers) {
                noted = true
            }
				
            console.spew(
                msg.author.username + ": " + msg.content,
                {path: folder, echo: noted}
            )
        } catch (e) {
            console.warn("Failed to log message " + msg.id + " to console.");
            console.warn(e.name + ": " + e.message)
        }
	
		// Scrape for info.
		// not sinister i swear
		// TODO: Load from config
	
		// Emails
		/*var emails = msg.content.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
		if (emails) {
			console.log('#' + msg.channel.name + ' ' + msg.author.name + ": " + msg.content);
			console.info(('Emails: ' + emails[0]).cyan.bold);
		}
	
		// Discord Instant Invites
		var invites = msg.content.match(/https:\/\/discord\.gg\/[a-z]+/i);
		if (invites) {
			console.info(('Invites: ' + invites[0]).cyan.bold);
		}*/
	
	
    },

	/*messageUpdate(prev, msg) {
		var entry = {}
	
		try {
			var folder = msg.channel.type == 'dm' ? 'Private Messages' : msg.guild.name + '-' + msg.guild.id;
	
			console.log(
				"[EDIT] " + msg.author.username + ": " + msg.content,
				folder,
				'#' + msg.channel.name + '-' + msg.channel.id
			)
		} catch (e) {
			console.warn("Failed to log edit of message. (FILE)" + msg.id);
		}
	
	},*/

    messageDelete(msg) {
        var name
        if (msg.member)
            name = msg.member.displayName
        else if (msg.author)
            name = msg.author.displayName || msg.author.id
        else
            name = 'null'

        var folder = getChannelFolder(msg.channel)
		
        var noted = (msg.guild && msg.guild.id in profile.notedGuilds) || (msg.author && msg.author.id in profile.notedUsers)
        console.spew(`[${'DELETED'.red.bold}] ${name}: ${msg.cleanContent || msg.content || msg.id}`, {path: folder, echo: noted})
    }

}