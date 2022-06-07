


exports.events = {
    message: Object.assign(logMessage, {prepend: true}),
    messageUpdate: Object.assign(logEdit, {prepend: true}),
    messageDelete: Object.assign(logDelete, {prepend: true})
}

function logMessage(msg) {
    //var entry = {} // db entry

    try {
        let guildName = msg.channel.type != 'dm' ? msg.guild.name.replace(/\//g, '-').replace(/\\/g, '-') : ''
        let folder = msg.channel.type == 'dm' ? 'Private Messages' : guildName + '-' + msg.guild.id
        let file = msg.channel.type == 'dm' ? '@' + msg.channel.recipient.username + '-' + msg.channel.recipient.id : '#' + msg.channel?.name + '-' + msg.channel.id

        console.spew(
            msg.author.username + ": " + msg.content,
            {
                echo: false,
                path: folder,
                file: file
            }
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
        console.log('#' + msg.channel.name + ' ' + msg.author.username + ": " + msg.content)
        console.info(('Emails: ' + emails[0]).cyan.bold)
    }

    // Discord Instant Invites
    var invites = msg.content.match(/https:\/\/discord\.gg\/[a-z]+/i)
    if (invites) {
        console.info(('Invites: ' + invites[0]).cyan.bold)
    }


}

function logEdit(prev, msg) {
    //var entry = {}

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

function logDelete(msg) {
    //var entry = {}

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
