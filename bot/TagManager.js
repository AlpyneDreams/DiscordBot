class TagManager {
    constructor(users, guilds) {
        this.profile = {users, guilds}
    }

    getTags(msg) {
        var userTags = []
        
        // local user can use any command (provided self commands enabled) 
        if (msg.author.id === msg.client.user.id) {
            return ["*"]
        }

        // user tags
        if (this.profile.users[msg.author.id] && this.profile.users[msg.author.id].tags) {
            userTags = userTags.concat(this.profile.users[msg.author.id].tags)
        }

        // role tags
        if (msg.guild) {
            var guildProfile = this.profile.guilds[msg.guild.id] || {}
            if (guildProfile.roles) {

                var guildRoles = guildProfile.roles || []

                for (var role of msg.member.roles.array()) {

                    if (guildRoles[role.id] && guildRoles[role.id].tags) {
                        userTags = userTags.concat(guildRoles[role.id].tags)
                    }
                }
            }
        }

        return userTags
    }
    hasTags(msg, tags) {

        var userTags = this.getTags(msg)

        // * allows all other tags
        if (userTags.includes('*')) {
            return true
        }

        for (var tag of tags) {
            if (!userTags.includes(tag)) {
                return false
            }
        }

        return true
    }
}

module.exports = TagManager
