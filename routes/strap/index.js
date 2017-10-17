var express = require('express');
var router = express.Router();

/*Lift Routes*/
router.use('/test', require('./test'));

router.use('/rfid', require('./rfid'));
router.use('/mobile', require('./mobile'));

//router.use('/inquiry', require('./inquiry'));

router.get('/', function (req, res) {
    res.send('Welcome to  Shipment Tracking RFID Apis!');
});


module.exports = router;