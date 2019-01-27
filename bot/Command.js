
const Discord = require('discord.js')

class Command {

	constructor(command, module) {

		if (!command) return

		Object.assign(this, {
			reload: false,

			requirements: null,
			tags: [],
			args: null,

			execute: null,

			response: null,
			dmResponse: false,

			usage: '',
			help: '',

			error: null
		})

		if (module.defaultCommand) {
			Object.assign(this, module.defaultCommand)
		}

		switch (typeof command) {
			case 'function':
				Object.assign(this, {execute: command})
				break
			case 'object':
				Object.assign(this, command)
				break
			default:
				Object.assign(this, {response: command, help: command})
		}


		this.module = module
	}

	static splitArgs(fullCommand, maxArgs) {
		//console.info("In: fullCommand: [" + fullCommand.join(", ") + "] maxArgs: " + maxArgs)
		var argCount = fullCommand.length - 1
		var args
													// Sample Command: (max 3 args)
													// fullCommand:	[command, arg1, arg2, arg3, arg4, arg5]

		args = fullCommand.splice(1, maxArgs - 1)	// args:		[arg1, arg2]
													// fullCommand: [command, arg3, arg4, arg5]

		if (argCount >= maxArgs)
			args.push(fullCommand.slice(1).join(' '))	// args:		[arg1, arg2, arg3+arg4+arg5]

		//console.info("Out: [" + args.join(", ") + "] " + args.length)
		return args
	}

	// formats a command response string with the provided args
	static insertArgs(pattern, args) {
		// replace $& with the full arguments
		return pattern.replace(/\$&/g, (match, pos, str) => {
			// if it's escaped like '$$&' then ignore it
			if (pos != 0 & str.charAt(pos - 1) === '$') {
				return "$&"
			} else {
				return args.join(' ')
			}
		}).replace(/\$(\d)/g, (match, i, pos, str) => {
			if (pos != 0 & str.charAt(pos - 1) === '$') {
				return match
			} else {
				return args[parseInt(i)] || ''
			}
		})
	}

	processArgs(args, fullCommand) {
		let cmdArgs = []

		// if there's just one int then treat it as [x, x]
		if (Number.isInteger(this.args)) {
			cmdArgs[0] = this.args
			cmdArgs[1] = this.args
		// if there's a range then copy it
		} else if (Array.isArray(this.args)) {
			cmdArgs = this.args
		}

		// -1 for the command itself
		var numArgs = fullCommand.length - 1

		// if there's a minimum then check that
		if (cmdArgs[0]) {
			if (numArgs < cmdArgs[0]) return
		}

		// if there's a maximum then split the command accordingly
		if (cmdArgs[1]) {
			args = Command.splitArgs(fullCommand, cmdArgs[1])
		}

		return args
	}

	async respond(msg, args) {
		// format the response based on given args
		var result = Command.insertArgs(this.response, args)

		if (this.dmResponse) {
			msg.author.send(result)
		} else {
			msg.channel.send(result)
		}
	}

	async invoke(bot, fullCommand, msg, checkTags = true) {

		// check if the command must (or must not) be via direct message
		if (this.requirements && this.requirements.length > 0) {
			var requirements = Array.isArray(this.requirements) ? this.requirements : [this.requirements]
			for (var req of this.requirements) {
				switch (req.toLowerCase()) {
					case 'dm':
						if (msg.channel.type != 'dm') return
						break
					case 'guild':
						if (msg.channel.type == 'dm') return
						break
					case 'bot':
						if (!bot.client.user.bot) return
						break
					case 'userbot':
						if (bot.client.user.bot) return
						break

				}
			}
		}

		if (this.tags && checkTags) {
			var tags = (Array.isArray(this.tags)) ? this.tags : [this.tags]

			if (!bot.tagManager.hasTags(msg, tags)) {
				msg.channel.send("Sorry, but you need the following tags to use this command: `" + tags.join(', ') + "`")
				return
			}
		}

		var args = fullCommand.slice(1)
		// TODO: args cut off \n somewhere

		if (this.args) {
			args = this.processArgs(args, fullCommand)
			if (!args) return
		}

		if (this.response) {
			console.log("Executing response for '" + msg.content + "' from " + msg.author.username)
			this.respond(msg, args)
		}

		if (this.execute) {
			try {
				// command context object
				var e = msg
				e.args = args
				e.bot = bot
				e.profile = bot.profile.modules[this.module.name]

				await this.execute(e)
			} catch (e) {
				console.error(e.stack)
				if (!this.channel) return
				if (!this.error) {
					msg.channel.send(`An internal error has occured.\n- ${e.name}: ${e.message}`, {code: 'diff'})
				} else {
					// if a custom error message is specificed
					// then format it like a normal command response based on given args
					msg.channel.send(Command.insertArgs(this.error, args))
				}
			}
		}


	}
}

module.exports = Command
