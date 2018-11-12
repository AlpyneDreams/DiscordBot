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
	name = __dirname + "/copypastas/" + name.toLowerCase() + ".txt"
	if (fs.existsSync(name))
		return fs.readFileSync(name, {encoding: 'UTF-8'})
	else
		return "Valid Pastas: " + listCopypasta()
}

exports.commands = {
	"pasta": {
		usage: "<copypasta>",
		help: "Pastes a copypasta.",
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
