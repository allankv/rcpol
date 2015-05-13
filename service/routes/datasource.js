var express = require('express');
var router = express.Router();

/* GET datasource listing. */
router.get('/', function(req, res, next) {
  res.render('datasource');
});
// Param URL
router.get('/registry', function(req, res, next) {
    // Request file URL
    // Save in database
    var r = {
        ds_id: "84l284l8s8a892b20",
        message: "Datasource \"ID=84l284l8s8a892b20\" saved from SDD",
        success: true
    };
    res.send(r);
});
router.get('/remove', function(req, res, next) {
    var r = {message: "Datasource \"ID=84l284l8s8a892b20\" removed",
        success: true
    };
    res.send(r);
});

router.get('/update', function(req, res, next) {
    var r = {message: "Datasource \"ID=84l284l8s8a892b20\" updated",
        success: true
    };
    res.send(r);
});

module.exports = router;
