import {AnimationOrchestrator, reverseKeyframes} from './AnimationOrchestrator.js'
import {normalSpeedMultiplier, reversedSpeedMultiplier} from './AnimationOrchestrator.js'
//import {ImageTransition} from './ImageTransition.js'
import {pair, cloneNode, camelToKebabCase} from './util.js'

import {ImageTransition} from '../../../../image-transition/src/ImageTransition.js'
//const ImageTransition = undefined // this was moved to separate package


// TODO: merge this with ViewTransition's z-index constants
// TODO: make separate container (as a direct child of body) for all cloned items
export const ZINDEX_CLONE_OVERLAY_CONTAINER = 105 // used by optional container for cloned nodes
export const ZINDEX_CLONE_OVERLAY_IMAGES = 106
export const ZINDEX_CLONE_OVERLAY_TEXT = 107

let cloneContainer = document.createElement('div')
Object.assign(cloneContainer.style, {
	position: 'absolute',
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
	zIndex: ZINDEX_CLONE_OVERLAY_CONTAINER,
	pointerEvents: 'none'
})
document.body.prepend(cloneContainer)


export class Transition extends AnimationOrchestrator {

	finalize(...args) {
		// Read all keyframes and collect names of propeties we'll be animating.
		// Assign these properties to 'will-change' which is necessary for performant
		// and GPU accelerated animations.
		// NOTE: will-change replaces having to use translate3d() instead of translate().
		// TODO: check for computed values of 'will-change' (but not if it compromises performance)
		for (let {node, keyframes} of this.requests) {
			let willChange = node.style.willChange
			for (let camelCase of Object.keys(keyframes)) {
				let kebabCase = camelToKebabCase(camelCase)
				if (willChange.includes(kebabCase)) continue
				willChange = willChange ? `${willChange}, ${kebabCase}` : kebabCase
			}
			node.style.willChange = willChange
		}
		super.finalize(...args)
	}

	// PLAYBACK

	in() {
		return this.play('normal', normalSpeedMultiplier)
	}

	out() {
		return this.play('reverse', reversedSpeedMultiplier)
	}

	// CALCULATIONS

	calculateResizeKeyframes(source, target) {
		return this.calculateDiffKeyframes(source, target, ['top', 'left', 'width', 'height'])
	}

	// Some transitions need unchanged properties (both start and end values are the same)
	// to be present in the keyframes. Often used for styles only applied during animation.
	// Therefore removeUnchanged should be always false. But is configurable.
	calculateDiffKeyframes(source, target, properties = [], removeUnchanged = false) {
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
					// TODO: disable this if using box-shadow (??? and overflow:hidden ???)
					keyframes.clipPath = [
						`inset(0px 0px 0px 0px round ${sourceComputed.borderRadius})`,
						`inset(0px 0px 0px 0px round ${targetComputed.borderRadius})`
					]
				} else {
					keyframes[prop] = [sourceComputed[prop], targetComputed[prop]]
				}
			}
			if (removeUnchanged) {
				let [val1, val2] = keyframes[prop]
				if (val1 === val2) delete keyframes[prop]
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
		var keyframes = this.calculateTransformKeyframes(node, origin, pivot)
		this.schedule(node, keyframes, start, end)
	}

	transformFrom(node, origin, pivot = node, start = 0, end = 1) {
		var keyframes = this.calculateTransformKeyframes(node, origin, pivot)
		keyframes = reverseKeyframes(keyframes)
		this.schedule(node, keyframes, start, end)
	}

	translateTo(node, origin, pivot = node, start = 0, end = 1) {
		var values = this.calculateTranslate(node, origin, pivot)
		var keyframes = getTransformKeyframes(values)
		keyframes.transformOrigin = pair('top left')
		this.schedule(node, keyframes, start, end)
	}

	scaleTo(node, origin, pivot = node, start = 0, end = 1) {
		var values = this.calculateScale(node, origin, pivot)
		var keyframes = getTransformKeyframes(values)
		keyframes.transformOrigin = pair('top left')
		this.schedule(node, keyframes, start, end)
	}


	calculateTransformKeyframes(node, origin, pivot) {
		var values  = this.calculateScale(node, origin, pivot)
		var values2 = this.calculateTranslate(node, origin, pivot)
		values.translateX += values2.translateX
		values.translateY += values2.translateY
		var {translateX, translateY, scaleX, scaleY} = values
		return {
			transformOrigin: pair('top left'),
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
	}

	clipFrom(nodeToClip, pivot, start = 0, end = 1) {
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
	}

	// sugar api

	scaleOut(node, start = 0, end = 1) {
		var keyframes = {transform: ['scale(1)', 'scale(0)']}
		this.schedule(node, keyframes, start, end)
	}

	scaleIn(node, start = 0, end = 1) {
		var keyframes = {transform: ['scale(0)', 'scale(1)']}
		this.schedule(node, keyframes, start, end)
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



	transitionNodes(source, target) {
		if (ImageTransition && ImageTransition.canTransition(source, target)) {
			this.transitionImageNodes(source, target)
		} else {
			this.transitionTextNodes(source, target)
		}
	}

	async transitionImageNodes(source, target) {
		// TODO: this needs to be scheduled and integrated into AnimationOrchestrator API.
		// TODO: set adjacentNode from here to be newView. because the view can be faded as whole
		// (do similar approach to transitionTextNode)
		// TODO: implement reverse animation
		console.log('------- transitionImageNodes -------')
		console.warn('transitionImageNodes not yet fully implemented')
		if (ImageTransition === undefined) return console.warn(`ImageTransition is not loaded, image animations won't work`)
		let options = {
			duration: this.duration,
			mode: 'clone',
			cloneZindex: ZINDEX_CLONE_OVERLAY_IMAGES,
			cloneContainer,
		}
		var transition = new ImageTransition(source, target, options)
		this.readyPromises.push(transition.ready)
		await transition.ready
		let animation = transition.createAnimation()
		animation.pause()
		this.animations.push(animation)
	}

	// TODO: be able to fade both views in/out while the transitioning text is cloned and out of the fading elements
	async transitionTextNodes(source, target, nodeToAnimate = 'clone') {
		var fromBbox = source.getBoundingClientRect()
		var toBbox = target.getBoundingClientRect()

		let shouldClone = nodeToAnimate === 'clone'
		let clone
		if (shouldClone) {
			clone = cloneNode(source)
			Object.assign(clone.style, {
				position: 'absolute',
				zIndex: ZINDEX_CLONE_OVERLAY_TEXT,
				top: fromBbox.top + 'px',
				left: fromBbox.left + 'px',
			})
			if (localStorage.debugAnimations === 'true') clone.style.outline = '1px solid red'
			cloneContainer.appendChild(clone)
			//this.newView.appendChild(clone)
		}

		source.style.visibility = 'hidden'
		target.style.visibility = 'hidden'

		var props = ['color', 'fontSize', 'fontWeight', 'letterSpacing', 'opacity']
		var keyframes = this.calculateDiffKeyframes(source, target, props)
		keyframes.transformOrigin = ['top left', 'top left']
		var translateX = toBbox.left - fromBbox.left
		var translateY = toBbox.top - fromBbox.top

		// NOTE: 5px is a safeguard around start/end of the animation becase
		// things like font-weight can jump-change the layour and cause text
		// to break into multiple lines (repeatedly and cause jitter) 
		keyframes.width = [
			(source.offsetWidth + 5) + 'px',
			(target.offsetWidth + 5) + 'px'
		]

		keyframes.transform = [
			`translate(0, 0) ` + (source.style.transform || ''),
			`translate(${translateX}px, ${translateY}px) ` + (target.style.transform || ''),
		]

		// TODO: use this for distance based duration calculations
		// e.g. the more pixels to travel, the more time it should animate.
		//var distance = getTravelDistance(translateX, translateY)

		source.style.visibility = 'hidden'
		target.style.visibility = 'hidden'

		if (shouldClone)
			this.schedule(clone, keyframes)

		// TODO: implement this 
		await this.finished
		if (shouldClone) {
			console.log('hiding clone text')
			source.style.visibility = ''
			target.style.visibility = ''
			clone.remove()
		}

	}



}

function getTravelDistance(translateX, translateY) {
	return Math.sqrt(Math.abs(translateX) ** 2 + Math.abs(translateY) ** 2)
}