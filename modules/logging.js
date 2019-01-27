


exports.events = {
    message: Object.assign(logMessage, {prepend: true}),
    messageUpdate: Object.assign(logEdit, {prepend: true}),
    messageDelete: Object.assign(logDelete, {prepend: true})
}



function logMessage(msg) {
    var entry = {} // db entry

    try {
        var folder = msg.channel.type == 'dm' ? 'Private Messages' : msg.guild.name + '-' + msg.guild.id
        var file = msg.channel.type == 'dm' ? '@' + msg.author.name + '-' + msg.author.id : '#' + msg.channel.name + '-' + msg.channel.id

        console.log(
            msg.author.username + ": " + msg.content,
            folder,
            file
        )
    } catch (e) {
        console.warn("Failed to log message #" + msg.id + " to console.")
        console.warn(e.name + ": " + e.message)
    }

    // Scrape for info.
    // not sinister i swear
    // TODO: Load from config and save to db.

    // Emails
    var emails = msg.content.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)
    if (emails) {
        console.log('#' + msg.channel.name + ' ' + msg.author.name + ": " + msg.content)
        console.info(('Emails: ' + emails[0]).cyan.bold)
    }

    // Discord Instant Invites
    var invites = msg.content.match(/https:\/\/discord\.gg\/[a-z]+/i)
    if (invites) {
        console.info(('Invites: ' + invites[0]).cyan.bold)
    }


}

function logEdit(prev, msg) {
    var entry = {}

    try {
        var folder = msg.channel.type == 'dm' ? 'Private Messages' : msg.guild.name + '-' + msg.guild.id

        console.log(
            "[EDIT] " + msg.author.username + ": " + msg.content,
            folder,
            '#' + msg.channel.name + '-' + msg.channel.id
        )
    } catch (e) {
        console.warn("Failed to log edit of message. (FILE)" + msg.id)
    }

}

function logDelete(msg, channel) {
    var entry = {}

    try {
        var folder = msg.channel.type == 'dm' ? 'Private Messages' : msg.guild.name + '-' + msg.guild.id

        console.log(
            "[DELETE] " + msg.author.username + ": " + msg.content + " (#" + msg.id + ")",
            folder,
            '#' + msg.channel.name + '-' + msg.channel.id
        )
    } catch (e) {
        console.warn("Failed to log deletion of message. (FILE)")//" + msg.id);
    }
}
