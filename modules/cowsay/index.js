
const fs = require('fs')

// could add more cows but meh
const restOfTheFuckingCow = fs.readFileSync('modules/cowsay/cow.txt', {encoding: 'utf8'})

function padding(length, char = ' ') {
	var str = ''
	for (var i = 0; i < length; i++) str += char
	return str
}

function padLeft(length, char, str) {
	return (pad + str).slice(-pad.length)
}

function padRight(pad, str) {
	return (str + pad).substring(0, pad.length)
}

// gets the longest string length from an array
function getWidth(lines) {
	var max = 0
	for (var line of lines)
		if (line.length > max) max = line.length

	return max
}

exports.commands = {}
exports.commands.cowsay = {
	args: 1,
	reload: true,
	execute(e) {
		var msg = ''
		var text = e.content.slice(e.content.indexOf(e.args[0]))
		var lines = text.split('\n')
		var width = getWidth(lines)
		var height = lines.length

		// top of the speech bubble
		msg = ' ' + padding(width + 2, '_') + ' \n'

		if (height == 1) {
			msg += '< ' + text + ' >\n'
		} else {
			// multi-line bubble sides
			msg += '/ ' + padRight(padding(width), lines[0]) + ' \\\n'
			for (var i = 1; i < height - 1; i++)
				msg += '| ' + padRight(padding(width), lines[i]) + ' |\n'
			msg += '\\ ' + padRight(padding(width), lines[height - 1]) + ' /\n'
		}
		// bottom of speech bubble
		// original cowsay used '-' instead of '‾'
		msg += ' ' + padding(width + 2, '‾') + ' \n'

		msg += restOfTheFuckingCow

		e.channel.send('```' + msg + '```')
	}
}
