var products = [{
	id: 0,
	name: 'Pencil',
	status: 'in stock',
	image: '../img/products/pencil.jpg',
	price: 1.5
}, {
	id: 1,
	name: 'Rubberbands',
	status: 'in stock',
	image: '../img/products/rubberbands.jpg',
	price: 4.5
}, {
	id: 2,
	name: 'Rulers',
	status: 'only 1 left in stock',
	image: '../img/products/rulers.jpg',
	price: 8
}, {
	id: 3,
	name: 'Clock',
	status: 'in stock',
	image: '../img/products/clock.jpg',
	price: 22
}]


class FlexusView extends HTMLElement {}
class FlexusToolbar extends HTMLElement {}
customElements.define('flexus-view', FlexusView)
customElements.define('flexus-toolbar', FlexusToolbar)

var asyncTimeout = millis => new Promise(resolve => setTimeout(resolve, millis))


export var cart = new Vue({
	delimiters: ['${', '}'],
	el: '#cart',
	data: {
		products,
	},
	methods: {
		async openDetail(e, id) {
			detail.product = products[id]
			await asyncTimeout()
			animateOverlapIn(cart.$el, detail.$el, e)
			//animateCircleIn(cart.$el, detail.$el, e)
		}
	}
})

export var detail = new Vue({
	delimiters: ['${', '}'],
	el: '#detail',
	data: {
		product: products[0]
	},
	methods: {
		async goBack(e) {
			await asyncTimeout()
			animateOverlapOut(cart.$el, detail.$el, e)
			//animateCircleOut(cart.$el, detail.$el, e)
		},
		remove() {
			console.log('remove from cart')
		}
	}
})

var TransitionClass

export function setTransitionClass(Class) {
	TransitionClass = Class
}

async function animateOverlapIn(baseView, newView, e, options) {
	var transition = new TransitionClass(baseView, newView, e, options)
	await transition.in()
}

async function animateOverlapOut(baseView, newView, e, options) {
	var name = newView.getAttribute('name')
	var origin = baseView.querySelector(`[name="${name}"]`)
	var transition = new TransitionClass(baseView, newView, origin, options)
	await transition.out()
}


cart.$el.setAttribute('fit', '')
detail.$el.setAttribute('fit', '')

//cart.$el.style.display = 'none'
detail.$el.style.display = 'none'
