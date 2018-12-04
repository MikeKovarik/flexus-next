import {Transition} from './Transition.js'
import {ImageTransition} from './ImageTransition.js'


const ZINDEX_BASEVIEW = 99
const ZINDEX_BACKDROP = 100
const ZINDEX_SHEET    = 101
const ZINDEX_ORIGINBG = 102
const ZINDEX_ORIGIN   = 103
const ZINDEX_NEWVIEW  = 104

export class ViewTransition extends Transition {

	constructor(baseView, newView, origin, pivot) {
		super()
		
		if (!pivot)
			pivot = newView.querySelector('[transition-pivot]') || newView
		if (origin instanceof Event)
			origin = this.findOrigin(origin)

		this.baseView = baseView
		this.newView  = newView
		this.origin   = origin
		this.pivot    = pivot

		this.duration = 250
		this.fill = 'both'
		this.easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)'

		//this.setup()
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

	setup() {

		// display all so that we can measure bboxes.
		this.baseView.style.display = ''
		this.newView.style.display = ''

		this.baseViewBbox   = this.baseView.getBoundingClientRect()
		this.newViewBbox    = this.newView.getBoundingClientRect()
		if (this.origin) {
			this.originBbox     = this.origin.getBoundingClientRect()
			this.originComputed = window.getComputedStyle(this.origin)
		}

		this.originalZindexes = {
			baseView: this.baseView && this.baseView.style.zIndex,
			backdrop: this.backdrop && this.backdrop.style.zIndex,
			sheet:    this.sheet    && this.sheet.style.zIndex,
			originBg: this.originBg && this.originBg.style.zIndex,
			origin:   this.origin   && this.origin.style.zIndex,
			newView:  this.newView  && this.newView.style.zIndex,
		}
		if (this.baseView) this.baseView.style.zIndex = ZINDEX_BASEVIEW
		if (this.backdrop) this.backdrop.style.zIndex = ZINDEX_BACKDROP
		if (this.sheet)    this.sheet.style.zIndex    = ZINDEX_SHEET
		if (this.originBg) this.originBg.style.zIndex = ZINDEX_ORIGINBG
		if (this.origin)   this.origin.style.zIndex   = ZINDEX_ORIGIN
		if (this.newView)  this.newView.style.zIndex  = ZINDEX_NEWVIEW
		// todo:
		this.scale = this.newViewBbox.width / this.originBbox.width
		// distance of size between origin and new view.
		this.sizeDiff = Math.max(this.newViewBbox.width - this.originBbox.width, this.newViewBbox.height - this.originBbox.height)
		// TODO: calculate duration dynamically based on the distance. longer the distance, longer the animation.

		if (this.canBlendToolbars)
			this.blendAboveMain()

		if (this.canBlendMains)
			this.blendMains()
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
		if (this.baseView) this.baseView.style.zIndex = this.originalZindexes.baseView
		if (this.backdrop) this.backdrop.style.zIndex = this.originalZindexes.backdrop
		if (this.sheet)    this.sheet.style.zIndex    = this.originalZindexes.sheet
		if (this.originBg) this.originBg.style.zIndex = this.originalZindexes.originBg
		if (this.origin)   this.origin.style.zIndex   = this.originalZindexes.origin
		if (this.newView)  this.newView.style.zIndex  = this.originalZindexes.newView
		this.originalZindexes.newView = undefined
	}

	scheduleIndependentsParts(parent, start, end) {
		// schedules independent parts of the view.
		// t.g. fading out something on master view or scaling in fab of the new view.
		var fab = parent.querySelector('[fab]')
		var parts = Array.from(parent.querySelectorAll('[transition]'))
		if (!parts.includes(fab)) parts.push(fab)
		for (let node of parts) {
			if (node == this.pivot) continue
			if (node == this.origin) continue
			let type = node === fab ? 'scale' : node.getAttribute('transition') || 'fade'
			// TODO: call proper methods for 'scale' and 'fade'
		}

	}

	//calculateOrigin(base, origin) {
	calculateOrigin() {
		var baseWidth = this.baseViewBbox.width - this.baseViewBbox.left
		var originMidpoint = this.originBbox.left - this.baseViewBbox.left + (this.originBbox.width / 2)
		this.originSideX = originMidpoint > baseWidth / 2 ? 'right' : 'left'
		this.originSideY = 'top'
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

	async in(...args) {
		this.setVisible(this.baseView)
		this.setVisible(this.newView)

		if (!this.readyToPlay) this.setup()
		if (this.setupIn) {
			this.setupIn()
			var playReversed = false
		} else {
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
			var playReversed = false
		} else {
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



	pushAwayElementsAbove() {
	}
	pushAwayElementsBelow() {
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

		var duration = 400
		var fill = 'both'
		var easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)'

		source.animate({
			transformOrigin: ['top left', 'top left'],
			transform: fromTransform,
			opacity: [1, 0],
		}, {duration, easing, fill})

		target.animate({
			transformOrigin: ['top left', 'top left'],
			transform: toTransform,
			opacity: [0, 1],
		}, {duration, easing, fill})
	}





}
