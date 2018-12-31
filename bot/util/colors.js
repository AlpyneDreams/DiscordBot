const colors = require("ansi-colors")

// Extends String.prototype to allow syntax like the 'colors' package

function addProperty(prop, func) {
    String.prototype.__defineGetter__(prop, function() {return func(this)})
}

addProperty('black', colors.black)
addProperty('red', colors.red)
addProperty('green', colors.green)
addProperty('yellow', colors.yellow)
addProperty('blue', colors.blue)
addProperty('magenta', colors.magenta)
addProperty('cyan', colors.cyan)
addProperty('white', colors.white)
addProperty('gray', colors.gray)
addProperty('grey', colors.grey)

addProperty('bgBlack', colors.bgBlack)
addProperty('bgRed', colors.bgRed)
addProperty('bgGreen', colors.bgGreen)
addProperty('bgYellow', colors.bgYellow)
addProperty('bgBlue', colors.bgBlue)
addProperty('bgMagenta', colors.bgMagenta)
addProperty('bgCyan', colors.bgCyan)
addProperty('bgWhite', colors.bgWhite)

addProperty('reset', colors.reset)
addProperty('bold', colors.bold)
addProperty('dim', colors.dim)
addProperty('italic', colors.italic)
addProperty('underline', colors.underline)
addProperty('inverse', colors.inverse)
addProperty('hidden', colors.hidden)
addProperty('strikethrough', colors.strikethrough)

