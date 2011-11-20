var express =require('express');


var Pixl = require('./lib/engine/pixl.js');
Pixl.Block = require('./lib/engine/block.js');
Pixl.Screen = require('./lib/engine/screen.js');

var app = express.createServer();

app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

var io = require('socket.io').listen(app);
io.set('log level', 1);


app.listen(8080);

var game = Pixl.game = new Pixl.Screen();

game.add(new Pixl.Block({ x:200,y:150 }));
game.add(new Pixl.Block({ x:800,y:150 }));



io.sockets.on('connection', function (socket) {

  var player = game.add(new Pixl.Block({ x:10,y:300, color: '#009900' }));

  socket.set('player',player, function() {
    socket.emit("start", game.sendScene(player));
  });

  
  socket.on('disconnect', function() {
    socket.get('player',function(err,player) {
      game.remove(player);
    });
  });

  socket.on('move',function(data) {
    player.move(data.dx,data.dy);
    io.sockets.emit('action', player.v);
  });

  socket.on('jump', function(data) {
    player.jump();
    io.sockets.emit('action', player.v); 
  });

});

Pixl.gameLoop = function() {

  Pixl.game.update(1000 / 30);
  io.sockets.emit('step', game.sendStep());

}



setInterval(Pixl.gameLoop,1000 /  30);
