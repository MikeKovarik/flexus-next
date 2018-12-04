var $ = document.querySelector.bind(document)
var $$ = selector => Array.from(document.querySelectorAll(selector))
HTMLTemplateElement.prototype.clone = function() {
    return this.content.cloneNode(true)
}