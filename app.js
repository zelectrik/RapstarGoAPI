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
    disconnectUser(socket.id, "Button dsiconnect press.", true); // emit : loginResult
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

  /* End Hub function */

  socket.on('disconnect', function (socket) {
    console.log("A client has disconnected!");
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
          disconnectUser(val.socket_id, "An other user connect to this account.");
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

function disconnectUser(socket_id, message, reset_socket_id)
{
  if(reset_socket_id)
  {
    dbo.collection('user').updateOne({socket_id : socket_id}, {$set : {socket_id : ""}},{}, function(err) {
      if(err) console.log(err);
      io.to(socket_id).emit('disconnectUser', {
        success : true,
        body : {
          message : message
        }});
    });
  } else {
    io.to(socket_id).emit('disconnectUser', {
      success : true,
      body : {
        message : message
      }});
  }
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
          test.push({id : i, name : character.name, level : character.level, class_name : mClassesData[character.class_id].name});
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
              socket.emit('selectCharacterResult', {
                  success : true,
                  body : {
                    message : "Success."
                  }});
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
          character = {id : result.id_current_character, name : _char.name, level : _char.level, class_name : mClassesData[_char.class_id].name};
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
  dbo.collection('hub').find({}, function(err, res) {
    if(err)
    {
      socket.emit('getAllHubsResult', {
          success : false,
          body : {
            message : err
          }});
    } else {
      console.log(res);
      socket.emit('getAllHubsResult', {
          success : true,
          body : {
            obj : res,
            message : "Success"
          }});
    }
  })
}
