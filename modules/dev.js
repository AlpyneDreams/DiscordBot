const util = require("util")
const child_process = require('child_process')

function exec(cmd, options) {
	return child_process.execSync(cmd, Object.assign({encoding: 'utf8'}, options))
}

module.exports.commands = {
	"eval": {
		help: "For development only.",
		usage: "<expression>",
		args: 1,
		tags: 'owner',
		async execute(e) {
			try {
				var code = e.args[0]
				var depth = 2
				var match = e.args[0].match(/^-d\s+(\d+)\s+/)
				if (match) {
					depth = parseInt(match[1])
					code = code.slice(match[0].length)
				}
				var result = eval(code)
				var formattedResult = util.inspect(result, {depth: depth})

				if (formattedResult.length > 1500) formattedResult = formattedResult.slice(0, 1500) + '\n...'
				e.channel.send("\nInput:  " + e.args[0] + "\nOutput: " + formattedResult, {code: 'js', split: false})
			} catch (err) {
				e.channel.send("\nInput: " + e.args[0] + "\nError: " + err.message, {code: 'js', split: false})
			}

		}
	},
	"e": {
		help: "For development only. Lazy eval, doesn't print output.",
		usage: "<expression>",
		args: 1,
		tags: "owner",
		execute(e) {
			try {
				var result = eval(e.args[0])
			} catch (err) {
				e.channel.send("```js\nError: " + err.message + "```")
			}
		}
	},
	"modules.unload": {
		help: "Unstable but effective way to kill a module.",
		usage: "<module>",
		tags: "owner",
		args: 1,
		execute(e) {
			var module = e.bot.profile.modules[e.args[0]]
			if (module) {
				e.bot.unloadModule(e.args[0])
				e.channel.send("Unloaded Module: " + e.args[0])
			}
		}
	},
	"modules.reload": {
		help: "Reloads all modules or one specific module.",
		usage: "[module]",
		args: [0, 1],
		tags: 'owner',
		execute(e) {
			var oldCount = Object.keys(e.bot.modules).length
			if (e.args.length == 0) {

				e.bot.reloadAllModules()

				var count = Object.keys(e.bot.modules).length
				e.channel.send("Reloaded " + count + " modules.")

				// check for discrepancies
				if (count < oldCount) {
					var difference = oldCount - count
					e.channel.send("Warning: " + difference + (difference == 1 ? " module was " : " modules were ") + "removed or failed to reload properly.")
				}

			} else {
				var module = e.bot.modules[e.args[0]]
				if (!module) {
					e.channel.send("Module `" + e.args[0] + "` cannot be found.")
				}

				e.bot.reloadModule(e.args[0], module.path)

				e.channel.send(`Reloaded Module: ${e.args[0]}`)

			}
		}
	},


	"sudo": {
		usage: "<command>",
		tags: 'sudoers',
		args: [1], // min 1 arg
		execute(e) {
			e.bot.executeCommand(e.args.join(' '), e, false)
		}
	},

	"error": {
		tags: 'owner',
		args: 1,
		execute(e) {
			throw new Error(e.args[0])
		}
	},

	"profile.reload": {
		tags: 'owner',
		execute(e) {
			e.bot.profile.reload()
		}
	},
	
	
	"emoji.export": {
		tags: 'owner',
		execute(e) {
			var fs = require('fs')
			var https = require('https')
			e.guild.emojis.forEach((m) => {
				var stream = fs.createWriteStream('dump/' + m.name + '.png')
				var request = https.get(m.url, function(response) {
					response.pipe(stream);
				});
				
			})
		}
	}

}
module.exports.commands['pipe'] = {
	args: 1,
	tags: 'owner',
	execute(e) {
		if (!e.profile[e.author.id]) {
			e.channel.send("Not piping anywhere. Use `pipe.start`.")
			return
		}

		e.client.channels.get(e.profile[e.author.id].channel).send(e.content.slice(e.content.indexOf(e.args[0])))
	}
}

module.exports.commands['pipe.start'] = {
	args: [0, 1],
	tags: 'owner',
	execute(e) {
		if (e.args.length > 0) {
			try {
				var chan = e.client.channels.get(e.args[0])
				e.profile[e.author.id] = {channel: chan.id}
				e.channel.send(	`Piped messages from you in this channel to \`#${chan.name}\` in \`${chan.guild.name}\`.\n`
										+ 'Use `pipe.stop` to cancel.')
			} catch (err) {
				e.channel.send("An error occured: " + e.message)
			}

		}
	}
}

module.exports.commands['pipe.stop'] = {
	tags: 'owner',
	execute(e) {
		e.profile[e.author.id] = {}
		e.channel.send("Removed your pipes.")
	}
}
