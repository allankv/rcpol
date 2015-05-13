var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var Schema = mongoose.Schema;


//ERRORS
/* GET datasource listing. */
router.get('/', function(req, res, next) {
    res.render('identification');
});

/*
    PARAMETERS: Datasource ID, Selected States
    RETURN: Eligible Items (id,label) and Descriptors (complete descriptor, complete related states) ordered by relevance.
 */

// definitions of our Item and State schemas, for querying the db
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

//router.get('/identify', function(req, res, next) {
executar(Item, State);
function executar(Item, State){

  /* param holds the states selected by the user */
  var param = {
    selectedStates:{
       /*TODO:$or not working with unique selected state,  state:{ id:2 } */
      $or:[
        {"state.id": 2}
      ]
    }
  };
  var eligibleItems = {}; // species that still can be selected
  var eligibleStates = {}; // all possible states, still unselected
  var eligibleDescriptors = {}; // All still unselected descriptors
  var result = {};

/*  if(param.selectedStates.length>0){
    // TODO
    var teste = dataset.collectionStates.filter(function (v) {return 0;});
    //console.log(teste);
  }*/

  mongoose.connect('mongodb://localhost/polen');
  var db = mongoose.connection;
  db.on('error', function(){
    console.log('connection error');
  });
  db.once('open', function(){
    var res = selectItems(param);
    finish(res, mongoose);
  });

}

function finish(res, mongoose){
  // res.send();
  //console.log("finish");
  //mongoose.close();
}

function selectItems(param){
  // collectionStates.find(param.selectedStates)
  //  map(return items [counting Items for each state])
  //  reduce (join in one array - unique values)
  //      collectionItems.find(result from reduce)
  //          map(return {elegibleItem, states}
  //          reduce (return {elegibleItem, elegibleState: join in one array - unique values, descriptor)
  //          reduce (return {elegibleItem, elegibleState, elegibleDescriptor: join in one array - unique values)
  //              mongo.close();
  //              res.send()

  // first mapReduce, to obtain all items with the selected states
  var mapred = {
    map: function() {
      this.state.items.forEach(function(itemObj){
        emit(itemObj.item.id, 1);
      });
      // count items for each state?
      //emit('states', {id: this.state.id, numberOfItems: this.state.items.length});
    },
    reduce: function(key, values) {
      return Array.sum(values);
      //return {values: values};
    },
    out: {inline:1},
    query: param.selectedStates
  };

  State.mapReduce(mapred, function(err, results){
    if(err) console.log(err);
    /*
     results =  { items: uniqueItems,
     states: results[1].value};*/

    // precisa mesmo tornar unicos? levando em conta o modo como a query eh feita ($in results)?
    var uniqueItems = [];
    results.forEach(function(item){
      uniqueItems.push(item._id);
    });

      getStates(uniqueItems, param);
  });
}

function getStates(results, param){
  var eligibleStates = [];

  Item.find({'item.id': {$in: results}}, function (err, eligibleItems){
    var mapred = {
      map: function() {
        this.item.states.forEach(function(stateObj){
          emit(stateObj.state.id, 1);
        });
      },
      reduce: function(state, count){
        return Array.sum(count);
      },
      out: {inline:1},
      query: {'item.id': {$in: results}}
    };

    Item.mapReduce(mapred, function(err, results){
      if(err) console.log(err);

      var uniqueStates = [];
      results.forEach(function(state){
        uniqueStates.push(state._id);
      });
      eligibleStates = uniqueStates;

      State.find({'state.id': {$in: uniqueStates}}, function(err, eligibleStates){
        getDescriptors(eligibleItems, eligibleStates, uniqueStates);
      });
    });
  });
}

function getDescriptors(eligibleItems, eligibleStates, uniqueStates){
//  console.log(eligibleItems);
//  console.log(eligibleStates);
  var mapred = {
    map: function() {
      this.item.states.forEach(function(stateObj){
        emit(stateObj.state.descriptor, 1);
      });
    },
    reduce: function(state, count){
      return Array.sum(count);
    },
    out: {inline:1},
    query: {'item.states.state.id': {$in: uniqueStates}}
  };

  Item.mapReduce(mapred, function(err, results){
    if(err) console.log(err);

    var eligibleDescriptors = [];
    results.forEach(function(descriptor){
      if (eligibleDescriptors.indexOf(descriptor._id) == -1)
        eligibleDescriptors.push(descriptor._id);
    });
    console.log(eligibleItems);
    console.log(eligibleStates);
    console.log(eligibleDescriptors);
  });



/*  eligibleItems.forEach(function(itemObj){
    itemObj.item.states.forEach(function(stateObj){
      eligibleDescriptors.push(stateObj.state.descriptor);
    });
  });

  setTimeout(function(){
    console.log(eligibleDescriptors);
  }, 5000);*/
}
