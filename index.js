require("./bot/util/console.js")
DiscordBot = require("./bot/DiscordBot.js")


var bot = new DiscordBot(process.argv[2])

module.exports = bot

bot.connect()
