/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

// Serving static files from "public" folder

var express = require('express');
var router = express.Router();

router.use(express.static('public'));
router.use('/strap', require('./strap'));


router.get('/', function (req, res) {
    res.send('Welcome to  STRAP App Apis!');
});

router.get('/about', function (req, res) {
    res.send('Learn about us');
});

module.exports = router;