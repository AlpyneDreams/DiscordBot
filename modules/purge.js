module.exports.defaultCommand = {requirements: 'guild'}

var MESSAGE_LIMIT = 2

module.exports.commands = {
    "purge": {
        reload: true,
        args: 1,
        help: "purge messages in this channel with at least a certain age",
        usage: "[hours]",
        async execute(e) {
            var botMember = await e.guild.fetchMember(e.client.user)
            if (!botMember.hasPermission('MANAGE_MESSAGES'))
                return e.channel.send("Error: This bot does not have the `Manage Messages` permission in this guild.")

            var statusMessage = await e.channel.send("Purging messages... 0")

            var filter = function (m) {
                return Date.now() - m.createdTimestamp > parseFloat(e.args[0]) * 60 * 60 * 1000 && !m.pinned
            }

            var done = false
            var messageCount = 0
            var oldestMessage = undefined
            while (!done) {
                var messages = await e.channel.fetchMessages({limit: MESSAGE_LIMIT, before: oldestMessage})
                done = messages.size < MESSAGE_LIMIT
                if (messages.size == 0) {
                    break;
                }
                oldestMessage = messages.array().sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                oldestMessage = oldestMessage[0].id

                var deletes = Promise.all(messages.array().filter(filter).map(function (m) {
                    m.delete()
                }))
                deletes = await deletes
                messageCount += deletes.length
                await statusMessage.edit("Purging messages... " + messageCount)
            }
            return statusMessage.edit("Purged " + messageCount + " messages.")
        }
    }
}