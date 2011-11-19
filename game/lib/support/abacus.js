(function( window ) {

  // Declare initial Abacus object
  // this file should always load first
  var Abacus = {},

  // Localize references to commonly used methods
  slice = [].slice,
  toString = {}.toString,
  hasOwn = {}.hasOwnProperty;

  // Declare global Abacus methods

  // Abacus.guid()
  // [Source http://www.broofa.com/2008/09/javascript-uuid-function/]
  // Returns RFC 4122-compliant UUID
  Abacus.guid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }).toUpperCase();
  };

  // Abacus.clone()
  // Returns deep copy of obj
  Abacus.clone = function( obj ) {

    var temp = [],
        ctorName, val, length, i;

    if ( Array.isArray( obj ) ) {

      for ( i = 0, length = obj.length; i < length; i++ ) {
        // Store reference to this array item's value
        val = obj[ i ];

        // If array item is an object (including arrays), derive new value by cloning
        if ( typeof val === 'object' ) {
          val = Abacus.clone( val );
        }

        temp[ i ] = val;
      }
      return temp;
    }

    // Determine constructor name from obj prototype
    ctorName = Object.getPrototypeOf( obj ).constructor.name;

    // Copy ArrayBufferView objects
    if ( /(.+)Array$/.test( ctorName ) ) {
      return new window[ ctorName ]( obj );
    }

    // Create a new object whose prototype is a new, empty object,
    // Using the second propertiesObject argument to copy the source properties
    return Object.create({}, (function( src ) {

      // Store reference to non-inherited properties,
      var properties = {};

      Object.getOwnPropertyNames( src ).forEach(function( name ) {

        var descriptor = Object.getOwnPropertyDescriptor( src, name );

        // Recurse on properties whose value is an object or array
        if ( typeof src[ name ] === 'object' ) {
          descriptor.value = Abacus.clone( src[ name ] );
        }

        properties[ name ] = descriptor;

      });

      return properties;

    })( obj ));
  };

  // Abacus.extend( dest, [ ... ] )
  // Returns extended destination object
  Abacus.extend = function( dest /* ... */ ) {
    var copy, prop,
        sources = slice.call( arguments, 1 ),
        sourcesLen = sources.length,
        i = 0;

    for ( ; i < sourcesLen; i++ ) {
      copy = Abacus.clone( sources[ i ] );

      for ( prop in copy ) {
        dest[ prop ] = copy[ prop ];
      }
    }

    return dest;
  };

  // Abacus.noop
  // No operation function expression literal
  Abacus.noop = function() {};

  // Abacus.identity( arg )
  // Returns the same value that was used as its argument
  Abacus.identity = function( arg ) {
    return arg;
  };

  // Abacus.prefix
  // This user agent's vendor prefix
  Abacus.prefix = (function( window ) {
    return [ 'webkit', 'moz', 'ms', 'o' ].filter(function( val ) {
      return val + 'RequestAnimationFrame' in window;
    })[ 0 ] || '';
  })( window );

  // Expose global Abacus object
  window.Abacus = Abacus;

})( this );

(function( window, Abacus ) {

  var requestAnimFrame = (function(){
    // thanks paul irish
    return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function( callback, element ) {
      window.setTimeout( callback, 1000 / 60 );
    };
  })();

      // An array of callbacks to call in our rAF
  var callbackQueue = [],
      // the function we call on each tick of the rAF
      timerLoop = function() {

        var queueLength = callbackQueue.length,
        i = queueLength - 1;

        // If there are callbacks, then run the loop again
        if ( queueLength ) {
          requestAnimFrame( timerLoop );
        }

        timerLoop.running = !!queueLength;

        // Iterate and execute all callbacks in the queue
        for ( ; i >= 0; --i ) {
          callbackQueue[ i ]();
        }
      };

  // Timer constructor (internal)
  // Mapped from calls to Abacus.timer( options )
  function Timer( options ) {
    // options is expected to have optional
    // callback and element properties

    options = options || {};

    // Ensure an id is created for this Timer instance
    this.id = options.id || Abacus.guid();

    // Instance tracking properties
    this.lastTick = 0;
    this.lastStart = 0;
    this.until = 0;
    this.isPaused = false;
    this.timing = {
      delta: 0,
      sinceStart: 0,

      // how many times callback is called
      ticks: 0
    };

    // Define own property loop() function closure
    this.loop = function() {
      var now = Date.now();

      this.timing.delta = now - this.lastTick;
      this.timing.sinceStart = now - this.lastStart;
      this.lastTick = now;

      // Check to see if the timer is paused, or run over until time but ran
      // at least once
      if ( this.isPaused ||
            ( this.until != null && this.lastTick - this.lastStart > this.until ) &&
            this.timing.ticks !== 0 ) {

        this.stop();

        if ( options.complete ) {
          options.complete( this.timing );
        }
      } else {

        // If there is a callback pass the timing to it
        if ( options.callback ) {
          // Set the callback's context to this Timer instance
          options.callback.call( this, this.timing );
        }

        // zero index, add after call
        this.timing.ticks++;
      }

    }.bind( this );


    // Define own property stop() function closure
    this.stop = function() {

      callbackQueue.splice( callbackQueue.indexOf( this.loop || Abacus.noop ), 1 );

    }.bind( this );

    return this;
  }

  Timer.prototype = {
    start: function( until ) {
      this.lastStart = Date.now();
      this.until = until;
      this.lastTick = this.lastStart;
      this.isPaused = false;

      callbackQueue.push( this.loop );

      if ( !timerLoop.running ) {
        requestAnimFrame( timerLoop );
      }
    },
    pause: function() {
      this.isPaused = true;
    }
  };

  // Wrap new Timer() construction in Abacus.timer() API
  Abacus.timer = function( options ) {
    return new Timer( options );
  };

})( this, this.Abacus );

(function( window, Abacus ) {

  var types = {
    // index - value between 0 and 1 inclusive
    'linear': function( start, stop, index ) {
      return ( stop - start ) * index + start;
    }
  };

  function tweenFn( tween ) {
    var type;

    if ( tween ) {

      type = typeof tween;

      // If tween is a string, return correct tweening method
      // from stored tweening methods by type name
      if ( type === 'string' ) {
        return types[ tween ] || Abacus.noop;
      }

      // If type is a function, return as is
      if ( type === 'function' ) {
        return tween;
      }
    }
    return Abacus.noop;
  }

  // Tween constructor (internal)
  // Mapped from calls to Abacus.tween( options )
  function Tween( options ) {

    options = options || {};

    this.index = options.index || 0;
    this.start = options.start || 0;
    this.stop = options.stop || 0;

    var tweening = tweenFn( options.type );

    this.get = function( preferredIndex ) {
      if ( preferredIndex != null ) {
        this.index = preferredIndex;
      }
      return tweening( this.start, this.stop, this.index );
    }; //step

    Object.defineProperty( this, 'type', {
      get: function() {
        return tweening;
      },
      set: function( val ) {
        tweenFn( val );
      }
    });
  }

  // Abacus.tween( options )
  // Returns new Tween object instance
  Abacus.tween = function( options ) {
    return new Tween( options );
  };

})( this, this.Abacus );

(function( window, Abacus ) {

  function getConstructorName( obj ) {
    var ctorName = typeof obj == 'object' ?
      Object.getPrototypeOf( obj ).constructor.name :
      'NotObject';

    return ctorName;
  }

  function isTypedArray( arr ) {
    var ctorName = getConstructorName( arr );

    if ( /(.+)Array$/.test( ctorName ) ) {
      return true;
    }
    return false;
  }

  // doTween( ... )
  // recursively tween values
  function doTween( lastValue, nextValue, tweenable, keys, target, tween, index ) {
    var i = -1,
        halfKeys = keys.length / 2,
        key,
        tweenableElement;

    while ( ++i < halfKeys ) {
      key = keys[ i ];
      tweenableElement = tweenable[ i ];

      if ( tweenableElement === true ) {
        target[ key ] = tween(
          lastValue[ key ],
          nextValue[ key ],
          index
        );
      } else {
        doTween(
          lastValue[ key ],
          nextValue[ key ],
          tweenableElement,
          keys[ halfKeys + i ],
          target[ key ],
          tween,
          index
        );
      }
    }
  }

  function cacheTweenable( values ) {
    var tweenable = [],
        key, length;

    function testTweenable( value ) {
      if ( typeof value == 'number' ) {
        return true;
      }
      return cacheTweenable( value );
    }

    if ( Array.isArray( values ) || isTypedArray( values ) ) {
      for ( key = 0, length = values.length; key < length; key++ ) {
        tweenable.push( testTweenable( values[ key ] ) );
      }
    } else {
      for ( key in values ) {
        tweenable.push( testTweenable( values[ key ] ) );
      }
    }

    return tweenable;
  }

  function cacheKeys( values, keys ) {
    var key, length;

    if ( Array.isArray( values ) || isTypedArray( values ) ) {
      for ( key = 0, length = values.length; key < length; key++ ) {
        keys.push( key );
      }
    } else {
      for ( key in values ) {
        keys.push( key );
      }
    }

    for ( key = 0, length = keys.length; key < length; key++ ) {
      keys.push( cacheKeys( values[ key ] , [] ) );
    }

    return keys;
  }

  // Frame constructor (internal)
  // contains new target value and how to get there
  function Frame( options ) {
    Abacus.extend( this, options );

    if ( this.tween ) {
      this.tween = Abacus.tween({
        type: this.tween
      });
    }

    this.tweenable = cacheTweenable( this.value );

    this.keys = cacheKeys( this.value, [] );
  }

  // Layer constructor (internal)
  // Returns Layer
  function Layer( options ) {
    options = options || {};

    Abacus.extend( this, options );

    if ( this.tween ) {
      this.tween = Abacus.tween({
        type: this.tween
      });
    }

    if ( !this.frames ) {
      this.frames = [];
    }

    // stored index value to avoid constantly looking up the correct frame
    this.frameIndex = -1;
  }

  Layer.prototype = {

    // Layer.reset
    // reset internal values to the start of the layer
    reset: function() {
      this.frameIndex = -1;
    },

    // Layer.addFrame(frame)
    // insert animation.frame object according to frame.index. returns Layer
    addFrame: function( frame ) {
      var frameAdded = false,
          framesLength = this.frames.length,
          i = 0;

      if ( !(frame instanceof Frame) ) {
        frame = Abacus.animation.frame(frame);
      }

      for ( ; i < framesLength; i++ ) {
        if ( this.frames[i].index > frame.index ) {
          this.frames.splice( i, 0, frame );
          frameAdded = true;
          break;
        }
      }

      if ( !frameAdded ) {
        this.frames.push(frame);
      }

      return this;
    },

    // Layer.getFrame( index )
    // return the frame with the given index value
    getFrame: function( index ) {
      var frames = this.frames,
          framesLength = frames.length,
          i = 0;

      for ( ; i < framesLength; i++ ) {
        if ( frames[i].index === index ) {
          return frames[i];
        }
      }

      return null;
    },

    // Layer.removeFrame( index || animation.frame )
    // remove an animation.frame either by its index value or by the frame itself
    removeFrame: function( index ) {
      var frames = this.frames,
          framesLength = frames.length,
          i = 0;

      if ( index instanceof Frame ) {
        // access the index value from the frame
        index = index.index;
      }

      for ( ; i < framesLength; i++ ) {
        if ( frames[i].index === index ) {
          frames.splice( i, 1 );
          break;
        }
      }
    },

    // Layer.step( ... )
    // updates target and returns true if there are no further frames
    step: function( animation, target, timerData ) {
      var sinceStart = timerData.sinceStart / 1000,
          frameIndex = this.frameIndex,
          lastFrame = this.frames[ frameIndex ],
          nextFrame = this.frames[ frameIndex + 1 ],
          framePlus;

      // at end of layer?
      if ( nextFrame == null ) {
        return false;
      }

      if ( lastFrame && lastFrame.index / animation.rate > sinceStart ) {
        return true;
      }

      // increment to the next usable frame
      if ( nextFrame.index / animation.rate <= sinceStart ) {
        for ( frameIndex++; frameIndex < this.frames.length; frameIndex++ ) {

          framePlus = frameIndex + 1;

          // special case for first frame
          if ( frameIndex === 0 && nextFrame.beforeTween ) {
            nextFrame.beforeTween();
          }

          lastFrame = this.frames[ frameIndex ];
          nextFrame = this.frames[ framePlus ];

          if ( nextFrame && nextFrame.beforeTween ) {
            nextFrame.beforeTween();
          }

          if ( lastFrame && lastFrame.afterTween ) {
            lastFrame.afterTween();
          }

          if ( this.frames[ framePlus ] &&
            this.frames[ framePlus ].index / animation.rate > sinceStart ||
            !this.frames[ framePlus ] )
          {
            break;
          }
        }

        this.frameIndex = frameIndex;

        // at end of layer?
        if ( nextFrame == null ) {
          return false;
        }
      }

      if ( lastFrame && nextFrame ) {
        doTween(
          lastFrame.value,
          nextFrame.value,
          nextFrame.tweenable,
          nextFrame.keys,
          target,
          ( nextFrame.tween || this.tween || animation.tween ).type,
          ( sinceStart - lastFrame.index / animation.rate ) *
            animation.rate /
            ( nextFrame.index - lastFrame.index )
        );
      }

      // this layer is not complete
      return true;
    }
  };

  // Animation constructor (internal)
  // Mapped from calls to Abacus.animation( options )
  function Animation( options ) {
    Abacus.extend(this, options);

    if ( this.tween ) {
      this.tween = Abacus.tween({
        type: this.tween
      });
    }

    if ( !this.layers ) {
      this.layers = [];
    }
  }

  Animation.prototype = {

    // Animation.start()
    // Returns Animation
    start: function( target ) {
      var animation = this;

      // timerCallback context |this| is Timer instance
      function timerCallback( timerData ) {

        var layers = animation.layers,
            allComplete = true,
            idx;

        for ( idx = 0; idx < layers.length; idx++ ) {
          allComplete = layers[ idx ].step( animation, target, timerData ) && allComplete;
        }

        if ( !allComplete ) {
          // stop the timer and reset values to the beginning
          animation.stop();
        }
      }

      if ( !this.timer ) {
        this.timer = Abacus.timer({
          callback: timerCallback
        });
      }

      this.timer.start();

      return this;
    },

    // Animation.stop()
    // Returns Animation
    stop: function() {
      if ( this.timer ) {
        this.timer.pause();
      }

      this.reset();

      return this;
    },

    // Animation.reset()
    // Returns Animation
    reset: function() {
      this.layers.forEach(function(layer) {
        layer.reset();
      });

      return this;
    },

    // Animation.addLayer
    // Add new layer. Returns Animation
    addLayer: function( layer ) {
      var index = this.layers.length;

      this.layers.push(layer);
      layer.index = index;

      return this;
    },

    // Animation.layer( number || {} )
    // get layer or shortcut add and get layer
    layer: function( idx ) {

      var layer, options;

      if ( idx == null ) {
        // Create a new layer
        layer = Abacus.animation.layer();

        // Add to current layers
        this.addLayer( layer );

        return layer;
      }

      if ( this.layers[ idx ] ) {
        return this.layers[ idx ];
      }

      if ( typeof idx === 'object' ) {

        options = idx;

        if ( options.index != null ) {
          if ( options.index < this.layers.length ) {
            layer = this.layers[ options.index ];
            Abacus.extend( layer, options );

            return layer;
          }

          // Reaching this block implies an error,
          // layer must already exist for index to be specified
          throw {
            type: 'ArgumentException',
            message: 'layer with given index (' + options.index + ') must exist before calling layer(...) with object',
            argument: options
          };

        } else {
          // shortcut for Abacus.animation.layer
          layer = Abacus.animation.layer( options );

          this.addLayer(layer);

          return layer;
        }
      }

      throw {
        type: 'ArgumentException',
        message: 'layer must be called with undefined, a number, or an object',
        argument: idx
      };
    }
  };

  Abacus.animation = function( options ) {
    return new Animation(options);
  };

  Abacus.animation.layer = function( options ) {
    return new Layer(options);
  };

  Abacus.animation.frame = function( options ) {
    return new Frame(options);
  };

})( this, this.Abacus );