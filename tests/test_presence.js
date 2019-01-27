let recentPresence = []

module.exports = function(e) {
    e.bot.client.on('raw', p => {
        if (p && p.t && p.t.startsWith('PRESENCE')) {
            if (p.d.user.id in e.bot.profile.modules.logging.notedUsers) {
                recentPresence.push(p.d)
            }
        }
    })
}