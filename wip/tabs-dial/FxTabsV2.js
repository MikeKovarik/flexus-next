import FxComponent from '../FxComponentV2.js'


function inRange(min, val, max) {
	return min < val && val < max
}

const passive = {passive: true}

class FxTabsCore extends FxComponent {

	constructor(...args) {
		super(...args)
		let children = Array.from(this.children)
		children.forEach((node, i) => node.addEventListener('click', e => this.scrollToItem(i)))
	}

}

class FxTabs extends FxTabsCore {

	rafPending = false
	lastEvent

	static style = `
		#highlight {
			position: absolute;
			left: 50%;
			display: block;
			background-color: rgb(var(--tint));;
			will-change: transform, width;
			transition: all 200ms var(--easing);
			border-radius: 100px;
		}
	`

	static template = `
		<div id="highlight"></div>
		<slot></slot>
	`
	constructor(...args) {
		super(...args)
		this.setupDial()
		this.setAttribute('ready', '')
	}

	setupDial() {
		this.onResize()

		this.highlight = this.shadowRoot.querySelector('#highlight')
		this.highlight.style.transition = 'none'
		let index = Array.from(this.children).indexOf(this.querySelector('[selected]'))
		this._selectIndex(index)
		setTimeout(() => this.highlight.style.transition = '')

		this.setupResizeObserver()

		this.addEventListener('scroll', this.onScrollRaw, passive)
		this.addEventListener('touchstart', this.onTouchStart, passive)
		this.addEventListener('touchend', this.onTouchEnd, passive)
	}

	setupResizeObserver() {
		let prevent = true
		this.ro = new ResizeObserver(() => {
			// ResizeObserver will trigger in next tick. It's not immediately so we can't rely on it
			// and have to trigger it ourselves right away. But then we have to cancel this first trigger.
			if (prevent) return prevent = false
			this.onResize()
		})
		this.ro.observe(this)
	}

	onResize() {
		let children = Array.from(this.children)
		let offsetLeft = children[0].offsetWidth / 2
		let offsetRight = children[children.length - 1].offsetWidth / 2
		this.style.setProperty('--offset-left', offsetLeft + 'px')
		this.style.setProperty('--offset-right', offsetRight + 'px')

		let bboxes = children.map(node => node.getBoundingClientRect())
		let compLeft = bboxes[0].left + offsetLeft
		this.stops = bboxes.map(bbox => {
			let left = bbox.left - compLeft
			let right = bbox.right - compLeft
			let center = Math.round(left + (right - left) / 2)
			return {left, right, center}
		})
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
		let index = this.stops.map(bbox => inRange(bbox.left, scroll, bbox.right)).indexOf(true)
		if (this.selected !== index) {
			this._selectIndex(index)
		}

		this.isInertiaScrolling = true
		clearTimeout(this.inertiaScrollTimeout)
		this.inertiaScrollTimeout = setTimeout(this.onScrollTimeout, 200)
	}

	onScrollTimeout = () => {
		this.isInertiaScrolling = false
		if (!this.isScrolling) this.scrollToItem(this.selected)
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
		if (!this.isScrolling) this.scrollToItem(this.selected)
	}

	_selectItem(node, foo = true) {
		if (foo) this._deselect()
		this.selectedNode = node
		this.selected = Array.from(this.children).indexOf(this.selectedNode)
		if (foo) this._select()
	}

	_selectIndex(index, foo = true) {
		if (foo) this._deselect()
		this.selected = index
		this.selectedNode = this.children[index]
		let computed = window.getComputedStyle(this.selectedNode)
		let tintBg = computed.getPropertyValue('--tint-bg')
		//let tintFg = computed.getPropertyValue('--tint-fg')
		let translateX = this.stops[this.selected].left
		Object.assign(this.highlight.style, {
			backgroundColor: 'rgb(var(--tint-bg))',
			//backgroundColor: `rgb(${tintBg})`,
			transform: `translate(${translateX}px)`,
			width: this.selectedNode.offsetWidth + 'px',
			height: this.selectedNode.offsetHeight + 'px',
		})
		this.highlight.style.setProperty('--tint-bg', tintBg)
		//this.highlight.style.setProperty('--tint-fg', tintFg)
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
		let left = this.stops[this.selected].center
		this.scrollTo({left, behavior: 'smooth'})
	}

	disconnectedCallback() {
	}

}

//customElements.define('fx-tabs', FxTabs)
customElements.define('flexus-tabs', FxTabs)