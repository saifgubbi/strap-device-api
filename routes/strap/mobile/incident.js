var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');
var multer = require('multer');
var fs=require('fs');
var path=require('path');

router.post('/', function (req, res) {
    createIncident(req, res);
});

router.get('/', function (req, res) {
    getImage(req, res);
});

module.exports = router;


var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./Images");
    },
    filename: function (req, file, callback) {
        console.log(file.fieldname);
        callback(null, file.fieldname + "_" + Date.now());
    }

});


var upload = multer({
    storage: Storage
}).single("file"); //Field name and max count

 function createIncident (req, res) {
    upload(req, res, function (err) {
        console.log(req.body);
        if (err) {
            console.log(err);
            return res.end("Something went wrong!");
        }
        return res.end("File uploaded sucessfully!.");
    });

};

function getImage (req, res) {
    var storedMimeType = 'image/jpeg';
    res.setHeader('Content-Type', storedMimeType);
    fs.createReadStream(path.join('./images/', req.params.id).replace(/\.[^/.]+$/, "")).pipe(res)
};




