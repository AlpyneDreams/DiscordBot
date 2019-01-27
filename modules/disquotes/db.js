
var r = require('rethinkdbdash')({db: 'disquotes'})

function createMessage(e) {
    return {
        id: e.id,
        channel: e.channel.id,
        author: e.author.id,
        content: e.content,
        timestamp: e.createdAt,
        edits: [],
        deleted: null,
        //tts: e.tts,
        //mentionEveryone: e.mentions.everyone,
        //mentions: e.mentions.users.array(),
        //mentionRoles: e.mentions.roles.array(),
        attachments: [],
        embeds: [],
    }
}

module.exports.logMessage = function(e) {
    var entry = createMessage(e)

    r.table('messages').insert(entry).run()
}
module.exports.logEdit = function(old, e) {
    r.table('messages')
        .get(e.id)
        .update({
            edits: r.row('edits').append({
                content: e.content,
                timestamp: e.editedAt
            })
        }).run()
}
module.exports.logDelete = function(e) {
    var timestamp = new Date()
    r.table('messages')
        .get(e.id)
        .update({
            deleted: timestamp
        }).run()
}

module.exports.getMessage = async function(id) {
    return await r.table('messages').get(id).run()
}
module.exports.getMessages = async function(channel, id, count = 4) {
    return await r.table('messages')
        .filter(r.row('channel').eq(channel))
        .filter(r.row('id').le(id))
        .orderBy(r.desc('timestamp'))
        .limit(count)
        .run()
}

module.exports.getQuote = async function(client, guildId, name) {
    return await r.table('quotes')
        .filter( r.row('guild').eq(guildId) )
        .filter( r.row('name').eq(name) )
        .nth(0)
        .run()
}

module.exports.addQuote = async function(e) {
    var msg = await module.exports.getMessage(e.args[0])
    return await r.table('quotes')
        .insert({
            creator: e.author.id,
            guild: e.guild.id,
            id: e.id, // Temp
            messages: [
                msg
            ],
            name: e.args[1]
        })
        .run()
}

module.exports.addToQuote = async function(qid, id) {
    var msg = await module.exports.getMessage(id)
    return await r.db('disquotes').table('quotes')
        .get(qid)
        .update({messages: r.row('messages').append(msg)})
        .run()
}

module.exports.deleteQuote = async function(guild, name) {
    return await r.table('quotes')
        .filter(r.row('guild').eq(guild))
        .filter(r.row('name').eq(name))
        .nth(0).delete()
        .run()
}

module.exports.renameQuote = async function(guild, name, rename) {
    return await r.table('quotes')
        .filter(r.row('guild').eq(guild))
        .filter(r.row('name').eq(name))
        .nth(0).update({name: rename})
        .run()
}

module.exports.getQuotes = async function(guild) {
    return await r.table('quotes')
        .filter(r.row('guild').eq(guild.id))
        .run()
}
module.exports.getQuoteNames = async function(guild) {
    return await r.table('quotes')
        .filter(r.row('guild').eq(guild))
        .getField('name')
        .run()
}


// eslint-disable-next-line no-unused-vars
const COLORS = [
    16711680,	// RED
    16746496,	// ORANGE
    16776960,	// YELLOW
    65280,		// GREEN
    255,		// BLUE
    8913151,	// PURPLE
    16711935,	// PINK,
    7506394,	// BLURPLE
]


module.exports.r = r
