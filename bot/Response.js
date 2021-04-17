const Discord = require("discord.js")

// Response to an interaction, such as a slash command (FIXME: D.JS UPDATE)
class Response extends Discord.Message {

    static nextID = 0

    constructor(interaction, channel, body, client) {

        let data = {
            // TODO: get real message ID
            id: (Response.nextID++).toString(),
            channel_id: channel.id,
            guild_id: channel.guild?.id,
            author: client.user,
            member: channel.guild?.me,
            content: body.data.content,
            timestamp: Date.now(),
            edited_timestamp: null,
            tts: body.data.tts,

            // mentions: TODO
            mention_everyone: false,
            mentions: [],
            mention_roles: [],
            mention_channels: [],
            
            attachments: [], // none
            embeds: body.data.embeds || [],
            reactions: [],
            pinned: false,
            type: 0 // default
        }

        super(channel, data, client)

        this.interaction = interaction
    }

    async edit(content, options = {}) {
        await this.client.rest.request(
            'patch',
            `/webhooks/${this.client.id}/${this.interaction.token}/messages/@original`,
            {
                route: `/webhooks/${this.client.id}/${this.interaction.token}/messages/@original`,
                data: {
                    content: content,
                    embeds: options.embed ? [option.embed] : undefined
                }
            }
        ) 

        return this
    }

    async delete(timeout = 0) {
        await this.client.rest.request(
            'delete',
            `/webhooks/${this.client.id}/${this.interaction.token}/messages/@original`,
            {route: `/webhooks/${this.client.id}/${this.interaction.token}/messages/@original`}
        )

        return this
    }

}

module.exports = Response