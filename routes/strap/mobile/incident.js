var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');
var multer = require('multer');
var fs = require('fs');
var path = require('path');

router.post('/', function (req, res) {
    createIncident(req, res);
});

router.get('/', function (req, res) {
    getIncident(req, res);
});

router.post('/comment', function (req, res) {
    updateIncident(req, res);
});

router.post('/image', function (req, res) {
    updateImage(req, res);
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

function createIncident(req, res) {

    let sqlStatement;
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partGrp = req.body.partGrp;
    let id = req.body.id;
    let problem = req.body.problem;
    let priority = req.body.priority;
    let category = req.body.category;
    let type = req.body.type;
    let ts = new Date().getTime();
    let bindArr = [];
    let incArr = [];

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };

    var getIncident = function (conn, cb) {
        let getInvSQL = `SELECT NVL(MAX(INC_ID),0) FROM INCIDENTS_T`;
        sqlStatement = "INSERT INTO INCIDENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13) ";

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
                    var inArr = {incId: row[0] + 1};
                    incArr.push(inArr);
                    let binVars = [row[0] + 1, id, new Date(), ts, problem, category, imgName, priority, partGrp, locId, userId, 'New', type];
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
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(incArr).replace(null, '"NULL"'));
                cb(null, conn);
            }
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

         
function updateImage (req, res) {
    upload(req, res, function (err) {
        var incId = req.body.incId;
        var sqlStatement;
        var userId = req.body.userId;
        var description = req.body.description;

        var doConnect = function (cb) {
            op.doConnectCB(function (err, conn) {
                cb(null, conn);
            });
        };

        var getIncident = function (conn, cb) {
            sqlStatement = "INSERT INTO INCIDENTS_IMG_T VALUES (:1,:2,:3,:4) ";
            let bindVars = [incId, imgName, description, userId];
            conn.execute(sqlStatement, bindVars, {
                autoCommit: true// Override the default non-autocommit behavior,
            }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    console.log("File uploaded sucessfully!."); // 1  
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(`Image Updated Sucessfully`);
                    cb(null, conn);
                }
                cb(null, conn);
            });
        };
        //console.log(req.body);


        async.waterfall(
                [doConnect,
                    getIncident
                ],
                function (err, conn) {
                    if (err) {
                        console.error("In waterfall error cb: ==>", err, "<==");
                        res.status(400).json({message: err});
                    }
                    console.log("Done Waterfall");
                    if (conn)
                        conn.close();
                });
    });
};

function updateIncident(req, res) {
    var incId = req.body.incId;
    var sqlStatement;
    var userId = req.body.userId;
    var comments = req.body.comments;

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };

    var getIncident = function (conn, cb) {
        sqlStatement = "INSERT INTO INCIDENTS_COM_T VALUES (:1,:2,:3) ";
        let bindVars = [incId, comments, userId];
        conn.execute(sqlStatement, bindVars, {
            autoCommit: true// Override the default non-autocommit behavior,
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                console.log("Comment Updated Sucessfully!."); // 1
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(`Comment Updated Sucessfully`);
                cb(null, conn);
            }
            //cb(null, conn);
        });
    };
    async.waterfall(
            [doConnect,
                getIncident
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(400).json({message: err});
                }
                console.log("Done Waterfall");
                if (conn)
                    {
                        conn.close();
                    }
            });
}
;

function getImage(req, res) {
    var storedMimeType = 'image/jpeg';
    res.setHeader('Content-Type', storedMimeType);
    fs.createReadStream(path.join('./images/', req.params.id).replace(/\.[^/.]+$/, "")).pipe(res)
}

function getIncident(req, res) {

    var partGrp = req.query.partGrp;
    var status ='';
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };
    
    if (req.query.status)
    {
        if (req.query.status==='Closed')
        {
        status=`AND STATUS = 'Resolved'`;
        }
        else
        {
           status=`AND STATUS <> 'Resolved'`;  
        }
    
    }
    
    function getEvents(conn, cb) {

        let selectStatement = `SELECT INC_ID,EVENT_ID,EVENT_DATE,EVENT_TS,PROBLEM,CATEGORY,PICTURE,PRIORITY,LOC_ID,USER_ID,STATUS
                                 FROM INCIDENTS_T A
                                WHERE PART_GRP='${partGrp}' ${status}
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
                    let obj = {};
                    obj.incId = row.INC_ID;
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