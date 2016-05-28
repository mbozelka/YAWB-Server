var app = require('http').createServer();
var io = require('socket.io')(app);
var roomUsers = io.of('/room-users');
var boardData = io.of('/board-data');
var activeRooms = {};

app.listen(8080);


/**
 * connection for sending room data
 */
boardData.on('connection', function (client) {
  
  client.on('drawing-points', function(data){
    boardData.emit('emited-drawing-points', data);
  });
  
  client.on('finalize-board', function(data){
    boardData.emit('emited-finalize-board', data);
  });
  
  client.on('clear-board', function(){
    boardData.emit('emited-clear-board');
  });
  
  client.on('undo-history', function(){
    boardData.emit('emited-undo-history');
  });
  
  client.on('adding-text', function(data){
    boardData.emit('emited-text-added', data);
  });
  
});



/**
 * connection that handles room users comming and going
 */
roomUsers.on('connection', function (client) {
  
  var addedUser = false;
  
  client.on('joining-room', function(msg){
    if (addedUser) return;
    var clients = [];
    
    addedUser = true;
    client.user = msg.user;
    client.roomId = msg.room;
    addUserToRoom(client.roomId, client);
    
    activeRooms[client.roomId].map(mappedClient => {
      clients.push(mappedClient.user);
      if(mappedClient !== client){
        mappedClient.emit('announce-user', mappedClient.user.fname + ' ' + mappedClient.user.lname);
      }
    });
    roomUsers.emit('user-joining', clients);
    
  });
  
  client.on('disconnect', function(){ 
    roomUsers.emit('user-leaving', client.user);
    activeRooms[client.roomId].map(mappedClient => {
      if(mappedClient !== client){
        mappedClient.emit('announce-leaving', client.user.fname + ' ' + client.user.lname);
      }
    });
    removeUserFromRoom(client.roomId, client);
  });
  
});


function addUserToRoom(roomId, client){
  if(typeof activeRooms[roomId] === 'undefined'){
    activeRooms[roomId] = [];
  }
  activeRooms[roomId].push(client);
}

function removeUserFromRoom(roomId, client){
  var index = activeRooms[roomId].indexOf(client);
  if(index > -1){
    activeRooms[roomId].splice(index, 1);
  }
}