import FxComponent from './FxComponentV1.js'

function remapPercentage(value, low2, high2) {
	return low2 + (high2 - low2) * value;
}

console.log('todo: handle sticky with javascript')

class TransformableNode {

	translateX = 0
	translateY = 0

	scale = 1

	indentExpanded = 0
	indentCollapsed = 56

	scaleExpanded = 1.5
	scaleCollapsed = 1

	fadeExpanded = 1
	fadeCollapsed = 0

	constructor(node) {
		this.node = node

		let willChange = new Set

		this.indentable = this.node.hasAttribute('indentable')
		this.scalable = this.node.hasAttribute('scalable')
		this.fadable = this.node.hasAttribute('fade') || this.node.hasAttribute('fadable')

		if (this.scalable) {
			this.node.style.willChange = 'opacity, transform'
			this.node.style.transformOrigin = this.node.style.transformOrigin || 'left bottom'
			this.node.style.transform = `scale(${this.scaleExpanded})`
		}

		if (this.indentable) {
			this.node.style.transformOrigin = this.node.style.transformOrigin || 'left bottom'
			willChange.add('transform')
			this.indentCollapsed = Number(this.node.getAttribute('indentable')) || 56
		}

		if (this.fadable) {
			let value = this.node.getAttribute('fade') || this.node.getAttribute('fadable') || 'out'
			console.log('value', value)
			if (value === 'out') {
				this.fadeExpanded = 1
				this.fadeCollapsed = 0
			} else {
				this.fadeExpanded = 0
				this.fadeCollapsed = 1
			}
			this.node.style.opacity = this.fadeExpanded
		}

		this.node.style.willChange = Array.from(willChange).join(',')
		this.render(0)
	}

	render(percentage) {
		if (this.indentable) {
			this.translateX = remapPercentage(percentage, this.indentExpanded, this.indentCollapsed)
		}
		if (this.scalable) {
			this.scale = remapPercentage(percentage, this.scaleExpanded, this.scaleCollapsed)
		}
		if (this.indentable || this.scalable) {
			this.node.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`
		}
		if (this.fadable) {
			this.node.style.willChange = 'opacity, transform'
			this.node.style.opacity = remapPercentage(percentage, this.fadeExpanded, this.fadeCollapsed)
		}
	}

}

class FxToolbar extends FxComponent {

	rafPending = false
	lastEvent

	onScrollRaw = e => {
		this.lastEvent = e
		if (!this.rafPending) {
			this.rafPending = true
			requestAnimationFrame(this.onScroll)
		}
	}

	onScroll = () => {
		this.rafPending = false
		var newPercentage = Math.min(this.lastEvent.target.scrollTop, this.collapsibleNodeHeight) / this.collapsibleNodeHeight
		if (newPercentage !== this.collapsePercentable) {
			if (this.collapsePercentable === 1) this.onExpanded()
			else if (newPercentage === 1) this.onCollapsed()
			this.collapsePercentable = newPercentage
			this.onCollapsing(this.collapsePercentable)
		}
	}

	connectedCallback() {
		this.view = this.parentElement
		this.main = this.view.querySelector('main')

		this.view.style.overflow = 'auto'
		this.main.style.overflow = 'unset'

		this.view.style.setProperty('--toolbar-height-expanded', this.offsetHeight + 'px')

		this.collapsibleNode = this.querySelector('[collapsible]')

		this.waterfall = this.hasAttribute('waterfall')

		if (this.waterfall) {
			this.style.willChange = 'box-shadow, border'
			this.style.transition = 'box-shadow 200ms'
			this.seamed = this.hasAttribute('seamed')
		}

		var [topSection, bottomSection] = this.querySelectorAll('section')
		this.topSection = topSection
		this.bottomSection = bottomSection

		this.transformables = 
			Array.from(this.querySelectorAll('[fade], [fadable], [indentable], [scalable]'))
			.map(node => new TransformableNode(node))

		this.collapsible = this.transformables.length > 0

		if (this.collapsibleNode)
			this.setupCollapsible()
		else
			this.calculateStickyCollapsible()

		if (this.collapsibleNode || this.waterfall) {
			this.view.addEventListener('scroll', this.onScrollRaw, {passive: true})
		}
	}

	setupCollapsible() {
		this.collapsibleNodeHeight = 0
		this.collapsePercentable = 0

		this.style.position = 'sticky'
		this.style.top = 'calc(-1 * var(--collapsible-height, 0px))'
		this.style.zIndex = 99

		this.collapsibleNode.style.willChange = 'opacity, transform'

		this.ro = new ResizeObserver(entries => this.calculateCollapsibleHeight(entries[0]))
		this.ro.observe(this.collapsibleNode)
		this.onExpanded()
	}

	calculateCollapsibleHeight() {
		if (this.collapsibleNode)
			this.collapsibleNodeHeight = this.collapsibleNode.offsetHeight
		else
			this.collapsibleNodeHeight = 0

		if (this.topSection) {
			if (this.topSection.hasAttribute('overlay')) {
				this.topSection.style.marginBottom = -this.topSection.offsetHeight + 'px'
				this.topSection.style.zIndex = 99
			}
			if (this.topSection.hasAttribute('sticky')) {
				this.collapsibleNodeHeight -= this.topSection.offsetHeight
			}
		}

		if (this.bottomSection) {
			if (this.bottomSection.hasAttribute('overlay')) {
				this.bottomSection.style.marginTop = -this.bottomSection.offsetHeight + 'px'
				this.bottomSection.style.zIndex = 99
			}
			if (this.bottomSection.hasAttribute('sticky')) {
				this.collapsibleNodeHeight -= this.bottomSection.offsetHeight
			}
		}

		this.style.setProperty('--collapsible-height', this.collapsibleNodeHeight + 'px')
	}

	calculateStickyCollapsible() {
		//console.log('------------------------------------')
		//console.log(this)
		let computed = window.getComputedStyle(this)
		//console.log('this.style.top', this.style.top)
		//console.log('computed.top', computed.top)
		if (this.style.top && computed.top !== '0px') return

		let collapsibleHeight2 = 0
		let foo = 0

		if (this.topSection) {
			collapsibleHeight2 += this.topSection.offsetHeight
			if (this.topSection.hasAttribute('sticky')) {
				foo += this.topSection.offsetHeight
			}
		}
		if (this.bottomSection) {
			collapsibleHeight2 += this.bottomSection.offsetHeight
			if (this.bottomSection.hasAttribute('sticky')) {
				foo += this.bottomSection.offsetHeight
			}
		}
		//console.log('foo', foo)
		//console.log('collapsibleHeight2', collapsibleHeight2)

		this.style.position = 'sticky'
		if (this.hasAttribute('hidable')) {
			this.style.top = -collapsibleHeight2 + 'px'
		} else {
			this.style.top = -foo + 'px'
		}
	}

	onCollapsing = percentage => {
		for (let transformable of this.transformables) transformable.render(percentage)
	}

	onExpanded = () => {
		if (this.waterfall) {
			if (this.seamed) this.setAttribute('seamed', '')
			this.setAttribute('elevation', '0')
		}
	}

	onCollapsed = () => {
		if (this.waterfall) {
			this.setAttribute('elevation', '4')
			if (this.seamed) this.removeAttribute('seamed')
		}
	}

	disconnectedCallback() {
	}

}

//customElements.define('fx-toolbar', FxToolbar)
customElements.define('flexus-toolbar', FxToolbar)