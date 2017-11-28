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

router.get('/old', function (req, res) {
    getLRDetailsOld(req, res);
});

module.exports = router;
/**
 * @api {get} /id/:id Get LR for Dispatch
 * @apiVersion 1.0.0
 * @apiName lr/dispatch
 * @apiGroup rfid
 * @apiPermission none
 *
 * @apiDescription This function is used to fetch the LR Number before Dispatch.
 */
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

        conn.execute(sqlStatement
                , [], {
            outFormat: oracledb.OBJECT
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                if (result.rows.length === 0) {

                    res.status(200).send([]);
                    cb(null, conn);
                } else {
                    let lrArr = [];
                    result.rows.forEach(function (row) {
                        let lrObj = {};
                        lrObj.lr = row.LR_NO || 0;
                        lrObj.invCount = row.INV_COUNT || 0;
                        lrArr.push(lrObj);
                    });
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(lrArr).replace(null, '"NULL"'));
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

/**
 * @api {get} /id/:id Get LR for Receive
 * @apiVersion 1.0.0
 * @apiName lr/receive
 * @apiGroup rfid
 * @apiPermission none
 *
 * @apiDescription This function is used to fetch the LR number for receiving.
 */

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

        conn.execute(sqlStatement
                , [], {
            outFormat: oracledb.OBJECT
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {

                if (result.rows.length === 0) {
                    res.status(200).send([]);
                    cb(null, conn);
                } else {
                    let lrArr = [];
                    result.rows.forEach(function (row) {
                        let lrObj = {};
                        lrObj.lr = row.LR_NO || 0;
                        lrObj.invCount = row.INV_COUNT || 0;
                        lrArr.push(lrObj);
                    });
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(lrArr).replace(null, '"NULL"'));
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

/**
 * @api {get} /id/:id getLRDetailsOld
 * @apiVersion 1.0.0
 * @apiName lr/details
 * @apiGroup rfid
 * @apiPermission none
 *
 * @apiDescription This function is used to fetch the LR details.
 */
function getLRDetailsOld(req, res) {

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        let partGrp = req.query.partGrp;
        let lr = req.query.lr;

        var sqlStatement = `(SELECT A.BIN_ID AS OBJ_ID,A.QTY,A.PART_NO,'Bin' as OBJ_TYPE,B.INVOICE_NUM FROM BINS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}' AND PALLET_ID is NULL) UNION (SELECT A.PALLET_ID AS OBJ_ID,A.QTY,A.PART_NO,'Pallet' as OBJ_TYPE,B.INVOICE_NUM FROM PALLETS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}')`;

        conn.execute(sqlStatement
                , [], {
            outFormat: oracledb.OBJECT
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                if (result.rows.length === 0) {
                    res.status(401).send({err: 'No Bins/Pallets found for this LR'});//Added for response set
                    cb(null, conn);
                } else {
                    let objArr = [];
                    result.rows.forEach(function (row) {
                        let obj = {};
                        obj.id = row.OBJ_ID;
                        obj.type = row.OBJ_TYPE;
                        obj.invId = row.INVOICE_NUM || 'NULL';
                        obj.partNo = row.PART_NO || 'NULL';
                        obj.qty = row.QTY || 0;
                        objArr.push(obj);
                    });
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(objArr).replace(null, '"NULL"'));
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

/**
 * @api {get} /id/:id Get LR Details
 * @apiVersion 1.0.0
 * @apiName lr/details
 * @apiGroup rfid
 * @apiPermission none
 *
 * @apiDescription This function is used to fetch the LR details.
 */
function getLRDetails(req, res) {

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };
    var objArr = [];

    var doSelect = function (conn, cb) {
        let partGrp = req.query.partGrp;
        let lr = req.query.lr;

        var sqlStatement = `(SELECT A.BIN_ID AS OBJ_ID,A.QTY,A.PART_NO,'Bin' as OBJ_TYPE,B.INVOICE_NUM FROM BINS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}' AND PALLET_ID is NULL) UNION (SELECT A.PALLET_ID AS OBJ_ID,A.QTY,A.PART_NO,'Pallet' as OBJ_TYPE,B.INVOICE_NUM FROM PALLETS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}')`;

        conn.execute(sqlStatement
                , [], {
            outFormat: oracledb.OBJECT
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                if (result.rows.length === 0) {
                    res.status(401).send({err: 'No Bins/Pallets found for this LR'});//Added for response set
                    cb(null, conn);
                } else {
                    result.rows.forEach(function (row) {
                        let obj1 = {};
                        obj1.id = row.OBJ_ID;
                        obj1.type = row.OBJ_TYPE;
                        obj1.invId = row.INVOICE_NUM || 'NULL';
                        obj1.partNo = row.PART_NO || 'NULL';
                        obj1.qty = row.QTY || 0;
                        obj1.bin=[];
                        //obj.bin =[];
                        objArr.push(obj1);
                    });
//                    res.writeHead(200, {'Content-Type': 'application/json'});
//                    res.end(JSON.stringify(objArr).replace(null, '"NULL"'));
                    cb(null, conn);
                }
            }
        });
    };

    var doSelect1 = function (conn, cb) {
        let partGrp = req.query.partGrp;
        let lr = req.query.lr;
        //var bin = {};
        var sqlStatement = `(SELECT A.BIN_ID,A.PALLET_ID FROM BINS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}')`;

        conn.execute(sqlStatement
                , [], {
            outFormat: oracledb.OBJECT
        }, function (err, result)
        {
            var bin = [];
            if (err) {
                cb(err, conn);
            } else {
                if (result.rows.length === 0) {
                    res.status(401).send({err: 'No Bins/Pallets found for this LR'});//Added for response set
                    cb(null, conn);
                } else {
                    objArr.forEach(function (obj)
                    {
                        result.rows.forEach(function (row) {
                            if (obj.type === 'Pallet' && obj.id == row.PALLET_ID)
                            {
                                let data = {};
                                data = row.BIN_ID;
                                obj.bin.push(data);
                            }

                        });
                    });
                    
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(objArr).replace(null, '"NULL"'));
                    cb(null, conn);
                }
            }
        });
    };

    async.waterfall(
            [
                doconnect,
                doSelect,
                doSelect1
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

//function getLRDetails(req, res) {
//
//    var doconnect = function (cb) {
//        op.doConnectCB(cb);
//    };
//
//    var dorelease = function (conn) {
//        conn.close();
//    };
//    var objArr = {obj: [], bin: []};
//
//    var doSelect = function (conn, cb) {
//        let partGrp = req.query.partGrp;
//        let lr = req.query.lr;
//
//        var sqlStatement = `(SELECT A.BIN_ID AS OBJ_ID,A.QTY,A.PART_NO,'Bin' as OBJ_TYPE,B.INVOICE_NUM FROM BINS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}' AND PALLET_ID is NULL) UNION (SELECT A.PALLET_ID AS OBJ_ID,A.QTY,A.PART_NO,'Pallet' as OBJ_TYPE,B.INVOICE_NUM FROM PALLETS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}')`;
//
//        conn.execute(sqlStatement
//                , [], {
//            outFormat: oracledb.OBJECT
//        }, function (err, result)
//        {
//            if (err) {
//                cb(err, conn);
//            } else {
//                if (result.rows.length === 0) {
//                    res.status(401).send({err: 'No Bins/Pallets found for this LR'});//Added for response set
//                    cb(null, conn);
//                } else {
//                    result.rows.forEach(function (row) {
//                        let obj1 = {};
//                        obj1.id = row.OBJ_ID;
//                        obj1.type = row.OBJ_TYPE;
//                        obj1.invId = row.INVOICE_NUM || 'NULL';
//                        obj1.partNo = row.PART_NO || 'NULL';
//                        obj1.qty = row.QTY || 0;
//                        //obj.bin =[];
//                        objArr.obj.push(obj1);
//                    });
////                    res.writeHead(200, {'Content-Type': 'application/json'});
////                    res.end(JSON.stringify(objArr).replace(null, '"NULL"'));
//                    cb(null, conn);
//                }
//            }
//        });
//    };
//
//    var doSelect1 = function (conn, cb) {
//        let partGrp = req.query.partGrp;
//        let lr = req.query.lr;
//        //var bin = {};
//        var sqlStatement = `(SELECT A.BIN_ID,A.PALLET_ID FROM BINS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}')`;
//
//        conn.execute(sqlStatement
//                , [], {
//            outFormat: oracledb.OBJECT
//        }, function (err, result)
//        {
//            if (err) {
//                cb(err, conn);
//            } else {
//                if (result.rows.length === 0) {
//                    res.status(401).send({err: 'No Bins/Pallets found for this LR'});//Added for response set
//                    cb(null, conn);
//                } else {
//                    objArr.obj.forEach(function (obj)
//                    {
//                        result.rows.forEach(function (row) {
//                            if (obj.type === 'Pallet' && obj.id == row.PALLET_ID)
//                            {
//                                let data = {};
//                                data = row.BIN_ID;
//                                objArr.bin.push(data);
//                            }
//
//                        });
//                    });
//                    res.writeHead(200, {'Content-Type': 'application/json'});
//                    res.end(JSON.stringify(objArr).replace(null, '"NULL"'));
//                    cb(null, conn);
//                }
//            }
//        });
//    };
//
//    async.waterfall(
//            [
//                doconnect,
//                doSelect,
//                doSelect1
//            ],
//            function (err, conn) {
//                if (err) {
//                    console.error("In waterfall error cb: ==>", err, "<==");
//                    res.writeHead(400, {'Content-Type': 'application/json'});
//                    res.end(JSON.stringify(err));
//                }
//                if (conn)
//                    dorelease(conn);
//            });
//
//}