require("./bot/util/console.js")
const DiscordBot = require("./bot/DiscordBot.js")

var bot = new DiscordBot(process.argv[2] || 'configs/config.hjson')

module.exports = bot



async function termSignal(sig) {
    console.info(`Received Signal: ${sig}`)
    await bot.destroy()
    process.exit(0)
}

process.on('SIGTERM', termSignal)   // generic
process.on('SIGINT', termSignal)    // Ctrl + C
process.on('SIGHUP', termSignal)    // terminal window closed


bot.connect()
