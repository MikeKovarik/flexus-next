import {Transition} from './Transition.js'
import {TransformOriginMixin} from './ViewTransition-transformOrigin.js'
import {SurroundingNodesMixin} from './ViewTransition-surroundingNodes.js'


const ZINDEX_BASEVIEW = 99
const ZINDEX_BACKDROP = 100
const ZINDEX_SHEET    = 101
const ZINDEX_ORIGINBG = 102
const ZINDEX_ORIGIN   = 103
const ZINDEX_NEWVIEW  = 104

export class ViewTransition extends Transition {

	duration = 250
	fill = 'both'
	easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)'

	constructor(baseView, newView, origin, pivot) {
		super()
		
		if (!pivot)
			pivot = newView.querySelector('[transition-pivot]') || newView
		if (origin instanceof Event)
			origin = this.findOrigin(origin)
		if (!origin)
			origin = this.findOriginInView(baseView)

		if (!origin)
			throw `Couldn't animate, 'origin' node is ${origin}`

		this.baseView = baseView
		this.newView  = newView
		this.origin   = origin
		this.pivot    = pivot
	}

	// accepts event
	// TODO: accept node to traverse upwards from.
	findOrigin(e) {
		var node = e.target
		while (node !== null) {
			if (node.hasAttribute('transition-origin')) return node
			node = node.parentElement
		}
	}
	findOriginInView(baseView) {
		let origins = Array.from(baseView.querySelectorAll('[transition-origin]'))
		if (origins.length === 1) return origins[0]
	}

	setup() {

		// display all so that we can measure bboxes.
		this.baseView.style.display = ''
		this.newView.style.display = ''

		this.baseViewBbox   = this.baseView.getBoundingClientRect()
		this.newViewBbox    = this.newView.getBoundingClientRect()
		if (this.origin) {
			this.originBbox     = this.origin.getBoundingClientRect()
			this.originComputed = window.getComputedStyle(this.origin)
			// views usually have position:relative, other elements are custom made with
			// position baked in, the only thing that needs position for z-index to work is origin
			if (this.originComputed.position === 'static')
				this.origin.style.position = 'relative'
		}

		this.storeZindexes()
		this.applyTransitionZindexes()

		// todo:
		this.scale = this.newViewBbox.width / this.originBbox.width
		// distance of size between origin and new view.
		this.sizeDiff = Math.max(this.newViewBbox.width - this.originBbox.width, this.newViewBbox.height - this.originBbox.height)
		// TODO: calculate duration dynamically based on the distance. longer the distance, longer the animation.

		if (this.canBlendToolbars)
			this.blendAboveMain() // todo

		if (this.canBlendMains)
			this.blendMains() // todo
		// PUSH away other elevated elements (bottom tabs or bar)
		// FADE out everything else.

		// TODO: change newView to baseView
		var originOrBaseView = this.origin || this.baseView
		for (let source of originOrBaseView.querySelectorAll('[transition-part]')) {
			//if (source === this.origin) continue
			let name = source.getAttribute('transition-part')
			let target = this.pivot.querySelector(`[transition-part="${name}"]`)
			if (!target) continue
			if (target === this.pivot) continue
			this.transitionNodes(source, target)
		}


		// TODO
		//this.scheduleIndependentsParts(this.baseView, 0, 0.4)
		//this.scheduleIndependentsParts(this.newView, 0.6, 1)

		this.readyToPlay = true

	}

	teardown() {
		if (this.backdrop) this.backdrop.remove()
		if (this.sheet)    this.sheet.remove()
		this.restoreZindexes()
		this.originalZindexes.newView = undefined
	}

	scheduleIndependentsParts(parent, start, end) {
		// schedules independent parts of the view.
		// t.g. fading out something on master view or scaling in fab of the new view.
		var fab = parent.querySelector('[fab]')
		var parts = Array.from(parent.querySelectorAll('[transition]'))
		if (!parts.includes(fab)) parts.push(fab)
		for (let node of parts) {
			if (node === this.pivot) continue
			if (node === this.origin) continue
			let type = node === fab ? 'scale' : node.getAttribute('transition') || 'fade'
			// TODO: call proper methods for 'scale' and 'fade'
		}

	}

	setVisible(node) {
		node.style.visibility = 'visible'
		node.style.display = ''
		// TODO: reenable this once responsive [hidden=""] rule doesn't take precendence.
		//this.baseView.setAttribute('hidden', '')
		//this.baseView.style.display = 'unset !important'
	}

	setHidden(node) {
		node.style.visibility = ''
		node.style.display = 'none'
	}

/*
	async play(...args) {
		if (!this.readyToPlay) this.setup()
		try {
			await super.play(...args)
		} catch(err) {
			// Propagate the error further down the pipeline.
			throw err
		} finally {
			// Reset Z-indexes to their original state no matter if succeded or err'd.
			this.teardown()
		}
	}
*/
	async in(...args) {
		this.setVisible(this.baseView)
		this.setVisible(this.newView)

		if (!this.readyToPlay) this.setup()
		if (this.setupIn) {
			this.setupIn()
			// todo???
			var playReversed = false
		} else {
			// todo???
			var playReversed = false
			//var playReversed = true
		}

		try {
			//await super.in(...args)
			var mode  = playReversed ? 'reversed' : 'normal'
			var speed = playReversed ? 1.3 : 1
			await super.play(mode, speed)
		} catch(err) {
			throw err
		} finally {
			this.setHidden(this.baseView)
			this.teardown()
		}
	}

	async out(...args) {
		this.setVisible(this.baseView)
		this.setVisible(this.newView)

		if (!this.readyToPlay) this.setup()
		if (this.setupOut) {
			this.setupOut()
			// todo???
			var playReversed = false
		} else {
			// todo???
			var playReversed = true
		}

		try {
			var mode  = playReversed ? 'reversed' : 'normal'
			var speed = playReversed ? 0.7 : 1
			await super.play(mode, speed)
			//await super.out(...args)
		} catch(err) {
			throw err
		} finally {
			this.setHidden(this.newView)
			this.teardown()
		}
	}

	createBackdrop() {
		this.backdrop = document.createElement('div')
		this.backdrop.setAttribute('fx-backdrop', '')
		this.baseView.append(this.backdrop)
	}

	createSheet(color = '#FFF') {
		this.sheet = document.createElement('div')
		//this.sheet.style.outline = '1px solid red'
		Object.assign(this.sheet.style, {
			position: 'absolute',
			zIndex: ZINDEX_SHEET,
			backgroundColor: color,
			willChange: 'box-shadow, transform, opacity, border-radius, left, right, top, bottom',
		})
		this.baseView.append(this.sheet)
		return this.sheet
	}

	scheduleResize(from, to, start = 0, end = 1) {
		//this.schedule(this.sheet, sheetResizeKeyframes, start, end)
	}

	scheduleSheetResize(start = 0, end = 1) {
		var keyframes = this.calculateResizeKeyframes(this.origin, this.newView)
		this.schedule(this.sheet, keyframes, start, end)
	}

	scheduleSheetTransform(start = 0, end = 1) {
	}
/*
	getKeyframes(node) {
		this.nodes = this.nodes || new Map
		var keyframes = this.nodes.get(node) || {
			translateX: 0,
			translateY: 0,
			scaleX: 1,
			scaleY: 1,
		}
		this.nodes.set(node, keyframes)
		return keyframes
	}
*/






	async transitionSheet(source, target) {
		this.sheet = this.createSheet()
		document.body.append(this.sheet)
		var transitionProps = ['left', 'top', 'width', 'height', 'backgroundColor', 'borderRadius']
		var keyframes = this.calculateDiffKeyframes(source, target, transitionProps)
		//target.style.visibility = 'hidden'
		this.schedule(this.sheet, keyframes)
		await this.finished
		//target.style.visibility = ''
		this.sheet.remove()

	}





	// is this still used? why doesn't it return anything, not animations, nor promise
	transitionNode(source, target, options = {}) {
		var fromBbox = source.getBoundingClientRect()
		var toBbox = target.getBoundingClientRect()

		var fromTransform = [
			`translate(0, 0)`,
			`translate(${toBbox.left - fromBbox.left}px, ${toBbox.top - fromBbox.top}px)`,
		]
		var toTransform = [
			`translate(${fromBbox.left - toBbox.left}px, ${fromBbox.top - toBbox.top}px)`,
			`translate(0, 0)`,
		]

		if (options.scale !== false) {
			fromTransform[0] += ` scale(1, 1)`
			fromTransform[1] += ` scale(${toBbox.width / fromBbox.width}, ${toBbox.height / fromBbox.height})`
			toTransform[0] += ` scale(${fromBbox.width / toBbox.width}, ${fromBbox.height / toBbox.height})`
			toTransform[1] += ` scale(1, 1)`
		}

		var duration = options.duration || 400
		var fill = options.fill || 'both'
		var easing = options.easing || 'cubic-bezier(0.4, 0.0, 0.2, 1)'

		source.animate({
			transformOrigin: Array(2).fill('top left'),
			transform: fromTransform,
			opacity: [1, 0],
		}, {duration, easing, fill})

		target.animate({
			transformOrigin: Array(2).fill('top left'),
			transform: toTransform,
			opacity: [0, 1],
		}, {duration, easing, fill})
	}



	// -------------------------------------------------------------
	// ------------------------ ZINDEX -----------------------------
	// -------------------------------------------------------------

	// list of nodes of which we'll be modifying and later restoring z-indexes.
	zIndexNodeList = ['baseView', 'backdrop', 'sheet', 'originBg', 'origin', 'newView']

	applyTransitionZindexes() {
		if (this.baseView) this.baseView.style.zIndex = ZINDEX_BASEVIEW
		if (this.backdrop) this.backdrop.style.zIndex = ZINDEX_BACKDROP
		if (this.sheet)    this.sheet.style.zIndex    = ZINDEX_SHEET
		if (this.originBg) this.originBg.style.zIndex = ZINDEX_ORIGINBG
		if (this.origin)   this.origin.style.zIndex   = ZINDEX_ORIGIN
		if (this.newView)  this.newView.style.zIndex  = ZINDEX_NEWVIEW
	}

	storeZindexes() {
		let originalZindexes = this.originalZindexes = {}
		for (let key of this.zIndexNodeList)
			if (this[key]) originalZindexes[key] = this[key].style.zIndex
	}

	restoreZindexes() {
		let {originalZindexes} = this
		for (let key of this.zIndexNodeList)
			if (this[key]) this[key].style.zIndex = originalZindexes[key]
	}


}

// MIXINS
extendClass(ViewTransition, TransformOriginMixin)
extendClass(ViewTransition, SurroundingNodesMixin)

function extendClass(Target, Mixin) {
	let staticKeys = Object.getOwnPropertyNames(Mixin)
	let protoKeys = Object.getOwnPropertyNames(Mixin.prototype)
	for (let key of staticKeys) {
		if (key === 'length') continue
		if (key === 'prototype') continue
		if (key === 'name') continue
		Target[key] = Mixin[key]
	}
	for (let key of protoKeys) {
		if (key === 'constructor') continue
		Target.prototype[key] = Mixin.prototype[key]
	}
}
