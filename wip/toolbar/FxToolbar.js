import FxComponent from '../FxComponentV1.js'

function remapPercentage(value, low2, high2) {
	return low2 + (high2 - low2) * value;
}

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

	blurExpanded = 0
	blurCollapsed = 20

	parallaxRatio = 0.5

	constructor(node) {
		this.node = node

		let willChange = new Set

		this.indentable = this.node.hasAttribute('indentable')
		this.scalable = this.node.hasAttribute('scale') || this.node.hasAttribute('scalable')
		this.fadable = this.node.hasAttribute('fade') || this.node.hasAttribute('fadable')
		this.parallax = this.node.hasAttribute('parallax')
		this.blurable = this.node.hasAttribute('blurable')

		if (this.scalable) {
			willChange.add('opacity')
			willChange.add('transform')
			let value = this.node.getAttribute('scale') || this.node.getAttribute('scalable')
			if (value.includes('-')) {
				this.parseValue('scale', value)
			}
			if (this.node.textContent.length > 0)
				this.node.style.transformOrigin = this.node.style.transformOrigin || 'left bottom'
			this.node.style.transform = `scale(${this.scaleExpanded})`
		}

		if (this.indentable) {
			willChange.add('transform')
			this.node.style.transformOrigin = this.node.style.transformOrigin || 'left bottom'
			this.indentCollapsed = Number(this.node.getAttribute('indentable')) || 56
		}

		if (this.fadable) {
			willChange.add('opacity')
			let value = this.node.getAttribute('fade') || this.node.getAttribute('fadable') || 'out'
			// TODO: use some CSS variables as well
			//this.node.style.getProperty('--fade-expanded') // TODO
			//this.node.style.getProperty('--fade-collapsed') // TODO
			if (value.includes('-')) {
				this.parseValue('fade', value)
			} else if (value === 'out') {
				this.fadeExpanded = 1
				this.fadeCollapsed = 0
			} else {
				this.fadeExpanded = 0
				this.fadeCollapsed = 1
			}
			this.node.style.opacity = this.fadeExpanded
		}

		if (this.parallax) {
			willChange.add('transform')
			//willChange.add('clip-path')
			let value = this.node.getAttribute('parallax')
			if (value !== '') this.parallaxRatio = Number(value)
		}

		if (this.blurable) {
			willChange.add('filter')
			// TODO: handle values
		}

		this.node.style.willChange = Array.from(willChange).join(',')
		this.render(0)
	}

	parseValue(name, value) {
		let [expanded, collapsed] = value.split('-').map(Number)
		this[`${name}Expanded`] = expanded
		this[`${name}Collapsed`] = collapsed
	}

	render(percentage, px) {
		if (this.indentable) {
			this.translateX = remapPercentage(percentage, this.indentExpanded, this.indentCollapsed)
		}
		if (this.scalable) {
			this.scale = remapPercentage(percentage, this.scaleExpanded, this.scaleCollapsed)
		}
		if (this.fadable) {
			this.node.style.opacity = remapPercentage(percentage, this.fadeExpanded, this.fadeCollapsed)
		}
		if (this.parallax) {
			this.translateY = this.parallaxRatio * px
			//this.node.style.clipPath = `inset(0px 0px ${this.translateY}px 0px)`
		}
		if (this.blurable) {
			let value = remapPercentage(percentage, this.blurExpanded, this.blurCollapsed)
			this.node.style.filter = `blur(${value}px)`
		}
		if (this.indentable || this.scalable || this.parallax) {
			this.node.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`
		}
	}

}

import {createTemplate, createGlobalStyle} from '../FxComponentV1.js'

var parallaxShadowTemplate = createTemplate(`
	<div style="clip-path: inset(0)">
		<slot></slot>
	</div>
`)

createGlobalStyle(`
flexus-toolbar section {
	pointer-events: none;
}
flexus-toolbar button,
flexus-toolbar section > * {
	pointer-events: all;
}
`)

class FxToolbar extends FxComponent {

	rafPending = false
	lastEvent

	collapseBy = 0
	collapsePercentage = 0

	constructor(...args) {
		super(...args)

		this.view = this.parentElement
		this.main = this.view.querySelector('main')

		this.view.style.overflow = 'auto'
		this.main.style.overflow = 'unset'

		this.view.style.setProperty('--toolbar-height-expanded', this.offsetHeight + 'px')

		this.collapsibleNode = this.querySelector('[collapsible]')

		this.waterfall = this.hasAttribute('waterfall')
		this.hidable = this.hasAttribute('hidable')

		if (this.waterfall) {
			this.style.willChange = 'box-shadow, border'
			this.style.transition = 'box-shadow 200ms'
			this.seamed = this.hasAttribute('seamed')
		}

		var parallax = this.querySelector('[parallax]') !== null
		if (parallax) this._createShadowFromTemplate(parallaxShadowTemplate)

		var sections = Array.from(this.querySelectorAll(':scope > *:not(button):not([collapsible])'))
		var sections = Array.from(this.querySelectorAll(':scope > *:not(button)'))
		var collapsibleIndex = sections.indexOf(this.collapsibleNode)
		var beforeCollapsible = sections.slice(0, collapsibleIndex)
		var afterCollapsible = sections.slice(collapsibleIndex + 1)
		this.topSection = beforeCollapsible.shift()
		this.bottomSection = afterCollapsible.pop()

		//var [topSection, bottomSection] = this.querySelectorAll('section, flexus-tabs')
		//this.topSection = topSection
		//this.bottomSection = bottomSection

		this.transformables = 
			Array.from(this.querySelectorAll('[fade], [fadable], [indentable], [scalable], [parallax], [blurable]'))
			.map(node => new TransformableNode(node))

		this.collapsible = this.transformables.length > 0

		this.setupCollapsible()

		let computed = window.getComputedStyle(this)
		if (computed.opacity === '0')
			this._animate(this, {opacity: [0, 1]}).then(() => this.style.opacity = 1)
	}

	setupCollapsible() {

		let computed = window.getComputedStyle(this)
		if (this.style.top && computed.top !== '0px') {
			//console.log('IGNORING', this)
			return
		}

		this.calculateCollapsibleHeight()

		if (this.collapsibleNode) {
			this.collapsibleNode.style.willChange = 'opacity, transform'
			let prevent = true
			this.ro = new ResizeObserver(() => {
				// ResizeObserver will trigger calculateCollapsibleHeight in next tick
				// it's not immediately so we can't rely on it and have to trigger it ourselves right away
				// but then we have to cancel this first observer triggered call.
				if (prevent) return prevent = false
				this.calculateCollapsibleHeight()
			})
			this.ro.observe(this.collapsibleNode)
			this.onExpanded()
		}

		let foo = this.collapseBy > 0 && this.transformables.length > 0
		if (foo || this.waterfall) {
			this.view.addEventListener('scroll', this.onScrollRaw, {passive: true})
		} else {
			//console.log('DEFAULT', this)
			//this.style.top = 0
		}

		this.style.position = 'sticky'
		this.style.zIndex = 99

	}

	calculateCollapsibleHeight() {
		//console.log('-------------------')
		//console.log(this)

		let {topSection, bottomSection} = this

		let stickyHeight = 0
		let overlayHeight = 0
		var collapsibleNodeHeight = this.collapsibleNode ? this.collapsibleNode.offsetHeight : 0

		if (topSection) {
			let topSectionHeight = topSection.offsetHeight
			if (topSection.hasAttribute('overlay') && this.collapsibleNode) {
				topSection.style.marginBottom = -topSectionHeight + 'px'
				topSection.style.zIndex = 99
				overlayHeight += topSectionHeight
			}
			if (topSection.hasAttribute('sticky')) {
				stickyHeight += topSectionHeight
			}
		}

		if (bottomSection) {
			let bottomSectionHeight = bottomSection.offsetHeight
			if (bottomSection.hasAttribute('overlay') && this.collapsibleNode) {
				bottomSection.style.marginTop = -bottomSectionHeight + 'px'
				bottomSection.style.zIndex = 99
				overlayHeight += bottomSectionHeight
			}
			if (bottomSection.hasAttribute('sticky')) {
				stickyHeight += bottomSectionHeight
			}
		}

		this.style.position = 'sticky'

		// TODO: observe this to avoid repaint by calling offsetHeight
		// IMPORTANT: Do not move this. offsetHeight can only be measured once [overlay] margins are applied
		this.expandedHeight = this.offsetHeight
		if (stickyHeight > 0) this.collapseBy = this.expandedHeight - stickyHeight
		this.collapsedHeight = this.expandedHeight - this.collapseBy

		//console.log('expandedHeight', this.expandedHeight)
		//console.log('collapsibleNodeHeight', collapsibleNodeHeight)
		//console.log('stickyHeight', stickyHeight)
		//console.log('overlayHeight', overlayHeight)
		//console.log('COLLAPSE BY', this.collapseBy, '!!!')
		//console.log('this.collapsedHeight', this.collapsedHeight)

		if (this.hidable)
			this.style.setProperty('--collapse-offset', this.expandedHeight + 'px')
		else
			this.style.setProperty('--collapse-offset', this.collapseBy + 'px')
		this.style.top = 'calc(-1 * var(--collapse-offset, 0px))'
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
		let {scrollTop} = this.lastEvent.target
		if (this.collapseBy === 0 && this.waterfall) {
			var newPercentage = scrollTop === 0 ? 0 : 1
		} else {
			if (scrollTop < this.collapseBy)
				var newPercentage = scrollTop / this.collapseBy
			else
				var newPercentage = 1
		}
		if (newPercentage !== this.collapsePercentage) {
			if (this.collapsePercentage === 1) this.onExpanded()
			else if (newPercentage === 1) this.onCollapsed()
			this.collapsePercentage = newPercentage
			this.onCollapsing(this.collapsePercentage)
		}
	}

	onCollapsing = percentage => {
		let px = this.collapseBy * percentage
		for (let transformable of this.transformables)
			transformable.render(percentage, px)
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