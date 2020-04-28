let recentlyMovedChannels

module.exports.events = {

    async message(msg) {

        // bot channel
        //if (msg.channel.id != '615418331083833375') return
        
        if (msg.guild && msg.guild.id != '615407840257114132') return
        if (msg.author && msg.author.id == msg.client.user.id) return


        /*if (msg.content.match(/terro\b/gi)) {

            if (!msg.content.match(/funny\s*terro/gi)) {
                
                if (msg.author)
                    msg.author.send('you must refer to `Terro` as `Funny Terro` - no exceptions').catch(console.error)

            }
        }*/
        
        if (msg.cleanContent.match(/:s+n+r+f+:/gi)) {

            console.info('[Dogzone] FOUND SNOT CAT')

            msg.delete().catch(console.warn)

            if (msg.author)
                msg.author.send('snot cat is gross and not accepted').catch(console.error)

        }

    },

    channelUpdate(oldChannel, newChannel) {
                
        if (!newChannel.guild) return

        let loggerChannel = newChannel.guild.channels.get('615440527428419584')

        if (newChannel.guild.id != '615407840257114132') return
        if (newChannel.parentID == oldChannel.parentID && newChannel.position == oldChannel.position) return

        let info = `${newChannel}\n`

        if (newChannel.parentID != oldChannel.parentID) {
            
            if (!newChannel.parent || !oldChannel.parent) {

                info += `Category: \`${oldChannel.parentID} -> ${newChannel.parentID}\`\n`

            } else {

                info += `Category: \`${oldChannel.parent.name} -> ${newChannel.parent.name}\`\n`

            }
            
        }

        if (newChannel.position != oldChannel.position) {
            info += `Position: \`${oldChannel.position} -> ${newChannel.position}\`\n`
        }

        console.info(`Channel ${newChannel.name} has been moved.`)

        loggerChannel.send('', { embed: { 
            title: 'Channel Moved',
            description: info,
            color: 16755200
        } })

    }

}