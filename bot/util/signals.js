
module.exports = function(bot) {

    async function termSignal(sig) {
        console.info(`Received Signal: ${sig}`)
        await bot.destroy()
        process.exit(0)
    }

    process.on('SIGTERM', termSignal)   // generic
    process.on('SIGINT', termSignal)    // Ctrl + C
    process.on('SIGHUP', termSignal)    // terminal window closed
}