/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas. Dual MIT/BSD license */
/*! NOTE: If you're already including a window.matchMedia polyfill via Modernizr or otherwise, you don't need this part */

window.matchMedia = window.matchMedia || (function( doc, undefined ) {

  "use strict";

  var bool,
      docElem = doc.documentElement,
      refNode = docElem.firstElementChild || docElem.firstChild,
      // fakeBody required for <FF4 when executed in <head>
      fakeBody = doc.createElement( "body" ),
      div = doc.createElement( "div" );

  div.id = "mq-test-1";
  div.style.cssText = "position:absolute;top:-100em";
  fakeBody.style.background = "none";
  fakeBody.appendChild(div);

  return function(q){

    div.innerHTML = "&shy;<style media=\"" + q + "\"> #mq-test-1 { width: 42px; }</style>";

    docElem.insertBefore( fakeBody, refNode );
    bool = div.offsetWidth === 42;
    docElem.removeChild( fakeBody );

    return {
      matches: bool,
      media: q
    };

  };

}( document ));





/*! Respond.js v1.1.0: min/max-width media query polyfill. (c) Scott Jehl. MIT/GPLv2 Lic. j.mp/respondjs  */
(function( win ){

  "use strict";

  //exposed namespace
  var respond = {};
  win.respond = respond;

  //define update even in native-mq-supporting browsers, to avoid errors
  respond.update = function(){};

  //expose media query support flag for external use
  respond.mediaQueriesSupported = win.matchMedia && win.matchMedia( "only all" ).matches;

  //if media queries are supported, exit here
  if( respond.mediaQueriesSupported ){
    return;
  }

  //define vars
  var doc = win.document,
    docElem = doc.documentElement,
    mediastyles = [],
    rules = [],
    appendedEls = [],
    parsedSheets = {},
    resizeThrottle = 30,
    head = doc.getElementsByTagName( "head" )[0] || docElem,
    base = doc.getElementsByTagName( "base" )[0],
    links = head.getElementsByTagName( "link" ),
    requestQueue = [],

    //loop stylesheets, send text content to translate
    ripCSS = function(){

      for( var i = 0; i < links.length; i++ ){
        var sheet = links[ i ],
        href = sheet.href,
        media = sheet.media,
        isCSS = sheet.rel && sheet.rel.toLowerCase() === "stylesheet";

        //only links plz and prevent re-parsing
        if( !!href && isCSS && !parsedSheets[ href ] ){
          // selectivizr exposes css through the rawCssText expando
          if (sheet.styleSheet && sheet.styleSheet.rawCssText) {
            translate( sheet.styleSheet.rawCssText, href, media );
            parsedSheets[ href ] = true;
          } else {
            if( (!/^([a-zA-Z:]*\/\/)/.test( href ) && !base) ||
              href.replace( RegExp.$1, "" ).split( "/" )[0] === win.location.host ){
              requestQueue.push( {
                href: href,
                media: media
              } );
            }
          }
        }
      }
      makeRequests();
    },

    //recurse through request queue, get css text
    makeRequests  = function(){
      if( requestQueue.length ){
        var thisRequest = requestQueue.shift();

        ajax( thisRequest.href, function( styles ){
          translate( styles, thisRequest.href, thisRequest.media );
          parsedSheets[ thisRequest.href ] = true;

          // by wrapping recursive function call in setTimeout
          // we prevent "Stack overflow" error in IE7
          win.setTimeout(function(){ makeRequests(); },0);
        } );
      }
    },

    //find media blocks in css text, convert to style blocks
    translate = function( styles, href, media ){
      var qs = styles.match(  /@media[^\{]+\{([^\{\}]*\{[^\}\{]*\})+/gi ),
        ql = qs && qs.length || 0;

      //try to get CSS path
      href = href.substring( 0, href.lastIndexOf( "/" ) );

      var repUrls = function( css ){
          return css.replace( /(url\()['"]?([^\/\)'"][^:\)'"]+)['"]?(\))/g, "$1" + href + "$2$3" );
        },
        useMedia = !ql && media;

      //if path exists, tack on trailing slash
      if( href.length ){ href += "/"; }

      //if no internal queries exist, but media attr does, use that
      //note: this currently lacks support for situations where a media attr is specified on a link AND
        //its associated stylesheet has internal CSS media queries.
        //In those cases, the media attribute will currently be ignored.
      if( useMedia ){
        ql = 1;
      }

      for( var i = 0; i < ql; i++ ){
        var fullq, thisq, eachq, eql;

        //media attr
        if( useMedia ){
          fullq = media;
          rules.push( repUrls( styles ) );
        }
        //parse for styles
        else{
          fullq = qs[ i ].match( /@media *([^\{]+)\{([\S\s]+?)$/ ) && RegExp.$1;
          rules.push( RegExp.$2 && repUrls( RegExp.$2 ) );
        }

        eachq = fullq.split( "," );
        eql = eachq.length;

        for( var j = 0; j < eql; j++ ){
          thisq = eachq[ j ];
          mediastyles.push( {
            media : thisq.split( "(" )[ 0 ].match( /(only\s+)?([a-zA-Z]+)\s?/ ) && RegExp.$2 || "all",
            rules : rules.length - 1,
            hasquery : thisq.indexOf("(") > -1,
            minw : thisq.match( /\(\s*min\-width\s*:\s*(\s*[0-9\.]+)(px|em)\s*\)/ ) && parseFloat( RegExp.$1 ) + ( RegExp.$2 || "" ),
            maxw : thisq.match( /\(\s*max\-width\s*:\s*(\s*[0-9\.]+)(px|em)\s*\)/ ) && parseFloat( RegExp.$1 ) + ( RegExp.$2 || "" )
          } );
        }
      }

      applyMedia();
    },

    lastCall,

    resizeDefer,

    // returns the value of 1em in pixels
    getEmValue = function() {
      var ret,
        div = doc.createElement('div'),
        body = doc.body,
        fakeUsed = false;

      div.style.cssText = "position:absolute;font-size:1em;width:1em";

      if( !body ){
        body = fakeUsed = doc.createElement( "body" );
        body.style.background = "none";
      }

      body.appendChild( div );

      docElem.insertBefore( body, docElem.firstChild );

      ret = div.offsetWidth;

      if( fakeUsed ){
        docElem.removeChild( body );
      }
      else {
        body.removeChild( div );
      }

      //also update eminpx before returning
      ret = eminpx = parseFloat(ret);

      return ret;
    },

    //cached container for 1em value, populated the first time it's needed
    eminpx,

    //enable/disable styles
    applyMedia = function( fromResize ){
      var name = "clientWidth",
        docElemProp = docElem[ name ],
        currWidth = doc.compatMode === "CSS1Compat" && docElemProp || doc.body[ name ] || docElemProp,
        styleBlocks = {},
        lastLink = links[ links.length-1 ],
        now = (new Date()).getTime();

      //throttle resize calls
      if( fromResize && lastCall && now - lastCall < resizeThrottle ){
        win.clearTimeout( resizeDefer );
        resizeDefer = win.setTimeout( applyMedia, resizeThrottle );
        return;
      }
      else {
        lastCall = now;
      }

      for( var i in mediastyles ){
        if( mediastyles.hasOwnProperty( i ) ){
          var thisstyle = mediastyles[ i ],
            min = thisstyle.minw,
            max = thisstyle.maxw,
            minnull = min === null,
            maxnull = max === null,
            em = "em";

          if( !!min ){
            min = parseFloat( min ) * ( min.indexOf( em ) > -1 ? ( eminpx || getEmValue() ) : 1 );
          }
          if( !!max ){
            max = parseFloat( max ) * ( max.indexOf( em ) > -1 ? ( eminpx || getEmValue() ) : 1 );
          }

          // if there's no media query at all (the () part), or min or max is not null, and if either is present, they're true
          if( !thisstyle.hasquery || ( !minnull || !maxnull ) && ( minnull || currWidth >= min ) && ( maxnull || currWidth <= max ) ){
            if( !styleBlocks[ thisstyle.media ] ){
              styleBlocks[ thisstyle.media ] = [];
            }
            styleBlocks[ thisstyle.media ].push( rules[ thisstyle.rules ] );
          }
        }
      }

      //remove any existing respond style element(s)
      for( var j in appendedEls ){
        if( appendedEls.hasOwnProperty( j ) ){
          if( appendedEls[ j ] && appendedEls[ j ].parentNode === head ){
            head.removeChild( appendedEls[ j ] );
          }
        }
      }

      //inject active styles, grouped by media type
      for( var k in styleBlocks ){
        if( styleBlocks.hasOwnProperty( k ) ){
          var ss = doc.createElement( "style" ),
            css = styleBlocks[ k ].join( "\n" );

          ss.type = "text/css";
          ss.media = k;

          //originally, ss was appended to a documentFragment and sheets were appended in bulk.
          //this caused crashes in IE in a number of circumstances, such as when the HTML element had a bg image set, so appending beforehand seems best. Thanks to @dvelyk for the initial research on this one!
          head.insertBefore( ss, lastLink.nextSibling );

          if ( ss.styleSheet ){
            ss.styleSheet.cssText = css;
          }
          else {
            ss.appendChild( doc.createTextNode( css ) );
          }

          //push to appendedEls to track for later removal
          appendedEls.push( ss );
        }
      }
    },
    //tweaked Ajax functions from Quirksmode
    ajax = function( url, callback ) {
      var req = xmlHttp();
      if (!req){
        return;
      }
      req.open( "GET", url, true );
      req.onreadystatechange = function () {
        if ( req.readyState !== 4 || req.status !== 200 && req.status !== 304 ){
          return;
        }
        callback( req.responseText );
      };
      if ( req.readyState === 4 ){
        return;
      }
      req.send( null );
    },
    //define ajax obj
    xmlHttp = (function() {
      var xmlhttpmethod = false;
      try {
        xmlhttpmethod = new win.XMLHttpRequest();
      }
      catch( e ){
        xmlhttpmethod = new win.ActiveXObject( "Microsoft.XMLHTTP" );
      }
      return function(){
        return xmlhttpmethod;
      };
    })();

  //translate CSS
  ripCSS();

  //expose update for re-running respond later on
  respond.update = ripCSS;

  //adjust on resize
  function callMedia(){
    applyMedia( true );
  }
  if( win.addEventListener ){
    win.addEventListener( "resize", callMedia, false );
  }
  else if( win.attachEvent ){
    win.attachEvent( "onresize", callMedia );
  }
})(this);

/*! responsive-nav.js v1.0.14
 * https://github.com/viljamis/responsive-nav.js
 * http://responsive-nav.com
 *
 * Copyright (c) 2013 @viljamis
 * Available under the MIT license
 */

/* jshint strict:false, forin:false, noarg:true, noempty:true, eqeqeq:true,
boss:true, bitwise:true, browser:true, devel:true, indent:2 */
/* exported responsiveNav */

var responsiveNav = (function (window, document) {

  var computed = !!window.getComputedStyle;

  // getComputedStyle polyfill
  if (!window.getComputedStyle) {
    window.getComputedStyle = function(el) {
      this.el = el;
      this.getPropertyValue = function(prop) {
        var re = /(\-([a-z]){1})/g;
        if (prop === "float") {
          prop = "styleFloat";
        }
        if (re.test(prop)) {
          prop = prop.replace(re, function () {
            return arguments[2].toUpperCase();
          });
        }
        return el.currentStyle[prop] ? el.currentStyle[prop] : null;
      };
      return this;
    };
  }

  var nav,
    opts,
    navToggle,
    docEl = document.documentElement,
    head = document.getElementsByTagName("head")[0],
    styleElement = document.createElement("style"),
    navOpen = false,

    // fn arg can be an object or a function, thanks to handleEvent
    // read more at: http://www.thecssninja.com/javascript/handleevent
    addEvent = function (el, evt, fn, bubble) {
      if ("addEventListener" in el) {
        // BBOS6 doesn't support handleEvent, catch and polyfill
        try {
          el.addEventListener(evt, fn, bubble);
        } catch (e) {
          if (typeof fn === "object" && fn.handleEvent) {
            el.addEventListener(evt, function (e) {
              // Bind fn as this and set first arg as event object
              fn.handleEvent.call(fn, e);
            }, bubble);
          } else {
            throw e;
          }
        }
      } else if ("attachEvent" in el) {
        // check if the callback is an object and contains handleEvent
        if (typeof fn === "object" && fn.handleEvent) {
          el.attachEvent("on" + evt, function () {
            // Bind fn as this
            fn.handleEvent.call(fn);
          });
        } else {
          el.attachEvent("on" + evt, fn);
        }
      }
    },

    removeEvent = function (el, evt, fn, bubble) {
      if ("removeEventListener" in el) {
        try {
          el.removeEventListener(evt, fn, bubble);
        } catch (e) {
          if (typeof fn === "object" && fn.handleEvent) {
            el.removeEventListener(evt, function (e) {
              fn.handleEvent.call(fn, e);
            }, bubble);
          } else {
            throw e;
          }
        }
      } else if ("detachEvent" in el) {
        if (typeof fn === "object" && fn.handleEvent) {
          el.detachEvent("on" + evt, function () {
            fn.handleEvent.call(fn);
          });
        } else {
          el.detachEvent("on" + evt, fn);
        }
      }
    },

    getFirstChild = function (e) {
      var firstChild = e.firstChild;
      // skip TextNodes
      while (firstChild !== null && firstChild.nodeType !== 1) {
        firstChild = firstChild.nextSibling;
      }
      return firstChild;
    },

    setAttributes = function (el, attrs) {
      for (var key in attrs) {
        el.setAttribute(key, attrs[key]);
      }
    },

    addClass = function (el, cls) {
      el.className += " " + cls;
      el.className = el.className.replace(/(^\s*)|(\s*$)/g,"");
    },

    removeClass = function (el, cls) {
      var reg = new RegExp("(\\s|^)" + cls + "(\\s|$)");
      el.className = el.className.replace(reg, " ").replace(/(^\s*)|(\s*$)/g,"");
    },

    ResponsiveNav = function (el, options) {
      var i;

      // Default options
      this.options = {
        animate: true,        // Boolean: Use CSS3 transitions, true or false
        transition: 400,      // Integer: Speed of the transition, in milliseconds
        label: "Menu",        // String: Label for the navigation toggle
        insert: "after",      // String: Insert the toggle before or after the navigation
        customToggle: "",     // Selector: Specify the ID of a custom toggle
        openPos: "relative",  // String: Position of the opened nav, relative or static
        jsClass: "js",        // String: 'JS enabled' class which is added to <html> el
        init: function(){},   // Function: Init callback
        open: function(){},   // Function: Open callback
        close: function(){}   // Function: Close callback
      };

      // User defined options
      for (i in options) {
        this.options[i] = options[i];
      }

      // Adds "js" class for <html>
      addClass(docEl, this.options.jsClass);

      // Wrapper
      this.wrapperEl = el.replace("#", "");
      if (document.getElementById(this.wrapperEl)) {
        this.wrapper = document.getElementById(this.wrapperEl);
      } else {
        // If el doesn't exists, stop here.
        throw new Error("The nav element you are trying to select doesn't exist");
      }

      // Inner wrapper
      this.wrapper.inner = getFirstChild(this.wrapper);

      // For minification
      opts = this.options;
      nav = this.wrapper;

      // Init
      this._init(this);
    };

  ResponsiveNav.prototype = {
    // Public methods
    destroy: function () {
      this._removeStyles();
      removeClass(nav, "closed");
      removeClass(nav, "opened");
      nav.removeAttribute("style");
      nav.removeAttribute("aria-hidden");
      nav = null;
      _instance = null;

      removeEvent(window, "load", this, false);
      removeEvent(window, "resize", this, false);
      removeEvent(navToggle, "mousedown", this, false);
      removeEvent(navToggle, "touchstart", this, false);
      removeEvent(navToggle, "touchend", this, false);
      removeEvent(navToggle, "keyup", this, false);
      removeEvent(navToggle, "click", this, false);

      if (!opts.customToggle) {
        navToggle.parentNode.removeChild(navToggle);
      } else {
        navToggle.removeAttribute("aria-hidden");
      }
    },

    toggle: function () {
      if (!navOpen) {
        removeClass(nav, "closed");
        addClass(nav, "opened");
        nav.style.position = opts.openPos;
        setAttributes(nav, {"aria-hidden": "false"});

        navOpen = true;
        opts.open();
      } else {
        removeClass(nav, "opened");
        addClass(nav, "closed");
        setAttributes(nav, {"aria-hidden": "true"});

        if (opts.animate) {
          setTimeout(function () {
            nav.style.position = "relative";
          }, opts.transition + 10);
        } else {
          nav.style.position = "relative";
        }

        navOpen = false;
        opts.close();
      }
    },

    handleEvent: function (e) {
      var evt = e || window.event;

      switch (evt.type) {
      case "mousedown":
        this._onmousedown(evt);
        break;
      case "touchstart":
        this._ontouchstart(evt);
        break;
      case "touchend":
        this._ontouchend(evt);
        break;
      case "keyup":
        this._onkeyup(evt);
        break;
      case "click":
        this._onclick(evt);
        break;
      case "load":
        this._transitions(evt);
        this._resize(evt);
        break;
      case "resize":
        this._resize(evt);
        break;
      }
    },

    // Private methods
    _init: function () {
      addClass(nav, "closed");
      this._createToggle();

      addEvent(window, "load", this, false);
      addEvent(window, "resize", this, false);
      addEvent(navToggle, "mousedown", this, false);
      addEvent(navToggle, "touchstart", this, false);
      addEvent(navToggle, "touchend", this, false);
      addEvent(navToggle, "keyup", this, false);
      addEvent(navToggle, "click", this, false);
    },

    _createStyles: function () {
      if (!styleElement.parentNode) {
        head.appendChild(styleElement);
      }
    },

    _removeStyles: function () {
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    },

    _createToggle: function () {
      if (!opts.customToggle) {
        var toggle = document.createElement("a");
        toggle.innerHTML = opts.label;
        setAttributes(toggle, {
          "href": "#",
          "id": "nav-toggle"
        });

        if (opts.insert === "after") {
          nav.parentNode.insertBefore(toggle, nav.nextSibling);
        } else {
          nav.parentNode.insertBefore(toggle, nav);
        }

        navToggle = document.getElementById("nav-toggle");
      } else {
        var toggleEl = opts.customToggle.replace("#", "");

        if (document.getElementById(toggleEl)) {
          navToggle = document.getElementById(toggleEl);
        } else {
          throw new Error("The custom nav toggle you are trying to select doesn't exist");
        }
      }
    },

    _preventDefault: function(e) {
      if (e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        e.returnValue = false;
      }
    },

    _onmousedown: function (e) {
      var evt = e || window.event;
      // If the user isn't right clicking:
      if (!(evt.which === 3 || evt.button === 2)) {
        this._preventDefault(e);
        this.toggle(e);
      }
    },

    _ontouchstart: function (e) {
      // Touchstart event fires before
      // the mousedown and can wipe it
      navToggle.onmousedown = null;
      this._preventDefault(e);
      this.toggle(e);
    },

    _ontouchend: function () {
      // Prevents ghost click from happening on some Android browsers
      var that = this;
      nav.addEventListener("click", that._preventDefault, true);
      setTimeout(function () {
        nav.removeEventListener("click", that._preventDefault, true);
      }, opts.transition);
    },

    _onkeyup: function (e) {
      var evt = e || window.event;
      if (evt.keyCode === 13) {
        this.toggle(e);
      }
    },

    _onclick: function (e) {
      // For older browsers (looking at IE)
      this._preventDefault(e);
    },

    _transitions: function () {
      if (opts.animate) {
        var objStyle = nav.style,
          transition = "max-height " + opts.transition + "ms";

        objStyle.WebkitTransition = transition;
        objStyle.MozTransition = transition;
        objStyle.OTransition = transition;
        objStyle.transition = transition;
      }
    },

    _calcHeight: function () {
      var savedHeight = nav.inner.offsetHeight,
        innerStyles = "#" + this.wrapperEl + ".opened{max-height:" + savedHeight + "px}";

      // Hide from old IE
      if (computed) {
        styleElement.innerHTML = innerStyles;
        innerStyles = "";
      }
    },

    _resize: function () {
      if (window.getComputedStyle(navToggle, null).getPropertyValue("display") !== "none") {
        setAttributes(navToggle, {"aria-hidden": "false"});

        // If the navigation is hidden
        if (nav.className.match(/(^|\s)closed(\s|$)/)) {
          setAttributes(nav, {"aria-hidden": "true"});
          nav.style.position = "absolute";
        }

        this._createStyles();
        this._calcHeight();
      } else {
        setAttributes(navToggle, {"aria-hidden": "true"});
        setAttributes(nav, {"aria-hidden": "false"});
        nav.style.position = opts.openPos;
        this._removeStyles();
      }

      // Init callback
      opts.init();
    }

  };

  var _instance;
  function rn (el, options) {
    if (!_instance) {
      _instance = new ResponsiveNav(el, options);
    }
    return _instance;
  }

  return rn;
})(window, document);


/*global jQuery */
/*jshint multistr:true browser:true */
/*!
* FitVids 1.0
*
* Copyright 2011, Chris Coyier - http://css-tricks.com + Dave Rupert - http://daverupert.com
* Credit to Thierry Koblentz - http://www.alistapart.com/articles/creating-intrinsic-ratios-for-video/
* Released under the WTFPL license - http://sam.zoy.org/wtfpl/
*
* Date: Thu Sept 01 18:00:00 2011 -0500
*/

(function( $ ){

  "use strict";

  $.fn.fitVids = function( options ) {
    var settings = {
      customSelector: null
    };

    var div = document.createElement('div'),
        ref = document.getElementsByTagName('base')[0] || document.getElementsByTagName('script')[0];

    div.className = 'fit-vids-style';
    div.innerHTML = '&shy;<style>         \
      .fluid-width-video-wrapper {        \
         width: 100%;                     \
         position: relative;              \
         padding: 0;                      \
      }                                   \
                                          \
      .fluid-width-video-wrapper iframe,  \
      .fluid-width-video-wrapper object,  \
      .fluid-width-video-wrapper embed {  \
         position: absolute;              \
         top: 0;                          \
         left: 0;                         \
         width: 100%;                     \
         height: 100%;                    \
      }                                   \
    </style>';

    ref.parentNode.insertBefore(div,ref);

    if ( options ) {
      $.extend( settings, options );
    }

    return this.each(function(){
      var selectors = [
        "iframe[src*='player.vimeo.com']",
        "iframe[src*='www.youtube.com']",
        "iframe[src*='www.youtube-nocookie.com']",
        "iframe[src*='www.kickstarter.com']",
        "object",
        "embed"
      ];

      if (settings.customSelector) {
        selectors.push(settings.customSelector);
      }

      var $allVideos = $(this).find(selectors.join(','));

      $allVideos.each(function(){
        var $this = $(this);
        if (this.tagName.toLowerCase() === 'embed' && $this.parent('object').length || $this.parent('.fluid-width-video-wrapper').length) { return; }
        var height = ( this.tagName.toLowerCase() === 'object' || ($this.attr('height') && !isNaN(parseInt($this.attr('height'), 10))) ) ? parseInt($this.attr('height'), 10) : $this.height(),
            width = !isNaN(parseInt($this.attr('width'), 10)) ? parseInt($this.attr('width'), 10) : $this.width(),
            aspectRatio = height / width;
        if(!$this.attr('id')){
          var videoID = 'fitvid' + Math.floor(Math.random()*999999);
          $this.attr('id', videoID);
        }
        $this.wrap('<div class="fluid-width-video-wrapper"></div>').parent('.fluid-width-video-wrapper').css('padding-top', (aspectRatio * 100)+"%");
        $this.removeAttr('height').removeAttr('width');
      });
    });
  };
})( jQuery );

/*! Plugin options and other jQuery stuff */

// Responsive Nav
var navigation = responsiveNav("#site-nav", { // Selector: The ID of the wrapper
  animate: true, // Boolean: Use CSS3 transitions, true or false
  transition: 400, // Integer: Speed of the transition, in milliseconds
  label: "<i class='icon-reorder'></i> Menu", // String: Label for the navigation toggle
  insert: "before", // String: Insert the toggle before or after the navigation
  customToggle: "", // Selector: Specify the ID of a custom toggle
  openPos: "relative", // String: Position of the opened nav, relative or static
  jsClass: "js", // String: 'JS enabled' class which is added to <html> el
  init: function(){}, // Function: Init callback
  open: function(){}, // Function: Open callback
  close: function(){} // Function: Close callback
});

// FitVids options
$(function() {
	$("article").fitVids();
});

// Magnific Popup v0.9.5 by Dmitry Semenov
// http://bit.ly/magnific-popup#build=image+gallery+retina+imagezoom+fastclick
(function(a){var b="Close",c="BeforeClose",d="AfterClose",e="BeforeAppend",f="MarkupParse",g="Open",h="Change",i="mfp",j="."+i,k="mfp-ready",l="mfp-removing",m="mfp-prevent-close",n,o=function(){},p=!!window.jQuery,q,r=a(window),s,t,u,v,w,x=function(a,b){n.ev.on(i+a+j,b)},y=function(b,c,d,e){var f=document.createElement("div");return f.className="mfp-"+b,d&&(f.innerHTML=d),e?c&&c.appendChild(f):(f=a(f),c&&f.appendTo(c)),f},z=function(b,c){n.ev.triggerHandler(i+b,c),n.st.callbacks&&(b=b.charAt(0).toLowerCase()+b.slice(1),n.st.callbacks[b]&&n.st.callbacks[b].apply(n,a.isArray(c)?c:[c]))},A=function(){(n.st.focus?n.content.find(n.st.focus).eq(0):n.wrap).focus()},B=function(b){if(b!==w||!n.currTemplate.closeBtn)n.currTemplate.closeBtn=a(n.st.closeMarkup.replace("%title%",n.st.tClose)),w=b;return n.currTemplate.closeBtn},C=function(){a.magnificPopup.instance||(n=new o,n.init(),a.magnificPopup.instance=n)},D=function(b){if(a(b).hasClass(m))return;var c=n.st.closeOnContentClick,d=n.st.closeOnBgClick;if(c&&d)return!0;if(!n.content||a(b).hasClass("mfp-close")||n.preloader&&b===n.preloader[0])return!0;if(b!==n.content[0]&&!a.contains(n.content[0],b)){if(d&&a.contains(document,b))return!0}else if(c)return!0;return!1},E=function(){var a=document.createElement("p").style,b=["ms","O","Moz","Webkit"];if(a.transition!==undefined)return!0;while(b.length)if(b.pop()+"Transition"in a)return!0;return!1};o.prototype={constructor:o,init:function(){var b=navigator.appVersion;n.isIE7=b.indexOf("MSIE 7.")!==-1,n.isIE8=b.indexOf("MSIE 8.")!==-1,n.isLowIE=n.isIE7||n.isIE8,n.isAndroid=/android/gi.test(b),n.isIOS=/iphone|ipad|ipod/gi.test(b),n.supportsTransition=E(),n.probablyMobile=n.isAndroid||n.isIOS||/(Opera Mini)|Kindle|webOS|BlackBerry|(Opera Mobi)|(Windows Phone)|IEMobile/i.test(navigator.userAgent),s=a(document.body),t=a(document),n.popupsCache={}},open:function(b){var c;if(b.isObj===!1){n.items=b.items.toArray(),n.index=0;var d=b.items,e;for(c=0;c<d.length;c++){e=d[c],e.parsed&&(e=e.el[0]);if(e===b.el[0]){n.index=c;break}}}else n.items=a.isArray(b.items)?b.items:[b.items],n.index=b.index||0;if(n.isOpen){n.updateItemHTML();return}n.types=[],v="",b.mainEl&&b.mainEl.length?n.ev=b.mainEl.eq(0):n.ev=t,b.key?(n.popupsCache[b.key]||(n.popupsCache[b.key]={}),n.currTemplate=n.popupsCache[b.key]):n.currTemplate={},n.st=a.extend(!0,{},a.magnificPopup.defaults,b),n.fixedContentPos=n.st.fixedContentPos==="auto"?!n.probablyMobile:n.st.fixedContentPos,n.st.modal&&(n.st.closeOnContentClick=!1,n.st.closeOnBgClick=!1,n.st.showCloseBtn=!1,n.st.enableEscapeKey=!1),n.bgOverlay||(n.bgOverlay=y("bg").on("click"+j,function(){n.close()}),n.wrap=y("wrap").attr("tabindex",-1).on("click"+j,function(a){D(a.target)&&n.close()}),n.container=y("container",n.wrap)),n.contentContainer=y("content"),n.st.preloader&&(n.preloader=y("preloader",n.container,n.st.tLoading));var h=a.magnificPopup.modules;for(c=0;c<h.length;c++){var i=h[c];i=i.charAt(0).toUpperCase()+i.slice(1),n["init"+i].call(n)}z("BeforeOpen"),n.st.showCloseBtn&&(n.st.closeBtnInside?(x(f,function(a,b,c,d){c.close_replaceWith=B(d.type)}),v+=" mfp-close-btn-in"):n.wrap.append(B())),n.st.alignTop&&(v+=" mfp-align-top"),n.fixedContentPos?n.wrap.css({overflow:n.st.overflowY,overflowX:"hidden",overflowY:n.st.overflowY}):n.wrap.css({top:r.scrollTop(),position:"absolute"}),(n.st.fixedBgPos===!1||n.st.fixedBgPos==="auto"&&!n.fixedContentPos)&&n.bgOverlay.css({height:t.height(),position:"absolute"}),n.st.enableEscapeKey&&t.on("keyup"+j,function(a){a.keyCode===27&&n.close()}),r.on("resize"+j,function(){n.updateSize()}),n.st.closeOnContentClick||(v+=" mfp-auto-cursor"),v&&n.wrap.addClass(v);var l=n.wH=r.height(),m={};if(n.fixedContentPos&&n._hasScrollBar(l)){var o=n._getScrollbarSize();o&&(m.paddingRight=o)}n.fixedContentPos&&(n.isIE7?a("body, html").css("overflow","hidden"):m.overflow="hidden");var p=n.st.mainClass;n.isIE7&&(p+=" mfp-ie7"),p&&n._addClassToMFP(p),n.updateItemHTML(),z("BuildControls"),a("html").css(m),n.bgOverlay.add(n.wrap).prependTo(document.body),n._lastFocusedEl=document.activeElement,setTimeout(function(){n.content?(n._addClassToMFP(k),A()):n.bgOverlay.addClass(k),t.on("focusin"+j,function(b){if(b.target!==n.wrap[0]&&!a.contains(n.wrap[0],b.target))return A(),!1})},16),n.isOpen=!0,n.updateSize(l),z(g)},close:function(){if(!n.isOpen)return;z(c),n.isOpen=!1,n.st.removalDelay&&!n.isLowIE&&n.supportsTransition?(n._addClassToMFP(l),setTimeout(function(){n._close()},n.st.removalDelay)):n._close()},_close:function(){z(b);var c=l+" "+k+" ";n.bgOverlay.detach(),n.wrap.detach(),n.container.empty(),n.st.mainClass&&(c+=n.st.mainClass+" "),n._removeClassFromMFP(c);if(n.fixedContentPos){var e={paddingRight:""};n.isIE7?a("body, html").css("overflow",""):e.overflow="",a("html").css(e)}t.off("keyup"+j+" focusin"+j),n.ev.off(j),n.wrap.attr("class","mfp-wrap").removeAttr("style"),n.bgOverlay.attr("class","mfp-bg"),n.container.attr("class","mfp-container"),n.st.showCloseBtn&&(!n.st.closeBtnInside||n.currTemplate[n.currItem.type]===!0)&&n.currTemplate.closeBtn&&n.currTemplate.closeBtn.detach(),n._lastFocusedEl&&a(n._lastFocusedEl).focus(),n.currItem=null,n.content=null,n.currTemplate=null,n.prevHeight=0,z(d)},updateSize:function(a){if(n.isIOS){var b=document.documentElement.clientWidth/window.innerWidth,c=window.innerHeight*b;n.wrap.css("height",c),n.wH=c}else n.wH=a||r.height();n.fixedContentPos||n.wrap.css("height",n.wH),z("Resize")},updateItemHTML:function(){var b=n.items[n.index];n.contentContainer.detach(),n.content&&n.content.detach(),b.parsed||(b=n.parseEl(n.index));var c=b.type;z("BeforeChange",[n.currItem?n.currItem.type:"",c]),n.currItem=b;if(!n.currTemplate[c]){var d=n.st[c]?n.st[c].markup:!1;z("FirstMarkupParse",d),d?n.currTemplate[c]=a(d):n.currTemplate[c]=!0}u&&u!==b.type&&n.container.removeClass("mfp-"+u+"-holder");var e=n["get"+c.charAt(0).toUpperCase()+c.slice(1)](b,n.currTemplate[c]);n.appendContent(e,c),b.preloaded=!0,z(h,b),u=b.type,n.container.prepend(n.contentContainer),z("AfterChange")},appendContent:function(a,b){n.content=a,a?n.st.showCloseBtn&&n.st.closeBtnInside&&n.currTemplate[b]===!0?n.content.find(".mfp-close").length||n.content.append(B()):n.content=a:n.content="",z(e),n.container.addClass("mfp-"+b+"-holder"),n.contentContainer.append(n.content)},parseEl:function(b){var c=n.items[b],d=c.type;c.tagName?c={el:a(c)}:c={data:c,src:c.src};if(c.el){var e=n.types;for(var f=0;f<e.length;f++)if(c.el.hasClass("mfp-"+e[f])){d=e[f];break}c.src=c.el.attr("data-mfp-src"),c.src||(c.src=c.el.attr("href"))}return c.type=d||n.st.type||"inline",c.index=b,c.parsed=!0,n.items[b]=c,z("ElementParse",c),n.items[b]},addGroup:function(a,b){var c=function(c){c.mfpEl=this,n._openClick(c,a,b)};b||(b={});var d="click.magnificPopup";b.mainEl=a,b.items?(b.isObj=!0,a.off(d).on(d,c)):(b.isObj=!1,b.delegate?a.off(d).on(d,b.delegate,c):(b.items=a,a.off(d).on(d,c)))},_openClick:function(b,c,d){var e=d.midClick!==undefined?d.midClick:a.magnificPopup.defaults.midClick;if(!e&&(b.which===2||b.ctrlKey||b.metaKey))return;var f=d.disableOn!==undefined?d.disableOn:a.magnificPopup.defaults.disableOn;if(f)if(a.isFunction(f)){if(!f.call(n))return!0}else if(r.width()<f)return!0;b.type&&(b.preventDefault(),n.isOpen&&b.stopPropagation()),d.el=a(b.mfpEl),d.delegate&&(d.items=c.find(d.delegate)),n.open(d)},updateStatus:function(a,b){if(n.preloader){q!==a&&n.container.removeClass("mfp-s-"+q),!b&&a==="loading"&&(b=n.st.tLoading);var c={status:a,text:b};z("UpdateStatus",c),a=c.status,b=c.text,n.preloader.html(b),n.preloader.find("a").on("click",function(a){a.stopImmediatePropagation()}),n.container.addClass("mfp-s-"+a),q=a}},_addClassToMFP:function(a){n.bgOverlay.addClass(a),n.wrap.addClass(a)},_removeClassFromMFP:function(a){this.bgOverlay.removeClass(a),n.wrap.removeClass(a)},_hasScrollBar:function(a){return(n.isIE7?t.height():document.body.scrollHeight)>(a||r.height())},_parseMarkup:function(b,c,d){var e;d.data&&(c=a.extend(d.data,c)),z(f,[b,c,d]),a.each(c,function(a,c){if(c===undefined||c===!1)return!0;e=a.split("_");if(e.length>1){var d=b.find(j+"-"+e[0]);if(d.length>0){var f=e[1];f==="replaceWith"?d[0]!==c[0]&&d.replaceWith(c):f==="img"?d.is("img")?d.attr("src",c):d.replaceWith('<img src="'+c+'" class="'+d.attr("class")+'" />'):d.attr(e[1],c)}}else b.find(j+"-"+a).html(c)})},_getScrollbarSize:function(){if(n.scrollbarSize===undefined){var a=document.createElement("div");a.id="mfp-sbm",a.style.cssText="width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;",document.body.appendChild(a),n.scrollbarSize=a.offsetWidth-a.clientWidth,document.body.removeChild(a)}return n.scrollbarSize}},a.magnificPopup={instance:null,proto:o.prototype,modules:[],open:function(a,b){return C(),a||(a={}),a.isObj=!0,a.index=b||0,this.instance.open(a)},close:function(){return a.magnificPopup.instance.close()},registerModule:function(b,c){c.options&&(a.magnificPopup.defaults[b]=c.options),a.extend(this.proto,c.proto),this.modules.push(b)},defaults:{disableOn:0,key:null,midClick:!1,mainClass:"",preloader:!0,focus:"",closeOnContentClick:!1,closeOnBgClick:!0,closeBtnInside:!0,showCloseBtn:!0,enableEscapeKey:!0,modal:!1,alignTop:!1,removalDelay:0,fixedContentPos:"auto",fixedBgPos:"auto",overflowY:"auto",closeMarkup:'<button title="%title%" type="button" class="mfp-close">&times;</button>',tClose:"Cerrar (Esc)",tLoading:"Cargando..."}},a.fn.magnificPopup=function(b){C();var c=a(this);if(typeof b=="string")if(b==="open"){var d,e=p?c.data("magnificPopup"):c[0].magnificPopup,f=parseInt(arguments[1],10)||0;e.items?d=e.items[f]:(d=c,e.delegate&&(d=d.find(e.delegate)),d=d.eq(f)),n._openClick({mfpEl:d},c,e)}else n.isOpen&&n[b].apply(n,Array.prototype.slice.call(arguments,1));else p?c.data("magnificPopup",b):c[0].magnificPopup=b,n.addGroup(c,b);return c};var F,G=function(b){if(b.data&&b.data.title!==undefined)return b.data.title;var c=n.st.image.titleSrc;if(c){if(a.isFunction(c))return c.call(n,b);if(b.el)return b.el.attr(c)||""}return""};a.magnificPopup.registerModule("image",{options:{markup:'<div class="mfp-figure"><div class="mfp-close"></div><div class="mfp-img"></div><div class="mfp-bottom-bar"><div class="mfp-title"></div><div class="mfp-counter"></div></div></div>',cursor:"mfp-zoom-out-cur",titleSrc:"title",verticalFit:!0,tError:'<a href="%url%">The image</a> could not be loaded.'},proto:{initImage:function(){var a=n.st.image,c=".image";n.types.push("image"),x(g+c,function(){n.currItem.type==="image"&&a.cursor&&s.addClass(a.cursor)}),x(b+c,function(){a.cursor&&s.removeClass(a.cursor),r.off("resize"+j)}),x("Resize"+c,n.resizeImage),n.isLowIE&&x("AfterChange",n.resizeImage)},resizeImage:function(){var a=n.currItem;if(!a||!a.img)return;if(n.st.image.verticalFit){var b=0;n.isLowIE&&(b=parseInt(a.img.css("padding-top"),10)+parseInt(a.img.css("padding-bottom"),10)),a.img.css("max-height",n.wH-b)}},_onImageHasSize:function(a){a.img&&(a.hasSize=!0,F&&clearInterval(F),a.isCheckingImgSize=!1,z("ImageHasSize",a),a.imgHidden&&(n.content&&n.content.removeClass("mfp-loading"),a.imgHidden=!1))},findImageSize:function(a){var b=0,c=a.img[0],d=function(e){F&&clearInterval(F),F=setInterval(function(){if(c.naturalWidth>0){n._onImageHasSize(a);return}b>200&&clearInterval(F),b++,b===3?d(10):b===40?d(50):b===100&&d(500)},e)};d(1)},getImage:function(b,c){var d=0,e=function(){b&&(b.img[0].complete?(b.img.off(".mfploader"),b===n.currItem&&(n._onImageHasSize(b),n.updateStatus("ready")),b.hasSize=!0,b.loaded=!0,z("ImageLoadComplete")):(d++,d<200?setTimeout(e,100):f()))},f=function(){b&&(b.img.off(".mfploader"),b===n.currItem&&(n._onImageHasSize(b),n.updateStatus("error",g.tError.replace("%url%",b.src))),b.hasSize=!0,b.loaded=!0,b.loadError=!0)},g=n.st.image,h=c.find(".mfp-img");if(h.length){var i=document.createElement("img");i.className="mfp-img",b.img=a(i).on("load.mfploader",e).on("error.mfploader",f),i.src=b.src,h.is("img")&&(b.img=b.img.clone()),b.img[0].naturalWidth>0&&(b.hasSize=!0)}return n._parseMarkup(c,{title:G(b),img_replaceWith:b.img},b),n.resizeImage(),b.hasSize?(F&&clearInterval(F),b.loadError?(c.addClass("mfp-loading"),n.updateStatus("error",g.tError.replace("%url%",b.src))):(c.removeClass("mfp-loading"),n.updateStatus("ready")),c):(n.updateStatus("loading"),b.loading=!0,b.hasSize||(b.imgHidden=!0,c.addClass("mfp-loading"),n.findImageSize(b)),c)}}});var H,I=function(){return H===undefined&&(H=document.createElement("p").style.MozTransform!==undefined),H};a.magnificPopup.registerModule("zoom",{options:{enabled:!1,easing:"ease-in-out",duration:300,opener:function(a){return a.is("img")?a:a.find("img")}},proto:{initZoom:function(){var a=n.st.zoom,d=".zoom";if(!a.enabled||!n.supportsTransition)return;var e=a.duration,f=function(b){var c=b.clone().removeAttr("style").removeAttr("class").addClass("mfp-animated-image"),d="all "+a.duration/1e3+"s "+a.easing,e={position:"fixed",zIndex:9999,left:0,top:0,"-webkit-backface-visibility":"hidden"},f="transition";return e["-webkit-"+f]=e["-moz-"+f]=e["-o-"+f]=e[f]=d,c.css(e),c},g=function(){n.content.css("visibility","visible")},h,i;x("BuildControls"+d,function(){if(n._allowZoom()){clearTimeout(h),n.content.css("visibility","hidden"),image=n._getItemToZoom();if(!image){g();return}i=f(image),i.css(n._getOffset()),n.wrap.append(i),h=setTimeout(function(){i.css(n._getOffset(!0)),h=setTimeout(function(){g(),setTimeout(function(){i.remove(),image=i=null,z("ZoomAnimationEnded")},16)},e)},16)}}),x(c+d,function(){if(n._allowZoom()){clearTimeout(h),n.st.removalDelay=e;if(!image){image=n._getItemToZoom();if(!image)return;i=f(image)}i.css(n._getOffset(!0)),n.wrap.append(i),n.content.css("visibility","hidden"),setTimeout(function(){i.css(n._getOffset())},16)}}),x(b+d,function(){n._allowZoom()&&(g(),i&&i.remove())})},_allowZoom:function(){return n.currItem.type==="image"},_getItemToZoom:function(){return n.currItem.hasSize?n.currItem.img:!1},_getOffset:function(b){var c;b?c=n.currItem.img:c=n.st.zoom.opener(n.currItem.el||n.currItem);var d=c.offset(),e=parseInt(c.css("padding-top"),10),f=parseInt(c.css("padding-bottom"),10);d.top-=a(window).scrollTop()-e;var g={width:c.width(),height:(p?c.innerHeight():c[0].offsetHeight)-f-e};return I()?g["-moz-transform"]=g.transform="translate("+d.left+"px,"+d.top+"px)":(g.left=d.left,g.top=d.top),g}}});var J=function(a){var b=n.items.length;return a>b-1?a-b:a<0?b+a:a},K=function(a,b,c){return a.replace("%curr%",b+1).replace("%total%",c)};a.magnificPopup.registerModule("gallery",{options:{enabled:!1,arrowMarkup:'<button title="%title%" type="button" class="mfp-arrow mfp-arrow-%dir%"></button>',preload:[0,2],navigateByImgClick:!0,arrows:!0,tPrev:"Anterior",tNext:"Siguiente",tCounter:"%curr% de %total%"},proto:{initGallery:function(){var c=n.st.gallery,d=".mfp-gallery",e=Boolean(a.fn.mfpFastClick);n.direction=!0;if(!c||!c.enabled)return!1;v+=" mfp-gallery",x(g+d,function(){c.navigateByImgClick&&n.wrap.on("click"+d,".mfp-img",function(){if(n.items.length>1)return n.next(),!1}),t.on("keydown"+d,function(a){a.keyCode===37?n.prev():a.keyCode===39&&n.next()})}),x("UpdateStatus"+d,function(a,b){b.text&&(b.text=K(b.text,n.currItem.index,n.items.length))}),x(f+d,function(a,b,d,e){var f=n.items.length;d.counter=f>1?K(c.tCounter,e.index,f):""}),x("BuildControls"+d,function(){if(n.items.length>1&&c.arrows&&!n.arrowLeft){var b=c.arrowMarkup,d=n.arrowLeft=a(b.replace("%title%",c.tPrev).replace("%dir%","left")).addClass(m),f=n.arrowRight=a(b.replace("%title%",c.tNext).replace("%dir%","right")).addClass(m),g=e?"mfpFastClick":"click";d[g](function(){n.prev()}),f[g](function(){n.next()}),n.isIE7&&(y("b",d[0],!1,!0),y("a",d[0],!1,!0),y("b",f[0],!1,!0),y("a",f[0],!1,!0)),n.container.append(d.add(f))}}),x(h+d,function(){n._preloadTimeout&&clearTimeout(n._preloadTimeout),n._preloadTimeout=setTimeout(function(){n.preloadNearbyImages(),n._preloadTimeout=null},16)}),x(b+d,function(){t.off(d),n.wrap.off("click"+d),n.arrowLeft&&e&&n.arrowLeft.add(n.arrowRight).destroyMfpFastClick(),n.arrowRight=n.arrowLeft=null})},next:function(){n.direction=!0,n.index=J(n.index+1),n.updateItemHTML()},prev:function(){n.direction=!1,n.index=J(n.index-1),n.updateItemHTML()},goTo:function(a){n.direction=a>=n.index,n.index=a,n.updateItemHTML()},preloadNearbyImages:function(){var a=n.st.gallery.preload,b=Math.min(a[0],n.items.length),c=Math.min(a[1],n.items.length),d;for(d=1;d<=(n.direction?c:b);d++)n._preloadItem(n.index+d);for(d=1;d<=(n.direction?b:c);d++)n._preloadItem(n.index-d)},_preloadItem:function(b){b=J(b);if(n.items[b].preloaded)return;var c=n.items[b];c.parsed||(c=n.parseEl(b)),z("LazyLoad",c),c.type==="image"&&(c.img=a('<img class="mfp-img" />').on("load.mfploader",function(){c.hasSize=!0}).on("error.mfploader",function(){c.hasSize=!0,c.loadError=!0,z("LazyLoadError",c)}).attr("src",c.src)),c.preloaded=!0}}});var L="retina";a.magnificPopup.registerModule(L,{options:{replaceSrc:function(a){return a.src.replace(/\.\w+$/,function(a){return"@2x"+a})},ratio:1},proto:{initRetina:function(){if(window.devicePixelRatio>1){var a=n.st.retina,b=a.ratio;b=isNaN(b)?b():b,b>1&&(x("ImageHasSize."+L,function(a,c){c.img.css({"max-width":c.img[0].naturalWidth/b,width:"100%"})}),x("ElementParse."+L,function(c,d){d.src=a.replaceSrc(d,b)}))}}}}),function(){var b=1e3,c="ontouchstart"in window,d=function(){r.off("touchmove"+f+" touchend"+f)},e="mfpFastClick",f="."+e;a.fn.mfpFastClick=function(e){return a(this).each(function(){var g=a(this),h;if(c){var i,j,k,l,m,n;g.on("touchstart"+f,function(a){l=!1,n=1,m=a.originalEvent?a.originalEvent.touches[0]:a.touches[0],j=m.clientX,k=m.clientY,r.on("touchmove"+f,function(a){m=a.originalEvent?a.originalEvent.touches:a.touches,n=m.length,m=m[0];if(Math.abs(m.clientX-j)>10||Math.abs(m.clientY-k)>10)l=!0,d()}).on("touchend"+f,function(a){d();if(l||n>1)return;h=!0,a.preventDefault(),clearTimeout(i),i=setTimeout(function(){h=!1},b),e()})})}g.on("click"+f,function(){h||e()})})},a.fn.destroyMfpFastClick=function(){a(this).off("touchstart"+f+" click"+f),c&&r.off("touchmove"+f+" touchend"+f)}}()})(window.jQuery||window.Zepto)

//Custom Medula
'use strict';

var tools = {
  scrollTo: function(element){
     $('html, body').animate({ scrollTop: $(element).offset().top }, 1000);
  },
  trim: function(string){
    return string.replace(/^\s+/g,'').replace(/\s+$/g,'');
  },
  msgBox: function(element, id){
    if(element == ''){
      if($('#msgbox-'+id).length > 0) {
        $('#msgbox-'+id).remove();
      }
    } else {
      if($('#msgbox-'+id).length == 0) {
        var top = $(element).offset().top;
        var right = $(element).offset().right;
        var right = ($(window).width() - ($(element).offset().left + $(element).outerWidth()));
        $("body").append('<div id="msgbox-'+id+'" data-parent=\''+element+'\' class="error-box" style="top: '+top+'px; right: '+right+'px;"> ! </div>');
      }
    }
  },
  msgBoxResize: function(){
    $(window).resize(function() {
      $('div[id^="msgbox-"]').each(function(){
        var element = $(this).attr('data-parent');
        var top = $(element).offset().top;
        var right = $(element).offset().right;
        var right = ($(window).width() - ($(element).offset().left + $(element).outerWidth()));
        $(this).css('top', top);
        $(this).css('right', right);
      });
    });
  }
}

var quote = {
    init: function(){
      var that = this;
      var products = new Array();
      $('.cake > h2').each(function(){
        products.push($(this).html());
      });
      var i = 0;
      $('.cake-quote').each(function(){
        var product = products[i++];
        $(this).click(function(){
          that.doQuote(product);
        })
      });
    },
    doQuote: function(product){
      var txt =  $('textarea');
      var quote = 'Hola, estoy interesado/a en el producto "'+product+'" ';
      if($(txt).val() != ''){
        if(confirm('Al parecer tienes un mensaje escrito en el formulario. Presiona "Aceptar" para sobre-escribir tu mensaje o "Cancelar" para mentener tu mensaje original.')){
          $(txt).focus().val(quote);
          tools.scrollTo('textarea');
        }
      } else {
        $(txt).focus().val(quote);
        tools.scrollTo('textarea');
      }
    }
};

var menu = {
  init: function(){
    var sections = ['business', 'cakes', 'contact'];
    var i = 0;
    $('#site-nav ul li').each(function(){
      var section = sections[i++];
      $(this).click(function(){
        tools.scrollTo('#'+section);
        return false;
      });
    });
  }
};

var contact = {

  user: { name: '', phone: '', email: '', msg: '' },
  init: function(){
    var that = this;
    $('input[type="submit"]').click(function(){
      if(that.checkForm()){
        that.send();
      }
      return false;
    })
  },
  checkForm: function(){
    var valid = true;
    this.user.name = tools.trim($('input[name="name"]').val());
    this.user.phone = tools.trim($('input[name="phone"]').val());
    this.user.email = tools.trim($('input[name="email"]').val());
    this.user.msg = tools.trim($('textarea[name="msg"]').val());
    var user = this.user;
    //Validate
    if(user.name == ''){
      tools.msgBox('input[name="name"]', 'name');
      valid = false;
    } else {
      tools.msgBox('', 'name'); // Remove box
    }
    if(user.email == ''){
        tools.msgBox('input[name="email"]', 'email');
        valid = false;
    } else {
      tools.msgBox('', 'email');
    }
    if (user.msg == ''){
       tools.msgBox('textarea[name="msg"]', 'msg');
       valid = false;
    } else {
      tools.msgBox('', 'msg');
    }
    return valid;
  },
  send: function(){
    var that = this;
    $.ajax({
      dataType: 'jsonp',
      url: "http://getsimpleform.com/messages/ajax?form_api_token="+simpleFormToken,
      data: {
        name: that.user.name,
        message: "E-mail: "+that.user.email+"\nTeléfono: "+that.user.phone+"\nMensaje: "+that.user.msg+"\n"
      }
    }).done(function() {
      $('.home-contact').append('<div class="msg-contact">Gracias por contarme. Tu mensaje ha sido enviado.</div>');
      $('#contact-form').slideUp(1500, function(){
        $('.msg-contact').slideDown(1000);
      });
    }).error(function(){
      alert('No se ha podido enviar el mensaje. Inténtalo nuevamente.');
    });
  }
}

$(function() {
  quote.init();
  menu.init();
  contact.init();
  tools.msgBoxResize();

  $('.zoom-gallery').magnificPopup({
    delegate: 'a',
    type: 'image',
    closeOnContentClick: false,
    closeBtnInside: false,
    mainClass: 'mfp-with-zoom mfp-img-mobile',
    image: {
      verticalFit: true
    },
    gallery: {
      enabled: true
    }
  });

});