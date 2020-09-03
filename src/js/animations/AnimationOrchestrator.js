import './polyfill.js'
import {promiseTimeout} from './util.js'


export function reverseKeyframes(keyframes) {
	var output = {}
	for (let [key, values] of Object.entries(keyframes))
		output[key] = values.slice(0).reverse()
	return output
}

function sanitizeKeyframes(keyframes) {
	// Ensure the values are always in pair. If not, create pair of the same start and end value.
	for (let [key, values] of Object.entries(keyframes))
		if (!Array.isArray(values)) keyframes[key] = [values, values]
	return keyframes
}

/*
export function reverseKeyframes(keyframes) {
	var entries = Object
		.entries(keyframes)
		.filter(pair => Array.isArray(pair[1]))
		.map(reverseEntry)
	return objectFromEntries(entries)
}

function objectFromEntries(entries) {
	var output = {}
	for (let [key, values] of entries)
		output[key] = values
	return output
}

function reverseEntry([key, values]) {
	return [key, values.slice(0).reverse()]
}
*/
export class AnimationOrchestrator {

	duration = 150

	// promises of async actions needed before we can start animating
	// (for example waiting for image to load)	
	readyPromises = []
	// animation descriptions
	requests = []
	// actual animation instances
	animations = []

	// 'both' id combination of 'forwards' and 'backwards'.
	// 'forwards' keeps the end keyframe applied even after animation is over.
	// 'backwards' applies the first keyframe before the animation starts (in combination with delay).
	fill = 'both'
	// Default sine easing to make the animations more snappy and playful.
	easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)'

	constructor() {
		this.started = new Promise(resolve => this.startedResolve = resolve)
	}

	get finished() {
		return this.started.then(() => {
			var promises = this.animations.map(a => a.finished)
			return Promise.all(promises)
		})
	}

	get ready() {
		return Promise.all(this.readyPromises)
	}

	get running() {
		return this.animations.some(a => a.playState === 'running')
	}

	schedule(node, keyframes, start = 0, end = 1) {
		keyframes = sanitizeKeyframes(keyframes)
		this.requests.push({node, keyframes, start, end})
	}

	// todo: rename: createAnimationsFromRequests
	finalize(direction = 'normal', speed = 1) {
		let {easing, fill} = this
		let totalDuration = this.duration * speed
		if (this.animations.length > 0) {
			for (let animation of this.animations) {
				if (animation.playState === 'paused')
					animation.play()
			}
		}
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
		await this.playButDontCancel(...args)
		// Wrapping the cancellation in yet another delay (just till the end of current event loop)
		// to ensure that the owner can finalize the animations. e.g. hiding the element with dispay:none
		// before we cancel the 'fill' animation. Cancelling first could cause quick flash.
		await promiseTimeout(0)
		this.cancel()
	}

	async playButDontCancel(...args) {
		// Turn requests into Animation instances (and fill this.animations array).
		this.finalize(...args)
		if (this.readyPromises.length > 0) {
			this.pauseAll()
			await this.ready
			this.playAll()
		}
		// resolve this.started promise.
		this.startedResolve()
		// Wait till all animations finish playing.
		await this.finished
	}

	pauseAll() {
		for (let animation of this.animations) animation.pause()
	}

	playAll() {
		for (let animation of this.animations) animation.play()
	}

	cancel() {
		while (this.animations.length) {
			let animation = this.animations.pop()
			animation.cancel()
		}
	}

}
