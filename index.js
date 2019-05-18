require("./bot/util/console.js")
const DiscordBot = require("./bot/DiscordBot.js")
require('./bot/util/signals.js')(bot)

var bot = new DiscordBot(process.argv[2] || 'configs/config.hjson')

module.exports = bot

bot.connect()
