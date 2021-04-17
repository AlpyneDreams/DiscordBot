
module.exports.defaultProfile = {
    guilds: {}
}
module.exports.defaultCommand = {
    reload: true,
    requirements: ['guild']
}

var profile, bot
exports.init = function(e) {profile = e.profile.modules.starboard, bot = e}


function getStarboard(guild) {
    var id = profile.guilds[guild.id] ? profile.guilds[guild.id].starboard : undefined
    return id ? guild.channels.get(id) : id
}

async function getStarPost(e) {
    var star = profile.guilds[e.guild.id] ? profile.guilds[e.guild.id].stars[e.id] : undefined
    return star ? await getStarboard(e.guild).messages.fetch(star.id) : undefined
}

// modifies: stars
function deleteStarPost(post, msg) {
    post.delete()
    delete profile.guilds[post.guild.id].stars[msg.id]
    bot.profile.save()
}

module.exports.events = {
    async messageReactionAdd(reaction, user) {
        // no selfstarring
        if (reaction.message.author.id == user.id) return

        if (reaction.emoji.name == '⭐') {
            var starPost = await getStarPost(reaction.message)
            if (starPost) {
                starPost.edit(starPost.content + '⭐')
            } else {
                var e = reaction.message
                var starboard = getStarboard(e.guild)
                if (!starboard) {return}
                var embed = {
                    author: {
                        name: e.member.nickname || e.author.username,
                        icon_url: e.author.avatarURL
                    },
                    description: e.content,
                    timestamp: e.createdAt,
                    color: 16756016
                }
                if (e.attachments.size > 0) {
                    embed.image = {
                        url: e.attachments.first().url
                    }
                }
                let msg = await starboard.send('⭐', {embed})
                let guild = profile.guilds[e.guild.id]
                guild.stars[e.id] = {id: msg.id, channel: e.channel.id}
                bot.profile.save()
            }

            // update stats
            let guild = profile.guilds[reaction.message.guild.id]
            guild.stats.total += 1
            guild.users[reaction.message.author.id] = guild.users[reaction.message.author.id] || {stars: 0}
            guild.users[reaction.message.author.id].stars += 1
            bot.profile.save()
        }
    },
    async messageReactionRemove(reaction) {
        if (reaction.emoji.name == '⭐') {
            var starPost = await getStarPost(reaction.message)
            if (starPost) {
                var post = starPost
                var msg = reaction.message
                // cut off a star
                var newContent = post.content.slice(0, -1)
                // check if there's any stars Left
                if (newContent.length <= 0) {
                    deleteStarPost(post, msg)
                } else {
                    post.edit(newContent)
                }

                // update stats
                var guild = profile.guilds[post.guild.id]
                guild.stats.total -= 1
                guild.users[msg.author.id] == guild.users[msg.author.id] || {stars: 0}
                guild.users[msg.author.id].stars -= 1
                bot.profile.save()
            }
        }
    },
    async messageReactionRemoveAll(message) {
        var post = await getStarPost(message)
        if (post) {
            deleteStarPost(post, message)

            // TODO: update stats
        }
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    //The maximum is exclusive and the minimum is inclusive
    return Math.floor(Math.random() * (max - min)) + min
}

// displays a starred message
async function showStar(channel, id) {
    var starboard = getStarboard(channel.guild)
    var msg = await starboard.messages.fetch(id)
    var embed = msg.embeds[0]
    channel.send(msg.content, {
        embed: {
            author: {
                name: embed.author.name,
                icon_url: embed.author.iconURL
            },
            timestamp: embed.createdTimestamp,
            description: embed.description,
            color: embed.color
        }
    })
}

module.exports.commands = {
    "starboard": {
        description: "Provides info about this server's starboard.",
        execute(e) {
            var starboard = getStarboard(e.guild)
            if (starboard) {
                var numStars = Object.keys(profile.guilds[e.guild.id].stars).length
                e.channel.send(`This server's starboard is <#${starboard.id}>, with ${numStars} stars cached.`)
            } else {
                e.channel.send('This server does not have a starboard!')
            }
        }
    },
    "starboard.use": {
        description: "Set the server's starboard channel and clear the star cache.",
        tags: 'admin',
        args: 1, usage: '<channel>',
        execute(e) {
            if (e.mentions.channels.size > 0) {
                var channel = e.mentions.channels.first()
                e.profile.guilds[e.guild.id] = {starboard: channel.id, stars: {}, stats: {total: 0}, users: {}}
                e.bot.profile.save()
                e.channel.send(`This server's starboard is now <#${channel.id}>. Star cache cleared.`)
            } else {
                e.channel.send('You must specifiy a channel.')
            }
        }
    },
    "starboard.reset": {
        description: "Disable stars and clear the star cache.",
        tags: 'admin',
        execute(e) {
            delete e.profile.guilds[e.guild.id]
            e.bot.profile.save()
            e.channel.send('No longer keeping track of stars. Star cache cleared.')
        }
    },

    "star.show": {
        args: 1,
        usage: '<message id>',
        execute(e) {
            if (profile.guilds[e.guild.id]) {
                var stars = profile.guilds[e.guild.id].stars
                if (Object.keys(stars).length <= 0) return e.channel.send('There are no stars!')

                var star = stars[e.args[0]]
                if (!star) {
                    e.channel.send('Cannot find that message.')
                } else {
                    showStar(e.channel, star)
                }
            }
        }
    },
    "star.random": {
        description: "Shows a random starred message from the cache.",
        execute(e) {
            if (profile.guilds[e.guild.id]) {
                var stars = Object.values(profile.guilds[e.guild.id].stars)
                if (stars.length <= 0) return e.channel.send('There are no stars!')

                var star = stars[getRandomInt(0, stars.length)]
                showStar(e.channel, star)
            }
        }
    },
    "star.stats": {
        execute(e) {
            var guild = profile.guilds[e.guild.id]
            if (guild) {
                var numStars = Object.keys(guild.stars).length
                e.channel.send('', {
                    embed: {
                        fields: [
                            {name: 'Messages Starred', value: numStars, inline: true},
                            {name: 'Total Stars', value: guild.stats.total, inline: true},
                            //{name: 'Most Starred', value:'0', inline: true},
                            //{name: '🥇 1st Place', value:'0', inline: true},
                            //{name: '🥈 2nd Place', value:'0', inline: true},
                            //{name: '🥉 3rd Place', value:'0', inline: true}
                        ]
                    }
                })
            }
        }
    }
}
