
Pixl.scene = function(data) {

  var game = Pixl.game = new Pixl.Screen(Pixl.ctx);

  _(data).each(function(v) {
    if(!v) return; 
    var obj = game.add(new Pixl.Block(v));
    if(!Pixl.player) { Pixl.player = obj; }
  });

}


Pixl.loop = Abacus.timer({
  callback: function( data ) {

    var dx = 0,dy = 0;
    if(Pixl.key('RIGHT_ARROW')) { dx++; } 
    if(Pixl.key('LEFT_ARROW')) { dx--; }
    if(Pixl.key('UP_ARROW')) { dy--; }
    if(Pixl.key('DOWN_ARROW')) { dy++; }

    if(Pixl.key("SPACE")) { Pixl.player.jump(); }
    if(Pixl.key("Z")) { Pixl.game.zoom(Pixl.game.z*1.1); }
    if(Pixl.key("A")) { Pixl.game.zoom(Pixl.game.z*0.9); }

    Pixl.player.move(dx,dy);

    Pixl.game.update(data.delta);

    Pixl.game.clear();
    Pixl.game.follow(Pixl.player);

    Pixl.game.render();
    // data.delta // time since the last tick
    // data.ticks // zero indexed number of ticks
  }
});



Pixl.startGame = function() {

  var container = document.getElementById("container");
  // Reflow handling
  var reflow = function() {
    var clientWidth = container.clientWidth;
    var clientHeight = container.clientHeight;
    Pixl.game.setDimensions(clientWidth, clientHeight);
  };

  window.addEventListener("resize", reflow, false);
  reflow();

  Pixl.loop.start();

};


