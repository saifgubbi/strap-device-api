var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
//var moment = require('moment');
var async = require('async');
//var google =require('google');
var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getGeoLoc(req, res);
});


module.exports = router;

/**
 * @api {get} /id/:id Get Invoice Geo Location
 * @apiVersion 1.0.0
 * @apiName getGeoLoc
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Invoice geo location based on device.
 */
function getGeoLoc(req, res) {
    var request = require('request');
    var partGrp = req.query.partGrp;
    var invId = req.query.invId;
    var geoRes = {inv: {}, dev: {},cur:{} };
    var mapArr ={};

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getInvLoc(conn, cb) {
        console.log("Getting List");

        let selectStatement = `SELECT DEVICE_ID as "deviceID",
                                      B.LAT AS "srcLat",
                                      B.LON AS "srcLang",
	                              C.LAT AS "destLat",
                                      C.LON AS "destLang"
                                 FROM INV_HDR_T A,LOCATIONS_T B,LOCATIONS_T C 
                                WHERE A.INVOICE_NUM = '${invId}' 
                                  AND A.part_grp= '${partGrp}' 
                                  AND A.FROM_LOC=B.LOC_ID 
                                  AND A.TO_LOC=C.LOC_ID`;
        //console.log(selectStatement);

        let bindVars = [];

        conn.execute(selectStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT, // Return the result as Object
                    autoCommit: true// Override the default non-autocommit behavior
                }, function (err, result)
        {
            if (err) {
                console.log("Error Occured: ", err);
                cb(err, conn);
            } else {
                result.rows.forEach(function (row) {
                    geoRes.inv = row;
                });

                cb(null, conn);
            }
        });

    }


    function getCurrentLoc(conn, cb) {
       // console.log(geoRes.inv.deviceID);
        request('http://l.tigerjump.in/tjbosch/getDeviceLocation?key=15785072&deviceID=' + geoRes.inv.deviceID, function (err, response, result) {
            console.log(result);
            if (err) {
                cb(err, conn);
            } else {
                // console.log(result);
                res.writeHead(200, {'Content-Type': 'application/json'});
                try {
                    geoRes.dev = JSON.parse(result);
                } catch (err) {
                    geoRes.dev = {};
                }
                //  res.end(JSON.stringify(geoRes));
                cb(null, conn);
            }

        });
    }

    function getCurrentLoc1(conn, cb) {

        request('https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins='
                + geoRes.dev.data.lastLat + ',' + geoRes.dev.data.lastLang +
                '&destinations=' + geoRes.inv.destLat + ',' + geoRes.inv.destLang + '\
              &key=AIzaSyA3P7PPCNhDvpgBwcmaLVZxPlnqoCVSd7M', function (err, response, result) {

                    console.log(result);
                    if (err) {
                        cb(err, conn);
                    } else {
                        // console.log(result);
                        //res.writeHead(200, {'Content-Type': 'application/json'});
                        try {
                            geoRes.cur  = JSON.parse(result); 
                            //mapArr=result;
                            //res.writeHead(200, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify(geoRes));
                            cb(null, conn);
                        } catch (err) {
                            console.log(err);
                            geoRes.cur = {};
                           // res.writeHead(200, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify(geoRes));
                            cb(null, conn);
                        }
//                        res.end(JSON.stringify(mapArr));
//                        cb(null, conn);
                    }
                });
    }

    async.waterfall(
            [doConnect,
                getInvLoc,
                getCurrentLoc,
                getCurrentLoc1
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(500).json({message: err});
                    conn.close();
                }
                console.log("Done Waterfall");
                if (conn)
                {
                    conn.close();
                }
            });

}
