var express = require('express');
var router = express.Router();
var async = require('async');
var op = require('../../../oracleDBOps');
var oracledb = require('oracledb');

router.get('/', function (req, res) {
    serialInfo(req, res);
});

module.exports = router;

function serialInfo(req, res) {

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
          var serial=[];
          let sqlStatement = `SELECT * FROM SERIAL_T WHERE BIN_ID='${req.query.binId}'`;

            conn.execute(sqlStatement
                    , [], {
                outFormat: oracledb.OBJECT
            }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    if (result.rows.length === 0) {
                        res.status(401).send({'err': 'Serial Number not available for bin ID :' + req.query.binId});//Added for response set
                         cb(null, conn);
                    } else {                       
                        result.rows.forEach(function (row) {
                            var seriesObj = { serialNum:row.SERIAL_NUM||0}; 
                            serial.push(seriesObj);
                        });
                              
                        //serial.push(seriesObj);
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(serial).replace(null, '"NULL"'));
                        cb(null, conn);
                    }
                }
            });
    };

    async.waterfall(
            [
                doconnect,
                doSelect
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.writeHead(400, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(err));
                }
                if (conn)
                    dorelease(conn);
            });

}