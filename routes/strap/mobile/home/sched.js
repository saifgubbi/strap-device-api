var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');
//oracledb.prefetchRows = 100;
router.get('/', function (req, res) {
    getData(req, res);
});




module.exports = router;

function getData(req, res) {
    var partGrp = req.query.partGrp;
    let selectStatement = `select count(part_no) as "variant", sum(qty) as "qty" 
                                             from sched_t 
                                            where part_grp LIKE '${partGrp}' 
                                              and trunc(sched_dt)=trunc(sysdate) 
                                              and part_no is not null`;

    console.log(selectStatement);

    var bindVars = [];
    op.singleSQL(selectStatement, bindVars, req, res);

}

