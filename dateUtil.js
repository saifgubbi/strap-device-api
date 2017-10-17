
module.exports.getReqDates = function (dateOption, req, offset) {

    var moment = require('moment');

    var startOfWeek = moment().utc().startOf('week').toDate().getTime() - (3600000 * offset);
    var startOfMonth = moment().utc().startOf('month').toDate().getTime() - (3600000 * offset);
    var startOfDay = moment().utc().startOf('day').toDate() - (3600000 * offset);
    var startOfYDay = moment().utc().subtract(1, 'days').startOf('day').toDate() - (3600000 * offset);
    var endOfYDay = moment().utc().subtract(1, 'days').endOf('day').toDate() - (3600000 * offset);
    var currentDay = moment().utc().valueOf();
    
//    console.log('startOfWeek'+startOfWeek);
//    console.log('startOfMonth'+startOfMonth);
//    console.log('startOfDay'+startOfDay);
//    console.log('startOfYDay'+startOfYDay);
//    console.log('endOfYDay'+endOfYDay);
//    console.log('currentDay'+currentDay);
    


    switch (dateOption) {
        case "TD":
            req.fromTS = startOfDay;
            req.toTS = currentDay;
            break;
        case "YD":
            req.fromTS = startOfYDay;
            req.toTS = endOfYDay;
            break;
        case "WK":
            req.fromTS = startOfWeek;
            req.toTS = currentDay;
            break;
        case "MM":
            req.fromTS = startOfMonth;
            req.toTS = currentDay;
            break;
        case "CD":
            req.fromTS = moment(req.query.fromDate).startOf('day').toDate() - (3600000 * offset);
            req.toTS = moment(req.query.toDate).endOf('day').toDate() - (3600000 * offset);
            break;
    }
};