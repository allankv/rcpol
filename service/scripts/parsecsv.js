var parse = require('csv-parse');
var fs = require('fs');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ItemSchema = new Schema({
  item:{
    id: Number,
    label: String,
    states:[
      {
        state:{
          id: Number,
          label: String,
          descriptor: {
            id: Number,
            label: String
          }
        }
      }
    ]
  }
});

var StateSchema = new Schema({
  state:{
    id: Number,
    label: String,
    descriptor: Number,
    items:[
      {
        item:{
          id: Number
        }
      }
    ]
  }
});

var Item = mongoose.model('collectionItems', ItemSchema);
var State = mongoose.model('collectionStates', StateSchema);

var file = "../files/test.csv";
fs.readFile(file, 'utf8', function (err, data) {
  if (err) console.log(err);
  parseFile(data);
});

function parseFile(data){
  parse(data, {delimiter: ';'}, function(err, rows){
    var codes = rows[0]; // those tell the kind of the column (categorical or numeric descriptor, photo, detail...)
    var columns = rows[1]; // name of the column
    var taxons = rows.slice(2); // descriptions of the taxons

    mongoose.connect('mongodb://localhost/polen');
    var db = mongoose.connection;
    db.on('error', function(){
      console.log('connection error');
    });
    db.once('open', function(){
      getCollectionItems(codes, columns, taxons, db);
    });
  });
}

function getCollectionItems(codes, columns, taxons, db){
  // drop collection and create new
  Item.remove({}, function(err){
    console.log('collectionItems removed');

    var seenStates = []; // this will hold every state's id that we pass, so that we don't add the same states with diff ids
    for (var i in taxons){
      var item = {};
      item.id = i;  // TODO: id (what if i don't wan't to replace the existing db?)

      var especie = columns.indexOf("Espécie"); // get the index of the column "especies"
      item.label = taxons[i][especie];

      var states = [];
      for (var j in codes){
        if (codes[j] == 'DC'){ // if is a categorical descriptor
          var state = {};

          if (seenStates.indexOf(taxons[i][j]) == -1){ // if this is the first time we see this state
            seenStates.push(taxons[i][j]);
            state.id = seenStates.indexOf(taxons[i][j]);
          } else state.id = seenStates.indexOf(taxons[i][j]);

          state.label = taxons[i][j];
          var descriptor = {};
          descriptor.id = j;
          descriptor.label = columns[j];
          state.descriptor = descriptor;

          states.push({state: state});
        }
      }
      item.states = states;

      Item.create({item: item}, function(err, item){
        if (err) console.log(err);
        console.log('inserted' + item.item.label);
      });
    }
  });
}

/*
function saveToDb(codes, columns, taxons){
  mongoose.connect('mongodb://localhost/polen');
  var db = mongoose.connection;

  db.once('open', function(){
    console.log('connected to ' + Item.db.name);

  });
}
 */
