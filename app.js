var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongo = require('mongodb');
var fs = require('fs');

/* Load json files needed */
// Get content from file
 var classesContents = fs.readFileSync("characterClass.json");
// Define to JSON type
 var mClassesData = JSON.parse(classesContents);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

var HubChannelPrefix = "Hub_";
var RoomChannelPrefix = "Room_";

var MongoClient = require('mongodb').MongoClient;
var uri = "mongodb://127.0.0.1:27017/";
var dbo;
var dbName = "rapstargo-test";

MongoClient.connect(uri, {
  useNewUrlParser: true,
  server : {
    auto_reconnect : true
  }
}, function(err, db) {
  if (err) throw err;
  dbo = db.db(dbName);

  http.listen(3000);
  console.log("Listening on port 3000.");
  console.log(dbo);
});

io.on('connection', function(socket) {

  console.log('a user connected');

  socket.on('pong', function(data){
      console.log("Pong received from client");
  });
  setTimeout(sendHeartbeat, 25000);

  function sendHeartbeat(){
      setTimeout(sendHeartbeat, 25000);
      io.sockets.emit('ping', { beat : 1 });
  }


  /* Start Login Function */
  socket.on('login', function(data) {
    login(data, socket); // emit : loginResult
  });

  socket.on('reconnection', function(data) {
    reconnection(data, socket); // emit : reconnectionResult
  });

  socket.on('loggedAccount', function(data) {
    /* debug function */
    loggedAccount(data, socket); // emit : loggedAccountResult
  });

  socket.on('disconnectUser', function(data) {
    disconnectUser(socket, socket.id, "Button dsiconnect press.", true); // emit : loginResult
  });
  /* End Login Function */

  /* Start Create account function */

  socket.on('createAccount', function(data) {
    createAccount(data, socket); // emit : createAccountResult
  });

  /* End Create account function */


  /* Start character function */

  socket.on('createCharacter', function(data) {
    CheckAndCreateCharacter(data, socket); // emit : createCharacterResult
  });

  socket.on('getAllMyCharacters', function(data) {
    GetAllMyCharacters(data, socket); // emit : getAllMyCharactersResult
  });

  socket.on('selectCharacter', function(data) {
    SelectCharacter(data, socket); // emit : selectCharacterResult
  });

  socket.on('getCurrentCharacter', function(data) {
    GetCurrentCharacter(data, socket); // emit : getCurrentCharacterResult
  });

  /* End character function */

  /* Start Hub function */

  socket.on('getAllHubs', function(data) {
    GetAllHubs(data, socket); // emit : getAllHubsResult
  });

  socket.on('connectToHub', function(data) {
    ConnectToHub(data, socket); // emit : connectToHubResult
  });

  socket.on('getHubConnectedTo', function(data) {
    GetHubConnectedTo(data, socket); // emit : getHubConnectedToResult
  });

  socket.on('exitHub', function(data) {
    ExitHub(data, socket, true, function(err) {

    }); // emit : exitHubResult
  });

  /* End Hub function */

  /* Start Room function */

  // Room state : 0 -> Created can be joinable , 1 -> fighting can't be joinable but have to be update each time, 2 -> Finished can't be joinable

  socket.on('createRoom', function(data) {
    CreateRoom(data, socket); // emit : createRoomResult
  });

  socket.on('joinRoom', function(data) {
    JoinRoom(data, socket); // emit : joinRoomResult
  });

  socket.on('exitRoom', function(data) {
    ExitRoom(data, socket, true, function(err) {

    }); // emit : exitRoomResult
  });

  socket.on('launchFight', function(data) {
    LaunchFight(data, socket); // emit : launchFightResult
  });

  /* End Room function */

  socket.on('disconnect', function () {

  });
});

function createAccount(data, socket)
{
  console.log(data);
  if(data.password == undefined || data.password == "") // Check if password is enter
  {
    socket.emit('createAccountResult', {
      success : false,
      body : {
        message : "Incorrect password."
      }});
  } else if (data.pseudo == undefined || data.pseudo == "") { // Check if pseudo is enter
    socket.emit('createAccountResult', {
      success : false,
      body : {
        message : "Incorrect pseudo."
      }});
  } else {
    dbo.collection('user').findOne({pseudo : data.pseudo}, function(err, val) {
      if (err) console.log(err);
      /* Permit to disconnect user if use this socket for test */
      if(val != null)
      {
        socket.emit('createAccountResult', {
          success : false,
          body : {
            message : "Pseudo already existing"
          }});
      } else {
        dbo.collection('user').findOne({socket_id : socket.id}, function(err, val) {
          if (err) console.log(err);
          /* Permit to disconnect user if use this socket for test */
          if(val != null && val.pseudo != data.pseudo)
          {
            dbo.collection('user').updateOne(val, {$set : {socket_id : ""}},{}, function(err) {
              if(err) console.log(err);
              socket.emit('disconnectUser', {
                success : true,
                body : {
                  message : "Disconnect from previous account."
                }});
            });
          }
          dbo.collection('user').insertOne({pseudo : data.pseudo, password : data.password, socket_id : socket.id, character_list : [], id_current_character : 0, id_current_hub : -1, id_current_room : -1}, function(err) {
            if(err)
            {
              console.log(err);
            } else {
              socket.emit('createAccountResult', {
                success : true,
                body : {
                  message : "Account created",
                  pseudo : data.pseudo,
                  socket_id : socket.id
                }});
            }
          });
        });
      }
    });
  }
}

function login(data, socket)
{
  dbo.collection('user').findOne({socket_id : socket.id}, function(err, val) {
    if (err) console.log(err);
    /* Permit to disconnect user if use this socket for test */
    if(val != null && val.pseudo != data.pseudo)
    {
      dbo.collection('user').updateOne(val, {$set : {socket_id : ""}},{}, function(err) {
        if(err) console.log(err);
        console.log("Disconnect from " + val.pseudo);
      });
    }

    /* Check if login and password are good */
    dbo.collection('user').findOne({pseudo : data.pseudo, password : data.password}, function(err, val) {
      if (err) console.log(err);
      /*Wrong connection*/
      if(val == null)
      {
        console.log("Mauvais pseudo ou mot de passe.");
        socket.emit('loginResult', {
          success : false,
          body : {
            message : "Mauvais pseudo ou mot de passe."
          }});
      }
      /*Good connection*/
      else {
        if(val.socket_id != "" && val.socket_id != socket.id)
        {
          disconnectUser(socket, val.socket_id, "An other user connect to this account.");
        }
        dbo.collection('user').updateOne(val, {$set : {socket_id : socket.id}},{}, function(err) {
          if(err) console.log(err);
          console.log("Connect to " + val.pseudo);
          socket.emit('loginResult', {
            success : true,
            body : {
              message : "Connect to " + val.pseudo,
              socket_id : socket.id,
              pseudo : val.pseudo
            }});
        });
      }
    });
  });
}

function reconnection(data, socket)
{
  /* Not need to be reconnect if socket_id unchanged */
  if(data.socket_id == socket.id)
  {
    socket.emit('reconnectionResult', {
      success : true,
      body : {
        new_socket_id : false,
        message : "Not needed reconnection"
      }});
  } else {
    dbo.collection('user').findOne({pseudo : data.pseudo ,socket_id : data.socket_id}, function(err, val) {
      if (err) console.log(err);
      /* Permit to disconnect user if use this socket for test */
      if(val != null)
      {
        dbo.collection('user').updateOne(val, {$set : {socket_id : socket.id}},{}, function(err) {
          if(err) console.log(err);
          console.log("Reconnection from " + val.pseudo);
          socket.emit('reconnectionResult', {
            success : true,
            body : {
              new_socket_id : true,
              message : "Reconnect to " + val.pseudo,
              socket_id : socket.id
            }});
        });
      } else {
        console.log("Can't reconnect ");
        socket.emit('reconnectionResult', {
          success : false,
          body : {
            message : "Can't reconnect."
          }});
      }
    });
  }
}

function loggedAccount(data, socket)
{
  dbo.collection('user').findOne({socket_id : socket.id}, function(err, val) {
    if (err) console.log(err);
    if(val == null)
    {
      console.log("Connecté à aucun compte.");
      socket.emit('loggedAccountResult', {
          success : false,
          body : {
            message : "Not connected."
          }});
    } else {
      console.log("Connecté à " + val.pseudo);
      socket.emit('loggedAccountResult', {
          success : true,
          body : {
            message : "Connected to " + val.pseudo
          }});
    }
  });
}

function disconnectUser(socket, socket_id, message, reset_socket_id, want_to_emit = true)
{
  ExitHub({}, socket, want_to_emit, function(err) {
    if(reset_socket_id)
    {
      dbo.collection('user').updateOne({socket_id : socket_id}, {$set : {socket_id : ""}},{}, function(err) {
        if(err) console.log(err);
        if(want_to_emit)
        {
          io.to(socket_id).emit('disconnectUser', {
            success : true,
            body : {
              message : message
            }});
        }
      });
    } else {
      if(want_to_emit)
      {
        io.to(socket_id).emit('disconnectUser', {
          success : true,
          body : {
            message : message
          }});
      }
    }
  });
}

function CheckAndCreateCharacter(data, socket)
{
  if(data.name == undefined || data.name == ""){
    socket.emit('createCharacterResult', {
        success : false,
        body : {
          message : "Wrong character name."
        }});
  } else if(data.classId == undefined || data.classId == "") {
    socket.emit('createCharacterResult', {
        success : false,
        body : {
          message : "Class not selected."
        }});
  } else {
    dbo.collection('user').findOne({socket_id : socket.id}, function(err, val) {
      if (err) console.log(err);
      if(val == null)
      {
        console.log("Connecté à aucun compte.");
        socket.emit('createCharacterResult', {
            success : false,
            body : {
              message : "Not connected, can't create character."
            }});
      } else {
        var newCharacter = CreateCharacter(data.name, data.classId);
        newCharacter.user_id = val._id.toString();
        dbo.collection('user').updateOne(val, {$push : {character_list : newCharacter}},{}, function(err, _success) {
          if(err) console.log(err);
          console.log(val.character_list);
          socket.emit('createCharacterResult', {
              success : true,
              body : {
                message : "Character created."
              }});
        });
      }
    });
  }
}

function CreateCharacter(_name = "Nom", _classId = 0)
{
  var lCharacter = {};
  lCharacter.name = _name;
  lCharacter.level = 1;

  var lClass = mClassesData[_classId];
  if(lClass == null)
  {
    _classId = 0;
    lClass = mClassesData[0];
  }
  lCharacter.class_id = _classId;
  lCharacter.life = lClass.initialLife;
  lCharacter.damage = lClass.initialDamage;
  lCharacter.abilities = [];

  lClass.Abilities.forEach(function(_ability) {
    if(_ability.levelToUnlock <= lCharacter.level)
    {
        lCharacter.abilities.push(_ability);
    }
  });

  return lCharacter;
}

function GetAllMyCharacters(data, socket)
{
  dbo.collection('user').findOne({socket_id : socket.id}, {projection : {_id : 0, character_list : 1}}, function(err, val) {
    if(err) {
      console.log(err);
      console.log("Can't get all character.");
      socket.emit('getAllMyCharactersResult', {
          success : false,
          body : {
            message : "Can't get all character."
          }});
    } else {
      var test = [];
      var i=0;
      if(val == undefined || val.character_list == undefined) {
        socket.emit('getAllMyCharactersResult', {
            success : false,
            body : {
              message : "Not connected"
            }});
      } else {
        val.character_list.forEach(function(character) {
          test.push({user_id : character.user_id, id : i, name : character.name, level : character.level, class_name : mClassesData[character.class_id].name});
          i++;
        })
        console.log("Get all my characters");
        console.log(val);
        socket.emit('getAllMyCharactersResult', {
            success : true,
            body : {
              obj : test,
              message : "Get all character."
            }});
      }
    }
  });
}

function SelectCharacter(data, socket)
{
  if(data.idSelected == undefined || !Number.isInteger(data.idSelected))
  {
    socket.emit('selectCharacterResult', {
        success : false,
        body : {
          message : "Invalid identifier."
        }});
  } else {
    dbo.collection('user').findOne({socket_id : socket.id}, function(error, result) {
      if(error) {
        socket.emit('selectCharacterResult', {
            success : false,
            body : {
              message : error
            }});
      } else {
        if(result.character_list == undefined || data.idSelected > (result.character_list.length - 1))
        {
          socket.emit('selectCharacterResult', {
              success : false,
              body : {
                message : "Character not existing."
              }});
        } else {
          dbo.collection('user').updateOne({socket_id : socket.id}, { $set: { id_current_character: data.idSelected } }, function(err, res) {
            if(err) {
              socket.emit('selectCharacterResult', {
                  success : false,
                  body : {
                    message : err
                  }});
            } else {
              var _char = result.character_list[data.idSelected];
              if(_char != undefined)
              {
                character = {user_id : _char.user_id ,id : data.idSelected, name : _char.name, level : _char.level, class_name : mClassesData[_char.class_id].name};
                socket.emit('selectCharacterResult', {
                    success : true,
                    body : {
                      obj : character,
                      message : "Success."
                    }});
              } else {
                socket.emit('selectCharacterResult', {
                    success : false,
                    body : {
                      message : "Character not existing."
                    }});
              }
            }
          });
        }
      }
    });
  }
}

function GetCurrentCharacter(data, socket)
{
  dbo.collection('user').findOne({socket_id : socket.id}, function(error, result) {
    if(error) {
      socket.emit('getCurrentCharacterResult', {
          success : false,
          body : {
            message : error
          }});
    } else {
      var character = {};
      if(result == undefined || result.character_list == undefined)
      {
        socket.emit('getCurrentCharacterResult', {
            success : false,
            body : {
              message : "Not connected"
            }});
      } else {
        var _char = result.character_list[result.id_current_character];
        if(_char != undefined)
        {
          character = {user_id : _char.user_id ,id : result.id_current_character, name : _char.name, level : _char.level, class_name : mClassesData[_char.class_id].name};
          socket.emit('getCurrentCharacterResult', {
              success : true,
              body : {
                obj : character,
                message : "Success"
              }});
        } else {
          socket.emit('getCurrentCharacterResult', {
              success : false,
              body : {
                message : "No character selected"
              }});
        }
      }
    }
  });
}

function GetAllHubs(data, socket)
{
  dbo.collection('hub').find({}).toArray(function(err, res) {
    if(err)
    {
      socket.emit('getAllHubsResult', {
          success : false,
          body : {
            message : err
          }});
    } else {
      console.log(res);
      if(res == undefined || res.length == 0)
      {
        socket.emit('getAllHubsResult', {
            success : false,
            body : {
              message : "Can't get hubs"
            }});
      } else {
        var hub_list = [];
        res.forEach(function(_hub) {
          hub_list.push({id : _hub.id, name : _hub.name, location : _hub.location});
        })

        socket.emit('getAllHubsResult', {
            success : true,
            body : {
              obj : hub_list,
              message : "Success"
            }});
      }
    }
  });
}

function ConnectToHub(data, socket)
{
  if(data.hubId == undefined || !Number.isInteger(data.hubId))
  {
    socket.emit('connectToHubResult', {
        success : false,
        body : {
          message : "Hub id Incorrect"
        }});
  } else {
    dbo.collection('user').findOne({socket_id : socket.id}, function(error, result) {
      if(error) {
        socket.emit('connectToHubResult', {
            success : false,
            body : {
              message : error
            }});
      } else {
        var character = {};
        if(result == undefined || result.character_list == undefined)
        {
          socket.emit('connectToHubResult', {
              success : false,
              body : {
                message : "Not connected"
              }});
        } else {
          dbo.collection('hub').findOne({id : data.hubId}, function(err, res) {
            if(error) {
              socket.emit('connectToHubResult', {
                  success : false,
                  body : {
                    message : error
                  }});
            } else {
              if(res == undefined)
              {
                socket.emit('connectToHubResult', {
                    success : false,
                    body : {
                      message : "No hub for this id"
                    }});
              } else {
                dbo.collection('user').updateOne({socket_id : socket.id}, { $set: { id_current_hub: data.hubId } }, function(errUpdate) {
                  if(errUpdate) {
                    socket.emit('connectToHubResult', {
                        success : false,
                        body : {
                          message : error
                        }});
                  } else {
                    if(result.id_current_hub != undefined && result.id_current_hub >= 0)
                    {
                      socket.leave(HubChannelPrefix + result.id_current_hub);
                    }
                    socket.join(HubChannelPrefix + res.id.toString());
                    socket.emit('connectToHubResult', {
                        success : true,
                        body : {
                          obj : {id : res.id, name : res.name, location : res.location, rooms_list : res.rooms_list},
                          message : "Succes"
                        }});
                  }
                });
              }
            }
          });
        }
      }
    });
  }
}

function GetHubConnectedTo(data, socket)
{
  dbo.collection('user').findOne({socket_id : socket.id}, function(error, result) {
    if(error) {
      socket.emit('getHubConnectedToResult', {
          success : false,
          body : {
            message : error
          }});
    } else {
      if(result == undefined)
      {
        socket.emit('getHubConnectedToResult', {
            success : false,
            body : {
              message : "Not connected"
            }});
      } else {
        if(result.id_current_hub == undefined || result.id_current_hub == -1)
        {
          socket.emit('getHubConnectedToResult', {
              success : false,
              body : {
                message : "No Hub connected To"
              }});
        } else {
          dbo.collection('hub').findOne({id : result.id_current_hub}, function(err, res) {
            if(err) {
              socket.emit('getHubConnectedToResult', {
                  success : false,
                  body : {
                    message : err
                  }});
            } else {
              if(res == undefined)
              {
                socket.emit('getHubConnectedToResult', {
                    success : false,
                    body : {
                      message : "No Hub connected To"
                    }});
              } else {
                socket.emit('getHubConnectedToResult', {
                    success : true,
                    body : {
                      obj : {id : res.id, name : res.name, location : res.location, rooms_list : res.rooms_list},
                      message : "Success"
                    }});
              }
            }
          });
        }
      }
    }
  });
}

function ExitHub(data, socket, want_to_emit, callback)
{
  dbo.collection('user').findOne({socket_id : socket.id}, function(error, result) {
    if(error) {
      if(want_to_emit)
      {
        socket.emit('connectToHubResult', {
            success : false,
            body : {
              message : error
            }});
      }
      callback(null);
    } else {
      var character = {};
      if(result == undefined || result.character_list == undefined)
      {
        if(want_to_emit)
        {
          socket.emit('connectToHubResult', {
              success : false,
              body : {
                message : "Not connected"
              }});
        }
        callback(null);
      } else {
        ExitRoom({},socket, want_to_emit, function(err) {
          dbo.collection('user').updateOne({socket_id : socket.id}, { $set: { id_current_hub: -1 } }, function(errUpdate) {
            if(errUpdate)
            {
              if(want_to_emit)
              {
                socket.emit('exitHubResult', {
                    success : false,
                    body : {
                      message : errUpdate
                    }});
              }
              callback(null);
            } else {
              if(want_to_emit)
              {
                socket.leave(HubChannelPrefix + result.id_current_hub.toString());
                socket.emit('exitHubResult', {
                    success : true,
                    body : {
                      message : "Success"
                    }});
              }
              callback(null);
            }
          });
        });
      }
    }
  });

}

function CreateRoom(data, socket)
{
  dbo.collection('user').findOne({socket_id : socket.id}, function(error, result) {
    if(error) {
      socket.emit('createRoomResult', {
          success : false,
          body : {
            message : error
          }});
    } else {
      if(result == undefined)
      {
        socket.emit('createRoomResult', {
            success : false,
            body : {
              message : "Not connected"
            }});
      } else if(result.id_current_room != "-1") {
        socket.emit('joinRoomResult', {
            success : false,
            body : {
              message : "Already connected to a room."
            }});
      } else {
        if(result.id_current_hub == undefined || result.id_current_hub < 0)
        {
          socket.emit('createRoomResult', {
              success : false,
              body : {
                message : "No hub connected to"
              }});
        } else {
          var room = {};
          room.id = result._id.toString() + Date.now().toString();
          room.user_id_owner = result._id.toString();
          room.user_list = [];
          room.state = 0;

          dbo.collection('hub').updateOne({id : result.id_current_hub}, {$push : {rooms_list : room}},{}, function(err, _success) {
            if(err)
            {
              socket.emit('createRoomResult', {
                  success : false,
                  body : {
                    message : err
                  }});
            } else {
              socket.emit('createRoomResult', {
                  success : true,
                  body : {
                    message : "Success"
                  }});
              JoinRoom({roomId : room.id}, socket);
              BroadcastRoomCreation(HubChannelPrefix + result.id_current_hub.toString(),room);
            }
          });
        }
      }
    }
  });
}

function BroadcastRoomCreation(channelName, room)
{
  io.to(channelName).emit('roomAddToHub', {
      body : {
        obj : room,
        message : "Success add"
      }});

}

function BroadcastRoomDestruction(channelName, room_id)
{
  io.to(channelName).emit('roomRemoveToHub', {
      body : {
        room_id : room_id,
        message : "Success remove"
      }});
}

function JoinRoom(data, socket)
{
  dbo.collection('user').findOne({socket_id : socket.id}, function(error, user) {
    if(error) {
      socket.emit('joinRoomResult', {
          success : false,
          body : {
            message : error
          }});
    } else {
      if(user == undefined)
      {
        socket.emit('joinRoomResult', {
            success : false,
            body : {
              message : "Not connected"
            }});
      } else {
        if(data.roomId == undefined || data.roomId.length == 0)
        {
          socket.emit('joinRoomResult', {
              success : false,
              body : {
                message : "No room selected"
              }});
        }  else if(user.id_current_room != "-1") {
          if(user.id_current_room == data.roomId)
          {
            socket.emit('joinRoomResult', {
                success : false,
                body : {
                  message : "Already connected to this room."
                }});
          } else {
            socket.emit('joinRoomResult', {
                success : false,
                body : {
                  message : "Already connected to a room."
                }});
          }

        }  else {
          dbo.collection('hub').findOne({id : user.id_current_hub, rooms_list : {$elemMatch: {id : data.roomId}}}, function(err, hub) {
            if(err)
            {
              socket.emit('joinRoomResult', {
                  success : false,
                  body : {
                    message : err
                  }});
            } else {
              if(hub == undefined)
              {
                socket.emit('joinRoomResult', {
                    success : false,
                    body : {
                      message : "No room for this hub"
                    }});
              } else {
                var wantedRoom = {};
                for (let _room of hub.rooms_list)
                {
                  if(_room.id == data.roomId)
                  {
                    wantedRoom = _room;
                    break;
                  }
                }
                dbo.collection('hub').updateOne({id : user.id_current_hub, 'rooms_list.id' : data.roomId},{$push: { 'rooms_list.$.user_list': user._id.toString()}}, function(errUpdate) {
                  if(errUpdate)
                  {
                    socket.emit('joinRoomResult', {
                        success : false,
                        body : {
                          message : errUpdate
                        }});
                  } else {
                    dbo.collection('user').updateOne({socket_id : socket.id},{$set : {id_current_room : data.roomId}}, function(errUpdateUser) {
                      if(errUpdateUser)
                      {
                        socket.emit('joinRoomResult', {
                            success : false,
                            body : {
                              message : errUpdateUser
                            }});
                      } else {
                        socket.join(RoomChannelPrefix + data.roomId);
                        socket.emit('joinRoomResult', {
                            success : true,
                            body : {
                              obj : {id : wantedRoom.id, user_id_owner : wantedRoom.user_id_owner },
                              message : "Success"
                            }});
                        BroadcastRoomCharacterChanged(user.id_current_hub, data.roomId);
                      }
                    });
                  }
                });

              }
            }
          });
        }
      }
    }
  });
}

//Envoie la liste des joueurs dans le hub
// emit : getAllUserOfRoom
function BroadcastRoomCharacterChanged(_hubId,_roomId)
{
  var channelName = RoomChannelPrefix + _roomId.toString();
  dbo.collection('hub').findOne({id : _hubId }, { rooms_list: { $elemMatch: { id: _roomId } } }, function(errHub, hub) {
    if(errHub)
    {
      io.to(channelName).emit('getAllUserOfRoom', {
          success : false,
          body : {
            message : errHub
          }});
    } else if(hub == undefined) {
      io.to(channelName).emit('getAllUserOfRoom', {
          success : false,
          body : {
            message : "No hub "
          }});
    } else {
      var wantedRoom = {};
      for(let _room of hub.rooms_list)
      {
        if(_room.id == _roomId)
        {
          wantedRoom = _room;
          break;
        }
      }
      if(wantedRoom.user_list == undefined)
      {
        io.to(channelName).emit('getAllUserOfRoom', {
            success : false,
            body : {
              message : "This room doesn't exist"
            }});
      }
      if(wantedRoom.user_list.length == 0)
      {
        RemoveRoom(_hubId,_roomId);
      } else {
        dbo.collection('user').find({id_current_room : _roomId}).toArray(function(errUsers, UsersList) {
          if(errUsers)
          {
            io.to(channelName).emit('getAllUserOfRoom', {
                success : false,
                body : {
                  message : errUsers
                }});
          } else {
            var CharacterList = [];
            wantedRoom.user_list.forEach(function(_userid)
            {
              for(let _userObj of UsersList)
              {
                if(_userid == _userObj._id.toString())
                {
                  var characterId = 0;
                  for(let _character of _userObj.character_list)
                  {
                    if(characterId == _userObj.id_current_character)
                    {
                      CharacterList.push({id : _userObj.id_current_character, name : _character.name, level : _character.level, class_name : mClassesData[_character.class_id].name, user_id : _userid});
                      break;
                    }
                    characterId++;
                  }
                  break;
                }
              }
            });
            console.log("===============CharacterList=================");
            console.log(CharacterList);
            console.log("===============Fin=================");
            io.to(channelName).emit('getAllUserOfRoom', {
                success : true,
                body : {
                  obj : CharacterList,
                  message : "Success"
                }});
          }
        });
      }

    }
  });
}

function RemoveRoom(_hubId,_roomId) {
  console.log("je vais la remove");
  dbo.collection('hub').updateOne({id : _hubId},{$pull: { rooms_list: { id : _roomId } }}, function(errUpdateHub) {
    if(errUpdateHub)
    {

    } else {
      BroadcastRoomDestruction(HubChannelPrefix + _hubId, _roomId);
    }
  });
}

function ExitRoom(data, socket, want_to_emit, callback)
{
  dbo.collection('user').findOne({socket_id : socket.id}, function(error, user) {
    if(error) {
      if(want_to_emit)
      {
        socket.emit('exitRoomResult', {
            success : false,
            body : {
              message : error
            }});
      }
      callback(null);
    } else {
      if(user == undefined)
      {
        if(want_to_emit)
        {
          socket.emit('exitRoomResult', {
              success : false,
              body : {
                message : "Not connected"
              }});
        }
        callback(null);
      } else {
        if(user.id_current_room == "-1")
        {
          if(want_to_emit)
          {
            socket.emit('exitRoomResult', {
                success : false,
                body : {
                  message : "Not connected to room"
                }});
          }
          callback(null);
        } else {
          dbo.collection('user').updateOne({socket_id : socket.id},{$set : {id_current_room : "-1"}}, function(errUpdateUser) {
            if(errUpdateUser)
            {
              if(want_to_emit)
              {
                socket.emit('exitRoomResult', {
                    success : false,
                    body : {
                      message : errUpdateUser
                    }});
              }
              callback(null);
            } else {
              dbo.collection('hub').updateOne({id : user.id_current_hub, 'rooms_list.id' : user.id_current_room},{$pull: { 'rooms_list.$.user_list': user._id.toString()}}, function(errUpdateHub) {
                if(errUpdateHub)
                {
                  if(want_to_emit)
                  {
                    socket.emit('exitRoomResult', {
                        success : false,
                        body : {
                          message : errUpdateHub
                        }});
                  }
                  callback(null);
                } else {
                  if(want_to_emit)
                  {
                    socket.emit('exitRoomResult', {
                        success : true,
                        body : {
                          message : "Success"
                        }});
                    socket.leave(RoomChannelPrefix + user.id_current_room);
                  }
                  BroadcastRoomCharacterChanged(user.id_current_hub, user.id_current_room);
                  callback(null);
                }
              });
            }
          });


        }
      }
    }
  });
}

function BroadcastFightIsLaunched(_roomId)
{
  var channelName = RoomChannelPrefix + _roomId.toString();
  io.to(channelName).emit('fightIsLaunched', {
      body : {
        message : "FightIsLaunched"
      }});
}

function LaunchFight(data, socket)
{
  dbo.collection('user').findOne({socket_id : socket.id}, function(error, user) {
    if(error) {
      socket.emit('launchFightResult', {
          success : false,
          body : {
            message : error
          }});
    } else {
      if(user == undefined)
      {
        socket.emit('launchFightResult', {
            success : false,
            body : {
              message : "Not connected"
            }});
      } else {
        if(user.id_current_hub == "-1")
        {
          socket.emit('launchFightResult', {
              success : false,
              body : {
                message : "Not connected to hub"
              }});
        } else if(user.id_current_room == "-1") {
          socket.emit('launchFightResult', {
              success : false,
              body : {
                message : "Not connected to room"
              }});
        } else {
          dbo.collection('hub').findOne({id : user.id_current_hub}, function(errorHub, hub) {
            if(errorHub) {
              socket.emit('launchFightResult', {
                  success : false,
                  body : {
                    message : errorHub
                  }});
            } else {
              if(hub == undefined)
              {
                socket.emit('launchFightResult', {
                    success : false,
                    body : {
                      message : "Can't find hub"
                    }});
              } else {
                var wantedRoom = {};
                for (let _room of hub.rooms_list)
                {
                  if(_room.id == user.id_current_room)
                  {
                    wantedRoom = _room;
                    break;
                  }
                }
                if(wantedRoom.id == undefined)
                {
                  socket.emit('launchFightResult', {
                      success : false,
                      body : {
                        message : "Can't find room"
                      }});
                } else {
                  if(wantedRoom.state != 0)
                  {
                    socket.emit('launchFightResult', {
                        success : false,
                        body : {
                          message : "State has been already changed"
                        }});
                  } else {
                    dbo.collection('hub').updateOne({id : user.id_current_hub, 'rooms_list.id' : wantedRoom.id},{$set : { 'rooms_list.$.state': 1}}, function(errUpdateHub) {
                      if(errUpdateHub)
                      {
                        socket.emit('launchFightResult', {
                            success : false,
                            body : {
                              message : errUpdateHub
                            }});
                      } else {
                        socket.emit('launchFightResult', {
                            success : true,
                            body : {
                              message : "Success"
                            }});
                        BroadcastFightIsLaunched(wantedRoom.id);
                      }
                    });
                  }
                }

              }
            }
          });
        }
      }
    }
  });
}
