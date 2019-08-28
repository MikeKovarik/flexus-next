import FxComponent from '../FxComponentV1.js'


//const duration = 120
const duration = 2000
const easing = 'cubic-bezier(0.1, 0.9, 0.2, 1)'

var animationOptions = {
	duration,
	easing,
	fill: 'both'
}

class FxList extends FxComponent {

	cloneRemoved = true
	transition = 'fade'
	//transition = 'slide'
	
	insertingNodes = new Set
	removingNodes = new Set

	constructor() {
		super()
		this.observer = new MutationObserver(this.onMutations)
	}

	connectedCallback() {
		this.observer.observe(this, {childList: true})
	}

	disconnectedCallback() {
		this.observer.disconnect()
	}

	onMutations = mutations => {
		this.oldOrder = this.newOrder
		return

		let adds = new Set
		let removes = new Set
		let moves = new Set
		for (let mutation of mutations) {
			console.log('mutation', mutation)
			for (let node of mutation.addedNodes) adds.add(node)
			for (let node of mutation.removedNodes) removes.add(node)
		}
		for (let node of adds) {
			if (removes.has(node)) {
				adds.delete(node)
				removes.delete(node)
				moves.add(node)
			}
		}
		console.log('removes', removes)
		console.log('adds', adds)
		console.log('moves', moves)

		this.newOrder = Array.from(this.children)

		let lastUntouchedNodeIndex = mutations
			.map(mutation => mutation.previousSibling)
			.map(node => this.newOrder.indexOf(node))
			.filter(index => index !== -1)
			.sort()
			.shift()
		let lastUntouchedNode = this.newOrder[lastUntouchedNodeIndex]
		console.log('lastUntouchedNodeIndex', lastUntouchedNodeIndex)
		console.log('lastUntouchedNode', lastUntouchedNode)

		this.onMutation(mutations[0])
	}
	onMutation = async mutation => {
		// filter out nodes that have been added back to dom only for fade out animation.
		let removedNodes = Array.from(mutation.removedNodes)
			.filter(node => !this.removingNodes.has(node))
		let addedNodes = Array.from(mutation.addedNodes)
			.filter(node => !this.removingNodes.has(node))
		// Remove nodes that have been initially removed but added back to animate their removal.
		Array.from(mutation.removedNodes)
			.filter(node => this.removingNodes.has(node))
			.forEach(node => this.removingNodes.delete(node))
		console.log('mutation', addedNodes, removedNodes)
		this.onRemoveNodes(removedNodes, mutation)
		this.onAddedNodes(addedNodes, mutation)
	}

	async onRemoveNodes(nodes, {previousSibling, nextSibling}) {
		if (this.cloneRemoved) nodes = nodes.map(node => node.cloneNode(true))
		for (let node of nodes) this.removingNodes.add(node)
		if (previousSibling)  previousSibling.after(...nodes)
		else if (nextSibling) nextSibling.before(...nodes)
		else console.log('???')
		let promises = nodes.map(this.animateRemoval)
		await Promise.all(promises)
		for (let node of nodes) node.remove()
	}

	async onAddedNodes(nodes) {
		for (let node of nodes) this.insertingNodes.add(node)
		let promises = nodes.map(this.animateAddition)
		await Promise.all(promises)
		for (let node of nodes) this.insertingNodes.delete(node)
	}

	animateRemoval = async node => {
		var keyframes = {opacity: [1, 0]}
		let animation = node.animate(keyframes, animationOptions)
		return Promise.callback(animation, 'onfinish', 'oncancel')
	}

	animateAddition = async node => {
		var keyframes = {opacity: [0, 1]}
		let animation = node.animate(keyframes, animationOptions)
		return Promise.callback(animation, 'onfinish', 'oncancel')
	}

}

customElements.define('fx-list', FxList)

Promise.callback = function(target, resolveCbName, rejectCbName) {
	return new Promise((resolve, reject) => {
		if (resolveCbName) target[resolveCbName] = resolve
		if (rejectCbName)  target[rejectCbName]  = reject
	})
}
