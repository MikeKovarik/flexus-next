import {AnimationOrchestrator, reverseKeyframes} from './AnimationOrchestrator.js'
import {cloneNode, highlight} from './util.js'


function addToWillChange(node, property) {
	if (node.style.willChange.includes(property)) return
	if (node.style.willChange)
		node.style.willChange += ', ' + property
	else
		node.style.willChange = property
}

export class Transition extends AnimationOrchestrator {

	constructor() {
		super()
		this.originSideX = 'left'
		this.originSideY = 'top'
	}

	get transformOrigin() {
		return `${this.originSideX} ${this.originSideY}`
	}
	set transformOrigin(string) {
		this.originSideX = this.originSideY = 'center'
		switch (string) {
			case 'center': return
			case 'top':    return this.originSideY = 'top'
			case 'right':  return this.originSideX = 'right'
			case 'bottom': return this.originSideY = 'bottom'
			case 'left':   return this.originSideX = 'left'
			default:
				var {originSideX, originSideY} = string.split(' ')
				this.originSideX = originSideX
				this.originSideY = originSideY
		}
	}

	// PLAYBACK

	in() {
		return this.play('normal', 1)
	}

	out() {
		return this.play('reverse', 0.7)
	}

	// CALCULATIONS

	calculateResizeKeyframes(source, target) {
		return this.calculateDiffKeyframes(source, target, ['top', 'left', 'width', 'height'])
	}

	calculateDiffKeyframes(source, target, properties = []) {
		var sourceBbox = source.getBoundingClientRect()
		var targetBbox = target.getBoundingClientRect()
		// Do not calculate computed styles untill necessary. It's expensive.
		var sourceComputed
		var targetComputed
		var keyframes = {}
		for (let prop of properties) {
			if (prop in sourceBbox) {
				// allow using translate instead of left/top positioning
				keyframes[prop] = [sourceBbox[prop] + 'px', targetBbox[prop] + 'px']
			} else {
				if (!sourceComputed) {
					sourceComputed = window.getComputedStyle(source)
					targetComputed = window.getComputedStyle(target)
				}
				if (prop === 'borderRadius') {
					keyframes.clipPath = [
						`inset(0px 0px 0px 0px round ${sourceComputed.borderRadius})`,
						`inset(0px 0px 0px 0px round ${targetComputed.borderRadius})`
					]
				} else {
					keyframes[prop] = [sourceComputed[prop], targetComputed[prop]]
				}
			}
		}
		return keyframes
	}


	// TRANSITIONS

	// view   - transformed view
	// origin - target position to translate and scale the view to fit into.
	// pivot  - element in animated view that will match origin element.
	// example: calendar app. clicking uppon event in event list opens a new 'view',
	//          the event (small blue rectangle) is the 'origin', it then scales up to grow
	//          as large as the 'pivot' and translates to pivot's position.
	//          by default pivot is the whole new view, but it could be a portion of it, like
	//          a tall blue toolbar. in which case the origin only grows to fill and match the toolbar.

	// NOTE: In the future we will be able to use {composite:'add'} to combine multiple
	//       transform animations.
	transformTo(node, origin, pivot = node, start = 0, end = 1) {
		addToWillChange(node, 'transform')
		var keyframes = this.calculateTransformKeyframes(node, origin, pivot)
		this.schedule(node, keyframes, start, end)
	}

	transformFrom(node, origin, pivot = node, start = 0, end = 1) {
		addToWillChange(node, 'transform')
		var keyframes = this.calculateTransformKeyframes(node, origin, pivot)
		keyframes = reverseKeyframes(keyframes)
		this.schedule(node, keyframes, start, end)
	}

	translateTo(node, origin, pivot = node, start = 0, end = 1) {
		var values = this.calculateTranslate(node, origin, pivot)
		var keyframes = getTransformKeyframes(values)
		keyframes.transformOrigin = [this.transformOrigin, this.transformOrigin]
		addToWillChange(node, 'transform')
		this.schedule(node, keyframes, start, end)
	}

	scaleTo(node, origin, pivot = node, start = 0, end = 1) {
		var values = this.calculateScale(node, origin, pivot)
		var keyframes = getTransformKeyframes(values)
		keyframes.transformOrigin = [this.transformOrigin, this.transformOrigin]
		addToWillChange(node, 'transform')
		this.schedule(node, keyframes, start, end)
	}


	calculateTransformKeyframes(node, origin, pivot) {
		var values  = this.calculateScale(node, origin, pivot)
		var values2 = this.calculateTranslate(node, origin, pivot)
		console.log('tranform values')
		console.log(values)
		console.log(values2)
		values.translateX += values2.translateX
		values.translateY += values2.translateY
		var {translateX, translateY, scaleX, scaleY} = values
		return {
			transformOrigin: [this.transformOrigin, this.transformOrigin],
			transform: [
				`translate(0px, 0px) scale(1, 1)`,
				`translate(${translateX || 0}px, ${translateY || 0}px) scale(${scaleX || 1}, ${scaleY || 1})`,
			]
		}
	}

	calculateTranslate(node, origin, pivot) {
		var originBbox = origin.getBoundingClientRect()
		var pivotBbox = pivot.getBoundingClientRect()
		return {
			translateX: originBbox.left - pivotBbox.left,
			translateY: originBbox.top - pivotBbox.top,
		}
	}

	calculateScale(node, origin, pivot) {
		var nodeBbox   = node.getBoundingClientRect()
		var originBbox = origin.getBoundingClientRect()
		var pivotBbox  = pivot.getBoundingClientRect()
		var scaleX = originBbox.width  / pivotBbox.width
		var scaleY = originBbox.height / pivotBbox.height
		var translateX = (pivotBbox.left - nodeBbox.left) * (1 - scaleX)
		var translateY = (pivotBbox.top  - nodeBbox.top)  * (1 - scaleY)
		return {translateX, translateY, scaleX, scaleY}
	}



	clipTo(nodeToClip, pivot, start = 0, end = 1) {
		console.log('clipTo()')
		var nodeToClipBbox = nodeToClip.getBoundingClientRect()
		var pivotBbox = pivot.getBoundingClientRect()
		var parent = nodeToClip.offsetParent

		var clipTop    = pivotBbox.top  - nodeToClipBbox.top
		var clipLeft   = pivotBbox.left - nodeToClipBbox.left
		var clipRightEnd  = nodeToClip.offsetWidth  - clipLeft - pivotBbox.width
		var clipBottomEnd = nodeToClip.offsetHeight - clipTop  - pivotBbox.height

		if (parent) {
			// This prevents clipping the portion of the node that's not visible due to scroll.
			var clipBottomStart = Math.max(0, nodeToClip.offsetTop  + nodeToClipBbox.height - parent.offsetHeight)
			var clipRightStart  = Math.max(0, nodeToClip.offsetLeft + nodeToClipBbox.width  - parent.offsetWidth)
		} else {
			var clipBottomStart = 0
			var clipRightStart  = 0
		}

		var keyframes = {
			clipPath: [
				`inset(${0}px ${clipRightStart}px ${clipBottomStart}px ${0}px round 0px)`,
				`inset(${clipTop}px ${clipRightEnd}px ${clipBottomEnd}px ${clipLeft}px round 0px)`,
			]
		}

		this.schedule(nodeToClip, keyframes, start, end)
		addToWillChange(nodeToClip, 'clip-path')
	}

	clipFrom(nodeToClip, pivot, start = 0, end = 1) {
		console.log('clipTo()')
		var nodeToClipBbox = nodeToClip.getBoundingClientRect()
		var pivotBbox = pivot.getBoundingClientRect()
		var parent = nodeToClip.offsetParent

		var clipTop    = pivotBbox.top  - nodeToClipBbox.top
		var clipLeft   = pivotBbox.left - nodeToClipBbox.left
		var clipRightEnd  = nodeToClip.offsetWidth  - clipLeft - pivotBbox.width
		var clipBottomEnd = nodeToClip.offsetHeight - clipTop  - pivotBbox.height

		if (parent) {
			// This prevents clipping the portion of the node that's not visible due to scroll.
			var clipBottomStart = Math.max(0, nodeToClip.offsetTop  + nodeToClipBbox.height - parent.offsetHeight)
			var clipRightStart  = Math.max(0, nodeToClip.offsetLeft + nodeToClipBbox.width  - parent.offsetWidth)
		} else {
			var clipBottomStart = 0
			var clipRightStart  = 0
		}

		var keyframes = {
			clipPath: [
				`inset(${clipTop}px ${clipRightEnd}px ${clipBottomEnd}px ${clipLeft}px round 0px)`,
				`inset(${0}px ${clipRightStart}px ${clipBottomStart}px ${0}px round 0px)`,
			]
		}

		this.schedule(nodeToClip, keyframes, start, end)
		addToWillChange(nodeToClip, 'clip-path')
	}


	fadeOut(node, start = 0, end = 1) {
		var keyframes = {opacity: [1, 0]}
		this.schedule(node, keyframes, start, end)
	}

	fadeIn(node, start = 0, end = 1) {
		var keyframes = {opacity: [0, 1]}
		this.schedule(node, keyframes, start, end)
	}

	fade(node, startOpacity = 0, endOpacity = 1, start = 0, end = 1) {
		var keyframes = {opacity: [startOpacity, endOpacity]}
		this.schedule(node, keyframes, start, end)
	}

	elevate(node, startElevation = 0, endElevation = 4, start = 0, end = 1) {
		if (startElevation === 'none')
			startElevation = 0
		if (typeof startElevation === 'number')
			startElevation = `var(--elevation-${startElevation})`
		if (typeof endElevation === 'number')
			endElevation = `var(--elevation-${endElevation})`
		var keyframes = {boxShadow: [startElevation, endElevation]}
		this.schedule(node, keyframes, start, end)
	}



	async transitionTextNode(source, target) {
		var fromBbox = source.getBoundingClientRect()
		var toBbox = target.getBoundingClientRect()

		var fromComputed = window.getComputedStyle(source)
		var toComputed = window.getComputedStyle(target)

		var $clone = cloneNode(source)
		Object.assign($clone.style, {
			position: 'absolute',
			zIndex: 105,
			top: fromBbox.top + 'px',
			left: fromBbox.left + 'px',
		})
		document.body.appendChild($clone)

		source.style.visibility = 'hidden'
		target.style.visibility = 'hidden'

		var keyframes = {
			transformOrigin: ['top left', 'top left'],
			transform: [
				`translate(0, 0)`,
				`translate(${toBbox.left - fromBbox.left}px, ${toBbox.top - fromBbox.top}px)`,
			],
			color: [fromComputed.color, toComputed.color],
			fontSize: [fromComputed.fontSize, toComputed.fontSize],
			fontWeight: [fromComputed.fontWeight, toComputed.fontWeight],
			letterSpacing: [fromComputed.letterSpacing, toComputed.letterSpacing],
			//opacity: [0, 1],
		}

		source.style.visibility = 'hidden'
		target.style.visibility = 'hidden'

		this.schedule($clone, keyframes)

		// TODO: better implement this
		await this.finished
		console.log('remove text node')
		source.style.visibility = ''
		target.style.visibility = ''
		$clone.remove()

	}



}
