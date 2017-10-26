var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');

router.post('/', function (req, res) {
    receiveObj(req, res);
});

module.exports = router;


function receiveObj(req, res) {

    let partGrp = req.body.partGrp;
    let userId = req.body.userId;
    let locId = req.body.locId;
    let lr = req.body.lr;
    let binVars;


    let ts = new Date().getTime();
    let invArr = [];

    let bindArr = [];

    /*Insert Pallet SQL*/

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    /*Insert Object (bin,pallets as dispatched)*/
    req.body.objArray.forEach(function (obj) {

        binVars = [obj.id, obj.type, 'Received', new Date(), locId, null, '', obj.partNo, obj.qty || 0, obj.invId, userId, obj.comments, 0, ts, null, null, partGrp, lr, null, null];

        if (invArr.indexOf() < 0) {
            invArr.push(obj.invId);
        }
        bindArr.push(binVars);
    });

    /*Insert Unique Invoices with Recieved Status*/
    invArr.forEach(function (invID) {
        let binVars = [invID, 'Invoice', 'Received', new Date(), locId, null, '', '', 0, invID, userId, null, 0, ts, null, null, partGrp, lr, null, null];
        bindArr.push(binVars);
    });
    insertEvents(req, res, sqlStatement, bindArr);
}



function insertEvents(req, res, sqlStatement, bindArr) {

    let errArray = [];
    let doneArray = [];

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };

    function doInsert(conn, cb) {
        let arrayCount = 1;
        async.eachSeries(bindArr, function (data, callback) {
            arrayCount++;
            let insertStatement = sqlStatement;
            let bindVars = data;
            //  console.log(bindVars.join());
            conn.execute(insertStatement
                    , bindVars, {
                        autoCommit: true// Override the default non-autocommit behavior
                    }, function (err, result)
            {
                if (err) {
                    console.log("Error Occured: ", err);
                    errArray.push({row: arrayCount, err: err});
                    callback();
                } else {
                    console.log("Rows inserted: " + result.rowsAffected); // 1
                    doneArray.push({row: arrayCount});
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("Event Insert Error");
                res.writeHead(400, {'Content-Type': 'application/json'});
                errArray.push({row: 0, err: err});
                res.end(`err:${err}}`);
            } else {
                res.json({"total": bindArr.length, "success": doneArray.length, "err": errArray.length, "errMsg": errArray});
            }
            cb(null, conn);
        }
        );
    }

    async.waterfall(
            [doConnect,
                doInsert
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(400).json(err);
                }
                console.log("Done Waterfall");
                if (conn)
                    conn.close();
            });
}