var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongo = require('mongodb');

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


  /* Login Function */
  socket.on('login', function(data) {
    login(data, socket);
  });

  socket.on('reconnection', function(data) {
    reconnection(data, socket)
  });


  socket.on('loggedAccount', function(data) {
    loggedAccount(data, socket)
  });

  socket.on('disconnect', function (socket) {
    console.log("A client has disconnected!");
  });
});



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
