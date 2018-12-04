;(function() {
	// It looks stupid but is necessary. Animation class is not globally accessible.
	var dummy = document.createElement('div')
	var animation = dummy.animate({})
	var Animation = animation.constructor
	if ('finished' in Animation.prototype) return
	Object.defineProperty(Animation.prototype, 'finished', {
		get() {
			if (this._finished)
				return this._finished
			if (this.playState === 'finished')
				return this._finished = new Promise.resolve()
			return this._finished = new Promise((resolve, reject) => {
				this.onfinish = resolve
				this.oncancel = reject
			})
		}
	})
})();