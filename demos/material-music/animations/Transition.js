import {AnimationOrchestrator} from './AnimationOrchestrator.js'
import {cloneNode, highlight} from './util.js'


function calculateTransform(translateX, translateY, scaleX, scaleY) {
	var temp = `translate(${translateX}px, ${translateY}px)`
	if (scaleX !== undefined && scaleY !== undefined)
		temp += ` scale(${scaleX}, ${scaleY})`
	return temp
}
function getTransformKeyframes(translateX, translateY, scaleX, scaleY) {
	return {
		transform: [
			`translate(0px, 0px) scale(1, 1)`,
			calculateTransform(translateX, translateY, scaleX, scaleY)
		]
	}
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

	calculateResizeKeyframes(from, to) {
		var fromBbox = from.getBoundingClientRect()
		var toBbox = to.getBoundingClientRect()
		return {
			top:    [fromBbox.top + 'px',    toBbox.top + 'px'],
			left:   [fromBbox.left + 'px',   toBbox.left + 'px'],
			width:  [fromBbox.width + 'px',  toBbox.width + 'px'],
			height: [fromBbox.height + 'px', toBbox.height + 'px'],
			//borderRadius: [this.originComputed.borderRadius, this.newComputed.borderRadius],
			//clipPath: [`inset(0px 0px 0px 0px round ${this.newComputed.borderRadius})`, 'inset(0px 0px 0px 0px round 0px)']
		}
	}

	_translateTo(node, origin, pivot) {
		var originBbox = origin.getBoundingClientRect()
		var pivotBbox = pivot.getBoundingClientRect()

		var translateX = originBbox.left - pivotBbox.left
		var translateY = originBbox.top - pivotBbox.top

		return {translateX, translateY}
	}

	_scaleTo(node, origin, pivot) {
		var nodeBbox   = node.getBoundingClientRect()
		var originBbox = origin.getBoundingClientRect()
		var pivotBbox  = pivot.getBoundingClientRect()

		var scaleX = originBbox.width  / pivotBbox.width
		var scaleY = originBbox.height / pivotBbox.height
		var translateX = (pivotBbox.left - nodeBbox.left) * (1 - scaleX)
		var translateY = (pivotBbox.top  - nodeBbox.top)  * (1 - scaleY)
/*
		if (this.transformOrigin) {
			if (neco == 'left') {
				var translateX = (pivotBbox.left - nodeBbox.left) * (1 - scaleX)
			} else if (neco === 'ight') {
				var translateX = (pivotBbox.right - nodeBbox.right) * (1 - scaleX)
			}
			// TODO: dodelat
		}
*/
		return {translateX, translateY, scaleX, scaleY}
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
		var {translateX, translateY, scaleX, scaleY} = this._scaleTo(node, origin, pivot)
		var temp = this._translateTo(node, origin, pivot)
		translateX += temp.translateX
		translateY += temp.translateY
		var keyframes = getTransformKeyframes(translateX, translateY, scaleX, scaleY)
		keyframes.transformOrigin = [this.transformOrigin, this.transformOrigin]
		this.schedule(node, keyframes, start, end)
	}

	translateTo(node, origin, pivot = node, start = 0, end = 1) {
		var {translateX, translateY} = this._translateTo(node, origin, pivot)
		var keyframes = getTransformKeyframes(translateX, translateY)
		keyframes.transformOrigin = [this.transformOrigin, this.transformOrigin]
		this.schedule(node, keyframes, start, end)
	}

	scaleTo(node, origin, pivot = node, start = 0, end = 1) {
		var {translateX, translateY, scaleX, scaleY} = this._scaleTo(node, origin, pivot)
		var keyframes = getTransformKeyframes(translateX, translateY, scaleX, scaleY)
		keyframes.transformOrigin = [this.transformOrigin, this.transformOrigin]
		//keyframes.transformOrigin = ['left top', 'left top']
		this.schedule(node, keyframes, start, end)
	}

	clipTo(view, origin, start = 0, end = 1) {
		var viewBbox = view.getBoundingClientRect()
		var originBbox = origin.getBoundingClientRect()

		var clipTop    = originBbox.top - viewBbox.top
		var clipRight  = viewBbox.right - originBbox.right
		var clipBottom = viewBbox.height - originBbox.bottom
		var clipLeft   = originBbox.left - viewBbox.left

		console.log('clipLeft', clipLeft)
		console.log('clipTop', clipTop)
		console.log('clipBottom', clipBottom)

		var keyframes = {
			clipPath: [
				`inset(0px 0px 0px 0px round 0px)`,
				`inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px round 0px)`,
			]
		}

		this.schedule(view, keyframes, start, end)
	}


	fadeOut(node, start = 0, end = 1) {
		//var keyframes = this.getKeyframes(node)
		var keyframes = {
			opacity: [1, 0]
		}
		this.schedule(node, keyframes, start, end)
	}

	fadeIn(node, start = 0, end = 1) {
		//var keyframes = this.getKeyframes(node)
		var keyframes = {
			opacity: [0, 1]
		}
		this.schedule(node, keyframes, start, end)
	}



	async transitionTextNode($from, $to) {
		var fromBbox = $from.getBoundingClientRect()
		var toBbox = $to.getBoundingClientRect()

		var fromComputed = window.getComputedStyle($from)
		var toComputed = window.getComputedStyle($to)

		var $clone = cloneNode($from)
		Object.assign($clone.style, {
			position: 'absolute',
			zIndex: 105,
			top: fromBbox.top + 'px',
			left: fromBbox.left + 'px',
		})
		document.body.appendChild($clone)

		$from.style.visibility = 'hidden'
		$to.style.visibility = 'hidden'

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

		$from.style.visibility = 'hidden'
		$to.style.visibility = 'hidden'

		this.schedule($clone, keyframes)

		// TODO: better implement this
		await this.finished
		console.log('remove text node')
		$from.style.visibility = ''
		$to.style.visibility = ''
		$clone.remove()

	}



}
