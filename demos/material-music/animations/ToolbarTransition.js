import {Transition} from './Transition.js'


export class ViewTransition extends Transition {

	constructor(oldToolbar, newToolbar) {
		super()
		this.oldToolbar = oldToolbar
		this.newToolbar = newToolbar

		this.oldTitle = this.oldToolbar.querySelector('[title=""]')
		this.newTitle = this.newToolbar.querySelector('[title=""]')
		var canTransitionToolbar = this.oldTitle.textContent.trim() === this.newTitle.textContent.trim()
	}

	findTitle(section) {
		var explicit = section.querySelector('[title=""]')
		if (explicit) return explicit
		var section.querySelector('')
	}

	matchButtons() {
		children.map(node => {
			if (node.textContent !== '' && node.hasAttribute('icon')) {
				if (sameIconOnSamePlace)
					node._animation = 'swap' // or fade
				else
					node._animation = 'twist'
			}
			else
				node._animation = 'fade'
		})
	}

}
