var discord = require('discord.js')

module.exports.defaultProfile = {
    guilds: {}
}
module.exports.defaultCommand = {
    reload: true,
    requirements: ['guild']
}


/**** CONSTANTS ****/
const DEFAULT_GUILD_PROFILE = {
    starboard: null,
    stars: {},
    users: {},
    stats: {messages: 0, totalStars: 0}
}
const DEFAULT_USER_PROFILE = {
    given: 0,
    received: 0,
    messages: 0
}
const IMAGE_FILE_TYPES = ['png', 'jpg', 'jpeg', 'gif']
const STAR_EMOJI = '⭐'

const STAR_TIERS = [5, 7]
const STAR_TIER_EMOJIS = ['⭐', '🌟']
// 1st, 2nd, 3rd
const MEDAL_EMOJIS = ['🥇', '🥈', '🥉']
const COLOR_GOLD = 0xf1c40f


var bot, moduleProfile
module.exports.init = function(e, m) {
    bot = e
    moduleProfile = m.profile
}

function getProfile(guild) {
    var p = moduleProfile.guilds[guild.id]
    if (p && !p.locked) {return p} else {return undefined}
}
function writeProfile(guild, profile) {
    moduleProfile.guilds[guild.id] = profile
    bot.profile.save()
}

// Message w/ star count, channel, and ID
function starAnnotation(msg, count=1) {
    let emoji = STAR_TIER_EMOJIS[0]
    for (let t = 0; t < STAR_TIERS.length; t++)
        if (count >= STAR_TIERS[t])
            emoji = STAR_TIER_EMOJIS[t]
    return `${emoji} ${count>1 ? `**${count}**` : ``} <#${msg.channel.id}> ID: ${msg.id}`
}
// Gradient color to vizualize number of stars
function starColor(stars) {
    /**
     * We define as 7 stars to be 100% of the star gradient (arbitrary)
     * So X / 7 will clamp to our percentage,
     * We start out with 0xfffdf7 for the beginning colour
     * Gradually evolving into 0xffc20c
     * rgb values are (255, 253, 247) -> (255, 194, 12)
     * To create the gradient, we use a linear interpolation formula
     * Which for reference is X = X_1 * p + X_2 * (1 - p)
     **/
    let p = stars / 7
    if (p > 1.0) p = 1.0


    let red = 255
    let green = Math.round( (194 * p) + (253 * (1-p)) )
    let blue  = Math.round( (12  * p) + (247 * (1-p)) )

    return (red << 16) + (green << 8) + blue
}
// Generates an embed quote for a starred message
function starEmbed(msg, count=1) {
    var em = {
        author: {
            name: msg.member.nickname || msg.author.username,
            icon_url: msg.author.avatarURL()
        },
        help: msg.content,
        timestamp: msg.createdAt,
        color: starColor(count)
    }


    if (msg.embeds.length > 0) {
        let file = msg.embeds[0]
        if (file.type === 'image') {
            em.image = {url: file.url}
        }
    }

    if (msg.attachments.size > 0) {
        let file = msg.attachments.first()
        for (var ext of IMAGE_FILE_TYPES) {
            if (file.filename.toLowerCase().endsWith(ext)) {
                em.image = {url: file.url}
            }
        }

        if (!em.image) {
            em.fields = [{name: 'Attachment', value: `[${file.filename}](${file.url})`}]
        }
    }

    return em
}

// Gets the message on the starboard that quotes the starred message
async function getLinked(msg, starboard, profile) {
    return await starboard.messages.fetch(profile.stars[msg.id].linked)
}

// Called when the first star is added to a message
async function newStar(msg, starboard, profile) {
    // create linked message
    var linked = await
    starboard.send(starAnnotation(msg), {embeds: [starEmbed(msg, 1)]})

    // create profile entry
    profile.stars[msg.id] = {linked: linked.id, count: 1, channel: msg.channel.id}
    profile.stats.messages += 1
    profile.stats.totalStars += 1

    bot.profile.save()
}
// Called when any extra stars are added
async function addStar(r, profile, starboard) {
    var linked = await getLinked(r.message, starboard, profile)

    // update count
    profile.stars[r.message.id].count += 1
    profile.stats.totalStars += 1

    // update linked
    linked.edit(starAnnotation(r.message, profile.stars[r.message.id].count), {embeds: [starEmbed(r.message, profile.stars[r.message.id].count)]})

    bot.profile.save()
}
// Called when a star is removed
async function subStar(r, profile, starboard) {
    var linked = await getLinked(r.message, starboard, profile)

    profile.stars[r.message.id].count -= 1
    profile.stats.totalStars -= 1

    linked.edit(starAnnotation(r.message, profile.stars[r.message.id].count), {embeds: [starEmbed(r.message, profile.stars[r.message.id].count)]})

    if (profile.stars[r.message.id].count <= 0) {
        // completely unstarred
        linked.delete()
        delete profile.stars[r.message.id]
        profile.stats.messages -= 1
        profile.users[r.message.author.id].messages -= 1
    }

    bot.profile.save()
}

function getUserStats(profile, user) {
    profile.users[user.id] = profile.users[user.id] || DEFAULT_USER_PROFILE
    return profile.users[user.id]
}

module.exports.events = {
    async messageReactionAdd(r, u) {
        var profile = getProfile(r.message.guild)
        if (!profile) return
        if (r.emoji.name !== STAR_EMOJI) return
        if (u.id === r.message.author.id) return

        var stats = getUserStats(profile, u)
        stats.given += 1
        stats = getUserStats(profile, r.message.author)
        stats.received += 1

        var starboard = r.message.guild.channels.get(profile.starboard)

        if (!(r.message.id in profile.stars)) {
            stats.messages += 1
            newStar(r.message, starboard, profile)
        } else {
            addStar(r, profile, starboard)
        }

    },
    async messageReactionRemove(r, u) {
        var profile = getProfile(r.message.guild)
        if (!profile) return
        if (r.emoji.name !== STAR_EMOJI) return
        if (u.id === r.message.author.id) return

        if (r.message.id in profile.stars) {
            var stats = getUserStats(profile, u)
            stats.given -= 1
            stats = getUserStats(profile, r.message.author)
            stats.received -= 1

            var starboard = r.message.guild.channels.get(profile.starboard)
            subStar(r, profile, starboard)
        }
    },
    async messageReactionRemoveAll(m) {
        var profile = getProfile(m.guild)
        if (!profile) return

        if (m.id in profile.stars) {
            var starboard = m.guild.channels.get(profile.starboard)

            // completely unstarred
            getLinked(m, starboard, profile).then(x => x.delete())
            profile.stats.messages -= 1
            profile.stats.totalStars -= profile.stars[m.id].count

            var stats = getUserStats(m.author)
            stats.messages -= 1
            stats.received -= profile.stars[m.id].count

            delete profile.stars[m.id]

            bot.profile.save()
        }
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    //The maximum is exclusive and the minimum is inclusive
    return Math.floor(Math.random() * (max - min)) + min
}


module.exports.commands = {
    "starboard": {
        tags: 'admin',
        args: [0, 1], usage: "[channel]",
        async execute(e) {
            var profile = getProfile(e.guild)

            if (!profile) {
                if (e.mentions.channels.size <= 0) {
                    return e.channel.send('This server does not have a starboard. You must specify a channel to create one.')
                }
                var channel = e.mentions.channels.first()
                if (!channel.permissionsFor(e.guild.me).has(discord.Permissions.FLAGS.SEND_MESSAGES | discord.Permissions.FLAGS.READ_MESSAGES)) {
                    return e.channel.send('I do not have permission to send or read messages in that channel, failed to initalize starboard.')
                }

                profile = {}
                Object.assign(profile, DEFAULT_GUILD_PROFILE)
                profile.starboard = channel.id
                writeProfile(e.guild, profile)

                channel.send(`Initialized <#${channel.id}> as this server's starboard.`)

            } else {
                e.channel.send(`This server's starboard is <#${profile.starboard}>.`)
            }
        }
    },

    "star.show": {
        help: 'Shows a starred message.',
        args: 1, usage: '<message>',
        async execute(e) {
            var profile = getProfile(e.guild)
            if (!profile) return

            if (e.args[0] in profile.stars) {
                var msg = await e.guild.channels.get(profile.stars[e.args[0]].channel).messages.fetch(e.args[0])
                e.channel.send(starAnnotation(msg, profile.stars[e.args[0]].count), {embeds: [starEmbed(msg, profile.stars[e.args[0]].count)]})
            } else {
                e.channel.send('That message is not starred.')
            }
        }
    },
    "star.random": {
        help: 'Shows a random starred message.',
        async execute(e) {
            var profile = getProfile(e.guild)
            if (!profile) return
            var starKeys = Object.keys(profile.stars)
            if (starKeys < 1) return

            var r = starKeys[getRandomInt(0, starKeys.length)]

            if (r in profile.stars) {
                var msg = await e.guild.channels.get(profile.stars[r].channel).messages.fetch(r)
                e.channel.send(starAnnotation(msg, profile.stars[r].count), {embeds: [starEmbed(msg, profile.stars[r].count)]})
            }
        }
    },

    "star.stats": {
        args: [0, 1], usage: '[member]',
        execute(e) {
            var profile = getProfile(e.guild)
            if (!profile) return

            if (e.args.length === 0) {


                var embed = {
                    fields: [
                        {name: 'Server Statistics',
                            value: `${profile.stats.messages} messages starred, with a total of ${profile.stats.totalStars} stars.`},
                        {name: 'Top Starred Posts', value:''},
                        {name: 'Top Star Givers', value:''},
                        {name: 'Top Star Receivers', value:''}
                    ],
                    color: COLOR_GOLD
                }

                var topStarred = Object.entries(profile.stars).sort((x, y) => x[1].count-y[1].count).reverse()
                for (let i = 0; i < 3; i++) {
                    let t = topStarred[i]
                    if (t) embed.fields[1].value += `${MEDAL_EMOJIS[i]} ${t[0]} (${t[1].count} stars)\n`
                }
                var topGiven = Object.entries(profile.users).sort((x, y) => x[1].given-y[1].given).reverse()
                for (let i = 0; i < 3; i++) {
                    let t = topGiven[i]
                    if (t) embed.fields[2].value += `${MEDAL_EMOJIS[i]} <@${t[0]}> (${t[1].given} stars)\n`
                }

                var topReceived = Object.entries(profile.users).sort((x, y) => x[1].received-y[1].received).reverse()
                for (let i = 0; i < 3; i++) {
                    let t = topReceived[i]
                    if (t) embed.fields[3].value += `${MEDAL_EMOJIS[i]} <@${t[0]}> (${t[1].received} stars, ${t[1].messages} messages)\n`
                }

                for (var f of embed.fields) if (!f.value) f.value = '[No Data]'

                e.channel.send({embed})
            } else if (e.mentions.members.size > 0) {
                var member = e.mentions.members.first()
                var stats = getUserStats(profile, member)
                e.channel.send({embeds: [{
                    author: {
                        name: member.nickname || member.user.username,
                        icon_url: member.user.avatarURL()
                    },
                    fields: [
                        {name: 'Messages Starred', value: stats.messages, inline: true},
                        {name: 'Stars Given', value: stats.given, inline: true},
                        {name: 'Stars Received', value: stats.received, inline: true}
                        /*{name: 'Top Starred Posts', value:
                         `🥇 \n`
                        +`🥈 \n`
                        +`🥉 `}*/
                    ],
                    color: COLOR_GOLD
                }]})
            } else {
                e.channel.send('You must mention a user to see their stats.')
            }
        }
    },

    "star.who": {
        help: 'Shows who starred a message.',
        args: 1, usage: '<message ID>',
        async execute(e) {
            var profile = getProfile(e.guild)
            if (!profile) return

            var id = e.args[0]
            if (id in profile.stars) {
                var msg = await e.guild.channels.get(profile.stars[id].channel).messages.fetch(id)
                e.channel.send(msg.reactions
                    .filterArray(r => r.emoji.name === STAR_EMOJI)[0]
                    .users
                        // filter out selfstars
                    .filter(u => u.id !== msg.author.id)
                    .map(u => u.username)
                    .join(', ')
                )
            }
        }
    },

    /*"star.embed.test": {
        args: 1,
        execute(e) {
            var count = parseInt(e.args[0])
            e.channel.send(starAnnotation(e, count), {embeds: [starEmbed(e, count)]})
        }
    },*/

    "starboard.lock": {
        tags: 'admin',
        execute(e) {
            var profile = moduleProfile.guilds[e.guild.id]
            if (!profile) return

            profile.locked = true
            bot.profile.save()

            e.channel.send('Locked starboard.')
        }
    },
    "starboard.unlock": {
        tags: 'admin',
        execute(e) {
            var profile = moduleProfile.guilds[e.guild.id]
            if (!profile) return

            profile.locked = false
            bot.profile.save()

            e.channel.send('Unlocked starboard.')
        }
    },

    "starboard.forget": {
        tags: 'owner',
        async execute(e) {
            writeProfile(e.guild, undefined)
            e.channel.send('[Debug] Cleared all starboard data about this server.')
        }
    }
}
