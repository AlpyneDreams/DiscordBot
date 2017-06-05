const fs = require('fs');
const STR = require("string");

// Use "colors/safe" if you don't want to modify String.prototype
const colors = require("colors");


var _log = console.log
var _error = console.error

console.muted = false
console.record = true
console.logdir = 'logs'


function spew(msg = '', {path = '', file = '', error = false, echo = true, record = true} = {}) {

	var date = new Date(Date.now())
	// generate a timestamp
	var timestamp = ("00" + date.getHours()).slice(-2)
	timestamp += ':' + ("00" + date.getMinutes()).slice(-2)
	timestamp += ':' + ("00" + date.getSeconds()).slice(-2)

	// prepend the timestamp to the message
	msg = "[" + timestamp + "] " + msg

	if (echo) {
		if (!error) {
			if (!console.muted) {
				_log(msg)
			}
		} else {
			_error(msg)
		}
	}

	if (record && console.record) {
		if (file) {
			// if a filename is specified then clean it up
			// and prepend a dash
			file = '-' + STR(file).slugify().toString();
		}

		if (path) {
			// if a path is specified then clean it up
			// and append a slash
			path = STR(path).slugify().toString() + '/';
		}

		// if the path doesn't exist then make it
		if (!fs.existsSync(console.logdir + '/' + path)) {
			try {
				fs.mkdirSync(console.logdir + '/' + path);
			} catch (err) {
				console.error('[CONSOLE] Cannot create directory "' + path + '"');
				log(msg, '', file, error);
			}
		}

		// generate a datestamp
		// months start from 0 because javascript was designed by gibbons
		var datestamp = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();

		// record the message
		fs.writeFileSync(console.logdir + '/' + path + datestamp + file + '.txt', msg + "\r\n", {flag:"a+"});
	}
}

function log(msg = '', path = '', file = '') {
	spew(msg, {path, file, error: false, echo: true, record: true})
}

function info(msg = '', path = '', file = '') {
	msg = '[INFO] ' + msg
	// print formatted message to console
	spew(msg.cyan.bold, {path, file, error: false, echo: true, record: false})
	// print unformatted message to file
	spew(msg, {path, file, error: false, echo: false, record: true})
}

// console.error and console.warn
function error(msg = '', path = '', file = '') {
	msg = '[ERROR] ' + msg
	// print formatted message to console
	spew(msg.red.bold, {path, file, error: false, echo: true, record: false})
	// print unformatted message to file
	spew(msg, {path, file, error: true, echo: false, record: true})
}

function warn(msg = '', path = '', file = '') {
	msg = '[WARN] ' + msg
	// print formatted message to console
	spew(msg.yellow.bold, {path, file, error: false, echo: true, record: false})
	// print unformatted message to file
	spew(msg, {path, file, error: false, echo: false, record: true})
}

// Redefine functions
console.log = log;
console.info = info;

console.error = error;
console.warn = warn;

// insert a white bold text modifier before logging anything else
_log(''.white.bold)
