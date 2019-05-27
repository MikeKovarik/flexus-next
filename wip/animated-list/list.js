const noop = () => {}

const VERTICAL = 1

function removeFromArray(array, item) {
	var index = array.indexOf(item)
	return array.splice(index, 1)
}

var curve = 'cubic-bezier(0.1, 0.9, 0.2, 1)'


function createAnimation(node, styles, options) {
	// Keeps nodes in their initial animation state despite possible delay
	if (!options.fill)
		options.fill = 'backwards'
	//options.fill = 'both'
	var animation = node.animate(styles, options)
	// the promise would keep throwing errors on cancelation
	animation.finished.catch(noop)
	// Set starting (inline) style and keep it until animation starts.
	// two reasons: animation could be delayed, or it's not but quick flash may appear
	// (when changing position to absolute, removing element, etc...)
	//setAnimationInitialState(node, styles)
	// apply and keep (inline) final style until it's removed (or canceled)
	//animation.onfinish = () => resetAnimationState(node, styles)
	// remove all inline styles on cancel
	//animation.oncancel = () => resetAnimationState(node, styles)
	return animation
}

class AnimationMap extends Map {

	set(node, animation) {
		super.set(node, animation)
		// remove animation from this list when it's done and catch any possible cancelation throws
		animation
			.finished
			.then(() => {
				console.log('translation done')
				this.delete(node)
				// for a good measure cancel the animation ()
				animation.cancel()
			})
			.catch(() => {
				this.delete(node)
			})
	}

	get finished() {
		var promises = []
		this.forEach(animation => promises.push(animation.finished))
		return Promise.all(promises)
	}

	get running() {
		for (var animation of this.values()) {
			if (animation.playState === 'running')
				return true
		}
		return false
	}

	cancel() {
		this.forEach(animation => {
			if (animation.playState === 'running')
				animation.cancel()
			else if (animation.oncancel)
				animation.oncancel()
		})
	}

}

function onScreenVisibility() {
	return true // todo
}






class FxList extends HTMLElement {

	connectedCallback() {
		this.setup()
	}

	disconnectedCallback() {
		this.destroy()
	}

	orientation = VERTICAL

	animationTimeModifier = 1

	translateAnimations = new AnimationMap

	setup() {
		this.updateVirtualList()
		this.observer = new MutationObserver(this.onMutation)
		this.observer.observe(this, {childList: true})

		//this.fadeOutPromises = Promise.resolve()
		//this.fadeInPromises = Promise.resolve()
		//this.movePromise = Promise.resolve()
	}

	destroy() {
		this.observer.disconnect()
	}

	onMutation = mutations => {

		var added   = this.postponedAdditions || []
		var removed = this.postponedRemovals  || []
		var moved   = this.postponedMoves     || []

		mutations.forEach(mutation => {
			if (mutation.removedNodes.length) {
				var node = mutation.removedNodes[0]
				// note: graceful removal is not differentiated at this point because we need
				// to know if this node is also added in the same tick (both removed and added mutations
				// in the same observations - which would mean the item was just moved and not removed)
				if (!node.wasRemovedForGood)
					removed.push(node)
			}
			if (mutation.addedNodes.length) {
				var node = mutation.addedNodes[0]
				if (node.isBeingReattachedForRemoval) {
					// The node was removed from DOM in last tick (forcibly, out of flexus-list lifecycle)
					// the removal was halted by reattaching the node back to DOM to be faded it out nicely.
					// That caused this mutation which we'll ignore since it is not actually a new item.
					node.isBeingReattachedForRemoval = false
					node.isBeingRemovedGracefuly = true
					removed.push(node)
				} else if (removed.includes(node)) {
					// The Node was both removed and added in the same tick (both mutations occured
					// in the same observation) which means it was repositioned withing DOM - moved.
					// We remove the node from removed array since it's not being faded out but retranslated
					removeFromArray(removed, node)
					moved.push(node)
				} else {
					// This is a new item (new element) freshly added to the list and needs to be faded in
					added.push(node)
				}
			}
		})

		var postponeAnimations = false

		// Now that nodes that only mode (were removed and then added again) are out of the way
		// we can handle removals and especially those that are ungraceful (directly removed from DOM)
		removed.forEach(node => {
			if (node.isBeingRemovedGracefuly)
				return
			postponeAnimations = true
			var lastIndex = this.items.indexOf(node)
			if (lastIndex > 0) {
				var previousItem = this.items[lastIndex - 1]
				// TODO - backtracking to find last present item in case multiple are deleted in a row
				if (this.contains(previousItem))
					previousItem.after(node)
			} else {
				this.prepend(node)
			}
			removeFromArray(removed, node)
			node.isBeingReattachedForRemoval = true
		})

		if (postponeAnimations) {
			this.postponedRemovals  = removed
			this.postponedMoves     = moved
			this.postponedAdditions = added
		} else {
			this.postponedRemovals  = undefined
			this.postponedMoves     = undefined
			this.postponedAdditions = undefined
			this.executeAnimations(removed, moved, added)
		}
	}

	resetFlowCalculations() {
		this.fadeOutDelay = 0
		this.translationDelay = 0
		this.fadeInDelay = 0

		//this.fadeInDuration = 120 * this.animationTimeModifier
		//this.fadeOutDuration = 120 * this.animationTimeModifier
		this.fadeOutDuration = 140 * this.animationTimeModifier
		this.translationDuration = 80 * this.animationTimeModifier
		this.fadeInDuration = 140 * this.animationTimeModifier

		this.xOffset = 0
		this.yOffset = 0
	}

	executeAnimations(removed, moved, added) {
		if (added.length === 0 && removed.length === 0 && moved.length === 0)
			return

		console.log('-------------------------------------------------------')
		console.log('- removed', removed)
		console.log('- moved', moved)
		console.log('- added', added)

		this.affectedNodes = []
		this.resetFlowCalculations()

		var oldOrder = this.items
		var newOrder = Array.from(this.children)

		// if there's more added items than removed (or vice versa)
		// all following items has to be shifted as well, whereas
		// equal ammounts allow for local edits (delimeted by min and max)
		var reflowUntilEnd = added.length !== removed.length
		// index of first modified item
		var min = newOrder.length
		// index of last modified item
		var max = reflowUntilEnd ? newOrder.length : 0

		var isRemovedWithin = () => {
			return removed.length > 1
				|| (removed.length === 1 && removed[0] !== this.lastElementChild)
		}
		var isAddedWithin = () => {
			return added.length > 1
				|| (added.length === 1 && added[0] !== this.lastElementChild)
		}

		var runningUnfinishedTranslation = this.translateAnimations.running
		console.log('runningUnfinishedTranslation', runningUnfinishedTranslation)

		// If item is removed from within the list (in other words: is not the last item)
		// all following items has to be translated into new positions, but we want to
		// delay that for a while to show beggining of fade-out animation of the removed item.
		if (isRemovedWithin())
			this.translationDelay = 60 * this.animationTimeModifier
		// Similarly if new item is added (elsewhere than at the end of the list)
		// we want to move out the other items (one of which is still at the position of new one)
		// before we start fading in the new item
		if (runningUnfinishedTranslation || moved.length || isRemovedWithin() || isAddedWithin())
			this.fadeInDelay = 60 * this.animationTimeModifier

		console.log('this.fadeInDelay', this.fadeInDelay)

		// TODO - newly added element should not be transitioned to the position
		//        it should already be there and just fade-in

		this.fadeOutPromises = removed.map(node => {
			node.isBeingRemoved = true
			node.style.position = 'absolute'
			var index = oldOrder.indexOf(node)
			min = Math.min(min, index)
			max = Math.max(max, index)
			var isVisible = onScreenVisibility(node) // TODO
			var animation = createAnimation(node, {
				opacity: [1, 0]
			}, {
				delay: this.fadeOutDelay,
				duration: this.fadeOutDuration,
				//easing: curve
				fill: 'both',
			})
			return animation
				.finished
				.then(() => {
					node.style.position = ''
					node.isBeingRemoved = undefined
					node.wasRemovedForGood = true
					node.remove()
				})
				.catch(noop)
		})
		this.fadeInPromises = added.map(node => {
			node.isBeingAdded = true
			var index = newOrder.indexOf(node)
			min = Math.min(min, index)
			console.log('fading in', node, this.fadeInDelay)
			max = Math.max(max, index)
			var isVisible = onScreenVisibility(node) // TODO
			var animation = createAnimation(node, {
				opacity: [0, 1]
			}, {
				delay: this.fadeInDelay,
				duration: this.fadeInDuration,
				//easing: curve
				fill: 'backwards',
			})
			return animation
				.finished
				.then(() => {
					node.isBeingAdded = undefined
				})
				.catch(noop)
		})

		if (min < max) {
			this.affectedNodes = newOrder
				.slice(min)
				.filter(onScreenVisibility)
		}

		if (this.affectedNodes.length) {
			this.reflowPhase()
			this.fadePromises = [...this.fadeOutPromises, ...this.fadeInPromises]
			this.fadeAnimationsReady = Promise.all(this.fadePromises)
			this.fadeAnimationsReady.then(() => {
				console.log('all done')
				// TODO: cancel all fade animations for a good measure
				// (especially fade-out in case the element might be reattached)
				this.translateAnimations.cancel()
				this.updateVirtualList()
			})
		} else {
			this.fadeAnimationsReady = Promise.resolve()
		}
	}

	reflowPhase() {
		this.xOffset = 0
		this.yOffset = 0
		this.affectedNodes.forEach(node => {
			// TODO: mix this with running translation animation detection
			var animation = this.translateItem(node, this.xOffset, this.yOffset)
			if (!node.dontCountToFlow) {
				if (node.isBeingAdded) {
					node.dontCountToFlow = true
					this.increaseFlowOffset(node, -1)
				}
				if (node.isBeingRemoved) {
					node.dontCountToFlow = true
					this.increaseFlowOffset(node, 1)
				}
			}
			return animation
		})
	}

	increaseFlowOffset(node, modifier = 1) {
		if (this.orientation === VERTICAL) {
			this.yOffset += node.offsetHeight * modifier
		} else {
			this.xOffset += node.offsetWidth * modifier
		}
		//console.log('increaseFlowOffset', this.yOffset, this.xOffset)
	}

	translateItem(node, x, y) {
		console.log('translate', y, x)
		// get node's currently running translation animation and cancel it if there's any
		var animation = this.translateAnimations.get(node)
		if (animation) {
			// move this to reflow phase and leave this to only initiate new transtiions
			if (animation.playState === 'running') {
				//console.log('TODO get position and use it as starting point instead of x and y')
				var computed = animation.effect.getComputedTiming()
				//console.log('currently running animation', computed.progress, '|', computed)
				var yOffsetedByDomChange = animation.initialTop - node.offsetTop
				var yUnfinishedTranslation = animation.y * (1-computed.progress)
				//console.log(yOffsetedByDomChange, yOffsetedByDomChange * (1-computed.progress))
				y = yUnfinishedTranslation + yOffsetedByDomChange
			}
			animation.cancel()
		}
		// translation always starts from original position and goes to 0 because at the beggining
		// of the animation, the element is already in the DOM in it's correct order (and thus position)
		if (x === 0 && y === 0) return
		var styles = {
			transform: [`translate(${x}px, ${y}px)`, `translate(0px, 0px)`]
		}
		if (node.isBeingAdded) return

		var delay = this.translationDelay
		var duration = this.translationDuration
		console.log('translateItem', node, styles.transform[0], styles.transform[1])
		//this.translateAnimations.create(node, styles, {
		animation = createAnimation(node, styles, {
			delay: this.translationDelay,
			duration: this.translationDuration,
			//easing: curve,
		})
		animation.initialLeft = node.offsetLeft
		animation.initialTop = node.offsetTop
		animation.y = y
		this.translateAnimations.set(node, animation)
	}

	updateVirtualList() {
		this.items = Array.from(this.children)
	}

}

customElements.define('fx-list', FxList)