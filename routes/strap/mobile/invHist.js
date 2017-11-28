var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
//var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');


router.get('/', function (req, res) {
    getInvHist(req, res);
});

module.exports = router;


/**
 * @api {get} /id/:id Get Invoice History
 * @apiVersion 1.0.0
 * @apiName getInvHist
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Invoice History.
 */
function getInvHist(req, res) {
    var partGrp = req.query.partGrp;
    var invId = req.query.invId;
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

     function getEvents(conn, cb) {

        let selectStatement = `SELECT EVENT_ID,EVENT_NAME,EVENT_DATE,FROM_LOC,TO_LOC,COMMENTS 
                                 FROM EVENTS_T A
                                WHERE EVENT_TYPE = 'Invoice' 
                                  AND EVENT_ID='${invId}'
                                  AND PART_GRP='${partGrp}'
                             ORDER BY EVENT_TS DESC`;

        let bindVars = [];

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
                            obj.eventId = row.EVENT_ID;
                            obj.eventName = row.EVENT_NAME;
                            obj.eventDt = row.EVENT_DATE;
                            obj.fromLoc = row.FROM_LOC;
                            obj.toLoc = row.TO_LOC;
                            obj.comments = row.COMMENTS;
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

