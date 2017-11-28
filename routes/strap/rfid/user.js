var express = require('express');
var router = express.Router();
var async = require('async');
var op = require('../../../oracleDBOps');
var oracledb = require('oracledb');

router.get('/part', function (req, res) {
    idPart(req, res);
});

router.get('/loc', function (req, res) {
    idLoc(req, res);
});

module.exports = router;

/**
 * @api {get} /id/:id Get Part Group details of User
 * @apiVersion 1.0.0
 * @apiName idPart
 * @apiGroup rfid
 * @apiPermission none
 *
 * @apiDescription This function is used to fetch the bin/pallet details based on id entered.
 * 
 */
function idPart(req, res) {
    
    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
         var pGrp=[];
        let sqlStatement = `SELECT * FROM USER_PARTS_T WHERE USER_ID='${req.query.id}'`;
            console.log(sqlStatement);
            conn.execute(sqlStatement
                    , [], {
                outFormat: oracledb.OBJECT
            }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    if (result.rows.length === 0) {
                        res.status(401).send({'err': 'ID not found in ' + table});//Added for response set
                        cb(null, conn);
                    } else {
                        let idDet = {};
                        result.rows.forEach(function (row) {
                            idDet=row.PART_GRP; 
                            pGrp.push(idDet);
                        });
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(pGrp).replace(null, '"NULL"'));
                        cb(null, conn);
                    }
                     
                }
            });
        }
    

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

};
/**
 * @api {get} /id/:id Get Part Group details of User
 * @apiVersion 1.0.0
 * @apiName idPart
 * @apiGroup rfid
 * @apiPermission none
 *
 * @apiDescription This function is used to fetch the bin/pallet details based on id entered.
 * 
 */
function idLoc(req, res) {
    var pLoc=[];
    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {

        let sqlStatement = `SELECT * FROM USER_LOCATIONS_T WHERE USER_ID='${req.query.id}'`;

            conn.execute(sqlStatement
                    , [], {
                outFormat: oracledb.OBJECT
            }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    if (result.rows.length === 0) {
                        res.status(401).send({'err': 'ID not found in ' + table});//Added for response set
                        cb(null, conn);
                    } else {
                        let idDet = {};
                        result.rows.forEach(function (row) {
                            idDet = row.LOC_ID;
                            pLoc.push(idDet);
                        });
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(pLoc).replace(null, '"NULL"'));
                        cb(null, conn);
                    }
                }
            });
        }
    

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

};