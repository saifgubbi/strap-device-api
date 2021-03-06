var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
//var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/data', function (req, res) {
    getData(req, res);
});

module.exports = router;
/**
 * @api {get} /id/:id Get Parts details status wise
 * @apiVersion 1.0.0
 * @apiName getData
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the status wise Parts Details.
 */
function getData(req, res) {
    var partGrp = req.query.partGrp;
    var partNo = req.query.partNo;
    var locType = '';

    if (req.query.locType === 'Plant') {
        locType = ` AND l.type='Plant' AND b.status not in ('Dispatched','Reached')`;
    }
    if (req.query.locType === 'Transit') {
        locType = ` AND l.type IN ('Plant','Warehouse') AND b.status in ('Dispatched','Reached')`;
    }
    if (req.query.locType === 'Warehouse') {
        locType = ` AND l.type='Warehouse' AND b.status not in ('Dispatched','Reached')`;
    }
    var schArr = [];

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getSchP(conn, cb) {
        let selectStatement = `SELECT part_no as "partNo",loc as "locType"
                               FROM(
                               select part_no,case  WHEN l.TYPE='Plant' AND b.STATUS NOT IN ('Dispatched','Reached') Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND b.STATUS IN ('Dispatched','Reached') Then 'Transit Wh'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS IN ('Dispatched','Reached') Then 'Transit Cust' 
                                                         end loc
                                 from bins_t b,LOCATIONS_T l 
                                where b.from_loc=l.loc_id 
                                  and b.part_no is not null
                                  and b.part_grp like '${partGrp}'
                                  and b.part_no = '${partNo}' ${locType}
                                  ) group by loc,part_no`;

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
                    obj.locType = row.locType;
                    obj.status = {};
                    schArr.push(obj);
                });
                cb(null, conn);
            }
        });

    }
    function getSchP1(conn, cb) {
        let selectStatement = `SELECT part_no as "partNo",loc as "locType",status as "status" ,sum(part_qty) as "partQty"
                               FROM(
                               select b.part_no,case  WHEN l.TYPE='Plant' AND b.STATUS NOT IN ('Dispatched','Reached') Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND b.STATUS IN ('Dispatched','Reached') Then 'Transit Wh'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS IN ('Dispatched','Reached') Then 'Transit Cust' 
                                                         end loc,b.status,b.qty part_qty
                                 from bins_t b,LOCATIONS_T l 
                                where b.from_loc=l.loc_id 
                                  and b.part_no is not null
                                  and b.part_grp like '${partGrp}'
                                  and b.part_no = '${partNo}'${locType}
                                  ) group by loc,part_no,status`;

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
                    schArr.forEach(function (sch) {
                        if (sch.locType === row.locType)
                        {
                            //console.log(row);
                            sch.status[row.status] = row.partQty;
                        }
                    });


                });
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(schArr));
                cb(null, conn);
            }
        });

    }

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
