const got = require('got')

module.exports.newQuote = async function(e, config) {
    var res = await got(`${config.url}${config.api}/pending/create`, {
        method: 'POST',
        port: config.port,
        headers: { Authorization: config.keys.api },
        json: true,
        body: {
            guild: e.guild.id
        }
    })
    e.channel.send(`${config.url}/create/${res.body.token}`)
}
