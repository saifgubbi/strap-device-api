var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
//var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/status', function (req, res) {
    getParts(req, res);
});



module.exports = router;

function getData(req, res) {
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
        console.log("Getting List");
         let selectStatement = `SELECT loc as "locType",sum(part_qty) as "partQty"
                               FROM(
                               select case  WHEN l.TYPE='Plant' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit Wh'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit Cust' 
                                                         end loc,il.qty part_qty
                                 from inv_line_t il,inv_hdr_t ih,LOCATIONS_T l 
                                where ih.invoice_num=il.invoice_num 
                                  AND ih.from_loc=l.loc_id 
                                  and part_no is not null
                                  and ih.part_grp like '${partGrp}'
                                  and il.part_no = '${partNo}'
                                  ) group by loc`;
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
                    obj.locType= row.locType;
                    obj.qty=row.partQty;
                    schArr.push(obj);
                });
                res.writeHead(200, {'Content-Type': 'application/json'});
                 res.end(JSON.stringify(schArr));
                cb(null, conn);
            }
        });

    }
        function getSchP1(conn, cb) {
        console.log("Getting List");
        let selectStatement = `SELECT part_no as "partNo",loc as "loc",sum(part_qty) as "partQty"
                               FROM(
                               select part_no,case  WHEN l.TYPE='Plant' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit Wh'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit Cust' 
                                                         end loc,il.qty part_qty
                                 from inv_line_t il,inv_hdr_t ih,LOCATIONS_T l 
                                where ih.invoice_num=il.invoice_num 
                                  AND ih.from_loc=l.loc_id 
                                  and part_no is not null
                                  and ih.part_grp like '${partGrp}'
                                  and il.part_no = '${partNo}'
                                  ) group by loc,part_no`;
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
                    schArr.forEach(function (sch) {
                        if (sch.partNo === row.partNo)
                        {
                         sch[row.loc]=row.partQty;   
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
             getSchP
             ,//getSchP1
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
        console.log("Getting List");
        let selectStatement = `SELECT part_no as "partNo",req.query.locType
                               FROM(
                               select part_no
                                 from inv_line_t il,inv_hdr_t ih,LOCATIONS_T l 
                                where ih.invoice_num=il.invoice_num 
                                  AND ih.from_loc=l.loc_id 
                                  and part_no is not null
                                  and ih.part_grp like '${partGrp}'
                                  and il.part_no = '${partNo}' ${locType}
                                  ) group by part_no`;
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
                    obj.plant= 0;
                    obj.transitWh=0;
                    obj.warehouse=0;
                    obj.transitCust=0;
                    schArr.push(obj);
                });
                cb(null, conn);
            }
        });

    }
        function getSchP1(conn, cb) {
        console.log("Getting List");
        let selectStatement = `SELECT part_no as "partNo",loc as "loc",sum(part_qty) as "partQty"
                               FROM(
                               select part_no,case  WHEN l.TYPE='Plant' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'plant'
                                                             WHEN l.TYPE='Plant' AND ih.STATUS IN ('Dispatched','Reached') Then 'transitWh'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'warehouse'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS IN ('Dispatched','Reached') Then 'transitCust' 
                                                         end loc,il.qty part_qty
                                 from inv_line_t il,inv_hdr_t ih,LOCATIONS_T l 
                                where ih.invoice_num=il.invoice_num 
                                  AND ih.from_loc=l.loc_id 
                                  and part_no is not null
                                  and ih.part_grp like '${partGrp}'
                                  and il.part_no = '${partNo}'
                                  ) group by loc,part_no`;
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
                    schArr.forEach(function (sch) {
                        if (sch.partNo === row.partNo)
                        {
                         sch[row.loc]=row.partQty;   
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
