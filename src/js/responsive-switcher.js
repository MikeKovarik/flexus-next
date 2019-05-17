var platform = window['platform-detect']

var htmlNode = document.documentElement

const SMALL  = 's'
const MEDIUM = 'm'
const LARGE  = 'l'

//export const SCREENSIZE = {SMALL, MEDIUM, LARGE}

// helpers for transforming numbers into breakpoint queries
var makeFirstQuery = value => `(max-width: ${value}px)`
var makeLastQuery = value => `(min-width: ${value}px)`
var makeStepQuery = (a, b) => `${makeLastQuery(a)} and ${makeFirstQuery(b)}`

// transorms array of breakpoint numbers into queries describing these breakpoints
function makeBreakpointQueries(breakpoints) {
	//breakpoints = breakpoints.map(Number)
	breakpoints = breakpoints
		.map(num => parseInt(num))
		.filter(num => num) // for now just filter out empty breakpoints
	var queries = [makeFirstQuery(breakpoints[0])]
	var lastIndex = breakpoints.length - 1
	if (lastIndex > 0) {
		for (var i = 0; i < lastIndex; i++)
			queries.push(makeStepQuery(breakpoints[i], breakpoints[i + 1]))
	}
	queries.push(makeLastQuery(breakpoints[lastIndex]))
	return queries
}

// setup core screensize queries
/*
var computedStyle = getComputedStyle(htmlNode)
var breakpointBetweenSmallAndMedium = computedStyle.getPropertyValue('--breakpoint-s-m')
var breakpointBetweenMediumAndLarge = computedStyle.getPropertyValue('--breakpoint-m-l')
*/
var breakpointBetweenSmallAndMedium = 640
var breakpointBetweenMediumAndLarge = 1000
var breakpoints = [breakpointBetweenSmallAndMedium, breakpointBetweenMediumAndLarge]
// returns three css queries (small, medium, large) covering screensize between the two breakpoints
var queries = makeBreakpointQueries(breakpoints)
// register events
platform.registerQuery(queries[0], matches => matches && setScreensize('s'))
platform.registerQuery(queries[1], matches => matches && setScreensize('m'))
platform.registerQuery(queries[2], matches => matches && setScreensize('l'))
platform.on('input', setInput)
platform.on('orientation', setOrientation)
// call them for the first time
setInput()
setOrientation()

function setScreensize(screensize) {
	setAttribute('screensize', screensize)
	// plugin for platform-detect
	platform.screensize = screensize
	platform.emit('screensize', screensize)
}

function setInput() {
	setAttribute('mouse', platform.mouse)
	setAttribute('touch', platform.touch)
}

function setOrientation() {
	setAttribute('portrait', platform.portrait)
	setAttribute('landscape', platform.landscape)
}

function setAttribute(name, value) {
	if (value === false)
		htmlNode.removeAttribute(name)
	else if (value === true)
		htmlNode.setAttribute(name, '')
	else
		htmlNode.setAttribute(name, value)
}
