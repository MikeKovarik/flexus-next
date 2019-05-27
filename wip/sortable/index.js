let body = document.body

class DragItem {

	constructor(node, index) {
		this.node = node
		this.index = index

		this.node.setAttribute('draggable', 'true')
		Object.assign(this.node.style, {
			willChange: 'transform',
			touchAction: 'none' // necessary for pointermove to work https://stackoverflow.com/questions/48124372/pointermove-event-not-working-with-touch-why-not
		})
	}

	calculatePosition() {
		let bbox = this.node.getBoundingClientRect()
		this.left = bbox.left
		this.right = bbox.right
		this.bottom = bbox.bottom
		this.top = bbox.top
		this.width = bbox.width
		this.height = bbox.height
		this.centerX = bbox.left + (bbox.width / 2)
		this.centerY = bbox.top + (bbox.height / 2)
	}

	dragStarted() {
		this.node.classList.add('dragging')
		this.node.style.zIndex = 99999
		this.node.style.position = 'relative'
	}

	dragEnded() {
		this.node.classList.remove('dragging')
		// todo: restore original values
		this.node.style.zIndex = ''
		this.node.style.position = ''
	}

	get dragging() {
		return this._dragging
	}
	set dragging(newValue) {
		if (this._dragging === newValue) return
		this._dragging = newValue
		if (newValue)
			this.dragStarted()
		else
			this.dragEnded()
	}

	get candidate() {
		return this._candidate
	}
	set candidate(newValue) {
		if (this._candidate === newValue) return
		this._candidate = newValue
		if (newValue)
			this.node.classList.add('candidate')
		else
			this.node.classList.remove('candidate')
	}

}

export class SortableContainer {

	// x/horizontal, y/vertical, any/multi/grid
	direction = undefined

	constructor(containerNode) {
		this.containerNode = containerNode
		this.setup()
	}

	setup() {
		this.setupItems()
		body.addEventListener('pointerdown', this.onPointerDown)
	}

	destroy() {
		body.removeEventListener('pointerdown', this.onPointerDown)
	}

	setupDirection() {
		if (this.direction) return
	}

	setupItems() {
		let nodes = Array.from(this.containerNode.querySelectorAll('[draggable]'))
		if (nodes.length > 0) {
			this.type = 'explicit'
		} else {
			nodes = Array.from(this.containerNode.children)
			this.type = 'implicit'
		}
		this.items = nodes.map((node, index) => new DragItem(node, index))
	}

	// --------------------------------------
	// RAW EVENTS

	fingers = 0

	onPointerDown = e => {
		if (isTouchEvent(e)) this.fingers++
		// the container is touched, no event inside
		if (e.path[0] === this.containerNode) return
		// prevent multi finger touch gestures. or maybe enable two items dragging at the same time??? 
		if (this.fingers > 1) return
		e.preventDefault()
		e.stopPropagation()
		body.addEventListener('pointermove', this.onPointerMove)
		body.addEventListener('pointerup', this.onPointerUp)
		this.onDragStart(e)
	}

	onPointerUp = e => {
		body.removeEventListener('pointermove', this.onPointerMove)
		body.removeEventListener('pointerup', this.onPointerUp)
		this.onDragEnd(e)
		if (isTouchEvent(e)) this.fingers--
	}

	onPointerMove = e => {
		e.preventDefault()
		this.onDragMove(e)
	}

	calculatePositions() {
		for (let item of this.items)
			item.calculatePosition()
	}

	// --------------------------------------
	// ACTIONABLE

	onDragStart = e => {
		console.log('onDragStart', this.items.length)
		this.calculatePositions()
		this.initX = e.x
		this.initY = e.y
		let path = Array.from(e.path)
		this.draggedItem = this.items.find(item => path.includes(item.node))
		this.draggedItem.dragging = true
	}

	onDragEnd = e => {
		console.log('onDragEnd')
		this.initX = undefined
		this.initY = undefined
		this.draggedItem.node.style.transform = `translate(0px, 0px)`
		this.draggedItem.dragging = false
		this.draggedItem = undefined
		this.items.forEach(item => item.candidate = false)
	}

	onDragMove = e => {
		let diffX = e.x - this.initX
		let diffY = e.y - this.initY
		let {left, right, top, bottom, centerX, centerY} = this.draggedItem
		left  += diffX
		right += diffX
		top    += diffY
		bottom += diffY
		this.draggedItem.node.style.transform = `translate(${diffX}px, ${diffY}px)`
		this.items.forEach(item => item.candidate = false)

		let toLeft = this.items
			.filter(item => item !== this.draggedItem)
			.filter(item => item.left < left && left < item.right)
			.filter(item => item.top < centerY && centerY < item.bottom)
		let toRight = this.items
			.filter(item => item !== this.draggedItem)
			.filter(item => item.left < right && right < item.right)
			.filter(item => item.top < centerY && centerY < item.bottom)

		let above = this.items
			.filter(item => item !== this.draggedItem)
			.filter(item => item.top < top && top < item.bottom)
			.filter(item => item.left < centerX && centerX < item.right)
		let below = this.items
			.filter(item => item !== this.draggedItem)
			.filter(item => item.top < bottom && bottom < item.bottom)
			.filter(item => item.left < centerX && centerX < item.right)

		toLeft.forEach(item => item.candidate = true)
		toRight.forEach(item => item.candidate = true)
		above.forEach(item => item.candidate = true)
		below.forEach(item => item.candidate = true)

		console.log(toLeft, toRight, above, below)

		/*
		let foo = item => {
			return (item.left < left && left < item.right)
				|| (item.left < right && right < item.right)
		}
		this.items
			.filter(item => item !== this.draggedItem)
			.filter(foo)
			.forEach(item => item.candidate = true)
		*/
	}

	// --------------------------------------

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

export function isTouchEvent(e) {
	return e.pointerType == 'touch'
		|| e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents
}