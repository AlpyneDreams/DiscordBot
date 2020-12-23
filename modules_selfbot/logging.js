

module.exports.defaultProfile = {
    notedUsers: [],
    notedGuilds: [],
}

var profile
module.exports.init = function(bot, mod) {
    profile = mod.profile
}

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
    else if (guild && guild.id)
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

// users that have sent or recieved a DM w/ the local user in the past minute
let interactingUsers = new Set()

// default: 60,000 ms = 1 minute
function userInteract(id, time = 60000) {
    interactingUsers.add(id)
    setTimeout(() => {
        interactingUsers.delete(id)
    }, time) 
    
}

module.exports.interactingUsers = interactingUsers

function checkForDiscard(user, channel) {
    if (!interactingUsers.has(user.id) && user.id !== user.client.user.id) {
        bell()
        console.spew(`[DM DISCARDED] ${user.username}`.green.bold, {path: getChannelFolder(channel)})
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

        // discarded message detection
        if (stop) {
            // grace period of 2 seconds in case the message event is late
            //setTimeout(checkForDiscard, 2000, user, channel)
        } else {
            userInteract(user.id, 2000)
        }
    } else { //if (channel.guild && channel.guild.id in profile.notedGuilds) {
        console.spew(
            `[TYPING ${event}] ${user.username} in #${channel.name}`[color],
            {path: getChannelFolder(channel), echo: noted}
        )
    }
}

var antiDupe = {
    presence: {
        status: "",
        song: ""
    }
}

/**
 * Types of Logged Event:
 *  - Status Change
 *  - Spotify Listen
 *  - Voice Join
 *  - Voice Leave
 *  - Voice Move
 *  - Voice Server Mute
 *  - Voice Server Unmute
 *  - Voice Server Deafen
 *  - Voice Server Undeafen
 *  - Nickname Change
 *  - Ban Add
 *  - Guild Joined
 *  - Guild Left
 *  - Typing Start
 *  - Typing Stop
 *  - Message
 *  - Message Delete
 */

module.exports.events = {
    
    /* presenceUpdate
     * 	- noted users
     *	- in noted guilds
     */
    presenceUpdate(old, cur) {
        var noted = cur.user.id in profile.notedUsers // || cur.guild.id in profile.notedGuilds
        // highlight noted users
        var important =  cur.user.id in profile.notedUsers
        
        if (!noted) return
        
        const color = important ? 'cyan' : 'reset'

        if (cur.presence.status !== old.presence.status) {

            const oldStatus = getPrettyStatus(old.presence.status)
            const newStatus = getPrettyStatus(cur.presence.status)
            
            let msg = `[STATUS] {0} [{1}] -> [{2}]`.format(cur.user.username, oldStatus, newStatus)
            if (antiDupe.presence.status !== msg) {
                console.spew(
                    msg[color].bold,
                    {path: 'Presence'}
                )
                antiDupe.presence.status = msg
            }
        } else if (cur.presence.activities[0]) {
            
            var activity = cur.presence.activities[0]
            if (activity.type === 0) { // 0 = Playing
                const game = activity.name

                if (antiDupe.presence.game !== game) {
                    console.spew(
                        `[STATUS] {0} started playing {1}`.format(cur.user.username, game.bgGreen.bold)[color].bold,
                        { path: 'Presence' }
                    )
                    antiDupe.presence.game = game
                }
            } else if (activity.type === 2) { // 2 = Listening
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
                console.log(`[VOICE LEAVE] ${newMember.user.username} left channel ${channel.name}`, getGuildFolder(newMember.guild))
            } else  if (!oldMember.voiceChannelID) {
                // voice joined
                console.log(`[VOICE JOIN] ${newMember.user.username} joined channel ${newMember.voiceChannel.name}`, getGuildFolder(newMember.guild))		
            } else {
                // voice moved
                console.log(`[VOICE MOVE] ${newMember.user.username} moved from ${oldMember.voiceChannel.name} to ${newMember.voiceChannel.name}`, getGuildFolder(newMember.guild))
            }
        }

        if (oldMember.serverMute !== newMember.serverMute) {
            if (newMember.serverMute) {
                console.log(`[VOICE SERVER MUTE] ${newMember.user.username}`.red, getGuildFolder(newMember.guild))
            } else {
                console.log(`[VOICE SERVER UNMUTE] ${newMember.user.username}`.green, getGuildFolder(newMember.guild))
            }
        }

        if (oldMember.serverDeaf !== newMember.serverDeaf) {
            if (newMember.serverDeaf) {
                console.log(`[VOICE SERVER DEAFEN] ${newMember.user.username}`.red, getGuildFolder(newMember.guild))
            } else {
                console.log(`[VOICE SERVER UNDEAFEN] ${newMember.user.username}`.green, getGuildFolder(newMember.guild))
            }
        }
    },

    guildMemberUpdate(old, cur) {
        if (cur.user.id === cur.client.user.id && old.nickname !== cur.nickname) {
            console.log(`[NICKNAME CHANGE] ${cur.user.username}: ${old.nickname || null} -> ${cur.nickname || null}`, getGuildFolder(cur.guild))
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
     
    guildJoin(guild) {
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
            
            info = msg.author.username + ": " + msg.content

            if (msg.channel.type === 'dm' && msg.channel.recipient != undefined) {
                if (msg.channel.recipient.id in profile.notedUsers) {
                    // DM is TO  a noted user
                    noted = true
                    userInteract(msg.channel.recipient.id)
                } else if (noted) {
                    // DM is FROM a noted user
                    userInteract(msg.author.id)
                }
            } else {
                info = info.blue.bold // brighten non-DMs
            }
                
            console.spew(
                info,
                {path: folder, echo: noted}
            )
        } catch (e) {
            console.warn("Failed to log message " + msg.id + " to console.")
            console.warn(e.name + ": " + e.stack)
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