module.exports.commands = {

    "bots": function(e) {

        let members = e.guild.members.cache
        console.log(`[Bots] Fetched ${members.size}/${e.guild.memberCount} members from guild ${e.guild.name}`)

        let bots = members.filter(m => m.user.bot)
        console.log(`[Bots] Filtered ${bots.size} bots from guild ${e.guild.name}`)

        let msg = bots.map(b => b.toString()).join('\n')

        e.channel.send(msg)

    }

}