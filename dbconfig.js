
module.exports = (function () {
    var secret = 'somesecretforjswt';
    var usersSeen = [];
    var prod = false;

    function addUser(user) {
        console.log('Adding User');
        usersSeen.push(user);
    }

    function userValidated(user) {
        return usersSeen.indexOf(user) !== -1 ? true : false;
    }

    return {
        pools: [
            {
                user: process.env.DBAAS_USER_NAME || "strap",
                password: process.env.DBAAS_USER_PASSWORD || "strap",
                //password: process.env.DBAAS_USER_PASSWORD || "Passw0rd_789",
                connectString: process.env.DBAAS_DEFAULT_CONNECT_DESCRIPTOR || "10.170.9.82/xe",
                //connectString: process.env.DBAAS_DEFAULT_CONNECT_DESCRIPTOR || "strap.c27rvxvvwmxs.ap-south-1.rds.amazonaws.com/strap",
                alias: 'strap'
            }],
        secret: secret,
        addUser: addUser,
        userValidated: userValidated,
        prod: false
    };
}
)();