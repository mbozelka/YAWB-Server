var app = require('http').createServer();
var io = require('socket.io')(app);
var roomUsers = io.of('/room-users');
var activeRooms = {};

app.listen(8080);
/**
* connection that handles room users comming and going
* and maps shared room data to correct users
*/
roomUsers.on('connection', function (client) {

   var addedUser = false;

   /**
   * anytime a user joins the room
   * they get added to a particular room list
   * and connections are made.
   */
   client.on('joining-room', function(msg){
      if (addedUser) return;
      var clients = [];

      addedUser = true;
      client.user = msg.user;
      client.roomId = msg.room;
      addUserToRoom(client.roomId, client);
      client.join(client.roomId);

      activeRooms[client.roomId].map(mappedClient => {
         clients.push(mappedClient.user);
         if(mappedClient !== client){
            mappedClient.emit('announce-user', client.user.fname + ' ' + client.user.lname);
         }
      });
      roomUsers.emit('user-joining', clients);

   });


   /**
   * events related to sending board data
   * between clients in a particular room
   */
   client.on('drawing-points', function(data){
      roomUsers.in(client.roomId).emit('emited-drawing-points', data);
   });

   client.on('finalize-board', function(data){
      roomUsers.in(client.roomId).emit('emited-finalize-board', data);
   });

   client.on('clear-board', function(){
      roomUsers.in(client.roomId).emit('emited-clear-board');
   });

   client.on('undo-history', function(){
      roomUsers.in(client.roomId).emit('emited-undo-history');
   });

   client.on('adding-text', function(data){
      roomUsers.in(client.roomId).emit('emited-text-added', data);
   });


   // Audio/Video connection code

   client.on('make-offer', function (data) {
      roomUsers.in(client.roomId).emit('offer-made', {
         offer: data.offer,
         client: client.id
      });
   });

   client.on('make-answer', function (data) {
      client.to(data.to).emit('answer-made', {
         client: client.id,
         answer: data.answer
      });
   });

   /**
   *
   * handle disconnect when a user leaves
   * the room. Also announce the user
   * has left to everyone else int he room
   *
   */
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


/**
*
* helper functions
*/
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
