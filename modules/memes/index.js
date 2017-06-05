const fs = require("fs");
const path = require("path");

function listCopypasta() {
	var names = fs.readdirSync(__dirname + "/copypastas")
	for (var n in names) {
		names[n] = names[n].slice(0, -4)
	}

	return "```" + names.join(', ') + "```"
}

function getCopypasta(name) {
	name = name.toLowerCase()
	if (fs.existsSync(__dirname + "/copypastas/" + name + ".txt")) {
		return fs.readFileSync(__dirname + "/copypastas/" + name + ".txt", {encoding: 'UTF-8'})
	} else {
		return "Valid Pastas: " + listCopypasta()
	}
}

exports.commands = {
	"pasta": {
		usage: "<copypasta>",
		args: [0, 1],
		execute(e) {

			if (e.args.length < 1) {
				e.channel.send(listCopypasta())
				return
			}

			if (e.args[0].indexOf('..') != -1) {
				e.channel.send("fuck off nepeat")
				return
			}
			var duplicateItalianDish = getCopypasta(e.args[0])
			e.channel.send(duplicateItalianDish, {split: true})
		}
	}
}
