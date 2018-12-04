import {rafThrottle} from './utils.js'
import { Dirent } from 'fs';


function remove(array, item) {
	var index = array.indexOf(item)
	if (index !== -1)
		array.splice(index, 1)
}

const HORIZONTAL = 1
const VERTICAL = 2

export let Scrollable = SuperClass => class extends SuperClass {

	scrollTarget = undefined
	scrollListeners = []

	scrolledToStart = true
	scrolledToEnd = true

	direction = VERTICAL

	//@once('ready')
	setupScrollable(target = this.scrollTarget) {
		// merge local and preexisting scroll listeners in case scrollTarget is shared
		// between multiple consumers
		// WARNING: it is necessary to share single scrollListeners array by reference
		//          with everyone listening to the same scrollTarget
		var listeners = target.scrollListeners = target.scrollListeners || []
		listeners.push(...this.scrollListeners)
		this.scrollListeners = listeners
		// some scrollable elements need to update their touch-action in combination with Draggable
		listeners.push(this.updateScrollState)

		if (this.isContentScrollable) {
			this.updateScrollState()
			this.applyTouchAction()
		} else {
			this.scrolledToStart = true
			this.scrolledToEnd = true
		}

		this.nativeScrollListener = rafThrottle(() => {
			var scrollPosition = this.scrollPosition
			for (var i = 0; i < listeners.length; i++)
				listeners[i](scrollPosition)
		})
		this.startScrollListening()
	}

	startScrollListening() {
		if (this.scrollListeners.length === 0) return
		var {scrollTarget} = this
		if (scrollTarget.watchingScroll) return
		scrollTarget.addEventListener('scroll', this.nativeScrollListener, {passive: true})
		scrollTarget.watchingScroll = true
	}
	endScrollListening() {
		if (this.scrollListeners.length > 0) return
		var {scrollTarget} = this
		if (!scrollTarget.watchingScroll) return
		scrollTarget.removeEventListener('scroll', this.nativeScrollListener)
		scrollTarget.watchingScroll = false
	}

	addScrollListeners(listener) {
		this.scrollListeners.push(listener)
		this.startScrollListening()
	}
	removeScrollListeners(listener) {
		remove(this.scrollListeners, listener)
		this.endScrollListening()
	}

	@autobind
    updateScrollState(scrollPosition = this.scrollPosition) {
		if (scrollPosition <= 0) {
			if (this.scrolledToStart === false) {
				this.scrolledToStart = true
				this.scrolledToEnd = false
				this.emit('scrolled-to-start')
			}
		} else if (scrollPosition >= this.maxScrollable) {
			if (this.scrolledToStart === true) {
				this.scrolledToStart = false
				this.scrolledToEnd = true
				this.emit('scrolled-to-start')
			}
		} else {
			if (this.scrolledToStart || this.scrolledToEnd) {
				this.scrolledToStart = false
				this.scrolledToEnd = false
				this.emit('scrolled-to-content')
			}
		}
	}

	@observe('scrolledToStart', 'scrolledToEnd')
	applyTouchAction() {
		if (this.scrolledToStart && this.scrolledToEnd)
			this.scrollTarget.style.touchAction = 'none'
		else if (this.scrolledToStart)
			this.scrollTarget.style.touchAction = 'pan-down'
		else if (this.scrolledToEnd)
			this.scrollTarget.style.touchAction = 'pan-up'
		else
			this.scrollTarget.style.touchAction = 'pan-y'
	}

	get scrollPosition() {
		if (this.direction === VERTICAL)
			return Math.round(this.scrollTarget.scrollTop)
		else
			return Math.round(this.scrollTarget.scrollLeft)
	}

	// return true if content of scrolltarget is taller than whats visible
	get isContentScrollable() {
		var {scrollTarget} = this
		return scrollTarget.scrollHeight !== scrollTarget.offsetHeight
	}

	get maxScrollable() {
		var {scrollTarget} = this
		return scrollTarget.scrollHeight - scrollTarget.offsetHeight
	}

}

