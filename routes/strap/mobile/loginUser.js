var express = require('express');
var bcrypt = require('bcryptjs');
var router = express.Router();
var op = require('../../../oracleDBOps');
var oracledb = require('oracledb');
var jwt = require('jsonwebtoken');
var async = require('async');


router.post('/', function (req, res) {
    loginUser(req, res);
});

module.exports = router;

/**
 * @api {Post} /id/:id User Login
 * @apiVersion 1.0.0
 * @apiName loginUser
 * @apiGroup User
 * @apiPermission none
 *
 * @apiDescription This function is used for User Login.
 */
function loginUser(req, res) {

    let userId = req.body.userId;
    let password = req.body.password;
    let userDB = {};
    let userFound = false;//Added for response set
    let userLock = false;//Added for response set
    let userOTP = false;
    let passwordValid = false;//Added for response set
    var bindArr = [];
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err) {
                cb(err, conn);
            }
            cb(null, conn);
        });
    };

    function doSelectUser(conn, cb) {
        console.log(req.body.userId);
        let sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${userId}'`;
        let bindVars = [];
        //  console.log(bindVars.join());
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                console.log(sqlStatement);
                if (result.rows.length === 0) {
                    res.status(401).send({'err': 'User not found'});
                    cb(null, conn);

                } else {
                    userDB = result.rows[0];
                    userFound = true;//Added for response set
                    cb(null, conn);
                }
            }
        });
    }

    function doChkOTP(conn, cb) {
        if (userFound)
        {
            console.log(req.body.userId);
            let sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${userId}' AND OTP is NULL`;
            let bindVars = [];
            //  console.log(bindVars.join());
            conn.execute(sqlStatement
                    , bindVars, {
                        outFormat: oracledb.OBJECT
                    }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    console.log(sqlStatement);
                    if (result.rows.length === 0) {
                        res.status(401).send({'err': 'Kindly reset the Password using OTP'});
                        cb(null, conn);

                    } else {
                        userOTP = true;//Added for response set
                        cb(null, conn);
                    }
                }
            });
        } else
            cb(null, conn);
    }

    function doChkLock(conn, cb) {
        if (userFound && userOTP)
        {
            console.log(req.body.userId);
            let sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${userId}' AND NVL(ACC_LOCK,'No')<>'Yes'`;
            let bindVars = [];
            //  console.log(bindVars.join());
            conn.execute(sqlStatement
                    , bindVars, {
                        outFormat: oracledb.OBJECT
                    }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    console.log(sqlStatement);
                    if (result.rows.length === 0) {
                        res.status(401).send({'err': 'Account Locked ! Kindly reset the Password'});
                        cb(null, conn);

                    } else {
                        userDB = result.rows[0];
                        userLock = true;//Added for response set
                        cb(null, conn);
                    }
                }
            });
        } else
            cb(null, conn);
    }

    function doVerifyPassword(conn, cb) {
        console.log(userFound);
        if (userFound && userLock && userOTP)//Added for response set
        {//Added for response set
            bcrypt.compare(password, userDB.PASSWORD, function (err, isMatch) {
                console.log("isMatch" + isMatch);
                console.log(err);
                if (err)
                    cb(err, conn);
                if (!isMatch)
                {
                    updateEntry(conn, cb);
                }
                if (isMatch)
                {
                    passwordValid = true;//Added for response set
                    cb(null, conn);
                }
            });
        }//Added for response set
        else
            cb(null, conn);
    }


    function updateEntry(conn, cb) {

        let getSQL = `SELECT NVL(MAX(LOGIN_NUM),0) FROM USERS_T WHERE USER_ID=:1`;

        sqlStatement = "UPDATE USERS_T SET LOGIN_NUM=:1,ACC_LOCK=:2 WHERE USER_ID=:3";
        var bindVars = [req.body.userId];
        var count = 0;
        conn.execute(getSQL, bindVars, {
            autoCommit: true// Override the default non-autocommit behavior,
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                result.rows.forEach(function (row) {
                    count = row[0] + 1;
                    if (count === 3)
                    {
                        let binVars = [count, 'Yes', req.body.userId];
                        bindArr.push(binVars);
                        res.status(401).send({'err': 'Incorrect Password ! Account Locked'});
                    } else
                    {
                        let binVars = [count, '', req.body.userId];
                        bindArr.push(binVars);
                        console.log('Data :' + count);
                        var result = 3 - count;
                        console.log('Data :' + result);
                        res.status(401).send({'err': 'Incorrect Password ! ' + result + ' Attempts Remaining '});
                    }
                });
                doInsert(conn, cb);
            }
        });
    }
    ;

    function doInsert(conn, cb) {
        console.log("In  doInsert");
        async.eachSeries(bindArr, function (data, callback) {
            console.log("Inserting :", JSON.stringify(data));
            let insertStatement = sqlStatement;
            let bindVars = data;
            conn.execute(insertStatement
                    , bindVars, {
                        autoCommit: true// Override the default non-autocommit behavior
                    }, function (err, result)
            {
                if (err) {
                    console.log("Error Occured: ", err);
                    callback();
                } else {
                    console.log("Rows inserted: " + result.rowsAffected); // 1
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("Event Insert Error");
            } else {
                cb(null, conn);
            }
        }
        );
    }

    function doSendUser(conn, cb) {
        if (userFound && passwordValid && userLock)//Added for response set
        {
            //Added for response set

            let user = {};
            user.userId = userDB.USER_ID;
            user.name = userDB.NAME;
            user.email = userDB.EMAIL;
            user.phone = userDB.PHONE || 0;
            user.role = userDB.ROLE;
            user.locId = userDB.LOC_ID;
            user.partGrp = userDB.PART_GRP;

            var token = 'JWT ' + jwt.sign({username: userDB.USER_ID}, 'somesecretforjswt', {expiresIn: 10080});
            user.token = token;
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(user).replace(null, '"NULL"'));
            doUpdate(conn, cb);
        } else {
            cb(null, conn);
        }
    }//Added for response set

    function doUpdate(conn, cb) {
        console.log("In  doUpdate");
        let sqlStatement = "UPDATE USERS_T SET LOGIN_NUM=:1,ACC_LOCK=:2 WHERE USER_ID=:3";
        let bindVars = ['', '', req.body.userId];
        conn.execute(sqlStatement
                , bindVars, {
                    autoCommit: true// Override the default non-autocommit behavior
                }, function (err, result)
        {
            if (err) {
                console.log("Error Occured: ", err);
                cb(err, conn);
            } else {
                console.log("Rows inserted: " + result.rowsAffected); // 1
                cb(null, conn);
            }
        });
    }

    async.waterfall(
            [doConnect,
                doSelectUser,
                doChkOTP,
                doChkLock,
                doVerifyPassword,
                doSendUser
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(500).json(err);
                    if (conn)
                    {
                        conn.close();

                    }
                }
                console.log("Done Waterfall");
                if (conn)
                {
                    console.log('Connection Closed');
                    conn.close();
                }
            });
}

