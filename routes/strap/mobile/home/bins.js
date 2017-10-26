var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/binsDet', function (req, res) {
    getBinsDet(req, res);
});

module.exports = router;




function getData(req, res) {

    var partGrp = req.query.partGrp;
    var owner = req.query.owner;
    var binArr = {bins: [], pallets: []};


    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getBins(conn, cb) {
        console.log("Getting Header");

        let selectStatement = `SELECT loc_Type as "locType",sum(free_Count) as "freeCount",(select count(1) from BINS_T where OWNER='${owner}') as "total"
                                          FROM(
                                            SELECT case  WHEN l.TYPE='Plant' Then 'plant'
                                                         WHEN l.TYPE='Warehouse' Then 'warehouse'        
                                                         WHEN l.TYPE='Customer' Then 'customer'
                                                    end as loc_Type,
                                                    DECODE(a.qty,0,COUNT(*),0) free_Count
                                               FROM BINS_T A ,
                                                    LOCATIONS_T l
                                              WHERE A.FROM_LOC=l.LOC_ID 
                                                AND OWNER='${owner}'
                                           GROUP BY l.TYPE,a.qty
                                             )group by loc_Type`;

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
                    console.log(row);
                    let obj = {};
                    obj.locType = row.locType;
                    obj.freeCount = row.freeCount || 0;
                    obj.total = row.total || 0;
                    binArr.bins.push(obj);
                });
                console.log(binArr);
                cb(null, conn);
            }
        });
    }
    function getPallets(conn, cb) {
        let selectStatement = `SELECT loc_Type as "locType",sum(free_Count) as "freeCount",( select count(1) from PALLETS_T where OWNER='${owner}' ) as "total"
                                          FROM(
                                            SELECT case  WHEN l.TYPE='Plant' Then 'plant'
                                                         WHEN l.TYPE='Warehouse' Then 'warehouse'        
                                                         WHEN l.TYPE='Customer' Then 'customer'
                                                    end as loc_Type,
                                                    DECODE(a.qty,0,COUNT(*),0) free_Count                                                    
                                               FROM PALLETS_T A ,
                                                    LOCATIONS_T l
                                              WHERE A.FROM_LOC=l.LOC_ID 
                                                AND OWNER='${owner}'
                                           GROUP BY l.TYPE,a.qty
                                             )group by loc_Type`;

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
                    obj.locType = row.locType;
                    obj.freeCount = row.freeCount || 0;
                    obj.total = row.total || 0;
                    binArr.pallets.push(obj);
                });

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(binArr));
                cb(null, conn);

            }

        });

    }

    async.waterfall(
            [doConnect,
                getBins,
                getPallets
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


function getBinsDet(req, res) {
    var locId = req.query.locId;
    var status = req.query.status;
    var option = req.query.option;
    //var partGrp = req.query.partGrp;

    var sqlStatement;
    if (status === 'Free') {
        sqlStatement = `SELECT STATUS,
                               FROM_LOC,
                               COUNT(*) AS COUNT 
                          FROM ${option} 
                         WHERE STATUS='Ready' 
                           AND FROM_LOC='${locId}' 
                      GROUP BY status,FROM_LOC`;
    } else {
        sqlStatement = `SELECT STATUS,
                               FROM_LOC,
                               COUNT(*) AS COUNT 
                          FROM ${option} 
                         WHERE STATUS <>'Ready' 
                           AND FROM_LOC='${locId}' 
                      GROUP BY status,FROM_LOC`;
    }
    console.log(sqlStatement);

    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

