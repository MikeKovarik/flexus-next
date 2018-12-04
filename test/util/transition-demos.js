import {ImageTransition} from '../../src/js/animations/ImageTransition.js'
import {ImageDescriptor} from '../../src/js/animations/ImageDescriptor.js'
window.ImageTransition = ImageTransition
window.ImageDescriptor = ImageDescriptor


var controlPanelhtml = `
	<div id="control-panel">
		<div layout center>
			<output></output>
			<input id="duration" min="80" max="10000" value="800" type="range">
		</div>
		<div layout center>
			<input id="debug" type="checkbox">
			debug
		</div>
		<p id="status"></p>
	</div>
`
var controlPanelFragment = document.createRange().createContextualFragment(controlPanelhtml)
document.body.prepend(controlPanelFragment)

var $duration = document.querySelector('#duration')
var $durationOutput = $duration.previousElementSibling

var $debug = document.querySelector('#debug')
var $status = document.querySelector('#status')


var duration = Number(localStorage.demoDuration || '800')
var printDuration = () => $durationOutput.value = $duration.value + 'ms'
$duration.value = duration
$duration.addEventListener('input', printDuration)
$duration.addEventListener('change', e => {
	duration = Number($duration.value)
	localStorage.demoDuration = $duration.value
	printDuration()
})
printDuration()


var debug = localStorage.demoDebug === 'true'
$debug.checked = debug
function applyDebug() {
	if (debug)
		document.body.classList.add('debug')
	else
		document.body.classList.remove('debug')
}
$debug.addEventListener('change', e => {
	debug = $debug.checked
	localStorage.demoDebug = debug
	applyDebug()
})
applyDebug()


Array.from(document.querySelectorAll('.source'))
	.forEach(source => {
		var target = source.nextElementSibling

		var sd = new ImageDescriptor(source)
		var td = new ImageDescriptor(target)
		applyCssVars(source, sd)
		applyCssVars(target, td)

		var layout = source.parentElement
		layout.addEventListener('click', async e => {
			var transition = new ImageTransition(source, target, {duration})
			await transition.ready
			$status.innerHTML = transition.placeholder ? 'using placeholder' : 'unmodified'
			await transition.play()
			$status.innerHTML = ''
		})
	})

async function applyCssVars(node, descriptor) {
	await descriptor.ready
	node.style.setProperty('--offset-top', descriptor.offsetTop + 'px')
	node.style.setProperty('--offset-right', descriptor.offsetRight + 'px')
	node.style.setProperty('--offset-bottom', descriptor.offsetBottom + 'px')
	node.style.setProperty('--offset-left', descriptor.offsetLeft + 'px')
}
