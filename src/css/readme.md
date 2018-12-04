# Reasoning behind controvertial 

We know some of Flexus' design decisions might be controversial and raise questions. 
Here we give you an in depth explanaition behind Flexus' design decisions, some of which might be controversial, such as defining custom attributes instead of classes (`<div card round>` instead of `<div class="flexus__component-card flexus__look-rounded">`)

**TL;DR;**

it all comes down to. Flexus is expressive and envisions what HTML would look like, had it been created today, with purpose of building apps, instead of 30 years ago for structuring text documents.

Good practises change, React forced us to break the 'separation of styles and logic' practise, custom components standard let you define your own components and custom attributes no longer break browsers and cause the code to be invalid.


## oppinionated builtin styling

flexus tries to let you use the components you (and your mvc frameworks) already know. Instead of `<flexus-button>` we style builtin `<button>` component. We all know `<input>`, `<buton>`. It has builtin states, expected behavior, builtin events like `change` and you can reason about them and safely put them inside `<form>` or `<fieldset>`.

When building the app, 

## custom components

custom components standard requires custom components to have dash in the name, for example `<flexus-drawer>` instead of just `<drawer>`

html5 is currently implementing `<dialog>` and `<menu>` elements

`<div>` is an amazing blank slate, but many apps often built their content into cards
`<card>` is to `<div>` something like `<p>`. It comes down to semantics. You could of course put a long text into `<div>`, give it margins on top and bottom and make it look exactly like `<p>`. But `<p>` has the semanthics, saying '*I am a paragraph of text*'.
We think of `<card>` as a piece of content, that can have a heading, photo, actions, has a defined look and style and separates itself from other content on the same page.

Initially we started with just a class `.card`, then changed it to attribute `[card]` (you can read more about custom attributes below) and while you can still apply the attribute to any element you like (e.g. you might be using some custom component image carousel and have it look like a material design card `<my-carousel card>...<img>...</my-carousel>`). We believe that for most cases, it's nice to have sematic `<card>` element instead of just `div` with a `[card]` attribute `<div card>`.

We know this is probably the most controvertial and much safer would be giving it a `flexus-` prefix and defining it as custom component `<flexus-card>` (without any shadow dom nor scripts behind it). But it didn't seem that bad to us. Though we are definately open to discussion on this topic.

## cusom attributes

Sore point for many could be the use of custom attributes. While we agree, we believe there are reasons to justify this.

BEM madness
dashes and underlines, remember what components and modules have what states and...

BEM examples
*Actual examples found online when googligl "BEM button"*
```html
<button class="button">Normal button</button>

<button class="button button--state-success">Success button</button>

<a href="#" class="btn is-disabled">Disabled</a>

<button class="btn btn--warning btn-refresh">
  <i class="fa fa-refresh btn__icon btn__icon--refresh" aria-hidden="true"></i>
  <span class="btn__text">Warning</span>
</button>
```

Flexus
```html
<button>Normal button</button>

<button green>Success button</button>

<a href="#" button disabled>Disabled</a>

<button icon="refresh" orange>Warning</button>
```

We respect BEM and believe there's a reason and use for it. Flexus has different oppinion, it might not work for everyone and we are okay with that. You are free to choose whatever tool an framework you'd like. But ask yourself. Isn't it nicer to just write `<button>`, remember just a few attributes that are modeled after our natural human language like `[big]`, `[green]` and `[disabled]`, instead of the madness of dashes, underscores, blocks and modifiers?

You should be able to look at the code and immediately know what's going on. Can you do it with this?

```html
<!-- orange button with refresh icon -->
<button class="btn btn--warning btn-refresh">
  <i class="fa fa-refresh btn__icon btn__icon--refresh" aria-hidden="true"></i>
  <span class="btn__text">Warning</span>
</button>
```

## oppinionated

Developers these days get crazy about modularization and not polluting global namespace, etc...

On the other hand, everyone is trying to make their apps as small and compressed as possible.

So we collectively pushed ourselves into the corner of writing `.button__state-*` prefixes to get the feeling of "*it's modular, it won't collide with other library I could import*" but we never do since the chase for smaller footprint forces us to only ever just that single library.

descriptive, expressive

### expressive
many are but I to the language already
### Custom components let you define custom attributes
The new web components standard allows you to create not only element but any attribute

### skin 
In material design there's a thin line between how chips and buttons look like. 
As a matter of fact chip can be anything. It could be  non interactive span (tags under article, or movies genres), be a link (tags under news article linking to other articles on the topic), host an X button (to remove the tag from search filter) or be a toggle/checkbox (filter through search fil

buttons have the :hover and :active
have the :hover and :active state

checkbox also has the :checked state

you get that for free

of course you could rewrite it as a <span> and get the very same look. But you would have to watch click events and modify states yourself. If we were to implement `<flexus-chip>` custom components, we would also 
```html
<!-- INPUT CHECKBOX STYLED AS CHIP -->
<input chip type="checkbox" label="Open now" checked>

<!-- SPAN -->
<span chip checked>Open now</span>
<script>
var chip = document.querySelector('span[chip]')
chip.addEventListener('click', e => {
  var isChecked = chip.hasAttribute('active')
  if (isChecked)
    chip.removeAttribute('active')
  else
    chip.setAttribute('active', '')
})
</script>
```



## other notes

* Always use `<button>` instead of `<input type="submit">`