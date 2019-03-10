This is reimplementation of [flexus](https://github.com/MikeKovarik/flexus) ui framework which was an experiment back in time when Shadow DOM V1 wasn't finished, CSS Variables nor position:sticky were widely available and Fluent Design System & Material Design Language were just a rumours.

This repo tries to take the good parts of the experiment and build it into production ready app framework.

## Warning. Work in progress, ugly code

**TL:DR;** The code is crap because the framework is still under heavy development.

Ideas come and go. Some are outlined, some prototyped, some even fully implemented. Most of them stick around and wait for polishing. `test/` directory is a melting pot of ideas of components, whereas examples `demos/` present how it could all works together in an actual app.

The examples are written more or less ugly, with a lot of inline styles and !important rules. That's because they are usually a quickly-put-together proof of concept and the `demos/` and `test/` files are in various stages of implementation or experimentation.

## Demos


<img align="right" src="https://raw.githubusercontent.com/MikeKovarik/resume/master/flexus-animations.gif" width="300">

There are some great demos, though not finished yet.

NOTE: these demos aren't responsive yet and they don't scale well! They exist to showcase animations or to recreate certain existing app or concept. Plus the framework is still in development.

Also it's only been developed/tested in chrome for now.

* [demos/venue.html](https://flexus-next.netlify.com/demos/venue.html) Phone only. Transition between two views with pivot.
* [demos/google-photos/grid-detail.html](https://flexus-next.netlify.com/demos/google-photos/grid-detail.html)
* [demos/cart/transition-overlap.html](https://flexus-next.netlify.com/demos/cart/transition-overlap.html) Phone only. Built vith vue.js
* [demos/cart/transition-blend-all.html](https://flexus-next.netlify.com/demos/cart/transition-blend-all.html) Phone only. Built vith vue.js
* [test/toolbar-collapsible.html](https://flexus-next.netlify.com/test/toolbar-collapsible.html) Showcase of various collapsible toolbars
* [demos/google-translate.html](https://flexus-next.netlify.com/demos/google-translate.html) Recreation of Google Translate's website
* [demos/material-music/albums.html](https://flexus-next.netlify.com/demos/material-music/albums.html) Full blown demo with transitions. Tablet mode only for now. Not responsive yet.
* [demos/material-music/artists.html](https://flexus-next.netlify.com/demos/material-music/artists.html) Different portion of the music app. Showcases different transition animation.
* [test/transition-img-practical.html](https://flexus-next.netlify.com/test/transition-img-practical.html) SHOWCASE OF IMAGE AIMATIONS !!!
* [test/transition-collapsible-fab.html](https://flexus-next.netlify.com/test/transition-collapsible-fab.html) Collapsible FAB button.

Static mockups
* [demos/shazam.html](https://flexus-next.netlify.com/demos/shazam.html) non-interactive mockup
* [test/app-material-mail.html](https://flexus-next.netlify.com/test/app-material-mail.html) Tablet only. Inspired by Google's material mail concept
* [test/grid.html](https://flexus-next.netlify.com/test/grid.html) Grids
* [test/layout-flexbox.html](https://flexus-next.netlify.com/test/layout-flexbox.html) Flexbox layouts
* [test/toolbar-floating.html](https://flexus-next.netlify.com/test/toolbar-floating.html) Floating toolbar
