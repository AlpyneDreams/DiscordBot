
const fs = require("fs");
var http = require("http");
const Random = require("random-seed");

var magic8ball = [
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
	"Reply hazy try again",
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
];

var min = null;
var max = null

var yes = 0;
var maybe = 10;
var no = 15;

// inclusive range
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampAbs(int, min, max) {
	return Math.min(Math.max(Math.abs(int), min), max)
}


exports.commands = {
	"8ball": {
		args: [0, 1],
		execute(e) {
			var rmin = min || 0;
			var rmax = max || magic8ball.length - 1;

			var rand = randomInt(rmin, rmax);

			e.channel.send("🎱" + magic8ball[rand] + "🎱");

		}
	},

	"roll": {
		args: [0, 1],
		reload: true,
		execute(e) {
			if (e.args.length === 0) {
				e.channel.send(`Rolled 1d20: 🎲 **${randomInt(1, 20)}**`)
			} else {
				var match = e.args[0].match(/(\d+)?d(\d+)/i)
				if (!match) return

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
				min = yes;
				max = maybe;
			} else if (e.args[0] === "maybe") {
				min = maybe;
				max = no;
			} else if (e.args[0] === "no") {
				min = no;
			} else {
				min = null;
				max = null;
				e.channel.send("Unrigged");
			}
		}
	},
	"size": {
		usage: "[user]",
		execute(e) {
			var user = e.mentions.users[0] || e.author;

			var subject = user.id;
			var rand = new Random("9_" + subject); // a little bit rigged
			var size = rand.floatBetween(4, 9);
			e.channel.send(user.username + " is " + size.toFixed(1) + "in (" + (size * 2.54).toFixed(1) + "cm)");

		}
	}
}
