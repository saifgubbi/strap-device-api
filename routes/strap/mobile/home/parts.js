var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getParts(req, res);
});


module.exports = router;



function getParts(req, res) {

    var partGrp = req.query.partGrp;
    var partArr =[];
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
                               select distinct part_no,case  WHEN l.TYPE='Plant' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit' 
                                                         end loc,il.qty part_qty
                                 from inv_line_t il,inv_hdr_t ih,LOCATIONS_T l 
                                where ih.invoice_num=il.invoice_num 
                                  AND ih.from_loc=l.loc_id 
                                  and part_no is not null
                                  and ih.part_grp like '${partGrp}'
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
                        let obj={};
                    obj.parts=row.parts;
                    obj.locType=row.locType;
                    obj.qty=row.qty;
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