(function(server){
  var _ = require('underscore');

  var Tile = function(options) {
    this.v = {};
    _(this.v).extend({
      color:"white", x: 0, y: 0 
                  },options);
    if(!this.v.id) { 
      this.v.id = _.uniqueId();
    }

    this.id = this.v.id;
    return this;
  };

  Tile.prototype.w = 50;
  Tile.prototype.h = 50;

  Tile.prototype.render = function(ctx,x,y) {
    ctx.fillStyle = this.v.color;
    ctx.fillRect(x,y,this.w,this.h);
  }


  if(server) {
    module.exports = Tile;
  } else {
    Pixl.Tile = Tile;
  }

})(typeof exports != 'undefined');
