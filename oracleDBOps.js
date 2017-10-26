var oracledb = require('oracledb');
var dbconfig = require('./dbconfig');
oracledb.maxRows=10000;

var domain = 'strap';

/*Create Pool to be shared during session to prevent DB reconnection*/

dbconfig.pools.forEach(function (pool) {
    oracledb.createPool(
            {
                queueRequests: true, // default is true
                _enableStats: true, // default is false
                poolAlias: pool.alias,
                user: pool.user,
                password: pool.password,
                connectString: pool.connectString
//                ,poolMax:10//default 4
//                poolMin:          2,//default 0
//                poolIncrement:    5//default 1
//                ,poolTimeout:      4 //default60
            },
            function (err, pool) {
//            console.log(pool.poolAlias); // 'default'
       //     console.log(pool._logStats());
            });
});

/*For Unhandled Rejections*/
process.on('unhandledRejection', (reason, p) => {
    console.error("Unhandled Rejection at: ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});


function doConnect() {
    console.log(`Getting Connection from Pool ${domain}`);
    console.log(oracledb.pool._logStats());
    return oracledb.getConnection(domain);
}

function doExecute(connection, sql, bindVars) {
//console.log('Executing SQL');
    return connection.execute(sql
            , bindVars, {
                outFormat: oracledb.OBJECT, // Return the result as Object
                autoCommit: true// Override the default non-autocommit behavior
            });
}

function sendResult(result, res) {
    console.log('Execution Completed.. Sending Result');
    res.writeHead(200, {'Content-Type': 'application/json'});
    if (result.rows) {
        res.end(JSON.stringify(result.rows));
    } else {
        if (result.rowsAffected) {
            res.end(JSON.stringify(`{message : Rows Affected  ${result.rowsAffected}}`));
        } else {
            res.end(JSON.stringify(result)); /*Send as is*/
        }
    }
}

function handleError(err, conn, res) {
    console.log('Error Occured' + err.message);
    //res.status(500).json(err.message);
    if (conn) {
        conn.close();
    }

}


function singleSQL(sqlStatement, bindVars, req, res) {
    var conn;
    doConnect(domain)
            .then(function (conn) {
                return  doExecute(conn, sqlStatement, bindVars)
                        .then((result) => sendResult(result, res))
                        .then(() => conn.close())
                        .catch((err) => handleError(err, conn, res));
            })
            .catch((err) => handleError(err, conn, res));
}


/*Connect execute and return*/
function getSQLRes(sqlStatement, bindVars,callback) {
    var conn;
    doConnect(domain)
            .then(function (conn) {
                return  doExecute(conn, sqlStatement, bindVars)
                        .then((result) => callback(null, result))
                        .then(() => {
                            console.log('Closing Connection');
                            conn.close();
                        })
                        .catch((err) => callback(err, null));
            })
            .catch((err) => {
                if (conn) {
                    conn.close();
                }
                callback(err, null);
            });
}



/*Function with call backs to use instead of */
function doConnectCB( cb) {
    console.log(oracledb.getPool("strap")._logStats());
    oracledb.getConnection(domain, cb);
    
}

function doSelectCB(conn, sqlStatement, bindVars, callback) {
    conn.execute(sqlStatement
            , bindVars, {
                outFormat: oracledb.OBJECT
            }, function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);
    });
}


function handleErrorCB(err, conn, callback) {
    console.log('Error in execution of select statement' + err.message);
    callback(err, conn);
}



module.exports = {
    doConnect: doConnect,
    sendResult: sendResult,
    handleError: handleError,
    singleSQL: singleSQL,
    doExecute: doExecute,
    getSQLRes: getSQLRes,
    doSelectCB: doSelectCB,
    handleErrorCB: handleErrorCB,
    doConnectCB: doConnectCB
};

