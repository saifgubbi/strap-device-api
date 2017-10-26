var express = require('express');
var router = express.Router();


router.use('/id', require('./id'));
//router.use('/lr', require('./lr'));
//router.use('/pickList', require('./pickList'));

//router.use('/release', require('./release'));
//router.use('/dispatch', require('./dispatch'));
//router.use('/receive', require('./receive'));
//router.use('/picking', require('./picking'));
router.use('/invList', require('./invList'));
router.use('/invHist', require('./invHist'));
router.use('/invMap', require('./invMap'));
router.use('/sched', require('./sched'));
router.use('/notification', require('./notification'));

router.use('/parts/partLocType', require('./parts/partLocType'));
router.use('/parts/status', require('./parts/status'));
router.use('/parts/stock', require('./parts/stock'));

router.use('/home/bins', require('./home/bins'));
router.use('/home/parts', require('./home/parts'));
router.use('/home/invoices', require('./home/invoices'));
router.use('/home/sched', require('./home/sched'));



router.get('/', function (req, res) {
    res.send('Welcome to  Shipment Tracking Mobile Apis!');
});


module.exports = router;