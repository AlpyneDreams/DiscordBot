
// validates role data in the profile
function validateRole(guild, role, profile) {
	profile.guilds = profile.guilds || {}
	profile.guilds[guild] = profile.guilds[guild] || {roles: {}}
	profile.guilds[guild].roles[role] = profile.guilds[guild].roles[role] || {tags: []}
}

function getRoleTags(guild, role, profile) {
	validateRole(guild, role, profile)
	profile.save()
	return profile.guilds[guild].roles[role].tags
}

function addRoleTags(guild, role, profile, tags) {
	validateRole(guild, role, profile)

	for (var tag of tags) {
		if (profile.guilds[guild].roles[role].tags.includes(tag)) continue
		profile.guilds[guild].roles[role].tags.push(tag)
	}

	profile.save()

}

function removeRoleTags(guild, role, profile, tags) {
	validateRole(guild, role, profile)

	for (var tag of tags) {
		var idx = profile.guilds[guild].roles[role].tags.indexOf(tag)

		if (idx != -1)
			profile.guilds[guild].roles[role].tags.splice(idx, 1)
	}

	profile.save()

}

function findRole(guild, name) {
	name = name.toLowerCase()
	var role = guild.roles.filterArray(r => r.name.toLowerCase() == name)[0]

	return role
}

function getRoleInfo(guild, role, profile) {
	var text = ''
	var tags = getRoleTags(guild, role.id, profile)

	text += `\n${role.name}:`
	text += `\n\tID: ${role.id}`
	text += `\n\tColor: ${role.hexColor}`
	text += `\n\tUsers: ${role.members.size}`
	if (tags.length > 0) {
		text += `\n\tTags: ${tags.join(', ')}`
	}

	return text
}

module.exports.commands = {

	'roles': {
		tags: 'admin',
		reload: true,
		execute(e) {
			var text = '```yaml'
			for (var role of e.guild.roles.array()) {
				text += getRoleInfo(e.guild.id, role, e.bot.profile)
			}

			e.channel.send(text + '```')

		}
	},

	"role": {
		tags: 'admin',
		reload: true,
		args: 1,
		execute(e) {
			var role = findRole(e.guild, e.args[0])
			if (!role) return
			var text = '```yaml\n'
			text += getRoleInfo(e.guild.id, role, e.bot.profile)
			e.channel.send(text + '```')
		}
	},

	"role.tags.add": {
		tags: 'admin',
		args: 2,
		usage: '<role> <tag>',
		execute(e) {
			var role = findRole(e.guild, e.args[0])
			if (!role) return

			addRoleTags(e.guild.id, role.id, e.bot.profile, e.args[1].split(' '))
		}
	},

	"role.tags.remove": {
		tags: 'admin',
		args: 2,
		usage: '<role> <tag>',
		execute(e) {
			var role = findRole(e.guild, e.args[0])
			if (!role) return

			removeRoleTags(e.guild.id, role.id, e.bot.profile, e.args[1].split(' '))
		}
	},


}
