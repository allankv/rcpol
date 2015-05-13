var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;

/* GET datasource listing. */
router.get('/', function(req, res, next) {
    res.render('identification');
});

/*
    PARAMETERS: Datasource ID, Selected States
    RETURN: Eligible Items (id,label) and Descriptors (complete descriptor, complete related states) ordered by relevance.
 */

router.get('/identify', function(req, res, next) {
  /* param holds the states selected by the user */
  var param = {
    selectedStates:[{
      // state:{
      //     id:1
      //r }
    }]
  };
  var eligibleItems = {}; // species that still can be selected
  var eligibleStates = {}; // (mapReduce) all possible states, still unselected
  var eligibleDescriptors = {}; // All still unselected descriptors
  var result = {};

/*  if(param.selectedStates.length>0){
    // TODO
    var teste = dataset.collectionStates.filter(function (v) {return 0;});
    //console.log(teste);
  }*/



  mongo.connect("mongodb://localhost/", function(err, db){
    var polen = db.db("polen");

    // eligibleItems
    polen.collection("collectionItems", function(err, collection){
      collection.find(function(err, items){
        items.toArray(function(err, itemArr){
          eligibleItems["eligibleItems"] = itemArr.map(function(currentValue){
            var item = {
              id: currentValue.item.id,
              label: currentValue.item.label,
              statesCount: currentValue.item.states.length
            };
            return item;
          });
        });
      });
    });

    // eligibleStates
    polen.collection("collectionItems", function(err, collection){
      eligibleStates["eligibleStates"] = [];
      collection.mapReduce(
        function(){ emit(this.item.id, this.item.states); }, //map
        function(id, states){ return states; }, //reduce
        { out: {inline:1} },
        function(err, results){
          eligibleDescriptors = results.map(function(currentValue){
            return currentValue["value"];
          }).map(function(currentValue){
            if(!(currentValue in eligibleStates["eligibleStates"])) {
              eligibleStates["eligibleStates"].push(currentValue);
              return currentValue;
            }
          }).reduce(function(currentValue, previousValue){
            return currentValue.concat(previousValue);
          }).map(function(currentValue, index){
            //eligibleDescriptor
            var r = {};
            r.descriptor =  currentValue.state.descriptor;
            delete currentValue.state.descriptor;
            r.descriptor.state = currentValue.state;
            return r;
          });
        }
      );
    });


    // close and send results
    setTimeout(function(){
      db.close();
      result = {
        eligibleItems:eligibleItems["eligibleItems"],
        eligibleDescriptors:eligibleDescriptors
      };
      res.send(result);
    }, 5000);
  });
});

module.exports = router;
