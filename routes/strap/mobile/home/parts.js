var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getParts(req, res);
});


module.exports = router;


/**
 * @api {get} /id/:id Get Parts Details
 * @apiVersion 1.0.0
 * @apiName getParts
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Parts Details location wise.
 */
function getParts(req, res) {

    var partGrp = req.query.partGrp;
    var partArr = [];
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {

        let selectStatement = `SELECT count(1) as "parts",loc as "locType",sum(part_qty) as "qty"
                               FROM(
                               select part_no,loc,sum(part_qty)part_qty from(
                               select part_no,case  WHEN l.TYPE='Plant' AND b.STATUS NOT IN ('New','Dispatched','Reached') Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND b.STATUS IN ('Dispatched','Reached') Then 'Transit'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS IN ('Dispatched','Reached') Then 'Transit' 
                                                         end loc,sum(b.qty) part_qty
                                 from bins_t b,LOCATIONS_T l 
                                where b.from_loc=l.loc_id 
                                  and part_no is not null
                                  and b.part_grp like '${partGrp}'
                                  AND b.status <>l.close_status
                                  and b.qty<>0
                                  GROUP BY part_no,l.type,b.status
                                  ) group by part_no,loc
                                  ) group by loc`;

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
                    obj.parts = row.parts||0;
                    obj.locType = row.locType;
                    obj.qty = row.qty||0;
                    partArr.push(obj);
                });
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(partArr));
                cb(null, conn);
            }

        });

    }

    async.waterfall(
            [doConnect,
                getHdr
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