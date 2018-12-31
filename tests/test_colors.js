const ansiColors = require('ansi-colors')

require('../bot/util/colors.js')

const colors = [
	'black',
	'red',
	'green',
	'yellow',
	'blue',
	'magenta',
	'cyan',
	'white',
	'gray',
	'grey',

	'bgBlack',
	'bgRed',
	'bgGreen',
	'bgYellow',
	'bgBlue',
	'bgMagenta',
	'bgCyan',
	'bgWhite'
]

const styles = [
	'bold',
	'dim',
	'italic',
	'underline',
	'inverse',
	'hidden',
	'strikethrough',
	'reset',
]

for (var prop of colors) {
	
	var test = `${prop}:`.padEnd(12)
	test += '['
	
	for (var style of styles) {
		test += ` ${style[style]} `[prop]
	}

	test += ']'

	console.log(test)
}

console.log("\n=== BRIGHT BG TEST (ansi-colors only) ===\n")

for (var prop of colors.filter(c => c.startsWith('bg'))) {
	const test = prop + 'Bright'
	console.log((test+':').padEnd(18) + " default ".black[prop] + ansiColors[test](" bright ".black))
}