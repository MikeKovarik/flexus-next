let body = document.body

export class SortableContainer {

	// x/horizontal, y/vertical, any/multi/grid
	direction = undefined

	constructor(node) {
		this.node = node
		this.setup()
	}

	setup() {
		this.setupItems()
		body.addEventListener('touchstart', this.onTouchStart)
		body.addEventListener('mousedown', this.onMouseDown)
	}

	destroy() {
		body.removeEventListener('touchstart', this.onTouchStart)
		body.removeEventListener('mousedown', this.onMouseDown)
	}

	setupDirection() {
		if (this.direction) return
	}

	setupItems() {
		this.items = Array.from(this.node.querySelectorAll('[draggable]'))
		if (this.items.length > 0) {
			this.type = 'explicit'
		} else {
			this.items = Array.from(this.node.children)
			this.items.forEach(item => this.setupItem(item))
			this.type = 'implicit'
		}
	}

	setupItem(itemNode) {
		itemNode.setAttribute('draggable', 'true')
		Object.assign(itemNode.style, {
			willChange: 'transform',
			touchAction: 'manipulation'
		})
	}

	// --------------------------------------
	// RAW EVENTS

	onTouchStart = e => {
		if (!this.isValidStartEvent(e)) return
		console.log('onTouchStart', e.target)
		e.preventDefault()
		body.addEventListener('touchmove', this.onTouchMove)
		body.addEventListener('touchend', this.onTouchEnd)
		this.onDragStart()
	}

	onTouchEnd = e => {
		body.removeEventListener('touchmove', this.onTouchMove)
		body.removeEventListener('touchend', this.onTouchEnd)
	}

	onMouseDown = e => {
		if (!this.isValidStartEvent(e)) return
		e.preventDefault()
		body.addEventListener('mousemove', this.onMouseMove)
		body.addEventListener('mouseup', this.onMouseUp)
		this.onDragStart()
	}

	onMouseUp = e => {
		body.removeEventListener('mousemove', this.onMouseMove)
		body.removeEventListener('mouseup', this.onMouseUp)
	}

	onTouchMove = e => {
		console.log('onTouchMove')
	}

	onMouseMove = e => {
		console.log('onMouseMove')
	}

	// --------------------------------------
	// ACTIONABLE

	onDragStart = e => {
	}

	onDragMove = e => {
	}

	onDragEnd = e => {
	}

	// --------------------------------------

	// todo: validate if event can start dragging (i.e. ignore second finger touch)
	isValidStartEvent(e) {
		if (e.type === 'touchstart' && e.touches.length > 1) return false
		return true
	}

	onResize() {
		// debounce
		// calculate item sizes
		// calculate gaps between items
	}

	onDragStart() {
		// copy current positions of visible elements
		// create ghost
	}

	onKeyDown = e => {
		//if (escape) cancel
	}

	cancel() {
		// restore positions
	}

}

export function traverse(startNode, condition) {
	var node = startNode
	while (node != null) {
		if (condition(node)) break
		node = node.parentElement
	}
	return node
}

export function isTouchEvent(e) {
	return e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents
		|| e.pointerType == 'touch'
}