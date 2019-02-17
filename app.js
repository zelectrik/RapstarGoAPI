var express = require('express');
var mongo = require('mongodb');
var app = express();

var MongoClient = require('mongodb').MongoClient;
var uri = "mongodb://127.0.0.1:27017/";

var dbo;

MongoClient.connect(uri, {
  useNewUrlParser: true,
  server : {
    auto_reconnect : true
  }
}, function(err, db) {
  if (err) throw err;
  dbo = db.db("local");

  app.listen(3000);
  console.log("Listening on port 3000.");
  console.log(dbo);
});

// Reuse database object in request handlers
app.get("/", function(req, res) {
  dbo.collection('character').find({}).toArray(function(err, val) {
    if (err) throw err;
    console.log(val[0].abilities);
    res.end();
  });
});
