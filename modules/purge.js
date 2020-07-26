const util = require('util')
module.exports.defaultCommand = {requirements: 'guild'}

const MESSAGE_LIMIT = 100

var purgeConfirms = {}

module.exports.commands = {
    "purge": {
        reload: false,
        args: [1, 2],
        help: "purge messages in this channel with at least a certain age",
        usage: "<hours>",
        async execute(e) {
            var botMember = await e.guild.fetchMember(e.client.user)
            if (!botMember.hasPermission('MANAGE_MESSAGES'))
                return e.channel.send("Error: This bot does not have the `Manage Messages` permission in this guild.")

            if (!e.member.hasPermission('MANAGE_MESSAGES'))
                return e.channel.send("Error: You do not have the `Manage Messages` permission in this guild.")
            
            // If there's only one arg or the confirm code is invalid we give the user the confirm code and ask them to run the command again
            if (e.args.length === 1 || !(e.args[1] in purgeConfirms) ) {

                // confirmation code wasn't valid
                if (e.args.length > 1) {
                    e.channel.send(`Confirmation code '${e.args[1]}' is invalid or has expired.`)
                }

                let confirmCode
                do {
                    // get an alphanumeric string that's 7 characters long
                    confirmCode = Math.random().toString(36).substring(2, 9)
                } while ( confirmCode in purgeConfirms );
                
                purgeConfirms[confirmCode] = {channel: e.channel.id, user: e.author.id}

                // expires in 5 minutes
                setTimeout(() => {
                    delete purgeConfirms[confirmCode]
                }, 300000)

                console.dir(purgeConfirms)

                return e.channel.send(`This will delete **ALL** messages older than ${e.args[0]} hours.\nType \`--purge ${e.args[0]} ${confirmCode}\` to confirm. This code will expire in 5 minutes.`)
            }

            var hours = parseFloat(e.args[0])
            if (hours === NaN) {
                return e.channel.send(`Not a valid number: ${e.args[0]}`)
            }

            if ( e.args[1] in purgeConfirms ) {
                let data = purgeConfirms[e.args[1]]
                if (e.author.id !== data.user) {
                    return e.channel.send(`This confirmation code is for another user.`)
                }
                if (e.channel.id !== data.channel) {
                    return e.channel.send(`This confirmation code is for another channel.`)
                }

                // now remove it
                delete purgeConfirms[e.args[1]]
            } else {
                // second check just to be extra sure
                return e.channel.send(`Confirmation code '${e.args[1]}' is invalid or has expired.`)
            }

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

                var deletes = e.channel.bulkDelete(messages.array().filter(filter))
                deletes = await deletes
                messageCount += deletes.size
                await statusMessage.edit("Purging messages... " + messageCount)
            }
            return statusMessage.edit("Purged " + messageCount + " messages.")
        }
    }
}