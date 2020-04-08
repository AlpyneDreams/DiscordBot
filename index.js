require("./bot/util/console.js")
const DiscordBot = require("./bot/DiscordBot.js")

var bot = new DiscordBot(process.argv[2] || 'configs/config.hjson')

require('./bot/util/signals.js')(bot)

module.exports = bot

bot.connect()
