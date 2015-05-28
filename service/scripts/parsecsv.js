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
          // in case it is a numerical descriptor:
          mean: Number,
          dev: Number,
          max: Number,
          min: Number,
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

var file = "./test.csv";
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
          if (taxons[i][j].indexOf(" & ") != -1){ // if the item has multiple states
            var splittedStates = taxons[i][j].split(" & ");
            splittedStates.forEach(function(state){
              insertstate(states, seenStates, state, j, columns[j], "DC");
            });
          }
          else {
            insertstate(states, seenStates, taxons[i][j], j, columns[j], "DC");
          }
        }
        if (codes[j] == 'DN'){ //if this is a numerical descriptors
          insertstate(states,seenStates, taxons[i][j], j, columns[j], "DN");
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
          // if is a categorical descriptor
          if (stateObj.state.label)
            emit(stateObj.state, id);
          else{
            var s = {
              id: stateObj.state.id,
              descriptor: stateObj.state.descriptor.id
            };
            emit(s, id);
          }
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
        state.descriptor = result._id.descriptor.id;
        var items = [];
        if (result.value.values){
          result.value.values.forEach(function(id){
            items.push({item: {id: id}});
          }); // values is the second argument of the mapReduce, and "values" is encapsulating the list of items
        } else { // in case there is only one item
          items.push({item: {id: results.value}});
        }
        state.items = items;

        if (result._id.label) //if is categorical
          state.label = result._id.label;


        State.create({state: state}, function(err, stateObj){
          if (err) console.log(err);
          console.log('inserted ' + stateObj.state.label);
        });
      });
      finish(db);
    });
  });
}

function insertstate(states, seenStates, state, id, label, type){
  var stateObj = {};

  if(type == "DC"){
    //if it is a categorical descriptor, we will mark its state on the seenStates list
    if (seenStates.indexOf(state) == -1){ // if this is the first time we see this state
      seenStates.push(state);
      stateObj.id = seenStates.indexOf(state);
    } else stateObj.id = seenStates.indexOf(state);
    stateObj.label = state;
  }

  if(type == "DN"){
    var values = state.split(" & ");
    if (seenStates.indexOf(label) == -1){ // if this is the first time we see this state
      seenStates.push(label);
      stateObj.id = seenStates.indexOf(label);
    } else stateObj.id = seenStates.indexOf(label);
    stateObj.mean = values[0];
    stateObj.dev = values[1];
    stateObj.min = values[2];
    stateObj.max = values[3];
  }

  var descriptor = {};
  descriptor.id = id;
  descriptor.label = label;
  stateObj.descriptor = descriptor;

  if (type == "DN" && values.indexOf('') == -1 || type == "DC")
    states.push({state: stateObj});
}

function finish(db){
  setTimeout(function(){
    console.log("closing connection");
    db.close();
  }, 5000);
}
