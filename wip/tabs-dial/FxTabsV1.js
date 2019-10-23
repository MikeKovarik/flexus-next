import FxComponent from '../FxComponentV1.js'

function inRange(min, val, max) {
	return min < val && val < max
}

class FxTabs extends FxComponent {

	rafPending = false
	lastEvent

	constructor(...args) {
		super(...args)
		this.setupDial()
	}

	setupDial() {
		let children = Array.from(this.children)
		let offsetLeft = children[0].offsetWidth / 2
		let offsetRight = children[children.length - 1].offsetWidth / 2
		this.style.setProperty('--offset-left', offsetLeft + 'px')
		this.style.setProperty('--offset-right', offsetRight + 'px')

		let bboxes = children.map(node => node.getBoundingClientRect())
		let compLeft = bboxes[0].left + offsetLeft
		this.itemBounds = bboxes.map(({left, right}) => ({left: left - compLeft, right: right - compLeft}))
		this.scrollStops = this.itemBounds.map(({left, right}) => Math.round(left + (right - left) / 2))

		this.addEventListener('scroll', this.onScrollRaw, {passive: true})

		setTimeout(() => {
			this.scrollToItem(3)
		}, 700)

		let passive = {passive: true}
		this.addEventListener('touchstart', this.onTouchStart, passive)
		this.addEventListener('touchend', this.onTouchEnd, passive)

		children.forEach((node, i) => node.addEventListener('click', e => this.scrollToItem(i)))

		//this.scrollToItem(this.querySelector('[selected]'))
		/*
		let prevent = true
		this.ro = new ResizeObserver(() => {
			// ResizeObserver will trigger calculateCollapsibleHeight in next tick
			// it's not immediately so we can't rely on it and have to trigger it ourselves right away
			// but then we have to cancel this first observer triggered call.
			if (prevent) return prevent = false
		})
		this.ro.observe(this)
		*/
	}

	onScrollRaw = e => {
		this.lastEvent = e
		if (!this.rafPending) {
			this.rafPending = true
			requestAnimationFrame(this.onScroll)
		}
	}

	onScroll = () => {
		this.rafPending = false
		let scroll = this.lastEvent.target.scrollLeft
		let index = this.itemBounds.map(bbox => inRange(bbox.left, scroll, bbox.right)).indexOf(true)
		if (this.selectedIndex !== index) {
			this._selectIndex(index)
		}

		this.isInertiaScrolling = true
		clearTimeout(this.inertiaScrollTimeout)
		this.inertiaScrollTimeout = setTimeout(this.onScrollTimeout, 200)
	}

	onScrollTimeout = () => {
		this.isInertiaScrolling = false
		if (!this.isScrolling) this.scrollToItem(this.selectedIndex)
	}

	get isScrolling() {
		return this.isInertiaScrolling
			|| this.isDragScrolling
	}

	onTouchStart = e => {
		this.isDragScrolling = true
	}

	onTouchEnd = e => {
		this.isDragScrolling = false
		// todo: account for inertia
		if (!this.isScrolling) this.scrollToItem(this.selectedIndex)
	}

	_selectItem(node, foo = true) {
		if (foo) this._deselect()
		this.selectedNode = node
		this.selectedIndex = Array.from(this.children).indexOf(this.selectedNode)
		if (foo) this._select()
	}

	_selectIndex(index, foo = true) {
		if (foo) this._deselect()
		this.selectedIndex = index
		this.selectedNode = this.children[index]
		if (foo) this._select()
	}

	_deselect() {
		if (this.selectedNode) this.selectedNode.removeAttribute('selected')
	}

	_select() {
		if (this.selectedNode) this.selectedNode.setAttribute('selected', '')
	}

	scrollToItem(index) {
		this._selectIndex(index, false)
		let left = this.scrollStops[this.selectedIndex]
		this.scrollTo({
			left,
			behavior: 'smooth'
		})
	}

	disconnectedCallback() {
	}

}

//customElements.define('fx-tabs', FxTabs)
customElements.define('flexus-tabs', FxTabs)