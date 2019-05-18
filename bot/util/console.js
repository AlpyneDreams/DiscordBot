// https://gist.github.com/DankParrot/3f5f194f073be7e96f84748dbe9e9eb7 - Version 3.3

require('./colors.js') // Overrides String.prototype
require('./prompt.js')
require('./format.js')

const fs = require('fs')
const stripANSI = require('strip-ansi')

const colors = require("ansi-colors")

const _log = console.log
const _error = console.error
const _table = console.table

console.muted = false
console.record = true
console.logdir = 'logs'
console.groupIndent = 0

function slugify(str) {
    return str.replace(/[^\w+!@#$%^&()_/\-[\]{} ]/g, '-')
}

function spew(msg = '', {path = '', file = '', error = false, echo = true, record = true, timestamp = true} = {}) {

    var date = new Date(Date.now())
    // generate a timestamp
    var ts = ("00" + date.getHours()).slice(-2)
    ts += ':' + ("00" + date.getMinutes()).slice(-2)
    ts += ':' + ("00" + date.getSeconds()).slice(-2)

    // prepend the timestamp to the message
    if (timestamp)
        msg = "[" + ts + "] " + '  '.repeat(console.groupIndent) + msg

    if (echo) {
        if (!error) {
            if (!console.muted) {
                _log(msg)
            }
        } else {
            _error(msg)
        }
    }

    if (record && console.record && path !== null) {
        if (file) {
            // if a filename is specified then clean it up
            // and prepend a dash
            file = '-' + slugify(file)
        }

        if (path) {
            // if a path is specified then clean it up
            // and append a slash
            path = path.replace('\\', '/').split('/').filter(s => s.length > 0).map(st => slugify(st)).join('/')
            path = slugify(path) + '/'
        }

        // if the path doesn't exist then make it
        if (!fs.existsSync(console.logdir + '/' + path)) {
            try {
                fs.mkdirSync(console.logdir + '/' + path, {recursive: true})
            } catch (err) {
                console.error('[CONSOLE] Cannot create directory "' + path + '"')
                log(msg, '', file, error)
            }
        }

        // generate a datestamp
        // months start from 0 because javascript was designed by gibbons
        var datestamp = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()

        // record the message
        fs.writeFileSync(console.logdir + '/' + path + datestamp + file + '.txt', stripANSI(msg) + "\r\n", {flag:"a+"})
    }
}

function log(msg = '', path = '', file = '') {
    spew(msg, {path, file, error: false})
}

function info(msg = '', path = '', file = '') {
    msg = '[INFO] ' + msg
    spew(colors.cyan.bold(msg), {path, file, error: false})
}

// console.error and console.warn
function error(msg = '', path = '', file = '') {
    msg = '[ERROR] ' + msg
    spew(colors.red.bold(msg), {path, file, error: true})
}

function warn(msg = '', path = '', file = '') {
    msg = '[WARN] ' + msg
    spew(colors.yellow.bold(msg), {path, file, error: true})
}

function group(...label) {
    if (label) log(...label)
    console.groupIndent++
}

function groupEnd() {
    if (console.groupIndent > 0)
        console.groupIndent--
}

function table(tabularData, properties) {
    return _table.call(Object.assign(console, {log: _log}), tabularData, properties)
}

// Redefine functions
console.log = log
console.info = info
console.error = error
console.warn = warn

console.group = group
console.groupCollapsed = group
console.groupEnd = groupEnd

console.table = table

// New functions
console.spew = spew
