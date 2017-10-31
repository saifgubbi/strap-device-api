var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

router.post('/', function (req, res) {
    pickLoc(req, res);
});

router.get('/', function (req, res) {
    getLoc(req, res);
});

module.exports = router;

var fs = require('fs');



function pickLoc(req, res) {
    let deviceId = req.body.deviceId;
    let lat = req.body.lat;
    let lan = req.body.lan;  
    let comments = req.body.comments; 
    let ts = req.body.time;
    
   // let bindArr = [];

    let sqlStatement = "INSERT INTO GPS_DEVICE_T VALUES (:1,:2,:3,:4,:5) ";
    let bindVars=[deviceId, ts, lat, lan, comments];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getLoc(req, res) {
    
    let deviceId = req.query.deviceId;

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {

       let sqlStatement = `SELECT * FROM GPS_DEVICE_T WHERE DEVICE_ID='${deviceId}'`;
            
            conn.execute(sqlStatement
                    , [], {
                outFormat: oracledb.OBJECT
            }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    if (result.rows.length === 0) {
                        cb({'err': 'ID not found in GPS Devices'}, conn);
                    } else {
                        let gpsDet = {};
                        result.rows.forEach(function (row) {
                            gpsDet.deviceId = row.DEVICE_ID;
                            gpsDet.eventTs = row.EVENT_TS;
                            gpsDet.lat = row.LAT;
                            gpsDet.lon = row.LON;
                            gpsDet.comments = row.COMMENTS;
                        });
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(gpsDet).replace(null, '"NULL"'));
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
                    res.writeHead(500, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(err));
                    if (conn)
                    {
                        dorelease(conn);
                    }
                }
                if (conn)
                {
                    dorelease(conn);
                }
            });

}