var express = require('express');
var router = express.Router();


router.use('/status', require('./status'));
//router.use('/notification', require('./notification'));
//router.use('/inquiry', require('./inquiry'));

router.get('/', function (req, res) {
    res.send('Welcome to  Shipment Tracking RFID Apis!');
});


module.exports = router;