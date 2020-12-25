
const fs = require("fs")
const path = require("path")

const Discord = require("discord.js")

const Profile = require('./Profile.js')
const Config = require('./Config.js')
const Module = require('./Module.js')
const TagManager = require('./TagManager.js')
const Response = require('./Response.js')

class DiscordBot {

    constructor(cfg, loadModules = true) {
        // disable flatfile logging until config is loaded
        // and log path is specified
        console.record = false

        this.config = new Config(cfg, {fatal: true})

        console.logdir = this.config.paths.logs
        console.record = true

        // setup Profile (JSON data file) and TagManager (basic permissions)
        this.profile = new Profile(this.config.paths.profile, this.config)
        this.tagManager = new TagManager(this.profile.users, this.profile.guilds)

        this.commands = {}
        this.modules = {}

        /** @type {Discord.Client} */
        this.client = new Discord.Client(this.config.client || {})
        this.configureClient()

        if (loadModules)
            this.loadAllModules()
    }

    get allowSelfCommands() {
        return this.config.selfCommands || this.config.selfCommandsOnly
    }

    // FIXME: D.JS UPDATE
    async interactionResponse(i9n, msg, content, options = {}) {
        
        if (options.code === true) {
            content = '```' + content + '```'
        } else if (typeof options.code === 'string') {
            content = '```' + options.code + '\n' + content + '```'
        }

        let body = {
            type: 4,
            data: {
                content,
                tts: options?.tts,
                embeds: options?.embed ? [options.embed] : undefined
            }
        }
        
        await this.client.rest.makeRequest(
            'post',
            `/interactions/${i9n.id}/${i9n.token}/callback`,
            this.client.token,
            body
        )
                
        return new Response(i9n, msg.channel, body, this.client)

    }
    
    // Attaches core event listeners to the Discord.js client
    configureClient() {

        // intercept the first raw READY event to get our application ID (FIXME: D.JS UPDATE)
        let firstReady = async payload => {
            if (payload.op === 0 && payload.t === 'READY') {
                this.client.id = payload.d.application.id
                this.client.off('raw', firstReady)
            }
        }
        if (!this.client.id)
            this.client.on('raw', firstReady)

        // register slash commands on ready
        this.client.on('ready', () => {
            for (let [name, cmd] of Object.entries(this.commands)) {
                if (cmd.interaction) {
                    console.log('Registering interaction command: ' + name)
                    
                    cmd.registerSlashCommand(this)
                }
            }
        })

        // catch an interaction, such as a slash command (FIXME: D.JS UPDATE)
        this.client.on('raw', async payload => {
            if (payload.op === 0 && payload.t === 'INTERACTION_CREATE') {
                let i9n = payload.d
                
                if (i9n.type === 2 && i9n.data.name in this.commands) {
                    console.dir(i9n, {
                        depth: null
                    })

                    this.commands[i9n.data.name].invokeSlashCommand(this, i9n)
                }

            }
        })

        this.client.on("message", msg => {
            var commandRegex = new RegExp(`^${this.config.commandPrefix}((?:.|[\n\r])+)`, "i")

            if (msg.author.id === this.client.user.id && !this.allowSelfCommands) {
                // If bot can't accept messages from itself
                return
            } else if (msg.author.id !== this.client.user.id && this.config.selfCommandsOnly) {
                // Bot can only accept self commands, like a selfbot
                return
            }

            var match = msg.content.match(commandRegex)
            if (match != null) {
                var rawCommand = match[1]

                this.executeCommand(rawCommand, msg)
            }
        })

        this.client.on("debug", info => {
            if (this.config.debug) {
                console.log(`[DEBUG] ${info}`)
            }
        })
    }

    async executeCommand(rawCommand, msg, checkTags = true) {
        var fullCommand = rawCommand.split(' ')
        var cmd = this.commands[fullCommand[0]]

        if (cmd) {
            // commands with {reload: true} will always reload
            // their module before executing. use only for
            // development and debugging purposes
            if (cmd.reload) {
                try {
                    this.reloadModule(cmd.module.name, cmd.module.path)
                    cmd = this.commands[fullCommand[0]]

                    if (!cmd) return
                } catch (e) {
                    console.error(e.stack)
                    msg.channel.send(`An internal module reload error has occured.\n- ${e.name}: ${e.message}`, {code: 'diff'})
                }
            }

            console.log("Executing command '" + msg.content + "' from " + msg.author.username)
            cmd.invoke(this, fullCommand, msg, checkTags)
        }
    }

    /**
     * loads module by file and name
     * @param init - Call the module's init function?
     */
    loadModule(file, init = true, force = false) {
        try {
            this.modules[path.basename(file, path.extname(file))]
             = new Module(file, this, init, force)
        } catch (e) {
            if (e instanceof Error)
                console.error(e.stack)
            else
                return e // will be true if module skipped, false if not a module
        }
    }

    // removes a modules, doesn't detach event listeners
    // reloadAllModules() to remove straggling listeners
    unloadModule(name) {
        if (!this.modules[name]) return

        delete this.modules[name]

        for (var cmd in this.commands) {
            if (this.commands[cmd].module.name == name) {
                delete this.commands[cmd]
            }
        }
    }

    // loads all modules
    loadAllModules(init = true) {
        let dir = this.config.paths.modules
        let skippedModules = []
        fs.readdirSync(dir).forEach(file => {
            let mod = this.loadModule(path.join(dir, file), init)
            if (mod === true) {
                skippedModules.push(file)
            }
        })

        if (this.config.extraModules) {
            for (var module of this.config.extraModules) {
                this.loadModule(module, init, true)
            }
        }

        if (skippedModules.length > 0)
            console.info(`Skipped ${skippedModules.length} Modules`)

        this.profile.save()

        console.info(`Finished loading ${Object.keys(this.modules).length} modules, and ${Object.keys(this.commands).length} commands.`)
    }

    /**
     * reloads a module by name.
     * does not call init() again,
     * use reloadAllModules() if
     * you want to upadate events
     */
    reloadModule(name, path) {
        for (var m in require.cache) {
            delete require.cache[m]
        }
        console.info("Reloading Module: " + name)
        if (this.modules[name]) {
            for (var c in this.commands) {
                var cmd = this.commands[c]
                if (cmd.module.name == name) {
                    delete this.commands[c]
                }
            }
            delete this.modules[name]
        }

        this.loadModule(path, false, true)
    }

    /**
     * more effective than reloadModule
     * as it allows init() to be re-called,
     * however this will take loads of time
     */
    reloadAllModules() {
        console.info("Reloading all modules.")

        this.client.removeAllListeners()
        this.commands = {}
        this.modules = {}

        this.loadAllModules()
        this.configureClient()
    }

    connect() {
        var token

        // "token" is either a file name or an acutal token string
        // tokens can be laoded from external files for security
        if (fs.existsSync(this.config.token)) {
            token = fs.readFileSync(this.config.token).toString().trim()
        } else {
            token = this.config.token
        }

        console.log("Connecting to Discord...")

        this.client.login(token).catch((err) => {
            console.error(err)
        })
    }

    async destroy() {
        console.info("Destroying client.")
        if (this.client.user.bot) {
            await this.client.destroy()
        } else {
            // if selfbot then just disconnect, don't logout
            // because we don't want the token to be cancelled
            await this.client.ws.destroy()
            await this.client.rest.destroy()
        }
    }
}

module.exports = DiscordBot
