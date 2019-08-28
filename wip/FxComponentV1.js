const EASING = 'cubic-bezier(0.4, 0.0, 0.2, 1)'
const DURATION = 200

function isAnimationOptions(object) {
	return object.duration
		|| object.delay
		|| object.easing
}

function getAnimationObjects(args) {
	if (args.length === 1) {
		var from = {}
		var to = {}
		for (let [key, val] of Object.entries(args[0])) {
			from[key] = val[0]
			to[key] = val[1]
		}
	} else {
		var [to, from] = args
	}
	return {to, from}
}

function animate(node, ...args) {
	var options = {}
	if (typeof args[args.length - 1] === 'number')
		options = {duration: args.pop()}
	if (isAnimationOptions(args[args.length - 1]))
		options = args.pop()
	var {to, from} = getAnimationObjects(args.reverse())
	Object.assign(node.style, from)
	options.easing = EASING
	options.fill = 'both'
	options.duration = options.duration || DURATION
	var animation = node.animate([from, to], options)
	animation.done = new Promise(resolve => {
		animation.onfinish = e => {
			//Object.assign(node.style, to)
			for (let key in to) node.style[key] = ''
			animation.cancel()
			resolve()
		}
		animation.oncancel = resolve
	})
	return animation
}

let animations = new WeakMap

export default class CustomComponent extends HTMLElement {

	constructor() {
		super()
		let Class = this.constructor
		if (Class.template !== undefined) {
			if (Class.templateNode === undefined) {
				Class.templateNode = document.createElement('template')
				Class.templateNode.innerHTML = Class.template
			}
			let root = this.attachShadow({mode: 'open'})
			root.appendChild(Class.templateNode.content.cloneNode(true))
			if (Class.style !== undefined) {
				if (Class.styleSheet === undefined) {
					Class.styleSheet = new CSSStyleSheet
					Class.styleSheet.replaceSync(Class.style)
				}
				root.adoptedStyleSheets = [...root.adoptedStyleSheets, Class.styleSheet]
			}
		}
	}

	async _animate(node, ...args) {
		let animation = animations.get(node)
		if (animation) animation.cancel()
		animation = animate(node, ...args)
		animations.set(node, animation)
		await animation.done
		animation = undefined
	}

}