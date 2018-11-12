module.exports.defaultProfile = {guilds: []}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


module.exports.commands = {
	"color": {
		reload: true,
		args: 1,
		async execute(e) {
			if (!e.profile.guilds.includes(e.guild.id)) return

			var rgb = hexToRgb(e.args[0])
			if (!rgb) return

			if (e.args[0][0] !== '#') e.args[0] = '#' + e.args[0]

			e.channel.sendMessage(`Color: ${rgb.r}, ${rgb.g}, ${rgb.b}`)
			if (!e.member.colorRole || e.member.colorRole.name[0] !== '#') {
				var role = await e.guild.createRole({name: '#' + e.author.username, color: e.args[0]})
				e.member.addRole(role)
			} else {
				e.member.colorRole.setColor(e.args[0])
			}

		}
	}
}
// for inferior dialects
module.exports.commands.colour = module.exports.commands.color
