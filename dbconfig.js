
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
                connectString: process.env.DBAAS_DEFAULT_CONNECT_DESCRIPTOR || "10.170.9.82/xe",
                alias: 'strap'
            }],
        secret: secret,
        addUser: addUser,
        userValidated: userValidated,
        prod: false
    };
}
)();