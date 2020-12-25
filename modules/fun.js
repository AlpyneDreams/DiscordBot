
const Random = require("random-seed")

const magic8ball = [
    // yes - 0
    "It is certain",
    "It is decidedly so",
    "Without a doubt",
    "Yes, definitely",
    "You may rely on it",
    "As I see it, yes",
    "Most likely",
    "Outlook good",
    "Yes",
    "Signs point to yes",
    // maybe - 10
    "Reply hazy, try again",
    "Ask again later",
    "Better not tell you now",
    "Cannot predict now",
    "Concentrate and ask again",
    // no - 15
    "Don't count on it",
    "My reply is no",
    "My sources say no",
    "Outlook not so good",
    "Very doubtful"
]

let gmin = null
let gmax = null

const yes = 0
const maybe = 10
const no = 15

// inclusive range
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function clampAbs(int, min, max) {
    return Math.min(Math.max(Math.abs(int), min), max)
}


exports.commands = {
    "8ball": {
        help: 'Ask the magic 8-ball a question',
        args: [0, 1],
        interaction: true,
        options: {
            inquiry: {type: 'string', description: 'Question to ask the magic 8-ball'}
        },
        execute(e) {
            var rmin = gmin || 0
            var rmax = gmax || magic8ball.length - 1

            var rand = randomInt(rmin, rmax)

            e.channel.send("🎱" + magic8ball[rand] + "🎱")

        }
    },

    "roll": {
        help: 'Role a die or dice.',
        args: [0, 1],
        interaction: true,
        options: {
            dice: {type: 'string', description: 'Dice notation `NdX` to roll N dice with X faces each (e.g. d20, 2d6)'}
        },
        reload: true,
        execute(e) {
            if (e.args.length === 0) {
                e.channel.send(`Rolled 1d20: 🎲 **${randomInt(1, 20)}**`)
            } else {
                var match = e.args[0].match(/(\d+)?d(\d+)/i)
                if (!match) return e.channel.send(`Error: \`${e.args[0]}\` is not recognized \`NdX\` dice notation (e.g. \`1d20\`, \`2d6\`)`)

                var count = clampAbs(parseInt(match[1]), 1, 20) || 1
                var max = clampAbs(parseInt(match[2]), 2, 1000)
                if (count == 1) {
                    e.channel.send(`Rolled ${count}d${max}: 🎲 **${randomInt(1, max)}**`)
                    return
                }
                var results = []
                var sum = 0

                for (let i = 0; i < count; i++) {
                    var int = randomInt(1, max)
                    sum += int
                    results.push(int)
                }

                e.channel.send(`Rolled ${count}d${max}: 🎲 **${sum}** = ${results.join(' + ')}`)
            }


        }
    },

    "8ball.rig": {
        tags: 'admin',
        args: [0, 1],
        execute(e) {
            if (e.args[0] === "yes") {
                gmin = yes
                gmax = maybe
            } else if (e.args[0] === "maybe") {
                gmin = maybe
                gmax = no
            } else if (e.args[0] === "no") {
                gmin = no
            } else {
                gmin = null
                gmax = null
                e.channel.send("Unrigged")
            }
        }
    },
    "size": {
        help: ";)",
        usage: "[user]",
        interaction: true,
        options: {
            user: {type: 'user', description: 'User to size-up. Defaults to whoever executes the command.'}
        },
        execute(e) {
            var user = e.mentions.users.first() || e.author

            var subject = user.id
            var rand = new Random("9_" + subject) // a little bit rigged
            var size = rand.floatBetween(4, 9)
            e.channel.send(user.username + " is " + size.toFixed(1) + "in (" + (size * 2.54).toFixed(1) + "cm)")

        }
    }
}
