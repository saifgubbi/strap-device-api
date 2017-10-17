var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

router.get('/list', function (req, res) {
    pickListInfo(req, res);
});


module.exports = router;


function pickListInfo(req, res) {

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        let partGrp = req.query.partGrp;

        var sqlStatement = `SELECT * FROM PICK_LIST_T WHERE PART_GRP='${partGrp}' AND status='New'`;

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
                    cb({err: 'No Active Picklist found for this Part Group'}, conn);
                } else {
                    let objArr = [];
                    result.rows.forEach(function (row) {
                        let obj = {};
                        obj.pickList = row.PICK_LIST;
                        obj.pickDate = row.PICK_DATE;
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