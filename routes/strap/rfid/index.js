var express = require('express');
var router = express.Router();


router.use('/id', require('./id'));
router.use('/lr', require('./lr'));
router.use('/pickList', require('./pickList'));
router.use('/serial', require('./serial'));

router.use('/release', require('./release'));
router.use('/dispatch', require('./dispatch'));
router.use('/receive', require('./receive'));
router.use('/picking', require('./picking'));


//router.use('/inquiry', require('./inquiry'));

router.get('/', function (req, res) {
    res.send('Welcome to  Shipment Tracking RFID Apis!');
});


module.exports = router;