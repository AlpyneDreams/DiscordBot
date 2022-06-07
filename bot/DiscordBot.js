
const fs = require("fs")
const path = require("path")

const Discord = require("discord.js")

const Profile = require('./Profile.js')
const Config = require('./Config.js')
const Module = require('./Module.js')
const TagManager = require('./TagManager.js')

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

        const opts = Object.assign(this.config.client ?? {})
        
        // Add intents from config
        if (opts.intents) {
            for (const i in opts.intents) {
                opts.intents[i] = Discord.Intents.FLAGS[opts.intents[i]]
            }
        }

        /** @type {Discord.Client} */
        this.client = new Discord.Client(opts)
        this.configureClient()

        if (loadModules)
            this.loadAllModules()
    }

    get allowSelfCommands() {
        return this.config.selfCommands || this.config.selfCommandsOnly
    }

    // Attaches core event listeners to the Discord.js client
    configureClient() {

        // Command parsing
        this.client.on('messageCreate', msg => {
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
     * @param addEvents - Attach module's event listeners?
     */
    loadModule(file, addEvents = true, force = false) {
        try {
            this.modules[path.basename(file, path.extname(file))]
             = new Module(file, this, addEvents, force)
        } catch (e) {
            if (e instanceof Error)
                console.error(e.stack)
            else
                return e // will be true if module skipped, false if not a module
        }
    }

    /**
     * removes a module, its commands, and optionally its events
     */
    unloadModule(name, removeEvents = true) {
        if (!this.modules[name]) return

        for (let cmd in this.commands) {
            if (this.commands[cmd].module.name === name) {
                delete this.commands[cmd]
            }
        }

        if (removeEvents) {
            let mod = this.modules[name]
            let removed = 0
            for (let event in mod.events) {
                let listener = mod.events[event]

                let before = this.client.listenerCount(event)

                this.client.off(event, listener)

                removed += before - this.client.listenerCount(event)
            }
            if (removed > 0)
                console.log(`Removed ${removed} event listeners`)
        }

        delete this.modules[name]

    }

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
     * reloads a module by name
     */
    reloadModule(name, path) {
        if (!this.modules[name]) return
        
        for (var m in require.cache) {
            delete require.cache[m]
        }

        console.info("Reloading Module: " + name)
        this.unloadModule(name)
        this.loadModule(path, true, true)
    }

    /**
     * reloads all modules
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
