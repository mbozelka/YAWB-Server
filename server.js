

var app = require('http').createServer();
var io = require('socket.io')(app);

app.listen(8080);

// global vars
var activeRooms = {};

io.on('connection', function (client) {
  
  var addedUser = false;
  
  client.on('joining-room', function(msg){
    if (addedUser) return;
    
    addedUser = true;
    client.user = msg.user;
    client.roomId = msg.room;
    addUserToRoom(client.roomId, client);
    
    activeRooms[client.roomId].map(mappedClient => {
      mappedClient.emit('user-joining', mappedClient.user);
      if(mappedClient !== client){
        mappedClient.emit('announce-user', mappedClient.user.fname + ' ' + mappedClient.user.lname);
      }
    });
    
  });
  
  client.on('disconnect', function(){ 
    console.log('user left the room ');
    activeRooms[client.roomId].map(mappedClient => {
      mappedClient.emit('user-leaving', mappedClient.user);
      mappedClient.emit('announce-leaving', client.user.fname + ' ' + client.user.lname);
    });
  });
});


function addUserToRoom(roomId, client){
  if(typeof activeRooms[roomId] === 'undefined'){
    activeRooms[roomId] = [];
  }
  activeRooms[roomId].push(client);
}