var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var moment = require('moment');
var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getNotify(req, res);
});



module.exports = router;


function getNotify(req, res) {
    
    var sqlStatement = ` select event_id as "eventId",event_type as "eventType",event_name as "eventName",event_date as "eventDt",
                                loc_id as "locId",message as "message" from notifications_t
                          where event_date between sysdate-3 and sysdate`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

//function getNotify(req, res) {
//
//    var userId = req.query.userId;
//    
//    var sqlStatement = `SELECT event_date,event_type,event_name,event_id,comments description , event_ts,Priority
//                       FROM(
//                       select event_date,event_type,event_name,event_id,'Device Id :'||event_id||': Entry/Exit : '||FROM_LOC comments , e.event_ts,'Low' Priority
//                         from events_t e,geofence_t g
//                        where event_type IN ('Device')
//                          and event_name in ('Notification')
//                          and from_loc =g.map_val
//                          and g.type='LOC_ID' 
//                          AND event_date like to_date('${moment(req.query.eventDt).format("DD-MMM-YYYY")}')
//                        UNION                         
//                       select event_date,event_type,event_name,event_id,e.event_name comments , e.event_ts,DECODE(e.event_name,'Reached','High','Dispatched','Medium') Priority
//                         from events_t e,locations_t l
//                        where event_type IN ('Invoice')
//                          and event_name in ('Reached','Dispatched')
//                          and from_loc =l.loc_id 
//                          AND event_date like to_date('${moment(req.query.eventDt).format("DD-MMM-YYYY")}')
//                          )
//                          order by event_ts desc`;
//    var bindVars = [];
//    console.log(sqlStatement);
//    op.singleSQL(sqlStatement, bindVars, req, res);
//}

