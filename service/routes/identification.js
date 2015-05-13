var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var Schema = mongoose.Schema;

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


/* GET datasource listing. */
router.get('/', function(req, res, next) {
    res.render('identification');
});

/*
    PARAMETERS: Datasource ID, Selected States
    RETURN: Eligible Items (id,label) and Descriptors (complete descriptor, complete related states) ordered by relevance.
 */

router.get('/identify', function(req, res, next) {

  // param holds the states selected by the user
  var param = {
    selectedStates:
    [
      {"state.id": 1},
      {"state.id": 2},
      {"state.id": 3}
    ]
  };
  var eligibleItems = {}; // species that still can be selected
  var eligibleStates = {}; // all possible states, still unselected
  var eligibleDescriptors = {}; // All still unselected descriptors
  var result = {}; // info to send back to client

  mongoose.connect('mongodb://localhost/polen');
  var db = mongoose.connection;
  db.on('error', function(){
    console.log('connection error');
  });
  db.once('open', function(){
    // collectionStates.find(param.selectedStates)             |
    //  map(return items [counting Items for each state])      | selectItems
    //  reduce (join in one array - unique values)             |
    //      collectionItems.find(result from reduce)                                                           |
    //          map(return {elegibleItem, states}                                                              | getStates
    //          reduce (return {elegibleItem, elegibleState: join in one array - unique values, descriptor)    |
    //          reduce (return {elegibleItem, elegibleState, elegibleDescriptor: join in one array - unique values) | getDescriptors
    //              mongo.close();
    //              res.send()


    selectItems(param, Item, State, res);
  });

});

function selectItems(param, Item, State, res){

  if (Object.keys(param.selectedStates).length == 0){
    // if no states were selected, return all items and all states
    getStates({}, param, Item, State, res);
  }
  else {
    // first mapReduce, to obtain all items with the selected states
    // the query must be set in the following way: if the selected states
    // belong to the same descriptor, it performs an OR operation over the states.
    // if the slected states belong to different descriptors, it performs an AND operation
    // over the states

    var mapred = {
      map: function() {
        // for each descriptor, emit all items with the selected states
        var descriptor = this.state.descriptor;
        this.state.items.forEach(function(itemObj){
          emit (descriptor, itemObj.item.id);
        });
      },
      reduce: function(key, values) {
        return {states: values};
      },
      out: {inline:1},
      query: {$or: param.selectedStates}
    };

    State.mapReduce(mapred, function(err, results){
      if(err) console.log(err);

      // if the item is present in all the descriptor arrays, push it.
      var uniqueItems = results[0].value.states;
      results.forEach(function(descriptor){
        uniqueItems = uniqueItems.filter( function(item) {
          return descriptor.value.states.indexOf(item) != -1;
        });
      });
      console.log(uniqueItems);

      getStates(uniqueItems, param, Item, State, res);
    });

  }
}

function getStates(uniqueItems, param, Item, State, res){
  // second mapReduce, get eligibleStates from eligibleItems AND selectedStates
  // the eligibleStates will be those which haven't been selected

  // items filtered with uniqueItems (results)
  var eligibleStates = [];

  // if no states were selected, get all items
  if (Object.keys(uniqueItems).length == 0)
    var query = uniqueItems;
  else
    query = {'item.id': {$in: uniqueItems}};

  Item.find(query, function (err, eligibleItems){
    if (err) console.log(err);

    var mapred = {
      map: function() {
        this.item.states.forEach(function(stateObj){
          emit(stateObj.state.id, 1);
        });
      },
      reduce: function(state, count){
        return Array.sum(count);
      },
      out: {inline:1}
    };

    Item.mapReduce(mapred, function(err, results){
      // results: state with it's number of items
      if(err) console.log(err);

      // get the ids of the selected states
      var selectedIds = param.selectedStates.map(function(state){
        return state['state.id'];
      });

      var uniqueStates = [];
      results.forEach(function(state){
        // make unique, excluding selected states
        if (selectedIds.indexOf(state._id) == -1){
          uniqueStates.push(state._id);
        }
      });

      State.find({'state.id': {$in: uniqueStates}}, function(err, eligibleStates){
        if (err) console.log(err);
        getDescriptors(eligibleItems, eligibleStates, selectedIds, Item, res);
      });
    });
  });
}

function getDescriptors(eligibleItems, eligibleStates, selectedIds, Item, res){

  var mapred = {
    map: function() {
      this.item.states.forEach(function(stateObj){
        if (selectedIds.indexOf(stateObj.state.id) == -1)
          emit(stateObj.state.descriptor, 1);
      });
    },
    reduce: function(state, count){
      return Array.sum(count);
    },
    out: {inline:1},
    scope: {selectedIds: selectedIds}
  };

  Item.mapReduce(mapred, function(err, results){
    if(err) console.log(err);

    var eligibleDescriptors = [];
    results.forEach(function(descriptor){
      eligibleDescriptors.push(descriptor._id);
    });

    var result = {
      eligibleItems: eligibleItems,
      eligibleDescriptors: eligibleDescriptors
    };

    finish(result, mongoose, res);
  });
}

function finish(result, mongoose, res){
  res.send(result);
  mongoose.connection.close();
}

module.exports = router;
