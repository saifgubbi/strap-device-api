var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var config = require('../dbconfig');
var op = require('../oracleDBOps');


// Setup work and export for the JWT passport strategy
module.exports = function (passport) {
    var opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeader();
    opts.secretOrKey = config.secret;
    opts.passReqToCallback = true;

    passport.use(new JwtStrategy(opts, function (req, jwt_payload, done) {
        findUser(req, jwt_payload, done);

    }));
};


function findUser(req, user, done) {
    var req, res;

    if (config.userValidated(user)) {
        done(null, user);
    } else
    {
        console.log('Executing DB check for user');
        var selectStatement = "SELECT 'Y' FROM USERS_T WHERE USERNAME=:1";
        var bindVars = [user.username];
        op.getSQLRes(selectStatement, bindVars, function (err, result) {
            if (err) {
                console.log('Error in execution of select statement' + err.message);
                done(err, false);
            } else {
                if (result.rows.length) {
                    config.userValidated(user) ? console.log('Not pushing User') : config.addUser(user);
                    (result.rows.length) ? done(null, user) : done(null, false);
                }
            }


        });

    }




}