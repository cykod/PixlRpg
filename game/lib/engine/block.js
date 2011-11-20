(function(server){
  var _ = require('underscore');

  var Block = function(options) {
    this.v = {};
    _(this.v).extend({corners: 10, z: 1,
                    w: 50, h: 50,
                    ang: 0, 
                    color:"white",
                    moving:0, vx: .5, vy: .5, movingLength: 300, 
                    jumping: 0, jumpingLength: 1000, jumpWait: 0,
                    dx: 0, dy: 0,
                  },options);
    if(!this.v.id) { 
      this.v.id = _.uniqueId();
    }

    this.id = this.v.id;
    return this;
  };


  Block.prototype.mover = [ 0.8,
                                0.9,
                                1.0,
                                1.0,
                                1.0,
                                1.0,
                                1.0,
                                1.0,
                                0.9,
                                0.8,
                                0.8 ];

  Block.prototype.angMover = [ 0.0,
                                 2.0, 
                                 4.0, 
                                 6.0, 
                                 8.0, 
                                 9.0, 
                                 8.0, 
                                 6.0, 
                                 4.0, 
                                 2.0, 
                                 0.0
                                ];

  Block.prototype.render = function(ctx) {
    var v = this.v;
    if(!this.predrawn) { this.predraw(); }

    ctx.save();
    ctx.translate(v.x,v.y);

    ctx.translate(v.w/2,v.h/2);
    ctx.rotate(v.ang * Math.PI / 180);
    ctx.scale(v.z,v.z);
    ctx.translate(-v.w/2,-v.h/2);
    ctx.drawImage(this.buffer,0,0);
    ctx.restore();
  }

  Block.prototype.draw = function(ctx) {
    var v = this.v;

    ctx.fillStyle = v.color;
    roundRect(ctx,0,0,v.w,v.h,v.corners,true);
  }


  Block.prototype.predraw = function() {
    var v = this.v;

    this.buffer = document.createElement('canvas');
    this.buffer.width = v.w;
    this.buffer.height = v.h;
    this.draw(this.buffer.getContext('2d'));
    this.predrawn = true;
  }


  Block.prototype.move = function(dx,dy) {
    var v = this.v;

    if((v.moving <= 0 && (dx || dy))  ||
       (v.moving > 0 && (v.dx != dx || v.dy != dy))) {
      if(!server) {
        this.proxy("move", { dx: dx, dy: dy });
        v.dx = dx;
        v.dy = dy;
      } else {
        v.dx = dx;
        v.dy = dy;
        v.moving = v.movingLength;
      }
    }
  }

  Block.prototype.jump= function() {
    var v = this.v;

    if(v.jumping <= 0 && v.jumpWait <= 0) {
      if(!server) {
        this.proxy("jump", { });
        v.jumpWait = 10;
      } else  {
        v.jumping = v.jumpingLength;
      }

    }
  }

  Block.prototype.proxy = function(msg,data) {
    Pixl.socket.emit(msg,data);

  }

  Block.prototype.update = function(dt) {
    var v = this.v;

    if(v.moving > 0) {
      v.moving-=dt;

     var m =  Math.sin( (v.movingLength - v.moving) * Math.PI / v.movingLength);
     if(v.jumping > 0) m = 0.5;
      
     var angMax = (v.dx || v.dy) ? 7 : 4;
     if(v.jumping > 0) angMax = 0;

      v.ang = (v.dx + v.dy > 0 ? -angMax : angMax) * Math.sin( 2 * (v.movingLength - v.moving) * Math.PI / v.movingLength);
      v.x += dt * v.dx * v.vx * m;
      v.y += dt * v.dy * v.vy * m;
    } else {
      v.ang =0;
    }

    if(v.jumpWait > 0) {
      v.jumpWait-=dt;
    }

    if(v.jumping > 0) {
      v.z = 1 + Math.sin( (v.jumpingLength - v.jumping) * Math.PI / v.jumpingLength);
      v.jumping-=dt;
    }

  }

  if(server) {
    module.exports = Block;
  } else {
    Pixl.Block = Block;
  }

})(typeof exports != 'undefined');
