var parse = require('csv-parse');
var fs = require('fs');

file = "database.csv";
fs.readFile(file, 'utf8', function (err, data) {
    if (err) console.log(err);
    console.log(data);
    parseFile(data);
});

function parseFile(data){
    parse(data, {delimiter: '|'}, function(err, output){
	console.log(output);
    }
}