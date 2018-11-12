# Modular Discord Bot
This documentation is very work in progress.
### Folders

```
bot/
    Command.js
    Config.js
    DiscordBot.js
    Module.js
    Profile.js
    TagManager.js

configs/
    default.hjson

data/
    logs/
    profiles/
    tokens/

modules/
    core.js - Basic features


schemas/
    config_schema.hjson

index.js
```

### Startup
Added ffmpeg to your path if you need it.
```
node index <config>
```

Where config is the path to your config.hjson file. Existing config files are located in `configs/`.

### Configs

Set `base` to another config file to use as a base (typically `default.hjson`, which also defines the `$schema` for the config).
See `schemas/config_schema.hjson` for easy reference as to what to set.

### Modules

Modules are loaded from the modules path specified in your config. Modules are either single js files or folders with index.js files in them.

Typical module structure:

```
Module {
    init(bot, module) - Called on load.
    events: {} - these will be bound to discord.js events
    commands: {
        "commandname": [Command object (see below)]
    }
}
```

Typical command structure:

```
Command {
    reload: bool - reload the module when this command is executed?


    requirements: requirement string (either 'dm' or 'guild')
        or
    requirements: array of requirement strings


    tags: required tag
        or
    tags: array of required tags


    args: number of args
        or
    args: [min, max]
        or
    args: [min]

    execute: The execute function

    response: simple command->response system.
              operators like $& and $0 can be used to match arguments
    dmResponse: bool - DM the response?

    usage: used by help system to show command args (ex: '<arg1> [optional arg2]')
    help: used by help system to describe the command

    error: acts like 'response' but only sent when there's an error
}
```
Commands can also just be functions or strings.

Everything is 100% optional in both of these structures.
