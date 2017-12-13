var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');
var moment = require('moment');

router.get('/', function (req, res) {
    getData(req, res);
});

module.exports = router;

/**
 * @api {get} /id/:id Get Invoice details Location wise
 * @apiVersion 1.0.0
 * @apiName getData
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Invoice details location wise.
 */
function getData(req, res) {
    var partGrp = req.query.partGrp;
    var locType = '';
    var status ='';
    var invDt='';
   // var invDtTo='';
    var invId='';
    
    if (req.query.status === 'Open') {
        status = ` AND ih.status <> l.close_status`;
    }
    if (req.query.status === 'Closed') {
        status = ` AND ih.status = l.close_status`;
    }
    
    if (req.query.locType === 'Plant') {
        locType = ` AND l.type='Plant' AND ih.status not in ('Dispatched','Reached')`;
    }
    if (req.query.locType === 'Transit') {
        locType = `  AND( l.type IN ('Plant') AND ih.status in ('Dispatched','Reached') OR l.type IN ('Warehouse') AND ih.status in ('Dispatched'))`;
    }
    
    if (req.query.locType === 'Warehouse') {
        locType = ` AND l.type='Warehouse' AND ih.status not in ('Dispatched','Reached')`;
    }
    
    if (req.query.invDtFrom && req.query.invDtTo) {
        invDt = `AND IH.INV_DT BETWEEN '${moment(req.query.invDtFrom).format("DD-MMM-YYYY")}' AND '${moment(req.query.invDtTo).format("DD-MMM-YYYY")}'`;
    }
    
    if (req.query.invId) {
        invId = ` AND ih.invoice_num LIKE '${req.query.invId}%'`;
    }
    
    var statArr = [];
    var invArr = [];
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };
    
     function getInvoice(conn, cb) {
        let selectStatement = `SELECT ih.invoice_num as "invId",
                                      ih.inv_dt as "invDt",
                                      part_no as "partNo",
                                      sum(qty) as "qty",
                                      DECODE('${req.query.locType}','Transit',status||'-'||l.type,status) as "status"
                                  FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                 WHERE ih.invoice_num=il.invoice_num
                                   AND ih.from_loc=l.loc_id
                                   AND part_no IS NOT NULL
                                   AND ih.part_grp='${partGrp}'${locType} ${status} ${invDt} ${invId}
                                  GROUP BY ih.invoice_num,ih.inv_dt,part_no,status,l.type`;
       
        let bindVars = [];
       // console.log(selectStatement);
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
                            obj.invId = row.invId;
                            obj.invDt = row.invDt;
                            obj.partNo = row.partNo;
                            obj.qty = row.qty||0;
                            obj.status = row.status;
                            invArr.push(obj);
                    });
            }
            cb(null, conn);
        });
    };

    function getStatus(conn, cb) {
        let selectStatement = `SELECT  count(1) as "count",
                                       DECODE('${req.query.locType}','Transit',status||'-'||l.type,status) as "status"
                                  FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                 WHERE ih.invoice_num=il.invoice_num
                                   AND ih.from_loc=l.loc_id
                                   AND part_no IS NOT NULL
                                   AND ih.part_grp='${partGrp}'${locType} ${status} ${invDt} ${invId}
                                  GROUP BY status,l.type`;
       
        let bindVars = [];
        //console.log(selectStatement);
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
                    let obj = {attr:{}};
                    obj.attr.count = row.count;
                    obj.attr.status = row.status;
                    obj.children = [];
                    invArr.forEach(function (inv) {
                        if (inv.status === obj.attr.status) {
                            var tempObj = {attr:inv};
                            obj.children.push(tempObj);
                        }
                    });
                    statArr.push(obj);
                });
                 res.writeHead(200, {'Content-Type': 'application/json'});
                 res.end(JSON.stringify(statArr));
                cb(null, conn);
            }
        });

    }

    async.waterfall(
            [doConnect,
             getInvoice,
             getStatus                
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

