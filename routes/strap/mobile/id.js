var express = require('express');
var router = express.Router();
var async = require('async');
var op = require('../../../oracleDBOps');
var oracledb = require('oracledb');

router.get('/', function (req, res) {
    idInfo(req, res);
});


module.exports = router;
/**
 * @api {get} /id/:id Get Bin/Pallet information
 * @apiVersion 1.0.0
 * @apiName idInfo
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Bin/Pallet information.
 */
function idInfo(req, res) {
    let table;
    let idLabel;
    let type;

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {

        if (req.query.id.charAt(8) === '0') {
            table = 'BINS_T';
            idLabel = 'BIN_ID';
            type = 'Bin';
        }
        if (req.query.id.charAt(8) === '1') {
            table = 'PALLETS_T';
            idLabel = 'PALLET_ID';
            type = 'Pallet';
        }
        if (!table) {
            cb({"err": "Invalid ID selected"}, conn);
        } else {

            let sqlStatement = `SELECT * FROM ${table} WHERE ${idLabel}='${req.query.id}'`;

            conn.execute(sqlStatement
                    , [], {
                outFormat: oracledb.OBJECT
            }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    if (result.rows.length === 0) {
                        cb({'err': 'ID not found in ' + table}, conn);
                    } else {
                        let idDet = {};
                        result.rows.forEach(function (row) {
                            idDet.id = row.BIN_ID || row.PALLET_ID;
                            idDet.status = row.STATUS;
                            idDet.partNo = row.PART_NO;
                            idDet.fromLoc = row.FROM_LOC;
                            idDet.qty = row.QTY || 0;
                            idDet.type = type;
                        });
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(idDet).replace(null, '"NULL"'));
                        cb(null, conn);
                    }
                }
            });
        }
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