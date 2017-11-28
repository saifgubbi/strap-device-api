var express = require('express');
var bcrypt = require('bcryptjs');
var router = express.Router();
var op = require('./oracleDBOps');
var oracledb = require('oracledb');
var jwt = require('jsonwebtoken');
var async = require('async');


router.post('/', function (req, res) {
    loginUser(req, res);
});


module.exports = router;


function loginUser(req, res) {

    let userId = req.body.userId;
    let password = req.body.password;
    let userDB = {};
    let userFound = false;//Added for response set
    let passwordValid = false;//Added for response set

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
                    res.status(401).send({'err': 'User not found'});//Added for response set
                    //cb({'err': 'User not found'}, conn);
                    cb(null, conn);

                } else {
                    userDB = result.rows[0];
                    userFound = true;//Added for response set
                    cb(null, conn);
                }
            }
        });
    }

    function doVerifyPassword(conn, cb) {
        console.log(userFound);
        if (userFound)//Added for response set
        {//Added for response set
            bcrypt.compare(password, userDB.PASSWORD, function (err, isMatch) {
                console.log("isMatch" + isMatch);
                console.log(err);
                if (err)
                    cb(err, conn);
                if (!isMatch)
                {
                    res.status(401).send({'err': 'Incorrect Password'});//Added for response set
                    cb(null, conn);
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

    function doSendUser(conn, cb) {
        if (userFound && passwordValid)//Added for response set
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
            cb(null, conn);
        } else {
            cb(null, conn);
        }
    }//Added for response set

    async.waterfall(
            [doConnect,
                doSelectUser,
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

