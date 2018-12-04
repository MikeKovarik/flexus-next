import {Transition} from './Transition.js'


const ZINDEX_BASEVIEW = 99
const ZINDEX_BACKDROP = 100
const ZINDEX_SHEET    = 101
const ZINDEX_ORIGINBG = 102
const ZINDEX_ORIGIN   = 103
const ZINDEX_NEWVIEW  = 104

export class ViewTransition extends Transition {

	constructor(baseView, newView, origin, pivot = newView) {
		super()
		this.baseView = baseView
		this.newView  = newView
		this.origin   = origin
		this.pivot    = pivot

		this.duration = 250
		this.fill = 'both'
		this.easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)'

		// display all so that we can measure bboxes.
		this.baseView.style.display = ''
		this.newView.style.display = ''

		this.baseViewBbox   = this.baseView.getBoundingClientRect()
		this.newViewBbox    = this.newView.getBoundingClientRect()
		this.originBbox     = this.origin.getBoundingClientRect()
		this.originComputed = window.getComputedStyle(origin)
		this.newComputed    = window.getComputedStyle(this.newView)
		// todo: delete
		this.baseBbox   = this.baseViewBbox
		this.newBbox    = this.newViewBbox

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

	}

	//calculateOrigin(base, origin) {
	calculateOrigin() {
		var baseWidth = this.baseViewBbox.width - this.baseViewBbox.left
		var originMidpoint = this.originBbox.left - this.baseViewBbox.left + (this.originBbox.width / 2)
		this.originSideX = originMidpoint > baseWidth / 2 ? 'right' : 'left'
		this.originSideY = 'top'
	}

	async play(...args) {
		var baseViewZindex = this.baseView && this.baseView.style.zIndex
		var backdropZindex = this.backdrop && this.backdrop.style.zIndex
		var sheetZindex    = this.sheet    && this.sheet.style.zIndex
		var originBgZindex = this.originBg && this.originBg.style.zIndex
		var originZindex   = this.origin   && this.origin.style.zIndex
		var newViewZindex  = this.newView  && this.newView.style.zIndex

		if (this.baseView) this.baseView.style.zIndex = ZINDEX_BASEVIEW
		if (this.backdrop) this.backdrop.style.zIndex = ZINDEX_BACKDROP
		if (this.sheet)    this.sheet.style.zIndex    = ZINDEX_SHEET
		if (this.originBg) this.originBg.style.zIndex = ZINDEX_ORIGINBG
		if (this.origin)   this.origin.style.zIndex   = ZINDEX_ORIGIN
		if (this.newView)  this.newView.style.zIndex  = ZINDEX_NEWVIEW

		try {
			await super.play(...args)
		} catch(err) {
			// Propagate the error further down the pipeline.
			throw err
		} finally {
			// Reset Z-indexes to their original state no matter if succeded or err'd.
			if (this.baseView) this.baseView.style.zIndex = baseViewZindex
			if (this.backdrop) this.backdrop.style.zIndex = backdropZindex
			if (this.sheet)    this.sheet.style.zIndex    = sheetZindex
			if (this.originBg) this.originBg.style.zIndex = originBgZindex
			if (this.origin)   this.origin.style.zIndex   = originZindex
			if (this.newView)  this.newView.style.zIndex  = newViewZindex
		}
	}

	async in(...args) {
		this.baseView.setAttribute('hidden', '')
		try {
			await super.in(...args)
		} catch(err) {
			throw err
		} finally {
			this.baseView.style.display = 'none'
			this.baseView.removeAttribute('hidden')
		}
	}

	async out(...args) {
		this.newView.setAttribute('hidden', '')
		try {
			await super.out(...args)
		} catch(err) {
			throw err
		} finally {
			this.newView.style.display = 'none'
			this.newView.removeAttribute('hidden')
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

	createSheet() {
		this.sheet = document.createElement('div')
		//this.sheet.style.outline = '1px solid red'
		this.sheet.style.position = 'absolute'
		this.sheet.style.backgroundColor = 'white'
		this.sheet.style.willChange = 'box-shadow, transform, opacity, border-radius, left, right, top, bottom'
		this.baseView.append(this.sheet)
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







	async transitionSheet($from, $to) {
		console.log('$from', $from)
		console.log('$to', $to)
		var fromBbox = $from.getBoundingClientRect()
		var toBbox = $to.getBoundingClientRect()
		var fromComputed = window.getComputedStyle($from)
		var toComputed = window.getComputedStyle($to)

		var sheet = document.createElement('div')
		var keyframes = {
			top: [fromBbox.top + 'px', toBbox.top + 'px'],
			left: [fromBbox.left + 'px', toBbox.left + 'px'],
			width: [fromBbox.width + 'px', toBbox.width + 'px'],
			height: [fromBbox.height + 'px', toBbox.height + 'px'],
			backgroundColor: [fromComputed.backgroundColor, toComputed.backgroundColor],
			borderRadius: [fromComputed.borderRadius, toComputed.borderRadius],
			//boxShadow: [fromComputed.boxShadow || 'var(--elevation-6)', toComputed.boxShadow || 'var(--elevation-0)'],
			//clipPath: [`inset(0px 0px 0px 0px round ${this.newComputed.borderRadius})`, 'inset(0px 0px 0px 0px round 0px)']
		}

		Object.assign(sheet.style, {
			position: 'absolute',
			//zIndex: 2,
			zIndex: 102,
		})
		document.body.append(sheet)

		console.log('sheet', sheet)
		console.log('keyframes', keyframes)

		$to.style.visibility = 'hidden'
		this.schedule(sheet, keyframes)
		await this.finished
		$to.style.visibility = ''
		sheet.remove()

/*
		var $fromView = $from.parentElement.parentElement
		var {duration, easing, fill} = this
		console.log('$fromView', $fromView)
		$fromView.animate({
			opacity: [1, 0]
		}, {
			delay: 0.5 * duration,
			duration: 0.5 * duration,
			//delay: 0.2 * duration,
			//duration: 0.6 * duration,
			easing,
			fill
		})
*/

	}






	transitionNode($from, $to, options = {}) {
		var fromBbox = $from.getBoundingClientRect()
		var toBbox = $to.getBoundingClientRect()

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

		$from.animate({
			transformOrigin: ['top left', 'top left'],
			transform: fromTransform,
			opacity: [1, 0],
		}, {duration, easing, fill})

		$to.animate({
			transformOrigin: ['top left', 'top left'],
			transform: toTransform,
			opacity: [0, 1],
		}, {duration, easing, fill})
	}





}
