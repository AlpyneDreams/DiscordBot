const fs = require('fs')
const path = require('path')
const child_process = require('child_process')

var killed = false

async function vox(e, dir) {
	if (e.client.voiceConnections && !e.channel.isPrivate) {
		var voice = e.member.voiceChannel
		if (!voice) {
			e.channel.send("You are not in a voice channel.")
			return
		} else {
			if (!voice.connection) {
				await voice.join()
			}
			voice = voice.connection

			if (voice.playing) {
				e.channel.send("Already playing a vox message.")
				return
			}

			var msg = e.args[0]

			msg = msg
				.replace(/,/g, ' _comma')
				.replace(/\./g, ' _period')
				.replace(/[']+/gi, '')
			.toLowerCase()

			var words = msg.split(' ')

			var queue = []

			fs.writeFileSync('vox.txt', '')

			for (var i = 0; i < words.length; i++) {
				var filename = './modules/vox/' + dir + '/' + words[i] + '.wav'
				if (fs.existsSync(filename)) {
					fs.writeFileSync('vox.txt', `file '${filename}'\r\n`, {flag: 'a'})
					queue.unshift(filename)
				} else {
					words[i] = `[${words[i]}]`
				}
			}

			/*var next = () => {
				if (killed) {killed = false; return;}
				if (queue.length < 1) return
				console.log(queue[queue.length - 1])
				voice.playFile(queue.pop()).on('end', next)
			}*/

			if (queue) {
				e.channel.send(words.join(' ').toUpperCase(), {code: 'ini'})
				child_process.execSync('ffmpeg -safe 0 -f concat -i vox.txt -c copy -y -f wav vox.wav')
				var disp = voice.playFile('vox.wav', {volume: 0.5})
			}



		}
	}
}


module.exports.commands = {
	"vox": {
		reload: true,
		usage: "[voice] <message>",
		execute: (e) => {
			if (e.content.length > 1000) {
				e.channel.send("Message too long!")
				return
			}

			if (e.args.length > 1) {
				var dir = 'vox'
				if (!fs.existsSync(__dirname + '/' + e.args[0])) {
				} else {
					dir = e.args[0]
					e.args = e.args.slice(1)
				}

				e.args = [e.args.join(' ')]
				vox(e, dir)
			} else {
				vox(e, 'vox')
			}
		}
	},

	"vox.kill": {
		tags: 'admin',
		execute(e) {
			if (e.member.voiceChannel) {
				var voice = e.member.voiceChannel.connection
				voice.player.dispatcher.end()
			}
		}
	},

	"vox.list": {
		execute(e) {
			var voices = fs.readdirSync(__dirname)
			var msg = ''

			if (voices) {
				for (var voice of voices) {
					if (fs.lstatSync(__dirname + '/' + voice).isDirectory()) {
						msg += voice.toUpperCase() + '\n'
					}
				}

				e.channel.send(msg, {code: true})
			}
		}
	}
}
