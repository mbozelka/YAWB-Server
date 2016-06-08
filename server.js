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
      roomUsers.in(client.roomId).emit('user-joining', clients);

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
   
   client.on('toggle-board', function(data){
      roomUsers.in(client.roomId).emit('emited-toggle-board', data);
   });

   client.on('update-page', function(data){
      roomUsers.in(client.roomId).emit('emited-update-page', data);
   });

   // Audio/Video connection code
   
   /**
    * sets up a one - many connection between owner and users
    */
   client.on('message', function (data) {
      
      activeRooms[client.roomId].map(mappedClient => {
          // calling client is not the owner, 
          // and the mapped client is the owner
          // send message to owner
          if(!client.user.owner && mappedClient.user.owner){
               mappedClient.emit('message', data); 
          }
          
          // owner is sending the message 
          // to the apporopriate peer connection
          else if(mappedClient.user.uid === data.to){
              mappedClient.emit('message', data);
          }
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
      var clients = [];
      removeUserFromRoom(client.roomId, client);
      activeRooms[client.roomId].map(mappedClient => {
         clients.push(mappedClient.user);
      });
      roomUsers.in(client.roomId).emit('announce-leaving', client.user.fname + ' ' + client.user.lname);
      roomUsers.in(client.roomId).emit('user-leaving', clients);
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
