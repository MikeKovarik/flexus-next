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

export function animate(node, ...args) {
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

export function createTemplate(string) {
	var template = document.createElement('template')
	template.innerHTML = string
	return template
}

export function createStyle(string) {
	let styleSheet = new CSSStyleSheet
	styleSheet.replaceSync(string)
	return styleSheet
}

export function createGlobalStyle(string) {
	let styleSheet = createStyle(string)
	document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet]
	return styleSheet
}

function fragmentFromString(string) {
	return document.createRange().createContextualFragment(string)
}

export default class CustomComponent extends HTMLElement {

	constructor() {
		super()
		let Class = this.constructor
		if (Class.template !== undefined) {
			if (Class.templateNode === undefined) {
				Class.templateNode = document.createElement('template')
				Class.templateNode.innerHTML = Class.template
			}
			this._createShadowFromTemplate(Class.templateNode)
			if (Class.style !== undefined) {
				if (Class.styleSheet === undefined) {
					Class.styleSheet = new CSSStyleSheet
					Class.styleSheet.replaceSync(Class.style)
				}
				this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, Class.styleSheet]
			}
		}/* else if (typeof this.template === 'string') {
			this._createShadowFromString(this.template)
			if (typeof this.style === 'string') {
				this._addStyleSheet(this.style)
			}
		}
		*/
	}

	_createShadowFromTemplate(templateNode) {
		let fragment = templateNode.content.cloneNode(true)
		this._createShadowFromFragment(fragment)
	}

	_createShadowFromString(string) {
		let fragment = fragmentFromString(string)
		this._createShadowFromFragment(fragment)
	}

	_createShadowFromFragment(fragment) {
		this.attachShadow({mode: 'open'})
		this.shadowRoot.appendChild(fragment)
	}

	_addStyleSheet(cssString) {
		let styleSheet = new CSSStyleSheet
		styleSheet.replaceSync(cssString)
		this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, styleSheet]
	}
/*
	attributeChangedCallback(attrName, oldValue, newValue) {
	}
*/
	async _animate(node, ...args) {
		let animation = animations.get(node)
		if (animation) animation.cancel()
		animation = animate(node, ...args)
		animations.set(node, animation)
		await animation.done
		animation = undefined
	}

}