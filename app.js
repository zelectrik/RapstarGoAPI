var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;
var fs = require('fs');

/* Load json files needed */
// Get content from file
 var classesContents = fs.readFileSync("characterClass.json");
// Define to JSON type
 var mClassesData = JSON.parse(classesContents);

 // Get content from file
  var bossContents = fs.readFileSync("bossData.json");
 // Define to JSON type
  var mBossData = JSON.parse(bossContents);

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

  var deltatime = 500;
  setInterval(function() {
    UpdateAllBossAttackInterval(deltatime);
  }, deltatime);
});

setInterval(function() {
  sendHeartbeat();
}, 20000);

function sendHeartbeat(){
    io.emit('ping', { beat : 1 });
}



io.on('connection', function(socket) {
  socket.on('pong', function(data){
  });


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

  socket.on('useCharacterAbility', function(data) {
    UseCharacterAbility(data, socket); // emit : useCharacterAbilityResult
  });


  /* End Room function */

  socket.on('disconnect', function () {
    //disconnectUser(socket, socket.id, "Disconnect from api", true, false)
  });
});

function createAccount(data, socket)
{
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
      if (err)
      {

      }
      /* Permit to disconnect user if use this socket for test */
      else if(val != null)
      {
        socket.emit('createAccountResult', {
          success : false,
          body : {
            message : "Pseudo already existing"
          }});
      } else {
        dbo.collection('user').findOne({socket_id : socket.id}, function(err, val) {
          if (err) {

          }
          /* Permit to disconnect user if use this socket for test */
          else if(val != null && val.pseudo != data.pseudo)
          {
            dbo.collection('user').updateOne(val, {$set : {socket_id : ""}},{}, function(err) {
              if(err)
              {

              } else {
                socket.emit('disconnectUser', {
                  success : true,
                  body : {
                    message : "Disconnect from previous account."
                  }});
              }
            });
          }
          dbo.collection('user').insertOne({pseudo : data.pseudo, password : data.password, socket_id : socket.id, character_list : [], id_current_character : 0, id_current_hub : -1, id_current_room : -1}, function(err) {
            if(err)
            {

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
    if (err) {

    }
    /* Permit to disconnect user if use this socket for test */
    else if(val != null && val.pseudo != data.pseudo)
    {
      dbo.collection('user').updateOne(val, {$set : {socket_id : ""}},{}, function(err) {
        if(err) {

        }
      });
    }

    /* Check if login and password are good */
    dbo.collection('user').findOne({pseudo : data.pseudo, password : data.password}, function(err, val) {
      if (err) {
      }
      /*Wrong connection*/
      else if(val == null)
      {
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
        ExitHub({}, socket, false, function(err) {
          dbo.collection('user').updateOne(val, {$set : {socket_id : socket.id}},{}, function(err) {
            if(err) {
              socket.emit('loginResult', {
                success : false,
                body : {
                  message : err
                }});
            } else {
              socket.emit('loginResult', {
                success : true,
                body : {
                  message : "Connect to " + val.pseudo,
                  socket_id : socket.id,
                  pseudo : val.pseudo
                }});
            }
          });
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
      if (err) {
      }
      /* Permit to disconnect user if use this socket for test */
      else if(val != null)
      {
        dbo.collection('user').updateOne(val, {$set : {socket_id : socket.id}},{}, function(err) {
          if(err) {
            socket.emit('reconnectionResult', {
              success : true,
              body : {
                new_socket_id : false,
                message : err
              }});
          } else {
            socket.emit('reconnectionResult', {
              success : true,
              body : {
                new_socket_id : true,
                message : "Reconnect to " + val.pseudo,
                socket_id : socket.id
              }});
          }
        });
      } else {
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
    if (err)
    {
      socket.emit('loggedAccountResult', {
          success : false,
          body : {
            message : err
          }});
    }
    else if(val == null)
    {
      socket.emit('loggedAccountResult', {
          success : false,
          body : {
            message : "Not connected."
          }});
    } else {
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
        if(err) {

        }
        else if(want_to_emit)
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
      if (err) {
        socket.emit('createCharacterResult', {
            success : false,
            body : {
              message : err
            }});
      }
      else if(val == null)
      {
        socket.emit('createCharacterResult', {
            success : false,
            body : {
              message : "Not connected, can't create character."
            }});
      } else {
        var newCharacter = CreateCharacter(val.character_list.length, data.name, data.classId);
        newCharacter.user_id = val._id.toString();
        dbo.collection('user').updateOne(val, {$push : {character_list : newCharacter}},{}, function(err, _success) {
          if(err) {
            socket.emit('createCharacterResult', {
                success : false,
                body : {
                  message : err
                }});
          }else {
            socket.emit('createCharacterResult', {
                success : true,
                body : {
                  message : "Character created."
                }});
          }
        });
      }
    });
  }
}

function CreateCharacter(id, _name = "Nom", _classId = 0)
{
  var lCharacter = {};
  lCharacter.id = id;
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
  lCharacter.max_life = lClass.initialLife;
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
      socket.emit('getAllMyCharactersResult', {
          success : false,
          body : {
            message : "Can't get all character."
          }});
    } else {
      var test = [];
      if(val == undefined || val.character_list == undefined) {
        socket.emit('getAllMyCharactersResult', {
            success : false,
            body : {
              message : "Not connected"
            }});
      } else {
        val.character_list.forEach(function(character) {
          var lcharacter = {user_id : character.user_id, id : character.id, current_life : character.life, alive : (character.life > 0), name : character.name, level : character.level, abilities : [],  class_name : mClassesData[character.class_id].name};
          character.abilities.forEach(function(ability) {
            lcharacter.abilities.push({id : ability.id, name : ability.name, effect : ability.effect, effectMultiplier : ability.effectMultiplier, cooldown : ability.cooldown})
          });
          test.push(lcharacter);

        })
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
        dbo.collection('user').updateOne({socket_id : socket.id}, { $set: { id_current_character: data.idSelected } }, function(err, res) {
          if(err) {
            socket.emit('selectCharacterResult', {
                success : false,
                body : {
                  message : err
                }});
          } else {
            var currentCharacter = {};
            result.character_list.forEach(function(character) {
              if(character.id == data.idSelected)
              {
                currentCharacter = character;
              }
            });
            var _char = currentCharacter;
            if(_char.name != undefined)
            {
              character = {user_id : _char.user_id ,id : data.idSelected, current_life : _char.life, alive : (_char.life > 0), name : _char.name, level : _char.level, abilities : [], class_name : mClassesData[_char.class_id].name};
              _char.abilities.forEach(function(ability) {
                character.abilities.push({id : ability.id, name : ability.name, effect : ability.effect, effectMultiplier : ability.effectMultiplier, cooldown : ability.cooldown})
              });
              socket.emit('selectCharacterResult', {
                  success : true,
                  body : {
                    obj : character

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
        var currentCharacter = {};
        result.character_list.forEach(function(character) {
          if(character.id == result.id_current_character)
          {
            currentCharacter = character;
          }
        });
        var _char = currentCharacter;
        if(_char.name != undefined)
        {
          character = {user_id : _char.user_id ,id : result.id_current_character, current_life : _char.life, alive : (_char.life > 0), name : _char.name, level : _char.level, abilities : [] , class_name : mClassesData[_char.class_id].name};
          _char.abilities.forEach(function(ability) {
            character.abilities.push({id : ability.id, name : ability.name, effect : ability.effect, effectMultiplier : ability.effectMultiplier, cooldown : ability.cooldown})
          });
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
          room.boss = CreateBoss();

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

function CreateBoss()
{
  var bossObj = mBossData.easy;

  return bossObj;
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
                if(wantedRoom.state != 0)
                {
                  socket.emit('joinRoomResult', {
                      success : false,
                      body : {
                        message : "This room is not joinable"
                      }});
                } else {
                  dbo.collection('hub').updateOne({id : user.id_current_hub, 'rooms_list.id' : data.roomId},{$push: { 'rooms_list.$.user_list': user._id.toString()}}, function(errUpdate) {
                    if(errUpdate)
                    {
                      socket.emit('joinRoomResult', {
                          success : false,
                          body : {
                            message : errUpdate
                          }});
                    } else {
                      var currentCharacter = {};
                      user.character_list.forEach(function(character) {
                        if(character.id == user.id_current_character)
                        {
                          currentCharacter = character;
                        }
                      });
                      dbo.collection('user').updateOne({socket_id : socket.id, 'character_list.id' : user.id_current_character},{$set : {id_current_room : data.roomId, 'character_list.$.life': currentCharacter.max_life}}, function(errUpdateUser) {
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
                                obj : {id : wantedRoom.id, user_id_owner : wantedRoom.user_id_owner, boss : {life : wantedRoom.boss.life, damage_per_attack : wantedRoom.boss.damage_per_attack, cooldown_value : wantedRoom.boss.cooldown_value} },
                                message : "Success"
                              }});
                          BroadcastRoomCharacterChanged(user.id_current_hub, data.roomId);
                        }
                      });
                    }
                  });
                }
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
      else if(wantedRoom.user_list.length == 0)
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
                  for(let _character of _userObj.character_list)
                  {
                    if(_character.id == _userObj.id_current_character)
                    {
                      let character = {id : _userObj.id_current_character, name : _character.name, current_life : _character.life, level : _character.level, abilities : [] , class_name : mClassesData[_character.class_id].name, alive : true, user_id : _userid};
                      _character.abilities.forEach(function(ability) {
                        character.abilities.push({id : ability.id, name : ability.name, effect : ability.effect, effectMultiplier : ability.effectMultiplier, cooldown : ability.cooldown})
                      });
                      CharacterList.push(character);
                      break;
                    }
                  }
                  break;
                }
              }
            });

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
                    dbo.collection('hub').updateOne({id : user.id_current_hub, 'rooms_list.id' : wantedRoom.id},{$set : { 'rooms_list.$.state': 1, 'rooms_list.$.boss.current_cooldown_attack' : wantedRoom.boss.cooldown_value}}, function(errUpdateHub) {
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

function UpdateAllBossAttackInterval(deltatime)
{
  dbo.collection('hub').find({}).toArray(function(err, res) {
    if(err)
    {

    } else {
      if(res == undefined || res.length == 0)
      {

      } else {
        res.forEach(function(_hub) {
          _hub.rooms_list.forEach(function(_room) {

            if(_room.state == 1)
            {
              var lnewCoolDown = _room.boss.current_cooldown_attack - deltatime;
              if(lnewCoolDown <= 0) // launch attack and reset cooldown
              {
                LaunchBossAttack(_hub, _room);
                dbo.collection('hub').updateOne({id : _hub.id, 'rooms_list.id' : _room.id},{$set : { 'rooms_list.$.boss.current_cooldown_attack': _room.boss.cooldown_value}}, function(errUpdateHub) {
                });
              } else { // decrease cool down
                dbo.collection('hub').updateOne({id : _hub.id, 'rooms_list.id' : _room.id},{$set : { 'rooms_list.$.boss.current_cooldown_attack': lnewCoolDown}}, function(errUpdateHub) {
                });
              }
            }
          });
        });
      }
    }
  });
}

// Broadcast : fightIsFinished
function FightIsFinished(_hub, _room, _victory)
{
  var channelName = RoomChannelPrefix + _room.id.toString();
  if(_victory)
  {
    dbo.collection('hub').updateOne({id : _hub.id, 'rooms_list.id' : _room.id},{$set : { 'rooms_list.$.state': 2, 'rooms_list.$.boss.life' : 0}}, function(errUpdateHub) {
    });
    io.to(channelName).emit('fightIsFinished', {
      body : {
        victory : true
      }});
  } else {
    dbo.collection('hub').updateOne({id : _hub.id, 'rooms_list.id' : _room.id},{$set : { 'rooms_list.$.state': 2}}, function(errUpdateHub) {
    });
    io.to(channelName).emit('fightIsFinished', {
      body : {
        victory : false
      }});
  }
}

function SetBossLife(_hub, _room, _life)
{
  var channelName = RoomChannelPrefix + _room.id.toString();

    dbo.collection('hub').updateOne({id : _hub.id, 'rooms_list.id' : _room.id},{$set : {'rooms_list.$.boss.life' : _life}}, function(errUpdateHub) {
      if(errUpdateHub)
      {

      } else {
        io.to(channelName).emit('bossTakeDamage', {
          body : {
            boss_life : _life
          }});
      }
    });

}

// Broadcast : applyDamageToRoomCharacters
function LaunchBossAttack(_hub, _room)
{
  var channelName = RoomChannelPrefix + _room.id.toString();

  dbo.collection('user').find({id_current_room : _room.id}).toArray(function(errUsers, UsersList) {
    if(errUsers)
    {

    } else {
      var isAllCharacterDead = true;
      UsersList.forEach(function(user) {
        var currentCharacter = {};
        user.character_list.forEach(function(character) {
          if(character.id == user.id_current_character)
          {
            currentCharacter = character;
          }
        });
        if(currentCharacter.life - _room.boss.damage_per_attack <= 0 )
        {
          currentCharacter.life = 0;
        } else {
          isAllCharacterDead = false;
          currentCharacter.life -= _room.boss.damage_per_attack;
        }
        dbo.collection('user').updateOne({_id : new ObjectID(user._id), 'character_list.id' : currentCharacter.id }, {$set  : {'character_list.$.life' : currentCharacter.life}}, function(errUpdateUser) {

        });

        if(isAllCharacterDead)
        {
          FightIsFinished(_hub, _room, false);
          // Broadcast all players are dead and fight is loose

        }
      });


      var CharacterList = [];
      UsersList.forEach(function(user) {
        var currentCharacter = {};
        user.character_list.forEach(function(character) {
          if(character.id == user.id_current_character)
          {
            currentCharacter = character;
          }
        });
        var character = {};
        if(currentCharacter.life == 0)
        {
          character = {id : user.id_current_character, name : currentCharacter.name, current_life : currentCharacter.life, level : currentCharacter.level, abilities : [] , class_name : mClassesData[currentCharacter.class_id].name, alive : false, user_id : user._id.toString()};
        } else {
          character = {id : user.id_current_character, name : currentCharacter.name, current_life : currentCharacter.life, level : currentCharacter.level, abilities : [] , class_name : mClassesData[currentCharacter.class_id].name, alive : true, user_id : user._id.toString()};
        }
        currentCharacter.abilities.forEach(function(ability) {
          character.abilities.push({id : ability.id, name : ability.name, effect : ability.effect, effectMultiplier : ability.effectMultiplier, cooldown : ability.cooldown})
        });
        CharacterList.push(character);
      });
      /*
      */
      io.to(channelName).emit('applyDamageToRoomCharacters', {
          body : {
            obj : CharacterList
          }});
    }
  });
}

function UseCharacterAbility(data, socket)
{
  var currentCharacter = {};
  var wantedRoom;
  var currentAbility;
  if(data.abilityId == undefined)
  {
    socket.emit('useCharacterAbilityResult', {
        success : false,
        body : {
          message : "No ability selected"
        }});
  } else {
    dbo.collection('user').findOne({socket_id : socket.id}, function(error, user) {
      if(error) {
        socket.emit('useCharacterAbilityResult', {
            success : false,
            body : {
              message : error
            }});
      } else {
        if(user == null)
        {
          socket.emit('useCharacterAbilityResult', {
              success : false,
              body : {
                message : "Not connected"
              }});
        } else if(user.id_current_hub == undefined)
        {
          socket.emit('useCharacterAbilityResult', {
              success : false,
              body : {
                message : "Not connected"
              }});
        } else if(user.id_current_hub == "-1")
        {
          socket.emit('useCharacterAbilityResult', {
              success : false,
              body : {
                message : "No hub connected to"
              }});
        } else if(user.id_current_room == "-1")
        {
          socket.emit('useCharacterAbilityResult', {
              success : false,
              body : {
                message : "No room connected to"
              }});
        } else
        {
          user.character_list.forEach(function(character) {
            if(character.id == user.id_current_character)
            {
              currentCharacter = character;
            }
          });
          if(currentCharacter.id == undefined)
          {
            socket.emit('useCharacterAbilityResult', {
                success : false,
                body : {
                  message : "No character selected"
                }});
          } else if (currentCharacter.life <= 0 ) {
            socket.emit('useCharacterAbilityResult', {
                success : false,
                body : {
                  message : "Character is dead"
                }});
          } else {
              currentCharacter.abilities.forEach(function(ability) {
                if(ability.id == data.abilityId)
                {
                  currentAbility = ability;
                }
              });
              if(currentAbility.id == undefined)
              {
                socket.emit('useCharacterAbilityResult', {
                    success : false,
                    body : {
                      message : "Ability selected doesn't exist"
                    }});
              } else if(Date.now() - currentAbility.lastTimeUsed < currentAbility.cooldown) {
                socket.emit('useCharacterAbilityResult', {
                    success : false,
                    body : {
                      message : "Ability is reloading"
                    }});
              } else {
                dbo.collection('hub').findOne({id : user.id_current_hub, 'rooms_list.id' : user.id_current_room }, function(errorHub, hub) {
                  if(errorHub)
                  {
                    socket.emit('useCharacterAbilityResult', {
                        success : false,
                        body : {
                          message : errorHub
                        }});
                  } else {
                    if(hub == null)
                    {
                      socket.emit('useCharacterAbilityResult', {
                          success : false,
                          body : {
                            message : "Hub connected to doesn't exist"
                          }});
                    } else if(hub.id == undefined)
                    {
                      socket.emit('useCharacterAbilityResult', {
                          success : false,
                          body : {
                            message : "Hub connected to doesn't exist"
                          }});
                    } else
                    {
                      for (let _room of hub.rooms_list)
                      {
                        if(_room.id == user.id_current_room)
                        {
                          wantedRoom = _room;
                        }
                      }
                      if(wantedRoom.state != 1)
                      {
                        socket.emit('useCharacterAbilityResult', {
                            success : false,
                            body : {
                              message : "This room is not in fight"
                            }});
                      } else {
                        LaunchAbility(socket, user, currentCharacter, hub, wantedRoom, currentAbility);
                      }
                    }
                  }
                });
              }
            }
          }
        }
      });
    }
}

function LaunchAbility(socket, user, character, hub, room, ability)
{
  var updatedAbilities = character.abilities;
  var i = 0;
  for (let _ability of updatedAbilities)
  {
    if(_ability.id == ability.id)
    {
      updatedAbilities[i].lastTimeUsed = Date.now();
      break;
    }
    i++;
  }
  switch (ability.effect) {
    case 0:
      character.abilities
      dbo.collection('user').updateOne({_id : new ObjectID(user._id), 'character_list.id' : character.id }, {$set  : {'character_list.$.abilities' : updatedAbilities}}, function(errUpdateUser) {
        socket.emit('useCharacterAbilityResult', {
            success : true,
            body : {
              message : "Success"
        }});
      });
      var damageToApply = character.damage * ability.effectMultiplier;
      var remainingBossLife = room.boss.life - damageToApply;
      if(remainingBossLife <= 0)
      {
        FightIsFinished(hub, room, true);
      } else {
        SetBossLife(hub, room, remainingBossLife);
      }

      break;
    default:

  }
}
