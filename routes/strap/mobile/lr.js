var express = require('express');
var router = express.Router();
var async = require('async');
var op = require('../../../oracleDBOps');
var oracledb = require('oracledb');

router.get('/dispatch', function (req, res) {
    getDipatchLR(req, res);
});

router.get('/receive', function (req, res) {
    getReceiveLR(req, res);
});

router.get('/', function (req, res) {
    getLRDetails(req, res);
});

module.exports = router;

function getDipatchLR(req, res) {

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        let partGrp = req.query.partGrp;
        let locId = req.query.locId;

        let sqlStatement = `SELECT LR_NO,COUNT(*) INV_COUNT FROM INV_HDR_T WHERE STATUS='LR Assigned' AND PART_GRP='${partGrp}' AND FROM_LOC='${locId}' AND LR_NO IS NOT NULL GROUP BY LR_NO `;
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
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify([]));
                    cb(null, conn);
                } else {
                    let lrArr = [];
                    result.rows.forEach(function (row) {
                        let lrObj = {};
                        lrObj.lr = row.LR_NO;
                        lrObj.invCount = row.INV_COUNT||0;
                        lrArr.push(lrObj);
                    });
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(lrArr));
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
                }
                if (conn)
                    dorelease(conn);
            });

}



function getReceiveLR(req, res) {

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        let partGrp = req.query.partGrp;
        let locId = req.query.locId;

        let sqlStatement = `SELECT LR_NO,COUNT(*) INV_COUNT FROM INV_HDR_T WHERE STATUS='Reached' AND PART_GRP='${partGrp}' AND TO_LOC='${locId}' AND LR_NO IS NOT NULL GROUP BY LR_NO `;
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
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify([]));
                    cb(null, conn);
                } else {
                    let lrArr = [];
                    result.rows.forEach(function (row) {
                        let lrObj = {};
                        lrObj.lr = row.LR_NO;
                        lrObj.invCount = row.INV_COUNT;
                        lrArr.push(lrObj);
                    });
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(lrArr));
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
                }
                if (conn)
                    dorelease(conn);
            });

}



function getLRDetails(req, res) {

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        let partGrp = req.query.partGrp;
        //  let locId = req.query.locId;
        let lr = req.query.lr;

        var sqlStatement = `(SELECT A.BIN_ID AS OBJ_ID,A.QTY,A.PART_NO,'Bin' as OBJ_TYPE,B.INVOICE_NUM FROM BINS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}' AND PALLET_ID is NULL) UNION (SELECT A.PALLET_ID AS OBJ_ID,A.QTY,A.PART_NO,'Pallet' as OBJ_TYPE,B.INVOICE_NUM FROM PALLETS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}')`;

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
                    cb({err: 'No Bins/Pallets found for this LR'}, conn);
                } else {
                    let objArr = [];
                    result.rows.forEach(function (row) {
                        let obj = {};
                        obj.id = row.OBJ_ID;
                        obj.type = row.OBJ_TYPE;
                        obj.invId = row.INVOICE_NUM;
                        obj.partNo = row.PART_NO;
                        obj.qty = row.QTY;
                        objArr.push(obj);
                    });
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(objArr));
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
                }
                if (conn)
                    dorelease(conn);
            });

}