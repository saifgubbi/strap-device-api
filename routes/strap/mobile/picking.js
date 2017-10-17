var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

router.post('/pickns', function (req, res) {
    pickNonSerial(req, res);
});

router.get('/serialized', function (req, res) {
    serialInfo(req, res);
});

router.post('/picks', function (req, res) {
    pickSerial(req, res);

});

module.exports = router;


function serialInfo(req, res) {

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        let partNo = req.query.partNo;

        var sqlStatement = `SELECT NVL(SERIALIZED,'N') SERIALIZED FROM PARTS_T P WHERE P.PART_NO='${partNo}'`;

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
                    cb({err: 'No Active Data found for this Part No'}, conn);
                } else {
                    let objArr = [];
                    result.rows.forEach(function (row) {
                        let obj = {};
                        obj.serialized = row.SERIALIZED;
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

function pickNonSerial(req, res) {
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partGrp = req.body.partGrp;
    let partNo = req.body.partNo;
    let pickList = req.body.pickList;
    let ts = new Date().getTime();

    let bindArr = [];

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    req.body.objArray.forEach(function (obj) {
        let binVars;
        binVars = [obj.oldBinId, 'Bin', 'Transferred', new Date(), locId, '', '', partNo, obj.qty, '', userId, '', 0, ts, obj.newBinId, pickList, partGrp, '', '', ''];
        bindArr.push(binVars);
        binVars = [obj.newBinId, 'Bin', 'Picked', new Date(), locId, '', '', partNo, obj.qty, '', userId, '', 0, ts, obj.oldBinId, pickList, partGrp, '', '', ''];
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
        console.log("In  doInsert");
        let arrayCount = 1;
        async.eachSeries(bindArr, function (data, callback) {
            arrayCount++;
            console.log("Inserting :", JSON.stringify(data));
            let insertStatement = sqlStatement;
            let bindVars = data;
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
                res.writeHead(500, {'Content-Type': 'application/json'});
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
                    res.status(500).json({message: err});
                }
                console.log("Done Waterfall");
                if (conn)
                    conn.close();
            });
}

function pickSerial(req, res) {
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partGrp = req.body.partGrp;
    let partNo = req.body.partNo;
    let pickList = req.body.pickList;
    let ts = new Date().getTime();

    let bindArr = [];

    /*Insert Pallet SQL*/

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    req.body.objArray.forEach(function (obj) {
        if (obj.partArray.length>0) {
            obj.partArray.forEach(function (part) {
                let binVars;
                binVars = [obj.oldBinId, 'Bin', 'Transferred', new Date(), locId, '', '', partNo, 1, '', userId, '', 0, ts, obj.newBinId, pickList, partGrp, '', '', part];
                bindArr.push(binVars);
                binVars = [obj.newBinId, 'Bin', 'Picked', new Date(), locId, '', '', partNo, 1, '', userId, '', 0, ts, obj.oldBinId, pickList, partGrp, '', '', part];
                bindArr.push(binVars);
                ts++;
            })
        } else {
            let binVars;
            binVars = [obj.newBinId, 'Bin', 'Picked', new Date(), locId, '', '', partNo, obj.qty, '', userId, '', 0, ts, obj.oldBinId, pickList, partGrp, '', '', ''];
            bindArr.push(binVars);
        }
        ;
    });
    insertEventsSer(req, res, sqlStatement, bindArr);
}

function insertEventsSer(req, res, sqlStatement, bindArr) {

    let errArray = [];
    let doneArray = [];

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };

    function doInsert(conn, cb) {
        console.log("In  doInsert");
        let arrayCount = 1;
        async.eachSeries(bindArr, function (data, callback) {
            arrayCount++;
            console.log("Inserting :", JSON.stringify(data));
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
                res.writeHead(500, {'Content-Type': 'application/json'});
                errArray.push({row: 0, err: err});
                res.end(`errorMsg:${err}}`);
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
                    res.status(500).json({message: err});
                }
                console.log("Done Waterfall");
                if (conn)
                    conn.close();
            });
}