var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var colors = ["PINK", "RED", "GREEN", "BLUE", "ORANGE", "BROWN"];
var species = ["GUNGANS", "JAWAS", "WOOKIES", "EWOKS"];
var resources = ["RED_CRYSTAL_KYBER", "GREEN_CRYSTAL_KYBER", "BLUE_CRYSTAL_KYBER", "VIOLET_CRYSTAL_KYBER"];
var users = [];
var players = [];
var fleets = [];
var planets = [];

var userId = 0;
var fleetId = 0;
var planetId = 0;
var timeCurrentTurn = 0;

io.on('connection', function(socket) {
  // Adress of user
  users[userId] = {id : socket.id};

  // Player
  players.push({
    id: userId,
    pseudo: userId,
    specie: userId % 4,
    color: userId % 6,
    resources: [2,2,2,2]
  });
  socket.userId = userId++;

  // "Connect" event
  console.log('a user connected, Player n°: ' + socket.userId);

  if(userId <= 5) {
    socket.emit('connected', {userId: socket.userId});
  }

  if(userId == 5) {
    setTimeout(() => {
      console.log("Play");
      play();
    }, 5000);
  }

  // "Connected" event
  socket.on('connected', function(message){
    message = JSON.parse(message);
    console.log(message.Pseudo + ' is pseudo of Player n°' + message.Id);
    for(var i = 0; i < players.length; i++) {
        if(players[i].id == message.Id) {
            players[i].pseudo = message.Pseudo;
            // Update Table
            io.to(users[0].id).emit('create_player', players[i]);
        }
    }
    // Update Client
    update_client();
  });

  socket.on('disconnect', function(message){
      console.log('Disconnect');
  });

  // "Interact" event
  socket.on('interact', function(message){
    message = JSON.parse(message);
    console.log('Send \"' + message.msg + '\" form Player n°' + message.sender + ' to Player n°' + message.recipient);
    io.to(users[message.recipient].id).emit('interact', {
      sender: message.sender,
      recipient: message.recipient,
      msg: message.msg
    });
  });

  // "Edit_change" event
  socket.on('edit_change', function(message){
    message = JSON.parse(message);
    console.log("Edit change");
    // Send Edit
    io.to(users[message.id_player].id).emit('edit_change', {
      id_player: socket.userId,
      resources_player: message.resources_own,
      resources_own : message.resources_player
    });
  });

  // "Accept_change" event
  socket.on('accept_change', function(message){
    message = JSON.parse(message);
    console.log("Accept change");
    // Send accept
    io.to(users[message.id_player].id).emit('accept_change', {
      id_player: socket.userId
    });
    // Update Resources
    for(var i = 0; i < 4; i++) {
        players[socket.userId].resources[i] = players[socket.userId].resources[i] + message.resources_player[i] - message.resources_own[i];
        players[message.id_player].resources[i] = players[message.id_player].resources[i] + message.resources_own[i] - message.resources_player[i];
    }
    // Send update
    io.to(users[message.id_player].id).emit('update_client', {
        players: players,
        fleets: fleets,
        planets: planets,
        userId: message.id_player,
        time: timeCurrentTurn
    });
    io.to(users[socket.userId].id).emit('update_client', {
        players: players,
        fleets: fleets,
        planets: planets,
        userId: socket.userId,
        time: timeCurrentTurn
    });
  });

  // "Refuse_change" event
  socket.on('refuse_change', function(message){
    message = JSON.parse(message);
    console.log("Refuse change");
    // Send Refuse
    io.to(users[message.id_player].id).emit('refuse_change', {
      id_player: socket.userId
    });
  });

  // "Add_fleet" event
  // Ex : socket.Emit ("add_fleet", "{\"id_planet\": 0, \"id_player\": 0}");
  socket.on('add_fleet', function(message){
    message = JSON.parse(message);
    console.log('Add a fleet to Player n°' + message.id_player + "on planet n°" + message.id_planet);
    // Add fleet
    fleets.push({
      id: fleetId,
      name: fleetId,
      id_planet : message.id_planet,
      id_player : message.id_player
    });

    // Remove resources of player
    for(var i = 0; i < players[message.id_player].resources.length; i++)
        players[message.id_player].resources[i]--;

    // Update Table
    io.to(users[0].id).emit('create_fleet', {
      id: fleetId,
      name: fleetId,
      id_planet : message.id_planet,
      id_player : message.id_player
    });
    fleetId++;

    // Update Client
    update_client();
  });

  // "Move_fleet" event
  // Ex : socket.Emit ("move_fleet", "{\"id_fleet\": 0, \"id_planet\": 1}");
  socket.on('move_fleet', function(message){
    message = JSON.parse(message);
    console.log('Move a fleet');
    // Move fleet
    for(var i = 0; i < fleets.length; i++) {
        if(fleets[i].id == message.id_fleet) {
            fleets[i].id_planet = message.id_planet;
        }
    }
    // Update
    update_client();
  });

  // "Remove_fleet" event
  socket.on('remove_fleet', function(message){
    message = JSON.parse(message);
    console.log('Remove a fleet to Player n°' + message.id_player);
    // Remove fleet
    for(var i = 0; i < fleets.length; i++) {
        if(fleets[i].id == message.id_fleet) {
            fleets.splice(i, i + 1);
        }
    }
    // Update
    update_client();
  });

  // "Add_planet" event
  // Ex : socket.Emit ("add_planet", "{}");
  socket.on('add_planet', function(message){
    message = JSON.parse(message);
    console.log('Add a planet');
    // Add planet
    planets.push({
      id: planetId,
      name: planetId,
      id_player : -1,
      resources: [
        Math.floor(Math.random() * 3),
        Math.floor(Math.random() * 3),
        Math.floor(Math.random() * 3),
        Math.floor(Math.random() * 3)
      ]
    });
    planetId++;
    // Update
    update_client();
  });

  // "Conquer_planet" event
  // Ex : socket.Emit ("conquer_planet", "{\"id_planet\": 0, \"id_player\": 0}");
  socket.on('conquer_planet', function(message){
    message = JSON.parse(message);
    console.log('Conquer a planet n°' + message.id_planet + ' for Player n°' + message.id_player);
    // Remove planet
    for(var i = 0; i < planets.length; i++) {
        if(planets[i].id == message.id_planet) {
            planets[i].id_player = message.id_player;
        }
    }
    // Update
    update_client();
  });

  // "Remove_planet" event
  socket.on('remove_planet', function(message){
    message = JSON.parse(message);
    console.log('Remove a planet');
    // Remove planet
    for(var i = 0; i < planets.length; i++) {
        if(planets[i].id == message.id_planet) {
            planets.splice(i, i + 1);
        }
    }
    // Update
    update_client();
  });

  // "Update" event
  socket.on('update', function(msg){
    console.log('updating game info');
    socket.broadcast.emit('update', "ok");
  });

  function update_client() {
      if(game_over()) {
          console.log('Game Over');
          for(var i = 0; i < users.length; i++) {
              io.to(users[i].id).emit('end', {
                  players: players,
                  fleets: fleets,
                  planets: planets,
                  userId: i,
                  time: timeCurrentTurn
              });
          }
      } else {
          console.log('Update Client');
          for(var i = 0; i < users.length; i++) {
              io.to(users[i].id).emit('update_client', {
                  players: players,
                  fleets: fleets,
                  planets: planets,
                  userId: i,
                  time: timeCurrentTurn
              });
          }
      }
  };

  function game_over() {
      console.log('Game Over ?');
      for(var j = 0; j < players.length; j++) {
          var k = 0;
          for(var i = 0; i < planets.length; i++) {
              if(planets[i].id_player == players[j].id) {
                 k++;
              }
          }
          if(k > planets.length/2) {
              return true;
          }
      }
      return false;
  }

  function play() {
      var date = new Date();
      timeCurrentTurn = date.getTime() + ((120 + 11 )* 1000);

      for(var i = 0; i < users.length; i++) {
          io.to(users[i].id).emit('play', {
            time: timeCurrentTurn
          });
      }

      setTimeout(function() {
        timeCurrentTurn = date.getTime() + (120 * 1000);
        update_resources();
        setInterval(update_resources, 120 * 1000);
      }, (120 + 11) * 1000);

  };

  function update_resources() {
      console.log('Update resources');
      for(var i = 0; i < planets.length; i++) {
          if(planets[i].id_player != -1) {
             players[planets[i].id_player].resources[(planets[i].id_player) % 4] += planets[i].resources[(planets[i].id_player) % 4];
             players[planets[i].id_player].resources[(planets[i].id_player + 1) % 4] += planets[i].resources[(planets[i].id_player + 1) % 4];
          }
      }
      var date = new Date();
      timeCurrentTurn = date.getTime() + (120 * 1000);
      update_client();
  }

});

http.listen(8000, function(){
  console.log('listening on *:8000');
});