const xDict = ['left', 'right']
const yDict = ['top', 'bottom']

function isCentered(width, height, x, y) {
	return isBetween(width / 2, x)
		&& isBetween(height / 2, y)
}

function isBetween(center, value) {
	return Math.floor(value) <= center && center <= Math.ceil(value)
}

// future ideas: make the methods callable separately for greater granularity
// for now collapseOriginIntoNewView() has to be called
export class TransformOriginMixin {

	_parseTransformOrigin() {
		let userOrigin = this.transformOrigin || this.origin.style.transformOrigin
		let {width, height} = this.originBbox
		let computedOrigin = this.originComputed.transformOrigin
		if (userOrigin) {
			let parts = userOrigin.split(' ')
			var x = 'left'
			var y = 'top'
			for (let part of parts) {
				if (xDict.includes(part)) x = part
				if (yDict.includes(part)) y = part
			}
		} else {
			// Computed styles are always calculated from words to pixel coords.
			var [x, y] = computedOrigin.split(' ').map(parseFloat)
			// Transform origin is implicitly alway in the center. 
			if (this.allowCenterOrigin !== true && isCentered(width, height, x, y)) {
				// overrwrite with 'top left' as default if the transform-origin is center (most likely by default, not by user's volition)
				x = y = 0
			}
		}
		this.transformOriginX = this._parseX(x, width)
		this.transformOriginY = this._parseY(y, height)
	}

	_parseX(x, width) {
		if (x === 'left')        return 0
		else if (x === 'right')  return width
		else if (x === 'center') return width / 2
		else                     return parseFloat(x)
	}

	_parseY(y, height) {
		if (y === 'top')         return 0
		else if (y === 'bottom') return height
		else if (y === 'center') return height / 2
		else                     return parseFloat(y)
	}

	// ACCEPTS:
	// - css-like word combinations
	//   - 'top', 'right', 'bottom', 'left', 'center'
	//   - 'top left', 'right bottom', 'top center', etc...
	// - pixels positions
	//   - 10 (number)
	//   - '10px' (string)
	//   - '20px 50px' (css-like string)
	// - otherwise parses this.origin's transform-origin computed style
	collapseOriginIntoNewView(start = 0.1, end = 1) {
		this._parseTransformOrigin()

		this.transformOriginXratio = this.transformOriginX / this.originBbox.width
		this.transformOriginYratio = this.transformOriginY / this.originBbox.height

		let {originBbox, newViewBbox} = this
		let diffLeft   = newViewBbox.left   - originBbox.left
		let diffRight  = newViewBbox.right  - originBbox.right
		let diffTop    = newViewBbox.top    - originBbox.top
		let diffBottom = newViewBbox.bottom - originBbox.bottom
		let translateX = (diffLeft * (1 - this.transformOriginXratio)) + (diffRight  * this.transformOriginXratio)
		let translateY = (diffTop  * (1 - this.transformOriginYratio)) + (diffBottom * this.transformOriginYratio)

		this.newViewOriginDiff = {diffLeft, diffRight, diffTop, diffBottom, translateX, translateY}

		// TODO: make these functions separately callable; collapseOriginIntoNewView should be just sugary on top of them, not the only way
		this.clipNewViewAroundOrigin(start, end)
		this.moveOriginTowardsNewView(start, end)
		// todo: add argument or some other way to choose between moving or scaling origin
		//this.scaleOriginTowardsNewView(start, end)
	}

	clipNewViewAroundOrigin(start = 0, end = 1) {
		let {width, height} = this.originBbox
		let left   = `calc(${100 * this.transformOriginXratio}% - ${width * this.transformOriginXratio}px)`
		let right  = `calc(${100 * this.transformOriginXratio}% - ${width * (this.transformOriginXratio - 1)}px)`
		let top    = `calc(${100 * this.transformOriginYratio}% - ${height * this.transformOriginYratio}px)`
		let bottom = `calc(${100 * this.transformOriginYratio}% - ${height * (this.transformOriginYratio - 1)}px)`

		let {translateX, translateY} = this.newViewOriginDiff

		var newViewMoveKeyframes = {
			transform: [
				`translate(${-translateX}px, ${-translateY}px)`,
				`translate(0, 0)`
			],
			clipPath: [
				`polygon(
					${left} ${top},
					${right} ${top},
					${right} ${bottom},
					${left} ${bottom}
				)`,
				`polygon(0 0, 100% 0, 100% 100%, 0% 100%)`,
			]
		}

		this.schedule(this.newView, newViewMoveKeyframes, start, end)
	}

	moveOriginTowardsNewView(start = 0, end = 1) {
		let {translateX, translateY} = this.newViewOriginDiff

		let originTransformKeyframes = {
			transform: [
				`translate(0, 0)`,
				`translate(${translateX}px, ${translateY}px)`
			],
			boxShadow: ['none', 'none']
		}

		this.schedule(this.origin, originTransformKeyframes, start, end)
	}

	scaleOriginTowardsNewView(start = 0, end = 1) {
		let {originBbox, newViewBbox} = this
		let scaleX = newViewBbox.width  / originBbox.width
		let scaleY = newViewBbox.height / originBbox.height
		let {diffLeft, diffTop} = this.newViewOriginDiff

		let originTransformKeyframes = {
			transformOrigin: ['left top', 'left top'],
			transform: [
				`translate(0, 0) scale(1)`,
				`translate(${diffLeft}px, ${diffTop}px) scale(${scaleX}, ${scaleY})`
			],
			boxShadow: ['none', 'none']
		}

		this.schedule(this.origin, originTransformKeyframes, start, end)
	}

}
