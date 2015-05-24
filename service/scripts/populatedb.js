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

mongoose.connect('mongodb://localhost/polen');
var db = mongoose.connection;
db.on('error', function(){
  console.log('connection error');
});
db.once('open', function(){
  console.log('connected to ' + Item.db.name);

  // drop collections and create new ones
  Item.remove({}, function(err) {
    console.log('collectionItems removed');
    for (var i in dataset.collectionItems){
      Item.create(dataset.collectionItems[i], function (err, item){
        if(err) console.log(err);
        console.log('inserted:' + dataset.collectionItems[i].item.label);
      });
    }
  });

  State.remove({}, function(err) {
    console.log('collectionStates removed');
    for (var j in dataset.collectionStates){
      State.create(dataset.collectionStates[j], function (err, state){
        if(err) console.log(err);
        console.log('inserted:' + dataset.collectionStates[j].state.label);
      });
    }
  });

  setTimeout(function(){
    db.close();
  }, 3000);
});


/* database model (example) */
var dataset ={
  collectionItems:
  [
              {
                  item:{
                      id:1,
                      label:"Species A",
                        states:[
                          {
                            state:{
                                id:1,
                                label:"Branco",
                                descriptor:{
                                  id:1,
                                  label:"Cor"
                                }
                            }
                          },
                          {
                              state:{
                                  id:2,
                                  label:"Amarelo",
                                    descriptor:{
                                      id:1,
                                      label:"Cor"
                                    }
                                }
                            },
                            {
                              state:{
                                  id:3,
                                  label:"Grande",
                                  descriptor:{
                                      id:2,
                                      label:"Tamanho"
                                    }
                                }
                            },
                            {
                              state:{
                                id:4,
                                label:"Medida",
                                mean: 30.0,
                                dev: 0.5,
                                max: 40.0,
                                min: 20.0,
                                descriptor:{
                                  id:2,
                                  label:"Tamanho do grão"
                                }
                              }
                            },
                        ]
                    }
                },
              {
                  item:{
                        id:2,
                    label:"Species B",
                    states:[
                      {
                        state:{
                          id:1,
                          label:"Branco",
                          descriptor:{
                            id:1,
                            label:"Cor"
                          }
                        }
                      },
                      {
                        state:{
                          id:4,
                          label:"Medida",
                          mean: 12.0,
                          dev: 0.8,
                          max: 50.0,
                          min: 10.0,
                          descriptor:{
                            id:2,
                            label:"Tamanho do grão"
                          }
                        }
                      }
                    ]
                  }
                },
              {
                  item:{
                        id:3,
                      label:"Species C",
                      states:[
                          {
                                state:{
                                  id:1,
                                  label:"Branco",
                                    descriptor:{
                                      id:1,
                                      label:"Cor"
                                    }
                                }
                            },
                          {
                              state:{
                                    id:3,
                                  label:"Grande",
                                  descriptor:{
                                        id:2,
                                      label:"Tamanho"
                                    }
                                }
                          },
                        {
                          state:{
                            id:4,
                            label:"Medida",
                            mean: 50.0,
                            dev: 2.0,
                            max: 90.0,
                            min: 10.0,
                            descriptor:{
                              id:2,
                              label:"Tamanho do grão"
                            }
                          }
                      }
                        ]
                    }
                },
              {
                  item:{
                        id:4,
                      label:"Species D",
                      states:[
                            {
                              state:{
                                  id:2,
                                    label:"Amarelo",
                                  descriptor:{
                                      id:1,
                                      label:"Cor"
                                    }
                                }
                            },
                            {
                              state:{
                                  id:3,
                                  label:"Grande",
                                    descriptor:{
                                      id:2,
                                      label:"Tamanho"
                                    }
                                }
                            }
                        ]
                    }
                }
            ],

  collectionStates:
  [
              {
                  state:{
                    id:1,
                    label:"Branco",
                    descriptor: 1,
                    items:[
                          {
                              item:{
                                    id:1
                                }
                            },
                          {
                              item:{
                                  id:2
                                }
                            },
                          {
                              item:{
                                  id:3
                                }
                            }
                        ]
                    }
              },
              {
                  state:{
                    id:2,
                    label:"Amarelo",
                    descriptor: 1,
                    items:[
                          {
                              item:{
                                  id:1
                                }
                            },
                          {
                              item:{
                                  id:4
                                }
                            }
                        ]
                    }
                },
              {
                  state:{
                    id:3,
                    label:"Grande",
                    descriptor: 2,
                    items:[
                          {
                                item:{
                                  id:1
                                }
                            },
                          {
                                item:{
                                  id:3
                                }
                            },
                          {
                              item:{
                                  id:4
                                }
                            }
                        ]
                    }
              },
              {   // Numerical Descriptor
                  state:{
                    id:4,
                    label:"Medida",
                    descriptor: 3
                  }
              }
  ]
};
