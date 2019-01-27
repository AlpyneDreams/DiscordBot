require('../bot/util/console.js')
const Config = require('../bot/Config.js')

console.log('Working Dir: ' + process.cwd())

var cfg = new Config('configs/config_disquotes.hjson')

console.dir(cfg, {colors: true})
