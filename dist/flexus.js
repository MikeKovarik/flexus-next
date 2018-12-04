(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('flexus', ['exports'], factory) :
	(factory((global.flexus = {})));
}(this, (function (exports) { 'use strict';

	(function () {
	  // It looks stupid but is necessary. Animation class is not globally accessible.
	  var dummy = document.createElement('div');
	  var animation = dummy.animate({});
	  var Animation = animation.constructor;
	  if ('finished' in Animation.prototype) return;
	  Object.defineProperty(Animation.prototype, 'finished', {
	    get() {
	      if (this._finished) return this._finished;
	      if (this.playState === 'finished') return this._finished = new Promise.resolve();
	      return this._finished = new Promise((resolve, reject) => {
	        this.onfinish = resolve;
	        this.oncancel = reject;
	      });
	    }

	  });
	})();

	var promiseTimeout = millis => new Promise(resolve => setTimeout(resolve, millis));
	function cloneNode(original) {
	  var computed = window.getComputedStyle(original);
	  var clone = document.createElement(original.localName);
	  clone.innerHTML = original.innerHTML;
	  clone.style.fontSize = computed.fontSize;
	  clone.style.fontWeight = computed.fontWeight;
	  clone.style.color = computed.color;
	  return clone;
	}

	function reverseKeyframes(keyframes) {
	  var entries = Object.entries(keyframes).filter(pair => Array.isArray(pair[1])).map(reverseEntry);
	  return objectFromEntries(entries);
	}

	function reverseEntry(entry) {
	  return [entry[0], entry[1].reverse()];
	}

	class AnimationOrchestrator {
	  constructor() {
	    this.requests = [];
	    this.animations = [];
	    this.duration = 150; // 'both' id combination of 'forwards' and 'backwards'.
	    // 'forwards' keeps the end keyframe applied even after animation is over.
	    // 'backwards' applies the first keyframe before the animation starts (in combination with delay).

	    this.fill = 'both'; // Default sine easing to make the animations more snappy and playful.

	    this.easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)';
	    this.started = new Promise(resolve => this.startedResolve = resolve);
	  }

	  get finished() {
	    return this.started.then(() => {
	      var promises = this.animations.map(a => a.finished);
	      return Promise.all(promises);
	    });
	  }

	  get running() {
	    return this.animations.some(a => a.playState === 'running');
	  }

	  schedule(node, keyframes, start = 0, end = 1) {
	    this.requests.push({
	      node,
	      keyframes,
	      start,
	      end
	    });
	  }

	  finalize(direction = 'normal', speed = 1) {
	    let {
	      easing,
	      fill
	    } = this;
	    let totalDuration = this.duration * speed;

	    for (let {
	      node,
	      keyframes,
	      start,
	      end
	    } of this.requests) {
	      let duration = (end - start) * totalDuration;
	      let delay = 0;

	      if (direction === 'normal') {
	        delay = start * totalDuration;
	      } else {
	        delay = (1 - end) * totalDuration; // Reversing values manually because 'direction' is unreliable and causes problems with delays.

	        keyframes = reverseKeyframes(keyframes);
	      }

	      let options = {
	        delay,
	        duration,
	        easing,
	        fill
	      };
	      let animation = node.animate(keyframes, options);
	      this.animations.push(animation);
	    }
	  }

	  async play(...args) {
	    await this.playOnly(...args); // Wrapping the cancellation in yet another delay (just till the end of current event loop)
	    // to ensure that the owner can finalize the animations. e.g. hiding the element with dispay:none
	    // before we cancel the 'fill' animation. Cancelling first could cause quick flash.

	    await promiseTimeout();
	    this.cancel();
	  }

	  async playOnly(...args) {
	    // Turn requests into Animation instances (and fill this.animations array).
	    this.finalize(...args); // resolve this.started promise.

	    this.startedResolve(); // Wait till all animations finish playing.

	    await this.finished;
	  }

	  cancel() {
	    while (this.animations.length) {
	      let animation = this.animations.pop();
	      if (animation.playState === 'running') animation.cancel();
	    }
	  }

	}

	function calculateTransform(translateX, translateY, scaleX, scaleY) {
	  var temp = `translate(${translateX}px, ${translateY}px)`;
	  if (scaleX !== undefined && scaleY !== undefined) temp += ` scale(${scaleX}, ${scaleY})`;
	  return temp;
	}

	function getTransformKeyframes(translateX, translateY, scaleX, scaleY) {
	  return {
	    transform: [`translate(0px, 0px) scale(1, 1)`, calculateTransform(translateX, translateY, scaleX, scaleY)]
	  };
	}

	class Transition extends AnimationOrchestrator {
	  constructor() {
	    super();
	    this.originSideX = 'left';
	    this.originSideY = 'top';
	  }

	  get transformOrigin() {
	    return `${this.originSideX} ${this.originSideY}`;
	  }

	  set transformOrigin(string) {
	    this.originSideX = this.originSideY = 'center';

	    switch (string) {
	      case 'center':
	        return;

	      case 'top':
	        return this.originSideY = 'top';

	      case 'right':
	        return this.originSideX = 'right';

	      case 'bottom':
	        return this.originSideY = 'bottom';

	      case 'left':
	        return this.originSideX = 'left';

	      default:
	        var {
	          originSideX,
	          originSideY
	        } = string.split(' ');
	        this.originSideX = originSideX;
	        this.originSideY = originSideY;
	    }
	  } // PLAYBACK


	  in() {
	    return this.play('normal', 1);
	  }

	  out() {
	    return this.play('reverse', 0.7);
	  } // CALCULATIONS


	  calculateResizeKeyframes(from, to) {
	    var fromBbox = from.getBoundingClientRect();
	    var toBbox = to.getBoundingClientRect();
	    return {
	      top: [fromBbox.top + 'px', toBbox.top + 'px'],
	      left: [fromBbox.left + 'px', toBbox.left + 'px'],
	      width: [fromBbox.width + 'px', toBbox.width + 'px'],
	      height: [fromBbox.height + 'px', toBbox.height + 'px'] //borderRadius: [this.originComputed.borderRadius, this.newComputed.borderRadius],
	      //clipPath: [`inset(0px 0px 0px 0px round ${this.newComputed.borderRadius})`, 'inset(0px 0px 0px 0px round 0px)']

	    };
	  }

	  _translateTo(node, origin, pivot) {
	    var originBbox = origin.getBoundingClientRect();
	    var pivotBbox = pivot.getBoundingClientRect();
	    var translateX = originBbox.left - pivotBbox.left;
	    var translateY = originBbox.top - pivotBbox.top;
	    return {
	      translateX,
	      translateY
	    };
	  }

	  _scaleTo(node, origin, pivot) {
	    var nodeBbox = node.getBoundingClientRect();
	    var originBbox = origin.getBoundingClientRect();
	    var pivotBbox = pivot.getBoundingClientRect();
	    var scaleX = originBbox.width / pivotBbox.width;
	    var scaleY = originBbox.height / pivotBbox.height;
	    var translateX = (pivotBbox.left - nodeBbox.left) * (1 - scaleX);
	    var translateY = (pivotBbox.top - nodeBbox.top) * (1 - scaleY);
	    /*
	    		if (this.transformOrigin) {
	    			if (neco == 'left') {
	    				var translateX = (pivotBbox.left - nodeBbox.left) * (1 - scaleX)
	    			} else if (neco === 'ight') {
	    				var translateX = (pivotBbox.right - nodeBbox.right) * (1 - scaleX)
	    			}
	    			// TODO: dodelat
	    		}
	    */

	    return {
	      translateX,
	      translateY,
	      scaleX,
	      scaleY
	    };
	  } // TRANSITIONS
	  // view   - transformed view
	  // origin - target position to translate and scale the view to fit into.
	  // pivot  - element in animated view that will match origin element.
	  // example: calendar app. clicking uppon event in event list opens a new 'view',
	  //          the event (small blue rectangle) is the 'origin', it then scales up to grow
	  //          as large as the 'pivot' and translates to pivot's position.
	  //          by default pivot is the whole new view, but it could be a portion of it, like
	  //          a tall blue toolbar. in which case the origin only grows to fill and match the toolbar.
	  // NOTE: In the future we will be able to use {composite:'add'} to combine multiple
	  //       transform animations.


	  transformTo(node, origin, pivot = node, start = 0, end = 1) {
	    var {
	      translateX,
	      translateY,
	      scaleX,
	      scaleY
	    } = this._scaleTo(node, origin, pivot);

	    var temp = this._translateTo(node, origin, pivot);

	    translateX += temp.translateX;
	    translateY += temp.translateY;
	    var keyframes = getTransformKeyframes(translateX, translateY, scaleX, scaleY);
	    keyframes.transformOrigin = [this.transformOrigin, this.transformOrigin];
	    this.schedule(node, keyframes, start, end);
	  }

	  translateTo(node, origin, pivot = node, start = 0, end = 1) {
	    var {
	      translateX,
	      translateY
	    } = this._translateTo(node, origin, pivot);

	    var keyframes = getTransformKeyframes(translateX, translateY);
	    keyframes.transformOrigin = [this.transformOrigin, this.transformOrigin];
	    this.schedule(node, keyframes, start, end);
	  }

	  scaleTo(node, origin, pivot = node, start = 0, end = 1) {
	    var {
	      translateX,
	      translateY,
	      scaleX,
	      scaleY
	    } = this._scaleTo(node, origin, pivot);

	    var keyframes = getTransformKeyframes(translateX, translateY, scaleX, scaleY);
	    keyframes.transformOrigin = [this.transformOrigin, this.transformOrigin]; //keyframes.transformOrigin = ['left top', 'left top']

	    this.schedule(node, keyframes, start, end);
	  }

	  clipTo(view, origin, start = 0, end = 1) {
	    var viewBbox = view.getBoundingClientRect();
	    var originBbox = origin.getBoundingClientRect();
	    var top = originBbox.top - viewBbox.top;
	    var right = viewBbox.right - originBbox.right;
	    var bottom = viewBbox.height - originBbox.bottom;
	    var left = originBbox.left - viewBbox.left;
	    var keyframes = {
	      clipPath: [`inset(0px 0px 0px 0px round 0px)`, `inset(${top}px ${right}px ${bottom}px ${left}px round 0px)`]
	    };
	    this.schedule(view, keyframes, start, end);
	  }

	  fadeOut(node, start = 0, end = 1) {
	    //var keyframes = this.getKeyframes(node)
	    var keyframes = {
	      opacity: [1, 0]
	    };
	    this.schedule(node, keyframes, start, end);
	  }

	  fadeIn(node, start = 0, end = 1) {
	    //var keyframes = this.getKeyframes(node)
	    var keyframes = {
	      opacity: [0, 1]
	    };
	    this.schedule(node, keyframes, start, end);
	  }

	  async transitionTextNode($from, $to) {
	    var fromBbox = $from.getBoundingClientRect();
	    var toBbox = $to.getBoundingClientRect();
	    var fromComputed = window.getComputedStyle($from);
	    var toComputed = window.getComputedStyle($to);
	    var $clone = cloneNode($from);
	    Object.assign($clone.style, {
	      position: 'absolute',
	      zIndex: 105,
	      top: fromBbox.top + 'px',
	      left: fromBbox.left + 'px'
	    });
	    document.body.appendChild($clone);
	    $from.style.visibility = 'hidden';
	    $to.style.visibility = 'hidden';
	    var keyframes = {
	      transformOrigin: ['top left', 'top left'],
	      transform: [`translate(0, 0)`, `translate(${toBbox.left - fromBbox.left}px, ${toBbox.top - fromBbox.top}px)`],
	      color: [fromComputed.color, toComputed.color],
	      fontSize: [fromComputed.fontSize, toComputed.fontSize],
	      fontWeight: [fromComputed.fontWeight, toComputed.fontWeight],
	      letterSpacing: [fromComputed.letterSpacing, toComputed.letterSpacing] //opacity: [0, 1],

	    };
	    $from.style.visibility = 'hidden';
	    $to.style.visibility = 'hidden';
	    this.schedule($clone, keyframes); // TODO: better implement this

	    await this.finished;
	    console.log('remove text node');
	    $from.style.visibility = '';
	    $to.style.visibility = '';
	    $clone.remove();
	  }

	}

	const ZINDEX_BASEVIEW = 99;
	const ZINDEX_BACKDROP = 100;
	const ZINDEX_SHEET = 101;
	const ZINDEX_ORIGINBG = 102;
	const ZINDEX_ORIGIN = 103;
	const ZINDEX_NEWVIEW = 104;
	class ViewTransition extends Transition {
	  constructor(baseView, newView, origin, pivot = newView) {
	    super();
	    this.baseView = baseView;
	    this.newView = newView;
	    this.origin = origin;
	    this.pivot = pivot;
	    this.duration = 250;
	    this.fill = 'both';
	    this.easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)'; // display all so that we can measure bboxes.

	    this.baseView.style.display = '';
	    this.newView.style.display = '';
	    this.baseViewBbox = this.baseView.getBoundingClientRect();
	    this.newViewBbox = this.newView.getBoundingClientRect();
	    this.originBbox = this.origin.getBoundingClientRect();
	    this.originComputed = window.getComputedStyle(origin);
	    this.newComputed = window.getComputedStyle(this.newView); // todo: delete

	    this.baseBbox = this.baseViewBbox;
	    this.newBbox = this.newViewBbox; // todo:

	    this.scale = this.newViewBbox.width / this.originBbox.width; // distance of size between origin and new view.

	    this.sizeDiff = Math.max(this.newViewBbox.width - this.originBbox.width, this.newViewBbox.height - this.originBbox.height); // TODO: calculate duration dynamically based on the distance. longer the distance, longer the animation.

	    if (this.canBlendToolbars) {
	      this.blendAboveMain();
	    }

	    if (this.canBlendMains) {
	      this.blendMains();
	    } // PUSH away other elevated elements (bottom tabs or bar)
	    // FADE out everything else.

	  } //calculateOrigin(base, origin) {


	  calculateOrigin() {
	    var baseWidth = this.baseViewBbox.width - this.baseViewBbox.left;
	    var originMidpoint = this.originBbox.left - this.baseViewBbox.left + this.originBbox.width / 2;
	    this.originSideX = originMidpoint > baseWidth / 2 ? 'right' : 'left';
	    this.originSideY = 'top';
	  }

	  async play(...args) {
	    var baseViewZindex = this.baseView && this.baseView.style.zIndex;
	    var backdropZindex = this.backdrop && this.backdrop.style.zIndex;
	    var sheetZindex = this.sheet && this.sheet.style.zIndex;
	    var originBgZindex = this.originBg && this.originBg.style.zIndex;
	    var originZindex = this.origin && this.origin.style.zIndex;
	    var newViewZindex = this.newView && this.newView.style.zIndex;
	    if (this.baseView) this.baseView.style.zIndex = ZINDEX_BASEVIEW;
	    if (this.backdrop) this.backdrop.style.zIndex = ZINDEX_BACKDROP;
	    if (this.sheet) this.sheet.style.zIndex = ZINDEX_SHEET;
	    if (this.originBg) this.originBg.style.zIndex = ZINDEX_ORIGINBG;
	    if (this.origin) this.origin.style.zIndex = ZINDEX_ORIGIN;
	    if (this.newView) this.newView.style.zIndex = ZINDEX_NEWVIEW;

	    try {
	      await super.play(...args);
	    } catch (err) {
	      // Propagate the error further down the pipeline.
	      throw err;
	    } finally {
	      // Reset Z-indexes to their original state no matter if succeded or err'd.
	      if (this.baseView) this.baseView.style.zIndex = baseViewZindex;
	      if (this.backdrop) this.backdrop.style.zIndex = backdropZindex;
	      if (this.sheet) this.sheet.style.zIndex = sheetZindex;
	      if (this.originBg) this.originBg.style.zIndex = originBgZindex;
	      if (this.origin) this.origin.style.zIndex = originZindex;
	      if (this.newView) this.newView.style.zIndex = newViewZindex;
	    }
	  }

	  async in(...args) {
	    this.baseView.setAttribute('hidden', '');

	    try {
	      await super.in(...args);
	    } catch (err) {
	      throw err;
	    } finally {
	      this.baseView.style.display = 'none';
	      this.baseView.removeAttribute('hidden');
	    }
	  }

	  async out(...args) {
	    this.newView.setAttribute('hidden', '');

	    try {
	      await super.out(...args);
	    } catch (err) {
	      throw err;
	    } finally {
	      this.newView.style.display = 'none';
	      this.newView.removeAttribute('hidden');
	    }
	  }

	  pushAwayElementsAbove() {}

	  pushAwayElementsBelow() {}

	  createBackdrop() {
	    this.backdrop = document.createElement('div');
	    this.backdrop.setAttribute('fx-backdrop', '');
	    this.baseView.append(this.backdrop);
	  }

	  createSheet() {
	    this.sheet = document.createElement('div'); //this.sheet.style.outline = '1px solid red'

	    this.sheet.style.position = 'absolute';
	    this.sheet.style.backgroundColor = 'white';
	    this.sheet.style.willChange = 'box-shadow, transform, opacity, border-radius, left, right, top, bottom';
	    this.baseView.append(this.sheet);
	  }

	  scheduleResize(from, to, start = 0, end = 1) {//this.schedule(this.sheet, sheetResizeKeyframes, start, end)
	  }

	  scheduleSheetResize(start = 0, end = 1) {
	    var keyframes = this.calculateResizeKeyframes(this.origin, this.newView);
	    this.schedule(this.sheet, keyframes, start, end);
	  }

	  scheduleSheetTransform(start = 0, end = 1) {}

	  getKeyframes(node) {
	    this.nodes = this.nodes || new Map();
	    var keyframes = this.nodes.get(node) || {
	      translateX: 0,
	      translateY: 0,
	      scaleX: 1,
	      scaleY: 1
	    };
	    this.nodes.set(node, keyframes);
	    return keyframes;
	  }

	  async transitionSheet($from, $to) {
	    console.log('$from', $from);
	    console.log('$to', $to);
	    var fromBbox = $from.getBoundingClientRect();
	    var toBbox = $to.getBoundingClientRect();
	    var fromComputed = window.getComputedStyle($from);
	    var toComputed = window.getComputedStyle($to);
	    var sheet = document.createElement('div');
	    var keyframes = {
	      top: [fromBbox.top + 'px', toBbox.top + 'px'],
	      left: [fromBbox.left + 'px', toBbox.left + 'px'],
	      width: [fromBbox.width + 'px', toBbox.width + 'px'],
	      height: [fromBbox.height + 'px', toBbox.height + 'px'],
	      backgroundColor: [fromComputed.backgroundColor, toComputed.backgroundColor],
	      borderRadius: [fromComputed.borderRadius, toComputed.borderRadius] //boxShadow: [fromComputed.boxShadow || 'var(--elevation-6)', toComputed.boxShadow || 'var(--elevation-0)'],
	      //clipPath: [`inset(0px 0px 0px 0px round ${this.newComputed.borderRadius})`, 'inset(0px 0px 0px 0px round 0px)']

	    };
	    Object.assign(sheet.style, {
	      position: 'absolute',
	      //zIndex: 2,
	      zIndex: 102
	    });
	    document.body.append(sheet);
	    console.log('sheet', sheet);
	    console.log('keyframes', keyframes);
	    $to.style.visibility = 'hidden';
	    this.schedule(sheet, keyframes);
	    await this.finished;
	    $to.style.visibility = '';
	    sheet.remove();
	    /*
	    		var $fromView = $from.parentElement.parentElement
	    		var {duration, easing, fill} = this
	    		console.log('$fromView', $fromView)
	    		$fromView.animate({
	    			opacity: [1, 0]
	    		}, {
	    			delay: 0.5 * duration,
	    			duration: 0.5 * duration,
	    			//delay: 0.2 * duration,
	    			//duration: 0.6 * duration,
	    			easing,
	    			fill
	    		})
	    */
	  }

	  transitionNode($from, $to, options = {}) {
	    var fromBbox = $from.getBoundingClientRect();
	    var toBbox = $to.getBoundingClientRect();
	    var fromTransform = [`translate(0, 0)`, `translate(${toBbox.left - fromBbox.left}px, ${toBbox.top - fromBbox.top}px)`];
	    var toTransform = [`translate(${fromBbox.left - toBbox.left}px, ${fromBbox.top - toBbox.top}px)`, `translate(0, 0)`];

	    if (options.scale !== false) {
	      fromTransform[0] += ` scale(1, 1)`;
	      fromTransform[1] += ` scale(${toBbox.width / fromBbox.width}, ${toBbox.height / fromBbox.height})`;
	      toTransform[0] += ` scale(${fromBbox.width / toBbox.width}, ${fromBbox.height / toBbox.height})`;
	      toTransform[1] += ` scale(1, 1)`;
	    }

	    var duration = 400;
	    var fill = 'both';
	    var easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)';
	    $from.animate({
	      transformOrigin: ['top left', 'top left'],
	      transform: fromTransform,
	      opacity: [1, 0]
	    }, {
	      duration,
	      easing,
	      fill
	    });
	    $to.animate({
	      transformOrigin: ['top left', 'top left'],
	      transform: toTransform,
	      opacity: [0, 1]
	    }, {
	      duration,
	      easing,
	      fill
	    });
	  }

	}

	exports.AnimationOrchestrator = AnimationOrchestrator;
	exports.Transition = Transition;
	exports.ViewTransition = ViewTransition;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=flexus.js.map
