export var promiseTimeout = millis => new Promise(resolve => setTimeout(resolve, millis))

export function pair(item) {
	return [item, item]
}

export function cloneNode(original) {
	var computed = window.getComputedStyle(original)
	var clone = document.createElement(original.localName)
	clone.innerHTML = original.innerHTML
	clone.style.fontSize = computed.fontSize
	clone.style.fontWeight = computed.fontWeight
	clone.style.color = computed.color
	return clone
}

export function highlight(arg, color = 'red') {
	if (arg instanceof HTMLElement)
		var bbox = arg.getBoundingClientRect()
	else
		var bbox = arg
	var div = document.createElement('div')
	Object.assign(div.style, {
		position: 'absolute',
		zIndex: 9999,
		left: bbox.left + 'px',
		top: bbox.top + 'px',
		width: bbox.width + 'px',
		height: bbox.height + 'px',
		outline: `2px solid ${color}`,
	})
	document.body.append(div)
	return div
}

var camelToKebabCaseMem = new Map
export function camelToKebabCase(camel) {
	if (camelToKebabCaseMem.has(camel))
		return camelToKebabCaseMem.get(camel)
	var kebab = camel
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.toLowerCase()
	camelToKebabCaseMem.set(camel, kebab)
	return kebab
}
/*
export function isElevated(node, computed) {
	var attr = Number(node.getAttribute('elevation'))
	if (!Number.isNaN(attr)) return attr > 0
	if (!computed) computed = window.getComputedStyle(node)
	if (computed.boxShadow === 'none') return false
	return computed.boxShadow
		// split string by commas that are outside of parenthesis (rgba colors)
		.split(/\,\s?(?![^\(]*\))/)
		.some(shadow => {
			// Split by all spaces that are outside of parenthesis.
			var parts = shadow.split(/\s(?![^\(]*\))/)
			var color = parts.find(isColor)
			var sizes = parts.filter(part => !isColor(part))
			var size = sizes.map(str => str.replace(/\D/g, '')).map(Number).reduce((a,b) => a + b)
			return size > 0 && !isTransparent(color)
		})
}

function isColor(string) {
	return string.includes('#')
		|| string.includes('rgb')
		|| string.includes('hsl')
}

function isTransparent(string) {
	if (string.includes('a(')) {
		var alpha = string.slice(5, -1).split(',').map(Number).pop()
		return alpha === 0
	} else {
		return string.startsWith('#')
			&& string.length === 5 && string[4] === '0'
			&& string.length === 9 && string.slice(-2) === '00'
	}
}
*/