import './polyfill.js'
import {promiseTimeout} from './util.js'


function reverseKeyframes(keyframes) {
	var entries = Object
		.entries(keyframes)
		.filter(pair => Array.isArray(pair[1]))
		.map(reverseEntry)
	return objectFromEntries(entries)
}

function reverseEntry(entry) {
	return [entry[0], entry[1].reverse()]
}

export class AnimationOrchestrator {
	
	constructor() {
		this.requests = []
		this.animations = []
		this.duration = 150
		// 'both' id combination of 'forwards' and 'backwards'.
		// 'forwards' keeps the end keyframe applied even after animation is over.
		// 'backwards' applies the first keyframe before the animation starts (in combination with delay).
		this.fill = 'both'
		// Default sine easing to make the animations more snappy and playful.
		this.easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)'

		this.started = new Promise(resolve => this.startedResolve = resolve)
	}

	get finished() {
		return this.started.then(() => {
			var promises = this.animations.map(a => a.finished)
			return Promise.all(promises)
		})
	}

	get running() {
		return this.animations.some(a => a.playState === 'running')
	}

	schedule(node, keyframes, start = 0, end = 1) {
		this.requests.push({node, keyframes, start, end})
	}

	finalize(direction = 'normal', speed = 1) {
		let {easing, fill} = this
		let totalDuration = this.duration * speed
		for (let {node, keyframes, start, end} of this.requests) {
			let duration = (end - start) * totalDuration
			let delay = 0
			if (direction === 'normal') {
				delay = start * totalDuration
			} else {
				delay = (1 - end) * totalDuration
				// Reversing values manually because 'direction' is unreliable and causes problems with delays.
				keyframes = reverseKeyframes(keyframes)
			}
			let options = {delay, duration, easing, fill}
			let animation = node.animate(keyframes, options)
			this.animations.push(animation)
		}
	}

	async play(...args) {
		await this.playOnly(...args)
		// Wrapping the cancellation in yet another delay (just till the end of current event loop)
		// to ensure that the owner can finalize the animations. e.g. hiding the element with dispay:none
		// before we cancel the 'fill' animation. Cancelling first could cause quick flash.
		await promiseTimeout()
		this.cancel()
	}

	async playOnly(...args) {
		// Turn requests into Animation instances (and fill this.animations array).
		this.finalize(...args)
		// resolve this.started promise.
		this.startedResolve()
		// Wait till all animations finish playing.
		await this.finished
	}

	cancel() {
		while (this.animations.length) {
			let animation = this.animations.pop()
			if (animation.playState === 'running')
				animation.cancel()
		}
	}


}
