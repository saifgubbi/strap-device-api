var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
//var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getParts(req, res);
});

module.exports = router;
/**
 * @api {get} /id/:id Get Parts details stock wise
 * @apiVersion 1.0.0
 * @apiName getparts
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the stock wise Parts Details.
 */
function getParts(req, res) {
    var partGrp = req.query.partGrp;
    var partNo = req.query.partNo;

    var schArr = [];

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getSchP(conn, cb) {
        let selectStatement = `SELECT part_no as "partNo"
                               FROM(
                               select b.part_no
                                 from bins_t b,LOCATIONS_T l 
                                where b.from_loc=l.loc_id 
                                  and part_no is not null
                                  and b.part_grp like '${partGrp}'
                                  ) group by part_no`;

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
                    let obj = {};
                    obj.partNo = row.partNo;
                    obj.plant = 0;
                    obj.transitWh = 0;
                    obj.warehouse = 0;
                    obj.transitCust = 0;
                    schArr.push(obj);
                });
                cb(null, conn);
            }
        });

    }
    function getSchP1(conn, cb) {
        let selectStatement = `SELECT part_no as "partNo",loc as "loc",sum(part_qty) as "partQty"
                               FROM(
                               select part_no,case  WHEN l.TYPE='Plant' AND b.STATUS NOT IN ('Dispatched','Reached') Then 'plant'
                                                             WHEN l.TYPE='Plant' AND b.STATUS IN ('Dispatched','Reached') Then 'transitWh'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS NOT IN ('Dispatched','Reached') Then 'warehouse'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS IN ('Dispatched','Reached') Then 'transitCust' 
                                                         end loc,b.qty part_qty
                                 from bins_t b,LOCATIONS_T l 
                                where b.from_loc=l.loc_id 
                                  and part_no is not null
                                  and b.part_grp like '${partGrp}'
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
                result.rows.forEach(function (row) {
                    schArr.forEach(function (sch) {
                        if (sch.partNo === row.partNo)
                        {
                            sch[row.loc] = row.partQty;
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
