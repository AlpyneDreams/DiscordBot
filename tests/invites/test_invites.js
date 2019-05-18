require("../../bot/util/console.js")
const fs = require('fs')
const DiscordBot = require("../../bot/DiscordBot.js")
const Command = require("../../bot/Command.js")

const log = msg => console.log(`[INVITES] ${msg}`.magenta)

var bot = new DiscordBot('configs/config.hjson', false)


// option to load data from last time to avoid requests for dead invite links
let prevData = null
if (process.argv.indexOf('--data') > 1) {
    prevData = require('./data.json')
} else {
    log(`Run with '--data' arg to filter out dead invites.`)
}

// just the basic modules

bot.config.moduleWhitelist = true
bot.config.modules = ['core', 'dev', 'logging', 'interactive']

bot.loadAllModules()

// load invites.txt. Remove comments and trim.
let invites = fs.readFileSync('tests/invites/invites.txt', {encoding: 'utf-8'}).split('\n').map(x => x.trim()).filter(x => x[0] != '#')

// Filter out dead invites from last run if avaliable
if (prevData) {
    invites = invites.filter(x => prevData[x] !== null)
    log(`Filtered out ${Object.keys(prevData).filter(x => prevData[x] === null).length} dead invites from previous pass.`)
}

log(`Loaded ${invites.length} invite codes.`)

// adds the 'go' command to the backend interactive commands
bot.modules.interactive._commands['go'] = new Command({
    async execute(e) {
        let j = 0
        const total = invites.length
        let data = {}
        for (const i of invites) {
            let invite
            try {
                invite = await bot.client.fetchInvite(i)
                log(`${`[${j + 1}/${total}] ${i}`.padEnd(32)}: ${invite.guild.name}`)
                data[i] = invite.guild.name
            } catch (err) {
                log(`${`[${j + 1}/${total}] ${i}`.padEnd(32)}: ` + 'null'.red)
                data[i] = null
            }
            j++
            //if (j > 5) break
        }
        let prevDataOrNone = prevData || {}
        fs.writeFileSync('tests/invites/data.json', JSON.stringify(Object.assign(prevDataOrNone, data), null, 4))
    }
}, bot.modules.interactive)

log(`Enter command 'go' to execute test.`)

bot.connect()