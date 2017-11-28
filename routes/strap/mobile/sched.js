var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
//var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');



router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/summary', function (req, res) {
    getSummary(req, res);
});

module.exports = router;
/**
 * @api {get} /id/:id Get Schedule
 * @apiVersion 1.0.0
 * @apiName getData
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Customer Schedule.
 */
function getData(req, res) {
    var partGrp = req.query.partGrp;
    var partNo ='';
    var schArr = [];
    
    
    if (req.query.partNo) {
        partNo = ` AND PART_NO LIKE '${req.query.partNo}%'`;
    }
    
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };
    
    function getSchP(conn, cb) {
        console.log("Getting List");
        let selectStatement = `SELECT PART_NO as "partNo", sum(wip_qty) as "wipQty", sum(close_stk) as "closeStk" 
                                  FROM sched_t p 
                                 WHERE part_grp='${partGrp}'${partNo} 
                                   AND trunc(sched_dt) between trunc(sysdate) and trunc(sysdate+3) 
	                           AND part_no is not null   
                                   GROUP BY part_no`;
        console.log(selectStatement);

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
                //let objArr = [];
                result.rows.forEach(function (row) {
                    let obj = {};
                    obj.partNo = row.partNo;
                    obj.wipQty = row.wipQty;
                    obj.closeStk = row.closeStk;
                    obj.d0 = 0;
                    obj.d1 = 0;
                    obj.d2 = 0;
                    obj.d3 = 0;
                    schArr.push(obj);
                });
                cb(null, conn);
            }
        });

    }

    function getSchP1(conn, cb) {
        console.log("Getting List");
        let selectStatement = `SELECT trunc(sched_dt)-trunc(sysdate) as "day", part_no as "partNo",sum(qty) as "qty"
                                  FROM sched_t p 
                                 WHERE part_grp='${partGrp}' ${partNo}
                                   AND trunc(sched_dt) between trunc(sysdate) and trunc(sysdate+3) 
	                           AND part_no is not null 
                             group by sched_dt,part_no
                             order by sched_dt desc`;
        console.log(selectStatement);

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
                result.rows.forEach(function (row) {
                    schArr.forEach(function (sch)
                    {
                        if (row.partNo === sch.partNo)
                        {   
                            console.log(sch["d" + row.day]);
                            console.log(sch[row.qty]);
                            sch["d" + row.day] = row.qty;                            
                        }

                    }
                    );
                });
            }
                 res.writeHead(200, {'Content-Type': 'application/json'});
                 res.end(JSON.stringify(schArr));
                cb(null, conn);
            }
        );
    };

    
    async.waterfall(
            [doConnect,
             getSchP,
             getSchP1
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
/**
 * @api {get} /id/:id Get Schedule Summary
 * @apiVersion 1.0.0
 * @apiName getSummary
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Customer Schedule Summary.
 */
function getSummary(req, res) {
    var partGrp = req.query.partGrp;
    //var schArr = [];
    var obj = {};
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };
    
    function getSchP(conn, cb) {
        console.log("Getting List");
        let selectStatement = `select count(part_no) as "variant", NVL(sum(qty),0) as "qty" 
                                             from sched_t 
                                            where part_grp LIKE '${partGrp}' 
                                              and trunc(sched_dt)=trunc(sysdate) 
                                              and part_no is not null`;
        console.log(selectStatement);

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
                //let objArr = [];
                result.rows.forEach(function (row) {
                    
                    obj.variant = row.variant||0;
                    obj.qty = row.qty||0;
                   // schArr.push(obj);
                });
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(obj));
                cb(null, conn);
            }
        });

    }
        async.waterfall(
            [doConnect,
             getSchP
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