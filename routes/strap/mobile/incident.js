var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');
var multer = require('multer');
var fs=require('fs');
var path=require('path');

router.post('/', function (req, res) {
    createIncident(req, res);
});

router.get('/', function (req, res) {
    getIncident(req, res);
});

router.get('/img', function (req, res) {
    getImage(req, res);
});

module.exports = router;

var imgName;

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./images");
    },
    filename: function (req, file, callback) {
        console.log(file.fieldname);
        imgName = file.fieldname + "_" + Date.now()
        callback(null, file.fieldname + "_" + Date.now());
    }

});


var upload = multer({
    storage: Storage
}).single("file"); //Field name and max count


//function createIncident(req, res) {
//    let userId = req.body.userId;
//    let locId = req.body.locId;
//    let partGrp = req.body.partGrp;
//    let partNo = req.body.partNo;
//    let pickList = req.body.pickList;
//    let ts = new Date().getTime();
//    
//    let bindArr = [];
//
//    var sqlStatement = "INSERT INTO INCIDENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11) ";
//    var binVars = [sequence(max 1),req.body.id, new Date(),ts, req.body.problem, req.body.category, imgName, req.body.priority,partGrp, locId, userId];
//    op.singleSQL(sqlStatement, binVars, req, res);
//    
//}

function createIncident(req, res) {

    let sqlStatement;
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partGrp = req.body.partGrp;
    let id = req.body.id;
    let problem = req.body.problem;
    let priority = req.body.priority;
    let category = req.body.category;
    let ts = new Date().getTime();
    let bindArr=[];
    
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };

    var getIncident = function (conn, cb) {
        let getInvSQL = `SELECT NVL(MAX(INC_ID),0) FROM INCIDENTS_T`;
        sqlStatement = "INSERT INTO INCIDENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12) ";

        let bindVars = [];
        conn.execute(getInvSQL, bindVars, {
            autoCommit: true// Override the default non-autocommit behavior,
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                result.rows.forEach(function (row) {
                    console.log(row);
                    let binVars = [row[0]+1,id, new Date(),ts, problem, category, imgName, priority,partGrp, locId, userId,'New'];
                    bindArr.push(binVars);
                });
                cb(null, conn);
            }
        });
    };

    function doInsert(conn, cb) {
        console.log("In  doInsert");
        async.eachSeries(bindArr, function (data, callback) {
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
                    callback();
                } else {
                    console.log("Rows inserted: " + result.rowsAffected); // 1
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("Event Insert Error");
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(`errorMsg:${err}}`);
            } else {
                res.writeHead(200); 
                res.end("Incident Created Sucessfully!");
            }
            cb(null, conn);
        }
        );
    }

    async.waterfall(
            [doConnect,
                getIncident,
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
//
// function createIncident2 (req, res) {
//    upload(req, res, function (err) {
//        console.log(req.body);
//        
//        if (err) {
//            console.log(err);
//            return res.end("Something went wrong!");
//        }
//        return res.end("File uploaded sucessfully!.");
//    });
//};

function getImage (req, res) {
    var storedMimeType = 'image/jpeg';
    res.setHeader('Content-Type', storedMimeType);
    fs.createReadStream(path.join('./images/', req.params.id).replace(/\.[^/.]+$/, "")).pipe(res)
}

function getIncident(req, res) {

    var partGrp = req.query.partGrp;
    var locId = req.query.locId;
    var status = req.query.status;
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

     function getEvents(conn, cb) {

        let selectStatement = `SELECT INC_ID,EVENT_ID,EVENT_DATE,EVENT_TS,PROBLEM,CATEGORY,PICTURE,PRIORITY,LOC_ID,USER_ID,STATUS
                                 FROM INCIDENTS_T A
                                WHERE LOC_ID='${locId}'
                                  AND PART_GRP='${partGrp}'
                                  AND STATUS ='${status}'
                             ORDER BY EVENT_TS DESC`;

        let bindVars = [];
        console.log(selectStatement);
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
                        let attr = [];
                        result.rows.forEach(function (row) {
                            let obj={};
                            obj.incId=row.INC_ID;
                            obj.eventId = row.EVENT_ID;
                            obj.eventName = row.EVENT_NAME;
                            obj.eventDt = row.EVENT_DATE;
                            obj.eventTs = row.EVENT_TS;
                            obj.problem = row.PROBLEM;
                            obj.category = row.CATEGORY;
                            obj.priority = row.PRIORITY;
                            obj.locId = row.LOC_ID;
                            obj.status = row.STATUS;
                            attr.push(obj);
                        });
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(attr).replace(null, '"NULL"'));
                        cb(null, conn);                
            }
        });

    }

    async.waterfall(
            [doConnect,
                getEvents
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