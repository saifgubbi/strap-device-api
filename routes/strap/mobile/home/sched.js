var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');

//oracledb.prefetchRows = 100;
router.get('/', function (req, res) {
    getSched(req, res);
});

module.exports = router;
/**
 * @api {get} /id/:id Get Schedule Details
 * @apiVersion 1.0.0
 * @apiName getSched
 * @apiGroup mobile
 * @apiPermission none
 *
 * @apiDescription This function is used to get the Customer Schedule Details.
 */
function getSched(req, res) {
    var partGrp = req.query.partGrp;
    let selectStatement = `SELECT count(variant) as "variant",sum(qty) as "qty"
                           from(
                                           select count(part_no) as variant, sum(qty) as qty 
                                             from sched_t 
                                            where part_grp LIKE '${partGrp}' 
                                              and trunc(sched_dt)=trunc(sysdate) 
                                              and part_no is not null
                                              group by part_no)`;


    var bindVars = [];
    op.singleSQL(selectStatement, bindVars, req, res);

}

