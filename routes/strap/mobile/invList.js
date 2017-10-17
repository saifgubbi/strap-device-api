var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getData(req, res);
});

module.exports = router;


function getData(req, res) {
    var partGrp = req.query.partGrp;
    var locType = '';

    if (req.query.locType === 'Plant') {
        locType = ` AND l.type='Plant' AND ih.status not in ('Dispatched','Reached')`;
    }
    if (req.query.locType === 'Transit-Wh') {
        locType = ` AND( l.type = ('Plant') AND ih.status in ('Dispatched')) OR (l.type = ('Warehouse') AND ih.status in ('Dispatched'))`;
    }
    if (req.query.locType === 'Transit-Cust') {
        locType = ` AND l.type IN ('Warehouse') AND ih.status in ('Dispatched','Reached')`;
    }
    if (req.query.locType === 'Warehouse') {
        locType = ` AND l.type='Warehouse' AND ih.status not in ('Dispatched','Reached')`;
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
        console.log("Getting List");
        let selectStatement = `SELECT ih.invoice_num as "invId",ih.inv_dt as "invDt",part_no as "partNo",sum(qty) as "qty",status as "status"
                                  FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                 WHERE ih.invoice_num=il.invoice_num
                                   AND ih.from_loc=l.loc_id
                                   AND part_no IS NOT NULL
                                   AND ih.part_grp='${partGrp}'${locType}
                                  GROUP BY ih.invoice_num,ih.inv_dt,part_no,status`;
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
        console.log("Getting List");
        let selectStatement = `SELECT  count(1) as "count",status as "status"
                                  FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                 WHERE ih.invoice_num=il.invoice_num
                                   AND ih.from_loc=l.loc_id
                                   AND part_no IS NOT NULL
                                   AND ih.part_grp='${partGrp}'${locType}
                                  GROUP BY status`;
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
                    let obj = {attr:{}};
                    obj.attr.count = row.count;
                    obj.attr.status = row.status;
                    obj.children = [];
                  //  console.log(invArr);
                    invArr.forEach(function (inv) {
                        if (inv.status === obj.attr.status) {
                            //console.log(inv);
                            var tempObj = {attr:inv}
                            obj.children.push(tempObj);
                        }
                    });
                    console.log(statArr);
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

