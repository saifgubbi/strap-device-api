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

        let selectStatement = `WITH Plant AS
                            (
                            SELECT 'Plant' plant_type, count(part_no) plant_part_no,NVL(sum(qty),0) plant_qty
                              FROM
                                (SELECT b.part_no, sum(qty) qty
                                   from bins_t b,LOCATIONS_T l 
                                  where b.from_loc=l.loc_id 
                                    and b.part_no is not null
                                    AND l.type='Plant'
                                    and b.status NOT IN ('New','Dispatched','Reached')
                                    AND b.status <>l.close_status
                                    and b.part_grp like '${partGrp}'
                                    and b.qty <>0
                                    group by part_no)),
                             Transit AS(
                             SELECT 'Transit' trasit_type, count(part_no) transit_part_no,NVL(sum(qty),0) transit_qty
                               FROM
                                  (SELECT b.part_no, sum(qty) qty
                                     from bins_t b,LOCATIONS_T l 
                                    where b.from_loc=l.loc_id 
                                      and b.part_no is not null
                                      AND l.type IN ('Plant','Warehouse')
                                      and b.status IN ('Dispatched','Reached')
                                      AND b.status <>l.close_status
                                      and b.part_grp like '${partGrp}'
                                      and b.qty <>0
                                     group by part_no)),
                             Warehouse AS (
                             SELECT 'Warehouse' wh_type, count(part_no) wh_part_no,NVL(sum(qty),0) wh_qty
                               FROM
                                  (SELECT b.part_no, sum(qty) qty
                                     from bins_t b,LOCATIONS_T l 
                                    where b.from_loc=l.loc_id 
                                      and b.part_no is not null
                                      AND l.type='Warehouse'
                                      and b.status NOT IN ('New','Dispatched','Reached')
                                      AND b.status <>l.close_status
                                      and b.part_grp like '${partGrp}'
                                      and b.qty <>0
                                  group by part_no))                                 
                         select * from plant,transit,warehouse
`;

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
                    obj.plantType = row.PLANT_TYPE;
                    obj.plantParts = row.PLANT_PART_NO;
                    obj.plantQty = row.PLANT_QTY;
                    obj.transitType = row.TRANSIT_TYPE;
                    obj.tranistParts = row.TRANSIT_PART_NO;
                    obj.transitQty = row.TRANSIT_QTY;
                    obj.whType = row.WH_TYPE;
                    obj.whParts = row.WH_PART_NO;
                    obj.whQty = row.WH_QTY;
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