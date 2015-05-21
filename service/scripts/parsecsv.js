// TODO descritores com multiplos campos
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
      var autores = columns.indexOf("Autores da espécie");
      item.label = taxons[i][especie] + " " + taxons[i][autores];

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

      Item.create({item: item}, function(err, itemObj){
        if (err) console.log(err);
        console.log('inserted ' + itemObj.item.label);
      });
    }
    getCollectionStates(db);
  });
}

function getCollectionStates(db){
  // drop collection and create new
  State.remove({}, function(err){
    console.log('collectionStates removed');

    var mapred = {
      map: function(){
        var id = this.item.id;
        this.item.states.forEach(function(stateObj){
          emit(stateObj.state, id);
        });
      },
      reduce: function(item, states){
        return {values: states};
      },
      out: {inline:1}
    };

    Item.mapReduce(mapred, function(err, results){
      if (err) console.log(err);
      //console.log(JSON.stringify(results, null, 4));
      results.forEach(function(result){
        var state = {};
        state.id = result._id.id; // _id is the first argument of the mapReduce, id is the id of the state
        state.label = result._id.label;
        state.descriptor = result._id.descriptor.id;
        var items = [];
        if (result.value.values){
          result.value.values.forEach(function(id){
            items.push({item: {id: id}});
          }); // values is the second argument of the mapReduce, and "values" is encapsulating the list of items
          state.items = items;
        } else { // in case there is only one item
          items.push({item: {id: results.value}});
        }

        State.create({state: state}, function(err, stateObj){
          if (err) console.log(err);
          console.log('inserted ' + stateObj.state.label);
        });
      });
      finish(db);
    });
  });
}

function finish(db){
  setTimeout(function(){
    console.log("closing connection");
    db.close();
  }, 5000);
}
