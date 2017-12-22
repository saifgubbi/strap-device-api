var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getInvoice(req, res);
});

router.get('/plant', function (req, res) {
    getPlant(req, res);
});

router.get('/transit', function (req, res) {
    getTransit(req, res);
});

router.get('/warehouse', function (req, res) {
    getWarehouse(req, res);
});



module.exports = router;
/**
 * @api {get} /id/:id Get Invoice Data
 * @apiVersion 1.0.0
 * @apiName getInvoice
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Invoice Data location wise.
 */
function getInvoice(req, res) {

    var partGrp = req.query.partGrp;
    var invArr = {plant: {}, wareHouse: {}, transit: {}}
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getPlant(conn, cb) {

        let selectStatement = `SELECT 'Plant' as "type", COUNT(invoice) as "invoice" ,count(part_no) as "partNo",NVL(sum(qty),0) as "qty"
                               FROM(
				SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                                  FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                 WHERE ih.invoice_num=il.invoice_num
                                   AND ih.from_loc=l.loc_id
                                   AND l.type='Plant'
                                   AND ih.status not in ('Dispatched','Reached')
                                   AND part_no IS NOT NULL
                                   AND ih.part_grp='${partGrp}'
                                  GROUP BY part_no)`;


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

                    invArr.plant.type = row.type;
                    invArr.plant.invoice = row.invoice;
                    invArr.plant.partNo = row.partNo;
                    invArr.plant.qty = row.qty;
                });
                cb(null, conn);

            }

        });

    }
    function getWarehouse(conn, cb) {

        let selectStatement = ` SELECT 'Warehouse' as "type", COUNT(invoice) as "invoice",count(part_no) as "partNo",NVL(sum(qty),0) as "qty"
                               FROM(
                               SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                                 FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                WHERE ih.invoice_num=il.invoice_num
                                  AND ih.from_loc=l.loc_id
                                  AND l.type='Warehouse'
                                  AND ih.status not in ('Dispatched','Reached')
                                  AND part_no IS NOT NULL
                                  AND ih.part_grp='${partGrp}'
                                  GROUP BY part_no)`;

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
                    invArr.wareHouse.type = row.type;
                    invArr.wareHouse.invoice = row.invoice;
                    invArr.wareHouse.partNo = row.partNo;
                    invArr.wareHouse.qty = row.qty;
                });
                cb(null, conn);

            }

        });

    }
    function getTransit(conn, cb) {

        let selectStatement = `SELECT 'Transit' as "type", COUNT(invoice) as "invoice",count(part_no) as "partNo",NVL(sum(qty),0) as "qty"
                               FROM(
                               SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                                 FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                WHERE ih.invoice_num=il.invoice_num
                                  AND ih.from_loc=l.loc_id
                                  AND l.type IN ('Plant','Warehouse')
                                  AND ih.status in ('Dispatched','Reached')
                                  AND part_no IS NOT NULL
                                  AND ih.part_grp='${partGrp}'
                                  GROUP BY part_no)`;

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
                    invArr.transit.type = row.type;
                    invArr.transit.invoice = row.invoice;
                    invArr.transit.partNo = row.partNo;
                    invArr.transit.qty = row.qty;
                });
                //console.log(partArr); 
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(invArr));
                cb(null, conn);

            }

        });

    }

    async.waterfall(
            [doConnect,
                getPlant,
                getWarehouse,
                getTransit
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
 * @api {get} /id/:id Get Invoice Data for Plant
 * @apiVersion 1.0.0
 * @apiName getPlant
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Invoice Data at Plant.
 */
function getPlant(req, res) {

    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT COUNT(invoice) ,count(part_no),NVL(sum(qty),0) qty
                        FROM(
                             SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                               FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                              WHERE ih.invoice_num=il.invoice_num
                                and ih.from_loc=l.loc_id
                                and l.type='Plant'
                                and ih.status<>'Dispatched'
                                and part_no IS NOT NULL
                                AND ih.part_grp='${partGrp}'
                                GROUP BY part_no)`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
/**
 * @api {get} /id/:id Get Invoice Data for In Transit
 * @apiVersion 1.0.0
 * @apiName getTransit
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Invoice Data in Transit.
 */
function getTransit(req, res) {

    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT COUNT(invoice),count(part_no),NVL(sum(qty),0) qty
                        FROM(
                             SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                               FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                              WHERE ih.invoice_num=il.invoice_num
                                and ih.from_loc=l.loc_id
                                and l.type in ('Plant','Warehouse')
                                and ih.status in ('Dispatched','Reached')
                                and part_no IS NOT NULL
                                AND ih.part_grp='${partGrp}'
                                GROUP BY part_no)`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

/**
 * @api {get} /id/:id Get Invoice Data for wareHouse
 * @apiVersion 1.0.0
 * @apiName getWarehouse
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Invoice Data in Warehouse.
 */
function getWarehouse(req, res) {

    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT COUNT(invoice),count(part_no),NVL(sum(qty),0) qty
                        FROM(
                             SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                               FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                              WHERE ih.invoice_num=il.invoice_num
                                and ih.from_loc=l.loc_id
                                and l.type='Warehouse'
                                and ih.status<>'Dispatched'
                                and part_no IS NOT NULL
                                AND ih.part_grp='${partGrp}'
                                GROUP BY part_no)`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

