export class SurroundingNodesMixin {

	findSurroundingNodes() {
		this.baseMain = this.baseView.querySelector(':scope > main')
		this.zIndexNodeList.push('baseMain')

		this.aboveNodes = getAllPreviousElements(this.baseMain).filter(isNotFab)
		this.belowNodes = getAllNextElements(this.baseMain).filter(isNotFab)
	}

	// hides toolbar by pushing it away off the top of the screen
	pushAwayElementsAbove() {
		// TODO: crude. proof of concept
		this.aboveMain = this.aboveNodes.pop()
		if (!this.aboveMain) return
		//if (!isElevated(this.aboveMain)) return
		// MD spec wants to delay the animation until edges of toolbar and animated element are touching
		// to make it look like the animated element pushes toolbar away.
		// This is an ugly calculation that somewhat does the job (I'm not a mathematician. send halp pls).
		// NOTE: It'd be nice to use the actual bezier curve used to animate the element.
		let top = this.originBbox.top - this.baseViewBbox.top
		// Distance between bottom edge of toolbar and origin's top edge.
		let distFromToolbar = top - this.aboveMain.offsetHeight
		let radians = mapRange(distFromToolbar * 2, 0, this.newViewBbox.height, 0, Math.PI / 2)
		let delay = 0.1 + (Math.sin(radians) * 0.45)
		let transform = ['translate3d(0, 0%, 0)', 'translate3d(0, -100%, 0)']
		this.schedule(this.aboveMain, {transform}, delay, 1)
	}

	// hides bottom tabs by pushing it away off the top of the screen
	pushAwayElementsBelow() {
		// TODO: crude. proof of concept
		this.belowMain = this.belowNodes.pop()
		if (!this.belowMain) return
		let bottom = this.baseViewBbox.bottom - this.originBbox.bottom
		// Distance between bottom edge of toolbar and origin's bottom edge.
		let distFromToolbar = bottom - this.belowMain.offsetHeight
		let radians = mapRange(distFromToolbar * 2, 0, this.newViewBbox.height, 0, Math.PI / 2)
		let delay = 0.1 + (Math.sin(radians) * 0.45)
		let transform = ['translate3d(0, 0%, 0)', 'translate3d(0, 100%, 0)']
		this.schedule(this.belowMain, {transform}, delay, 1)
	}

}

function mapRange(num, inMin, inMax, outMin, outMax) {
	return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin
}

function getAllPreviousElements(node) {
	let nodes = []
	while (true) {
		node = node.previousElementSibling
		if (node === null) break
		nodes.push(node)
	}
	return nodes
}

function getAllNextElements(node) {
	let nodes = []
	while (true) {
		node = node.nextElementSibling
		if (node === null) break
		nodes.push(node)
	}
	return nodes
}

function isNotFab(node) {
	return !node.hasAttribute('fab')
}
