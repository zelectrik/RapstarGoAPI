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
  });

  socket.on('reconnection', function(data) {
      console.log(data);
  });


  socket.on('loggedAccount', function() {
    dbo.collection('user').findOne({socket_id : socket.id}, function(err, val) {
      if (err) console.log(err);
      if(val == null)
      {
        console.log("Connecté à aucun compte.");
        socket.emit("message", {message : 'Not connected.'});
      } else {
        console.log("Connecté à " + val.pseudo);
        socket.emit("message", {message : 'Connected to ' + val.pseudo});
      }
    });
  });

  socket.on('disconnect', function (socket) {
    console.log("A client has disconnected!");
  });
});
