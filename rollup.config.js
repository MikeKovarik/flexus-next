import fs from 'fs'
import babel from 'rollup-plugin-babel'
import notify from 'rollup-plugin-notify'


var pkg = JSON.parse(fs.readFileSync('package.json').toString())
var nodeCoreModules = require('repl')._builtinLibs
var external = [...nodeCoreModules, ...Object.keys(pkg.dependencies || {})]
var globals = external.reduce((obj, name) => (obj[name] = name, obj), {})

var format = 'umd'

var plugins = [
	notify(),
	babel()
]

var files = [
	{
		input: './src/js/index.js',
		name: 'flexus',
	}/*, {
		input: './src/elements/flexus-drawer.js',
		output: 'flexus-drawer',
	}*/
]

export default files.map(exp => ({
	input: exp.input,
	output: [{
		file: `dist/${exp.name}.js`,
		name: exp.name,
		amd: {id: exp.name},
		format: exp.format || format,
		globals,
		sourcemap: true,
	}],
	external,
	plugins,
}))
