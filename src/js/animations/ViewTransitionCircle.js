// this is just copy paste from one of the experiments
// WORK TO BE DONE HERE


			//var circleAnimation = animateCircleClip(e, album.color)
			var {animation: circleAnimation, node: circle} = animateCircleTransform(e, album.color)
			await circleAnimation.finished
			albumView.style.display = ''

			albumView.style.zIndex = 999999
			var fadeAnimation = albumView.animate({opacity: [0, 1]}, {duration, easing})
			await fadeAnimation.finished
			albumView.style.zIndex = ''

			circle.remove()

			//var bgDiv = createDisposableDiv()
			//Object.assign(bgDiv.style, {
			//	backgroundImage: `url('${getUrl(album.artistart)}')`,
			//	backgroundPosition: `center`,
			//	backgroundSize: `cover`,
			//	opacity: 0,
			//})
			//await promiseImageLoaded(bgDiv)
			//bgDiv.style.opacity = 1
			//bgDiv.animate({opacity: [0, 1]}, {duration, easing})


		function animateCircleTransform(e, color) {
			var {x, y} = e
			var node = createDisposableDiv()
			node.style.backgroundColor = color
			var radius = distanceToFurthestCorner(x, y, document.body.getBoundingClientRect())
			var radiusPx = (radius * 2) + 'px'
			var left = x - radius + 'px'
			var top  = y - radius + 'px'
			var animation = node.animate({
				left: [left, left],
				top:  [top, top],
				width:  [radiusPx, radiusPx],
				height: [radiusPx, radiusPx],
				borderRadius: ['50%', '50%'],
				transform: [`scale(0)`, `scale(1)`]
			}, {duration})
			return {animation, node}
		}

		function animateCircleClip(e, color) {
			var {x, y} = e
			var circle = createDisposableDiv()
			circle.style.backgroundColor = color
			var radius = distanceToFurthestCorner(x, y, document.body.getBoundingClientRect())
			return circle.animate({
				clipPath: [
					`circle(0px         at ${x}px ${y}px)`,
					`circle(${radius}px at ${x}px ${y}px)`,
				]
			}, {duration})
		}

		function createDisposableDiv() {
			var div = document.createElement('div')
			div.setAttribute('fit', '')
			div.style.willChange = 'clip-path, opacity, background-color, transform'
			div.style.zIndex = 999
			document.body.append(div)
			return div
		}

		function distanceToFurthestCorner(x, y, rect) {
			const distX = Math.max(Math.abs(x - rect.left), Math.abs(x - rect.right))
			const distY = Math.max(Math.abs(y - rect.top), Math.abs(y - rect.bottom))
			return Math.sqrt(distX * distX + distY * distY)
		}
