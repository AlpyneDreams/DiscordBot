
const Hjson = require('hjson')
const fs = require('fs')
const path = require('path')
const deepAssign = require('deep-assign')
const jsonschema = require('jsonschema')

// Read only Hjson or JSON file
// Supports base files and schemas.
class Config {

	constructor(file, {schemaFile = null, fatal = false} = {}) {

		this.meta = {}
		this.meta.path = file

		try {
				this.load(file)

				if (this.$schema && !schemaFile) {
					schemaFile = this.$schema
				}

				if (schemaFile) {
					this.loadSchema(schemaFile)
					this.validate()
				}
		} catch (e) {
			if (fatal) {
				console.error(e)
				process.exit()
			}
			console.warn(e)
		}



	}

	validate() {
		return jsonschema.validate(this, this.meta.schema, {throwError: true})
	}

	loadSchema(file) {
		if (fs.existsSync(file)) {
			console.log(`Loading Schema: "${file}"`)
			this.meta.schema = Hjson.parse(fs.readFileSync(file, {encoding: 'utf-8'}))
		} else {
			throw new Error(`Failed to locate config schema file: ${file}`)
		}
	}

	// Includes another config
	load(file) {
		if (fs.existsSync(file)) {
			console.log(`Loading Config: "${file}"`)
			var data = Hjson.parse(fs.readFileSync(file, {encoding: 'utf-8'}))

			if (data.base) {
				this.load(path.dirname(file) + '/' + data.base)
				delete data.base
			}

			// TODO: Prevent keys in use by this object from being overwritten
			deepAssign(this, data)
		} else {
			throw new Error(`Failed to locate config file: ${file}`)
		}
	}

}

module.exports = Config
