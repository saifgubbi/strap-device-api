var express = require('express');
var router = express.Router();
var async = require('async');
var op = require('../../oracleDBOps');

router.get('/', function (req, res) {
    test(req, res);
});

module.exports = router;

function test(req, res) {

    let selectSysdate = `SELECT SYSDATE FROM DUAL`;

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doTest = function (conn, cb) {
        op.doSelectCB(conn, selectSysdate, [], function (err, result) {
            if (err) {
                return op.handleErrorCB(err, conn, cb);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.rows));
            return cb(null, conn);
        });
    };

    async.waterfall(
        [
            doconnect,
            doTest
        ],
        function (err, conn) {
            if (err) {
                console.error("In waterfall error cb: ==>", err, "<==");
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
            }
            if (conn)
                dorelease(conn);
        });

}