export var promiseTimeout = millis => new Promise(resolve => setTimeout(resolve, millis))

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