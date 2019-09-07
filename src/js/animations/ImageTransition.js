import './polyfill.js'
import {ImageDescriptor, promiseUrlLoad, parseBgUrl, promiseLoad, isLoaded} from './ImageDescriptor.js'


// TODO: cleanup
// TODO: cancellable
// TODO: reversible animations

var defaultOptions = {
	fill: 'both',
	easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
}

var timeout = millis => new Promise(resolve => setTimeout(resolve, millis))

export class ImageTransition {

	static canTransition(source, target) {
		return this.isTransitionable(source)
			|| this.isTransitionable(target)
	}

	static isTransitionable(node) {
		if (node.localName === 'img') return true
		return window.getComputedStyle(node).backgroundImage !== 'none'
	}

	constructor(source, target, options = {duration: 200}) {
		this.source = source
		this.target = target
		this.options = Object.assign(this, defaultOptions, options)
		this.sd = new ImageDescriptor(source)
		this.td = new ImageDescriptor(target)
		this.ready = this.setup()
	}

	async setup() {
		var {sd, td} = this

		// Wait till both images are loaded and their descriptors ready.
		await Promise.all([sd.ready, td.ready])

		this.containerTranslateX = sd.x - td.x
		this.containerTranslateY = sd.y - td.y

		this.keyframes = {
			transform: [
				`translate(${this.containerTranslateX}px, ${this.containerTranslateY}px)`,
				`translate(0px, 0px)`,
			]
		}

		this.sameUrls = sd.url === td.url
		this.sameAspects = sd.naturalAspectRatio.toFixed(3) === td.naturalAspectRatio.toFixed(3)
		this.imagesMatch = this.sameUrls || this.sameAspects

		if (this.imagesMatch) {
			this.scale = sd.contentWidth / td.contentWidth
			this.sdVirtualWidth  = sd.contentWidth
			this.sdVirtualHeight = sd.contentHeight
		} else if (sd.naturalAspectRatio >= 1 && td.naturalAspectRatio >= 1) {
			// 1) Both images are landscape, or 2) one is landscape and the other is at least square
			// Use their height as scale basis.
			this.scale = sd.contentHeight / td.contentHeight
			this.sdVirtualWidth  = sd.contentWidth * td.naturalAspectRatio
			this.sdVirtualHeight = sd.contentHeight
		} else if (sd.naturalAspectRatio <= 1 && td.naturalAspectRatio <= 1) {
			// 1) Both images are portrait, or 2) one is portrait and the other is at least square
			// Use their width as scale basis.
			this.scale = sd.contentWidth / td.contentWidth
			this.sdVirtualWidth  = sd.contentWidth
			this.sdVirtualHeight = sd.contentHeight / td.naturalAspectRatio
		}
		this.scaleX = sd.contentWidth / td.contentWidth
		this.scaleY = sd.contentHeight / td.contentHeight

		this.sdWidthDiff  = sd.containerWidth - this.sdVirtualWidth
		this.sdHeightDiff = sd.containerHeight - this.sdVirtualHeight

		this.sdOffsetLeft   = this.sdWidthDiff  * sd.positionLeftRatio
		this.sdOffsetRight  = this.sdWidthDiff  * sd.positionRightRatio
		this.sdOffsetTop    = this.sdHeightDiff * sd.positionTopRatio
		this.sdOffsetBottom = this.sdHeightDiff * sd.positionBottomRatio

		this.sdOriginX = this.sdOffsetLeft
		this.sdOriginY = this.sdOffsetTop
		this.tdOriginX = td.offsetLeft
		this.tdOriginY = td.offsetTop

		this.sdOffsetLeftRatio   = this.sdOffsetLeft / this.sdVirtualWidth
		this.sdOffsetRightRatio  = this.sdOffsetRight / this.sdVirtualWidth
		this.sdOffsetTopRatio    = this.sdOffsetTop / this.sdVirtualHeight
		this.sdOffsetBottomRatio = this.sdOffsetBottom / this.sdVirtualHeight

		this.sdOutsetLeftRatio   = Math.max(0, -this.sdOffsetLeftRatio)
		this.sdOutsetRightRatio  = Math.max(0, -this.sdOffsetRightRatio)
		this.sdOutsetTopRatio    = Math.max(0, -this.sdOffsetTopRatio)
		this.sdOutsetBottomRatio = Math.max(0, -this.sdOffsetBottomRatio)

		this.tdOutsetLeftRatio   = td.outsetLeft / td.contentWidth
		this.tdOutsetRightRatio  = td.outsetRight / td.contentWidth
		this.tdOutsetTopRatio    = td.outsetTop / td.contentHeight
		this.tdOutsetBottomRatio = td.outsetBottom / td.contentHeight

		this.sourceContainedWithinTarget = this.tdOutsetLeftRatio   <= this.sdOutsetLeftRatio
										&& this.tdOutsetTopRatio    <= this.sdOutsetTopRatio
										&& this.tdOutsetRightRatio  <= this.sdOutsetRightRatio
										&& this.tdOutsetBottomRatio <= this.sdOutsetBottomRatio

		this.targetContainedWithinSource = this.sdOutsetLeftRatio   <= this.tdOutsetLeftRatio
										&& this.sdOutsetTopRatio    <= this.tdOutsetTopRatio
										&& this.sdOutsetRightRatio  <= this.tdOutsetRightRatio
										&& this.sdOutsetBottomRatio <= this.tdOutsetBottomRatio
/*
		this.sdInsetLeftRatio   = Math.max(0, this.sdOffsetLeftRatio)
		this.sdInsetRightRatio  = Math.max(0, this.sdOffsetRightRatio)
		this.sdInsetTopRatio    = Math.max(0, this.sdOffsetTopRatio)
		this.sdInsetBottomRatio = Math.max(0, this.sdOffsetBottomRatio)

		this.sdClipLeftRatio   = sd.clipLeft / this.sdVirtualWidth
		this.sdClipRightRatio  = sd.clipRight / this.sdVirtualWidth
		this.sdClipTopRatio    = sd.clipTop / this.sdVirtualHeight
		this.sdClipBottomRatio = sd.clipBottom / this.sdVirtualHeight
*/
		this.originX = 0
		this.originY = 0

		console.log('this.target', this.target)
		console.log('this.source', this.source)

		console.log('this.targetContainedWithinSource', this.targetContainedWithinSource)
		console.log('this.sourceContainedWithinTarget', this.sourceContainedWithinTarget)

		if (!this.mode) {
			/*
			this works great for now, when miniaturue gets animated into full size image in picture gallery scenarions.
			Source is expected to be always smaller than target so that target can be cropped-up and scaled up from
			source's position. Using this.sourceContainedWithinTarget.
			TODO: make this work the other way around. When we close galley detail and animate the large image back into
			miniature but we want to use the big image (in this case it would be to source) as the one that animates.
			Thus the new this.targetContainedWithinSource should be included into it and also createClone() cannot only rely
			on this.target.
			*/
			if (this.targetContainedWithinSource) {
				console.warn('TODO: ImageTransition: source scaling down to target not implemented yet (aka reverse mode)')
				//this.nodeToAnimate = this.source
				this.mode = 'crop'
			}
			if (this.sourceContainedWithinTarget) {
				this.mode = 'crop'
			} else {
				var suitableForManipulation = this.target.children.length === 0
											&& td.computed.maxWidth  !== 'none'
											&& td.computed.maxHeight !== 'none'
											&& (td.computed.left === 'auto' || td.computed.right === 'auto')
											&& (td.computed.top === 'auto' || td.computed.bottom === 'auto')
				this.mode = suitableForManipulation ? 'recreate' : 'clone'
			}
		}

		switch (this.mode) {
			case 'crop':
				console.log('RECROP')
				this.setupCrop()
				this.nodeToAnimate = this.target
				break
			case 'recreate':
				console.log('RECREATE with placeholder')
				this.createPlaceholder()
				this.setupRecreate()
				break
			case 'clone':
				console.log('RECREATE WITH CLONE')
				await this.createClone()
				this.nodeToAnimate = this.clone
				this.setupRecreate()
				break
		}

		this.keyframes.transformOrigin = pair(`${this.originX || 0}px ${this.originY || 0}px`)

	}

	setupCrop() {
		var {sd, td} = this

		// clip-path applies to container, not the whole image (contentWidth can be larger than container).
		// background-position can also offset the image within the container.
		// this the inside offset (aka inset) and clip-path compete against each other.
		// E.g. given we have bg-position:10px, the image is starts at 10th pixel from left edge of the container.
		//      If we apply clip-path:inset(10px), nothing happens, both bg-post and clip start at containers edge.
		//      Only if we changed it to clip-path:inset(11px), then the bg would begin clipped.
		var sdCropLeft   = Math.max(sd.insetLeft,  sd.clipLeft)
		var sdCropRight  = Math.max(sd.insetRight, sd.clipRight)
		var sdCropTop    = Math.max(sd.insetTop,  sd.clipTop)
		var sdCropBottom = Math.max(sd.insetBottom, sd.clipBottom)
		// Getting percentage of the total content width that is not displayed (either clipped or shifted).
		// Not using container width, becasue content image can be stretched. Plus it'll be easier to apply
		// the percentage to target's size to be clipped.
		var sdCropLeftRatio   = sdCropLeft   / this.sdVirtualWidth
		var sdCropRightRatio  = sdCropRight  / this.sdVirtualWidth
		var sdCropTopRatio    = sdCropTop    / this.sdVirtualHeight
		var sdCropBottomRatio = sdCropBottom / this.sdVirtualHeight
		// One thing we cannot avoid in recrop mode is how much of the background image is cropped by being shited outside
		// the container. I.e. how much of it is cropped by background-position (usually in combination with background-size:cover).
		// Recrop is only used if the whole source image is contained within target. I.e if we can fit source into target.
		// But we need to be aware of how much of source is cropped by bg-position. aka outset.
		var outsetLeftRatioDiff   = this.sdOutsetLeftRatio   - this.tdOutsetLeftRatio
		var outsetRightRatioDiff  = this.sdOutsetRightRatio  - this.tdOutsetRightRatio
		var outsetTopRatioDiff    = this.sdOutsetTopRatio    - this.tdOutsetTopRatio
		var outsetBottomRatioDiff = this.sdOutsetBottomRatio - this.tdOutsetBottomRatio
		// Všechny ingredience smícháme, přivedeme k varu a za neustálého míchání vylejeme do hajzlu.
		var clipLeft   = ((outsetLeftRatioDiff   + sdCropLeftRatio)   * td.contentWidth)  + td.insetLeft
		var clipRight  = ((outsetRightRatioDiff  + sdCropRightRatio)  * td.contentWidth)  + td.insetRight
		var clipTop    = ((outsetTopRatioDiff    + sdCropTopRatio)    * td.contentHeight) + td.insetTop
		var clipBottom = ((outsetBottomRatioDiff + sdCropBottomRatio) * td.contentHeight) + td.insetBottom

		var translateX = this.sdOriginX - (this.tdOriginX * this.scale)
		var translateY = this.sdOriginY - (this.tdOriginY * this.scale)

		this.keyframes.transform[0] += `
			translate(${translateX}px, ${translateY}px)
			scale(${this.scale})
		`

		this.keyframes.transform[1] += `
			translate(0px, 0px)
			scale(1)
		`

		this.keyframes.clipPath = [
			`inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`,
			`inset(${td.clipTop}px   ${td.clipRight}px   ${td.clipBottom}px   ${td.clipLeft}px)`,
		]
	}


	createPlaceholder() {
		var {sd, td} = this
		// Create throwaway placeholder of the same size as the target element.
		this.placeholder = document.createElement(this.target.localName)
		this.placeholder.style.visibility = 'hidden'
		this.placeholder.style.width  = td.containerWidth + 'px'
		this.placeholder.style.height = td.containerHeight + 'px'
		// Put the placeholder into the DOM while taking the actual target element out of the flow.
		// position:absolute causes subsequent elements fill the void after target, but the placeholder
		// is there to prevent that.
		this.target.after(this.placeholder)
	}

	async createClone(adjacentNode = this.target) {
		var {sd, td} = this
		this.clone = document.createElement('div')
		Object.assign(this.clone.style, {
			willChange: 'all',
			width: td.containerWidth + 'px',
			height: td.containerHeight + 'px',
			backgroundImage: td.computed.backgroundImage,
			backgroundPosition: td.computed.backgroundPosition,
			backgroundSize: td.computed.backgroundSize,
			backgroundRepeat: td.computed.backgroundRepeat,
			backgroundColor: td.computed.backgroundColor,
			zIndex: td.computed.zIndex,
		})
		this.clone.style.visibility = 'hidden'
		adjacentNode.after(this.clone)
		// give the clone some time to load and render the image to prevent unstyled flash
		await timeout(20)
		this.clone.style.visibility = ''
		this.target.style.visibility = 'hidden'
	}

	setupRecreate() {
		var {sd, td} = this
		// RECREATE strategy literally means the target image gets taken out of the flow
		// or recreated by a temporary new element which is then animated.

		this.keyframes.left = pair(td.left + 'px')
		this.keyframes.top  = pair(td.top  + 'px')
		this.keyframes.position = pair('absolute')
		// Temporarily resize target element to the same size as its background image's natural size.
		// background-size:cover is necessary to prevent problems with hardcoded, contain, and pretty much any other sizing.
		this.keyframes.backgroundSize = pair('cover')
		this.keyframes.width  = pair(`${td.contentWidth}px`)
		this.keyframes.height = pair(`${td.contentHeight}px`)

		var clipLeftStart   = -this.sdOffsetLeftRatio   * td.contentWidth
		var clipRightStart  = -this.sdOffsetRightRatio  * td.contentWidth
		var clipTopStart    = -this.sdOffsetTopRatio    * td.contentHeight
		var clipBottomStart = -this.sdOffsetBottomRatio * td.contentHeight

		var clipLeftEnd   = td.outsetLeft + td.insetLeft + td.clipLeft
		var clipRightEnd  = td.outsetRight + td.insetRight + td.clipRight
		var clipTopEnd    = td.outsetTop + td.insetTop + td.clipTop
		var clipBottomEnd = td.outsetBottom + td.insetBottom + td.clipBottom

		var translateX = -td.outsetLeft
		var translateY = -td.outsetTop

		this.keyframes.transform[0] += `
			scale(${this.scale})
			translate(${-clipLeftStart}px, ${-clipTopStart}px)
		`
		this.keyframes.transform[1] += `
			scale(1)
			translate(${translateX}px, ${translateY}px)
		`
		this.keyframes.clipPath = [
			`inset(${clipTopStart}px ${clipRightStart}px ${clipBottomStart}px ${clipLeftStart}px)`,
			`inset(${clipTopEnd}px   ${clipRightEnd}px   ${clipBottomEnd}px   ${clipLeftEnd}px)`,
		]

	}

	async play() {
		await this.ready
		this.keyframes.zIndex = [1,1]
		this.animation = this.nodeToAnimate.animate(this.keyframes, this.options)
		this.source.style.visibility = 'hidden'
		try {
			await this.animation.finished
		} catch(err) {}
		this.animation.cancel()
		if (this.placeholder) this.placeholder.remove()
		if (this.clone) this.clone.remove()
		this.source.style.visibility = ''
		this.target.style.visibility = ''
	}

}


function pair(value) {
	return [value, value]
}