Object.assign(NodeList.prototype, Array.prototype)
HTMLCollection.prototype.forEach = Array.prototype.forEach
//Object.assign(HTMLCollection.prototype, Array.prototype)
var $ = document.querySelector.bind(document)
var $$ = document.querySelectorAll.bind(document)

function fragmentFromString(html) {
	return document.createRange().createContextualFragment(html)
}

var tpl = document.createElement('template')

function getVariantsArray(string) {
	var arr = (string || '').split(' ').filter(a => a)
	arr.unshift(undefined)
	return arr
}
function getVariants(node) {
	var variantsRow = getVariantsArray(node.getAttribute('variants-row'))
	var variantsCol = getVariantsArray(node.getAttribute('variants-col'))
	return {variantsRow, variantsCol}
}

function getTemplateHeader(name, row, col) {
	var filtered = [name, row, col].filter(a => a)
	if (filtered.length)
		var html = `[${filtered.join('][')}]`
	else
		var html = ''
	return fragmentFromString(`<h6>${html}</h6>`)
}

for (let template of $$('template')) {
	let name = template.getAttribute('name')

	let {variantsRow, variantsCol} = getVariants(template)

	for (let row of variantsRow) {
		let $layout = document.createElement('div')
		$layout.style.display = 'flex'
		for (let col of variantsCol) {
			let $section = document.createElement('div')
			$section.style.flex = 1
			var header = getTemplateHeader(name, row, col)
			let content = template.content.cloneNode(true)
			if (row) content.children.forEach(node => node.setAttribute(row, ''))
			if (col) content.children.forEach(node => node.setAttribute(col, ''))
			$section.append(header, content)
			$layout.append($section)
		}
		tpl.content.append($layout)
	}
}

var $testbedFragment = fragmentFromString(`
	<div class="testbed">
		<div theme="light"></div>
		<div theme="dark"></div>
	</div>
`)

document.body.prepend($testbedFragment)


var $light = $('.testbed > [theme="light"]').appendChild(tpl.content.cloneNode(true))
var $dark  = $('.testbed > [theme="dark"]').appendChild(tpl.content.cloneNode(true))