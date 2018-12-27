
const fs = require('fs')
const path = require('path')
const deepAssign = require('deep-assign')

class Profile {

	constructor(file, config, fatal = true) {
		this.meta = {
			files: []
		}

		// TODO: Profile schema
		if (!this.users) this.users = {}
		if (!this.guilds) this.guilds = {}
		if (!this.tags) this.tags = {}
		if (!this.modules) this.modules = {}
		

		try {
			this.load(file)
		} catch (e) {
			if (fatal) {
				console.error(e)
				process.exit()
			}
			console.warn(e)
		}

		if (config.profile) {
			deepAssign(this, config.profile)
		}

	}

	// Includes another config
	load(file) {
		if (fs.existsSync(file)) {

			console.log(`Loading Profile: "${file}"`)
			var data = JSON.parse(fs.readFileSync(file, {encoding: 'utf-8'}))

			// TODO: Prevent keys in use by this object from being overwritten
			deepAssign(this, data)

		} else {
			console.log(`Created Profile: ${file}`)
		}
		this.meta.files.push(file)
		this.save()
	}

	reload() {
		var backup = Object.assign({}, this)

		for (var key in this) {
			if (key != 'meta') {
				delete this[key]
			}
		}

		try {
			this.load(this.meta.files[0])
		} catch (e) {
			Object.assign(this, backup)
			throw e
		}
	}

	save() {
		var meta = this.meta
		delete this.meta

		//console.log(`Saving Profile: "${meta.path}"`)
		fs.writeFileSync("./" + meta.files[0], JSON.stringify(this, null, '\t'), {flag: "w+"})

		this.meta = meta
	}

}

module.exports = Profile
