import './polyfill.js'


// TODO: velka cistka

export class ImageDescriptor {

	constructor(node) {
		this.node = node

		this.clipTop    = 0
		this.clipRight  = 0
		this.clipBottom = 0
		this.clipLeft   = 0

		this.offsetTop    = 0
		this.offsetRight  = 0
		this.offsetBottom = 0
		this.offsetLeft   = 0

		this.clipTopRatio    = 0 // TODO: delete
		this.clipRightRatio  = 0 // TODO: delete
		this.clipBottomRatio = 0 // TODO: delete
		this.clipLeftRatio   = 0 // TODO: delete

		this.offsetTopRatio    = 0 // TODO: delete
		this.offsetRightRatio  = 0 // TODO: delete
		this.offsetBottomRatio = 0 // TODO: delete
		this.offsetLeftRatio   = 0 // TODO: delete

		this.bbox = this.node.getBoundingClientRect()
		// Deliberately not using bbox, because it does not reflect scroll position.
		this.left = this.node.offsetLeft
		this.top = this.node.offsetTop
		this.x = Math.round(this.bbox.x)
		this.y = Math.round(this.bbox.y)
		this.width = Math.round(this.bbox.width)
		this.height = Math.round(this.bbox.height)
		this.containerWidth = this.width
		this.containerHeight = this.height

		this.computed = window.getComputedStyle(this.node)
		
		// TODO: handle initial clip
		this.handleClipPath()

		this.cover = false
		this.contain = false
		this.natural = false
		this.fill = false
		this.hardCodedSize = false

		if (this.node.localName === 'img') {
			this.fromImg()
		} else if (this.computed.backgroundImage !== 'none') {
			this.fromBg()
		}
	}

	async fromImg() {
		// Internal methods expect this.img to be <img> element. this.node could be anything, like a wrapper.
		this.img = this.node
		// Check if the picture is available otherwise wait till it loads.
		this.checkIfLoaded()
		// Only block/await when absolutely necessary. Keep the flow as synchronous as possible.
		if (this.loading) await this.ready

		this.cover   = this.computed.objectFit === 'cover'
		this.contain = this.computed.objectFit === 'contain'

		this.positionX = '50%'
		this.positionY = '50%'

		this.getSizes()
		this.getOffset()
	}

	async fromBg() {
		// Parses background-image url and loads it into virtual <img> to get picture's size.
		// Assigns the newly created <img> element as this.img but does not insert it into DOM.
		this.createImgFromBg()
		// Check if the picture is available otherwise wait till it loads.
		this.checkIfLoaded()
		// Only block/await when absolutely necessary. Keep the flow as synchronous as possible.
		if (this.loading) await this.ready

		switch (this.computed.backgroundSize) {
			case 'cover':
				this.cover = true
				break
			case 'contain':
				this.contain = true
				break
			case 'auto':
				// no sizing, the background image has its natural size.
				this.natural = true
				break
			case '100% 100%':
				// background-size of 100% width and 100% height. Effectively behaving as
				// default behavior of squeezed img. 
				this.fill = true
				break
			default:
				// background-size can also have hardcoded value (percentual or pixel).
				// If only one value is set it applies to width. Height is then auto calculated with correct aspect ratio.
				// If two values are defined, than the other applies to height.
				this.hardCodedSize = true
		}

		this.positionX = this.computed.backgroundPositionX
		this.positionY = this.computed.backgroundPositionY
		// NOTE: Some browsers use 'center' instead of percentage
		if (this.positionX === 'left')   this.positionX = '0%'
		if (this.positionX === 'center') this.positionX = '50%'
		if (this.positionX === 'right')  this.positionX = '100%'
		if (this.positionY === 'top')    this.positionY = '0%'
		if (this.positionY === 'center') this.positionY = '50%'
		if (this.positionY === 'bottom') this.positionY = '100%'

		this.getSizes()
		this.getOffset()
	}

	checkIfLoaded() {
		//console.log('isLoaded(this.img)', isLoaded(this.img))
		this.loading = !isLoaded(this.img)
		if (this.loading)
			return this.ready = promiseLoad(this.img)
		else
			return this.ready = Promise.resolve()
	}

	createImgFromBg() {
		this.img = new Image()
		this.img.src = parseBgUrl(this.computed.backgroundImage)
	}

	get url() {
		return this.img.src
	}

	getSizes() {
		// Natural width
		this.naturalWidth = this.img.naturalWidth
		this.naturalHeight = this.img.naturalHeight
		// Aspect ratio
		this.naturalAspectRatio   = this.naturalWidth   / this.naturalHeight
		this.containerAspectRatio = this.containerWidth / this.containerHeight
		// Content width
		if (this.contain || this.cover) {
			if (this.naturalAspectRatio.toFixed(3) === this.containerAspectRatio.toFixed(3)) {
				this.contentWidth  = this.containerWidth
				this.contentHeight = this.containerHeight
			} else if (this.contain) {
				if (this.naturalAspectRatio > this.containerAspectRatio) {
					// image is wider than container (landscape)
					this.contentWidth  = this.containerWidth
					this.contentHeight = this.containerWidth / this.naturalAspectRatio
				} else {
					// image is thinner than container (portrait)
					this.contentWidth  = this.containerHeight * this.naturalAspectRatio
					this.contentHeight = this.containerHeight
				}
			} else if (this.cover) {
				if (this.naturalAspectRatio > this.containerAspectRatio) {
					// image is wider than container (landscape)
					this.contentWidth  = this.containerHeight * this.naturalAspectRatio
					this.contentHeight = this.containerHeight
				} else {
					// image is thinner than container (portrait)
					this.contentWidth  = this.containerWidth
					this.contentHeight = this.containerWidth / this.naturalAspectRatio
				}
			}
		} else if (this.fill) {
			this.contentWidth  = this.containerWidth
			this.contentHeight = this.containerHeight
		} else if (this.hardCodedSize) {
			var [width, height] = this.computed.backgroundSize.split(' ')
			if (width.endsWith('%'))
				this.contentWidth = percentToRatio(width) * this.containerWidth
			else if (width.endsWith('px'))
				this.contentWidth = pxToNumber(width)
			if (!height)
				this.contentHeight = this.contentWidth / this.naturalAspectRatio
			else if (height.endsWith('%'))
				this.contentHeight = percentToRatio(height) * this.containerHeight
			else if (height.endsWith('px'))
				this.contentHeight = pxToNumber(height)
		} else {
			this.contentWidth  = this.naturalWidth
			this.contentHeight = this.naturalHeight
		}
		// now we can get content aspect ratio
		this.contentAspectRatio   = this.contentWidth   / this.contentHeight
		// Void size
		this.visibleWidth  = Math.min(this.containerWidth,  this.contentWidth)
		this.visibleHeight = Math.min(this.containerHeight, this.contentHeight)
		this.voidWidth  = this.containerWidth  - this.visibleWidth
		this.voidHeight = this.containerHeight - this.visibleHeight
		this.invisibleWidth  = this.contentWidth  - this.visibleWidth
		this.invisibleHeight = this.contentHeight - this.visibleHeight
		// Ratios
		// 0-1 (percentage) how much of the container is filled by empty space (offset)
		this.voidWidthRatio  = this.voidWidth  / this.containerWidth // TODO: delete?
		this.voidHeightRatio = this.voidHeight / this.containerHeight // TODO: delete?
		// 0-1 (percentage) how much of the container is filled by content
		this.fillWidthRatio  = 1 - this.voidWidthRatio // TODO: delete?
		this.fillHeightRatio = 1 - this.voidHeightRatio // TODO: delete?
		//this.contentWidthRatio  = this.contentWidth  / this.containerWidth
		//this.contentHeightRatio = this.contentHeight / this.containerHeight
	}

	getOffset() {
		if (this.positionX.endsWith('%')) {
			this.positionLeftRatio = percentToRatio(this.positionX)
			this.positionRightRatio = 1 - this.positionLeftRatio
			let diff = this.containerWidth - this.contentWidth
			this.offsetLeft  = diff * this.positionLeftRatio
			this.offsetRight = diff * this.positionRightRatio
		} else {
			this.offsetLeft = pxToNumber(this.positionX)
			this.offsetRight = this.containerWidth - this.contentWidth - this.offsetLeft
		}
		this.contentOffsetLeftRatio    = this.offsetLeft  / this.contentWidth
		this.contentOffsetRightRatio   = this.offsetRight / this.contentWidth
		this.containerOffsetLeftRatio  = this.offsetLeft  / this.containerWidth
		this.containerOffsetRightRatio = this.offsetRight / this.containerWidth

		if (this.positionY.endsWith('%')) {
			this.positionTopRatio = percentToRatio(this.positionY)
			this.positionBottomRatio = 1 - this.positionTopRatio
			let diff = this.containerHeight - this.contentHeight
			this.offsetTop    = diff * this.positionTopRatio
			this.offsetBottom = diff * this.positionBottomRatio
		} else {
			this.offsetTop = pxToNumber(this.positionY)
			this.offsetBottom = this.containerHeight - this.contentHeight - this.offsetTop
		}
		this.contentOffsetTopRatio      = this.offsetTop    / this.contentHeight
		this.contentOffsetBottomRatio   = this.offsetBottom / this.contentHeight
		this.containerOffsetTopRatio    = this.offsetTop    / this.containerHeight
		this.containerOffsetBottomRatio = this.offsetBottom / this.containerHeight
	}

	// SHORTCUTS:
	// inset(0px 0px 0px 0px) => inset(0px)
	// inset(2px 0px 2px 0px) => inset(2px 0px)
	// inset(5px 0px 0px 0px) => inset(5px 0px 0px)
	// inset(0px 0px 0px 6px) => inset(0px 0px 0px 6px)
	handleClipPath() {
		var {clipPath} = this.computed
		if (clipPath === 'none') return
		if (!clipPath.startsWith('inset('))
			throw new Error('Cannot animate clip-path other than inset()')
		// NOTE: values can be pixels or percents.
		var [top, right, bottom, left] = clipPath.slice(6, -1).split(' ')
		top = top || '0%'
		right = right || top
		bottom = bottom || top
		left = left || right

		var apply = (value, containerSize) => {
			if (value.endsWith('px'))
				return pxToNumber(value)
			else
				return containerSize * percentToRatio(value)
		}
		this.clipTop    = apply(top,    this.containerHeight)
		this.clipRight  = apply(right,  this.containerWidth)
		this.clipBottom = apply(bottom, this.containerHeight)
		this.clipLeft   = apply(left,   this.containerWidth)
/*
		// TODO: delete
		var applyDeleteme = (value, name, containerSize) => {
			if (value.endsWith('px')) {
				this[`clip${name}`] = pxToNumber(value)
				this[`clip${name}Ratio`] = containerSize / this[`clip${name}`]
			} else {
				this[`clip${name}Ratio`] = percentToRatio(value)
				this[`clip${name}`] = containerSize * this[`clip${name}Ratio`]
			}
		}
		applyDeleteme(top,    'Top',    this.containerHeight)
		applyDeleteme(right,  'Right',  this.containerWidth)
		applyDeleteme(bottom, 'Bottom', this.containerHeight)
		applyDeleteme(left,   'Left',   this.containerWidth)
*/
	}

	get contained() {
		if (this.contain) return true
		return this.contentWidth  <= this.containerWidth
			&& this.contentHeight <= this.containerHeight
			//&& !this.outset
			//&& !this.clipped
	}

	// The image is not visible in its entirety inside the container.
	// It's either too big for the container that some sides are cropped
	// or it is internally clipped using clip-path.
	get cropped() {
		return this.contentWidth  > this.containerWidth
			&& this.contentHeight > this.containerHeight
			|| this.outset
			|| this.clipTop    > this.offsetTop
			|| this.clipRight  > this.offsetRight
			|| this.clipBottom > this.offsetBottom
			|| this.clipLeft   > this.offsetLeft
	}

	// background-offset 
	get inset() {
		return this.offsetTop    > 0
			|| this.offsetRight  > 0
			|| this.offsetBottom > 0
			|| this.offsetLeft   > 0
	}

	// Not the whole image is visible.
	// Happens when: 1) bg-image is larger than the container.
	//               2) image may be the same size, or even smaller than the container
	//                  but the background-offset is large enough to push it out.
	//               3) object-fit / background-size is 'cover' and image has different
	//                  aspect ratio than the container.
	get outset() {
		return this.offsetTop    < 0
			|| this.offsetRight  < 0
			|| this.offsetBottom < 0
			|| this.offsetLeft   < 0
	}
/*
	// clipped
	get clipped() {
		return this.clipTop    > 0
			|| this.clipRight  > 0
			|| this.clipBottom > 0
			|| this.clipLeft   > 0
	}
*/
	get cropTop()    {return Math.max(this.clipTop,    this.offsetTop,    0)}
	get cropRight()  {return Math.max(this.clipRight,  this.offsetRight,  0)}
	get cropBottom() {return Math.max(this.clipBottom, this.offsetBottom, 0)}
	get cropLeft()   {return Math.max(this.clipLeft,   this.offsetLeft,   0)}


	// Yeah, negative zero is a thing and I'm using it to make debugging easier (console.log would actually log -0 instead of 0)
	get visibleEdgeTop()    {return -Math.min(-0, this.contentOffsetTopRatio)}
	get visibleEdgeRight()  {return Math.min(1 + this.contentOffsetRightRatio, 1)}
	get visibleEdgeBottom() {return Math.min(1 + this.contentOffsetBottomRatio, 1)}
	get visibleEdgeLeft()   {return -Math.min(-0, this.contentOffsetLeftRatio)}

	get outsetTop()    {return Math.max(0, -this.offsetTop)}
	get outsetRight()  {return Math.max(0, -this.offsetRight)}
	get outsetBottom() {return Math.max(0, -this.offsetBottom)}
	get outsetLeft()   {return Math.max(0, -this.offsetLeft)}

	get insetTop()    {return Math.max(0, this.offsetTop)}
	get insetRight()  {return Math.max(0, this.offsetRight)}
	get insetBottom() {return Math.max(0, this.offsetBottom)}
	get insetLeft()   {return Math.max(0, this.offsetLeft)}

	get insetTopRatio()    {return this.insetTop / this.containerWidth}
	get insetRightRatio()  {return this.insetRight / this.containerWidth}
	get insetBottomRatio() {return this.insetBottom / this.containerWidth}
	get insetLeftRatio()   {return this.insetLeft / this.containerWidth}

}

function percentToRatio(percentString) {
	return parseFloat(percentString.slice(0, -1)) / 100
}
function pxToNumber(pxString) {
	return Number(pxString.slice(0, -2))
}
export function promiseLoad(img) {
	if (isLoaded(img)) return Promise.resolve()
	return new Promise((resolve, reject) => {
		img.onload  = resolve
		img.onerror = reject
	})
}

export function isLoaded(img) {
	return img.naturalWidth !== 0
		&& img.naturalHeight !== 0
		&& img.complete
}

export function parseBgUrl(bgImage) {
	return bgImage.trim().replace(/url\((['"])?(.*?)\1\)/gi, '$2')
}
