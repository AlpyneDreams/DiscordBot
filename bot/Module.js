
const fs = require('fs')
const path = require('path')

const Hjson = require('hjson')

const Command = require('./Command.js')

/**
 * @throws Throws false if module does not exist. Throws true if module was skipped.
 * Otherwise will throw any other error that occurs while loading module.
 * 
 */
class Module {
    constructor(file, bot, addEvents = false, force = false) {
        file = (path.resolve(file))
        
        // check for omitted .js extension
        if (!fs.existsSync(file)) file = file + ".js"
        // ensure that file's existance is definite
        if (!fs.existsSync(file)) throw new Error(`Cannot find module: ${path.dirname(file)}${path.sep}${path.basename(file)}`)

        var ext = path.extname(file)
        var name = path.basename(file, ext)
        var isDirectory = fs.lstatSync(file).isDirectory()
        var isHjson = (!isDirectory) && ext.match(/h?json$/gi)

        // skip disabled modules
        if (bot.config.modules && bot.config.modules[name] || Array.isArray(bot.config.modules) && bot.config.modules.includes(name)) {
            if (!Array.isArray(bot.config.modules) && bot.config.modules[name].disabled) {
                console.info(`Skipped Module: ${name.yellow.bold}`)
                throw true
            }
        } else {
            // skip if there's no config entry and the whitelist is on
            if (bot.config.moduleWhitelist && !force) {
                //console.info(`Skipped Unwhitelisted Module: ${name.yellow.bold}`)
                throw true
            }
        }

        // files that aren't .js, .json, or .hjson
        if (!isDirectory && !ext.match(/(js|h?json)$/gi)) {
            console.warn(`Skipped Non-Module: ${name}`)
            throw false
        }

        console.info("Loading Module: " + name)

        // if a module has already been cached
        // then delete it so we can reload it
        if (require.cache[require.resolve(file)]) {
            delete require.cache[require.resolve(file)]
        }

        var imports

        try {
            imports = this.import(file, isHjson)
        } catch (e) {
            console.error(`Failed to load module: '${name}'`)
            throw e
        }

        this.build(imports, name, file, bot, addEvents)

        // Report Number of Events
        //let numEvents = imports.events !== undefined ? Object.keys(imports.events).length : 0
        //if (numEvents > 0) 
        //    console.info("Loaded Module: " + name + `, with ${numEvents} events.`)
    }

    // integrates the module into the bot
    build(imports, name, file, bot, addEvents) {

        Object.assign(this, imports)

        Object.assign(this, {
            init: imports.init,
            commands: imports.commands,
            events: imports.events,
            name,
            path: file,
            defaultCommand: imports.defaultCommand,
            defaultProfile: imports.defaultProfile,
        })

        // don't use imports after this point

        if (!bot.profile.modules) bot.profile.modules = {}
        // Create a profile for this module if one does not exist
        bot.profile.modules[name] = bot.profile.modules[name] || this.defaultProfile || {}
        this.profile = bot.profile.modules[name]

        for (var cmd in this.commands) {
            // TODO Handle command name conflicts
            bot.commands[cmd] = new Command(this.commands[cmd], this, cmd)
        }

        if (addEvents) {
            for (var event in this.events) {
                var listener = this.events[event]
                
                // Discord.js v13: 'message' -> 'messageCreate'
                if (event === 'message')
                    event = 'messageCreate'
                
                if (listener.prepend)
                    if (listener.once)
                        bot.client.prependOnceListener(event, listener)
                    else
                        bot.client.prependListener(event, listener)
                else {
                    if (listener.once)
                        bot.client.once(event, listener)
                    else
                        bot.client.on(event, listener)
                }
            }
        }

        if (this.init) {
            this.init(bot, this)
        }

        // Register regex responses - unused code
        /*if (module.responses) {
            for (var res of module.responses) {
                this.responses.push({
                    pattern: new RegExp(res.pattern.replace("<prefix>", this.config.commandPrefix)),
                    response: res.response
                });
            }
        }*/

    }

    // loads the module from a file
    import(file, isHjson) {
        if (isHjson) {
            return Hjson.parse(fs.readFileSync(file, {encoding: 'utf-8'}))
        } else {
            return require(file)
        }
    }

}

module.exports = Module
