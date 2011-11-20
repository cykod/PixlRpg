(function(server){
  var _ = require('underscore');

  /* Screen */
  var Screen = function(ctx) {
    this.w = 100;
    this.h = 100;

    this.ctx = ctx;
    this.blocks = [];
    this.tiles = [];

    _(_.range(this.h)).each(function(y) {
      var row = [];
      _(_.range(this.w)).each(function(x) {
        row.push(0);
      },this);
      this.tiles.push(row);
    },this);

    this.x = 0;
    this.y = 0;
    this.z= 0.5;
    this.blocksHash = {};
  }

  Screen.prototype.add = function(blck) {
    this.blocksHash[blck.id] = blck;
    this.blocks.push(blck);
    return blck;
  }

  Screen.prototype.setTile = function(x,y,tile) {
    this.tiles[y][x] = tile;
  }

  Screen.prototype.render = function() {
    if(this.resized) {
      this.resized = false;
      this.ctx.canvas.width = this.clientW;
      this.ctx.canvas.height = this.clientH;
    }

    this.ctx.save();
    this.ctx.scale(this.z,this.z);
    this.ctx.translate(this.x,this.y);

    this.blocks.sort(function(a,b) {
        return a.v.z - b.v.z;
    });

    for(var ty=0;ty<this.h;ty++) {
      for(var tx=0;tx<this.w;tx++) {
        if(this.tiles[ty][tx]) {
          this.tiles[ty][tx].render(this.ctx,tx*50,ty*50);
        }

      }
    }

    for(var i = 0, len = this.blocks.length;i<len;i++) {
      this.blocks[i].render(this.ctx);
    }
    this.ctx.restore();
  }

  Screen.prototype.zoom = function(dest) {
    this.z = dest;
    this.zooming = true;
  }


  Screen.prototype.update = function(dt) {
    for(var i = 0, len = this.blocks.length;i<len;i++) {
      this.blocks[i].update(dt);
    }
  }

  Screen.prototype.setPosition = function(x,y) {
    this.x = x;
    this.y = y;
  }


  Screen.prototype.setDimensions = function(clientW,clientH) {
    this.clientW = clientW;
    this.clientH = clientH;

    this.resized = true;
  }

  Screen.prototype.clear = function() {
    this.ctx.clearRect(0,0,this.clientW,this.clientH);
  }

  Screen.prototype.follow = function(block) {
    var destX = -block.v.x - block.v.w / 2 + this.clientW / this.z/ 2;
    var destY =  -block.v.y - block.v.h / 2 + this.clientH / this.z / 2;

    if(this.zooming) {
      this.setPosition(destX,destY);
      this.zooming = false;
    } else {
      this.setPosition((destX - this.x)/3 + this.x, (destY - this.y)/3 + this.y);
    }
  }

  Screen.prototype.sendScene = function(player) {
   return [ player.v ].concat(_(this.blocks).map(function(b) { return b == player ? null : b.v }));
  }

  Screen.prototype.sendStep = function() {
   return _(this.blocks).map(function(b) { return  b.v });
  }

  Screen.prototype.step = function(data) {
   _(data).each(function(v) {
      var obj = this.blocksHash[v.id];
      if(!obj) {
        this.add(new Pixl.Block(v));
      } else {
        _(obj.v).extend(v);
      }
    },this);
  };

  Screen.prototype.action = function(v) {
      var obj = this.blocksHash[v.id];
      if(!obj) {
        this.add(new Pixl.Block(v));
      } else {
        _(obj.v).extend(v);
      }
  };

  Screen.prototype.remove = function(block) {

    var idx = this.blocks.indexOf(block);
    if(idx != -1) {
      this.blocks.splice(idx,1);
    }

  };

  if(server) {
    module.exports = Screen;
  } else {
    Pixl.Screen= Screen;
  }


})(typeof exports != 'undefined');
