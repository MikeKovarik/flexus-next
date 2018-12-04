var gulp = require('gulp')
var plumber = require('gulp-plumber')
var notify = require('gulp-notify')
var changed = require('gulp-changed')
var less = require('gulp-less')
var rename = require('gulp-rename')
var sourcemaps = require('gulp-sourcemaps')
//var rollupBabel = require('rollup-plugin-babel')
//var rollup = require('gulp-better-rollup')
var pkg = require('./package.json')


function watch(watchGlob, source, callback, globOptions) {
	if (source === undefined) {
		source = watchGlob
	}
	if (typeof source === 'function') {
		callback = source
		source = watchGlob
	}
	var cwd = process.cwd()
	gulp.watch(watchGlob, globOptions)
		.on('change', e => {
			if (source)
				callback(gulp.src(source, globOptions))
			else
				callback(gulp.src(path.relative(cwd, e.path), globOptions))
		})
	// TODO: if this is wildcard, make this return everything
	return callback(gulp.src(source, globOptions))
}

var port = 8080

var DEST = {
	css: 'css',
	lib: 'lib',
	polyfills: 'polyfills',
	elements: 'elements'
}




var lessConfig = {strictMath: true}

function buildLess(watchNames, inputName = watchNames, renameTo) {
	return watch(watchNames, inputName, stream => {
		return stream
			.pipe(plumber(notify.onError('<%= error.message %>')))
			.pipe(sourcemaps.init())
			.pipe(less(lessConfig))
			.pipe(renameTo ? rename({basename: renameTo}) : rename({prefix: 'flexus-'}))
			.pipe(sourcemaps.write(''))
			.pipe(gulp.dest(DEST.css))
			//.pipe(browser.reload({stream: true}))
	}, {cwd: 'src/css/'})
}

gulp.task('wireframe',   () => buildLess('wireframe.less'))
gulp.task('ui-fluent',   () => buildLess(['*.less', '!material*.less'], 'fluent.less'))
gulp.task('ui-material', () => buildLess(['*.less', '!fluent*.less'], 'material.less'))

gulp.task('ui', ['ui-fluent', 'ui-material'])
gulp.task('default', [/*'ui-fluent', */'ui-material'])
