This is reimplementation of [flexus](https://github.com/MikeKovarik/flexus) ui framework which was an experiment back in time when Shadow DOM V1 wasn't finished, CSS Variables nor position:sticky were widely available and Fluent Design System & Material Design Language were just a rumours.

This repo tries to take the good parts of the experiment and build it into production ready app framework.

## Warning. Work in progress, ugly code

**TL:DR;** The code is crap because the framework is still under heavy development.

Ideas come and go. Some are outlined, some prototyped, some even fully implemented. Most of them stick around and wait for polishing. `test/` directory is a melting pot of ideas of components, whereas examples `demos/` present how it could all works together in an actual app.

The examples are written more or less ugly, with a lot of inline styles and !important rules. That's because they are usually a quickly-put-together proof of concept and the `demos/` and `test/` files are in various stages of implementation or experimentation.

## Demos

There are some great demos, though not finished yet.

NOTE: these demos aren't responsive yet and they don't scale well! They exist to showcase animations or to recreate certain existing app or concept. Plus the framework is still in development.

Also it's only been developed/tested in chrome for now.

* [demos/app-material-music/app-material-music.html](https://flexus-next.netlify.com/demos/app-material-music/app-material-music.html) Full blown demo with transitions. Tablet mode only for now. Not responsive yet.
* [demos/app-material-music/app-material-music-artists.html](https://flexus-next.netlify.com/demos/app-material-music/app-material-music-artists.html) Different portion of the music app. Showcases different transition animation.
* [demos/app-google-photos-detail.html](https://flexus-next.netlify.com/demos/app-google-photos-detail.html)
* [demos/cart/cart-overlap.html](https://flexus-next.netlify.com/demos/cart/cart-overlap.html) Phone only. Built vith vue.js
* [demos/cart/cart-blend-all.html](https://flexus-next.netlify.com/demos/cart/cart-blend-all.html) Phone only. Built vith vue.js
* [demos/venue.html](https://flexus-next.netlify.com/demos/venue.html) Phone only. Transition between two views with pivot.
* [test/toolbar-collapsible.html](https://flexus-next.netlify.com/test/toolbar-collapsible.html) Showcase of various collapsible toolbars
* [test/transition-img-practical.html](https://flexus-next.netlify.com/test/transition-img-practical.html) SHOWCASE OF IMAGE AIMATIONS !!!
* [test/transition-collapsible-fab.html](https://flexus-next.netlify.com/test/transition-collapsible-fab.html) Collapsible FAB button.

Static mockups
* [demos/shazam.html](https://flexus-next.netlify.com/demos/shazam.html) non-interactive mockup
* [test/app-material-mail.html](https://flexus-next.netlify.com/test/app-material-mail.html) Tablet only. Inspired by Google's material mail concept
* [test/grid.html](https://flexus-next.netlify.com/test/grid.html) Grids
* [test/layout-flexbox.html](https://flexus-next.netlify.com/test/layout-flexbox.html) Flexbox layouts
* [test/toolbar-floating.html](https://flexus-next.netlify.com/test/toolbar-floating.html) Floating toolbar
