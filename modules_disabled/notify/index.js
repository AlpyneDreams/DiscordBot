// most of this is disabled due to insecurity
/* eslint-disable no-unreachable */
//const util = require ('util')
//const vm = require('vm')
//const Discord = require('discord.js')


// VM Stuff
//var sandbox = {result: null, pattern: null}
//var context = vm.createContext(sandbox)
//console.log('Sandbox initialized: ' + vm.isContext(sandbox))

exports.init = function(e, module) {

    // disabled
    return

    e.client.on("message", m => {

        if (e.client.user.equals(m.author)) {
            return
        }

        // if channel
        var channel = module.profile[m.channel.id]
        if (channel && channel.users) {
            // for each user
            for (var id in channel.users) {

                if (m.author.id == id) {
                    //continue
                }

                // for each pattern
                for (var pattern of module.profile[m.channel.id].users[id]) {
                    // if matching
                    if (m.content.match(pattern)) {
                        var embed = {
                            description: m.content,
                            author: {name: m.member.nickname || m.author.username, icon_url: m.author.displayAvatarURL},

                        }


                        e.client.users.fetch(id).then(u => {u.sendEmbed(embed, `Your pattern \`${pattern}\` was matched in <#${m.channel.id}> by <@${m.author.id}>.`)})
                    }
                }
            }
        }
    })
}

exports.commands = {
    "notify": {
        usage: "<regex>",
        execute(e) {
            e.channel.send("⚠️️ Notify is disabled because I am too lazy to fix ReDos issues")
            return

            // Create a profile for the channel
            e.profile[e.channel.id] = e.profile[e.channel.id] || {users: {}}
            var channel = e.profile[e.channel.id]

            // Create a profile for the user in that channel
            e.profile[e.channel.id].users[e.author.id] = e.profile[e.channel.id].users[e.author.id] || []
            var user = channel.users[e.author.id]

            e.args = e.args.join(' ')

            if (!e.args) {
                if (user[0]) {
                    e.channel.send("🔔 Your pattern is set to `" + user[0] + "` for this channel.")
                    return
                } else {
                    e.channel.send("🔕 You do not have a notification pattern set for this channel.")
                    return
                }
            } else {
                user[0] = e.args
                e.bot.profile.save()
                e.channel.send("🔔 Set notification pattern to `" + e.args + "` for this channel.")
            }



        }
    },
    "notify.remove": {
        execute(e) {
            if (e.profile[e.channel.id] && e.profile[e.channel.id].users[e.author.id]) {
                e.profile[e.channel.id].users[e.author.id] = undefined
                e.channel.send("🔕 Notifications removed for this channel.")
            }
        }
    }
}
