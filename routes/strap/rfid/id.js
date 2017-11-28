var express = require('express');
var router = express.Router();
var async = require('async');
var op = require('../../../oracleDBOps');
var oracledb = require('oracledb');

router.get('/', function (req, res) {
    idInfo(req, res);
});

router.get('/view', function (req, res) {
    viewInfo(req, res);
});

module.exports = router;

/**
 * @api {get} /id/:id Get bin/pallet details
 * @apiVersion 1.0.0
 * @apiName idInfo
 * @apiGroup rfid
 * @apiPermission none
 *
 * @apiDescription This function is used to fetch the bin/pallet details based on id entered.
 *
 * @apiParam {String} id first character of id represents Bin/Pallet Bin=0 and Pallet=1.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      "id": "1000000000000002",
 *  "status": "Dispatched",
 *  "partNo": "0261S19174570",
 *     "qty": 160,
 *    "type": "Pallet"
 *     }
 * @apiExample Example usage:
 * curl -i http://localhost/api/strap/rfid/id?id=1000000000000002
 * @apiError UserNotFound The id of the User was not found.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Not Found
 *     {
 *        "err": "ID not found in PALLETS_T"
 *     }
 * @apiUse CreateUserError
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
            //cb({"err": "Invalid ID selected"}, conn);
            res.status(401).send({"err": "Invalid ID selected"});//Added for response set
            cb(null, conn);
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
                        res.status(401).send({'err': 'ID not found in ' + table});//Added for response set
                        cb(null, conn);
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

}
/**
 * @api {get} /id/:id Get bin/pallet details for view
 * @apiVersion 1.0.0
 * @apiName viewInfo
 * @apiGroup rfid
 * @apiPermission none
 *
 * @apiDescription This function is used to fetch the bin/pallet details based on id entered.
 *
 * @apiParam {String} id first character of id represents Bin/Pallet Bin=0 and Pallet=1.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id": "1000000000000171",
 *       "status": "Ready",
 *       "partNo": "NULL",
 *       "fromLoc": "W720",
 *       "type": "Pallet",
 *       "qty": 0,
 *       "owner": "RBAI",
 *       "invoice": "NULL"
 *         }
 * @apiExample Example usage:
 * curl -i http://localhost/api/strap/rfid/id/view?id= 1000000000000171
 * @apiError NoDataFound The id of the Bin/Pallet was not found.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Not Found
 *     {
 *        "err": "ID not found in PALLETS_T"
 *     }
 */
function viewInfo(req, res) {
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
            //cb({"err": "Invalid ID selected"}, conn);
            res.status(401).send({"err": "Invalid ID selected"});//Added for response set
            cb(null, conn);
        } else {

            let sqlStatement = `SELECT * FROM ${table} WHERE ${idLabel}='${req.query.id}'`;
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
                            idDet.id = row.BIN_ID || row.PALLET_ID;
                            idDet.status = row.STATUS;
                            idDet.partNo = row.PART_NO||'NULL';
                            idDet.fromLoc = row.FROM_LOC;
                            idDet.type = type;
                            idDet.qty = row.QTY || 0;
                            idDet.owner = row.OWNER;
                            idDet.invoice = row.INVOICE_NUM||'NULL';
                            idDet.partGrp = row.PART_GROUP;
                            if (type === 'Bin')
                            {
                            idDet.palletId = row.PALLET_ID||'NULL';
                             }
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

}