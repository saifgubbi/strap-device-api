var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var passport = require('passport');

var loginUser = require('./loginUser');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


var port = process.env.PORT || 3060;        // set our port

// Log requests to console
app.use(morgan('dev'));
app.use('/uploads',express.static('uploads'));

// Initialize passport for use
app.use(passport.initialize());
// Bring in defined Passport Strategy
require('./config/auth')(passport);

var router = express.Router();

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', true);
    if (req.method === 'OPTIONS') {
        res.status(200).send('Allow');
    } else {
        next();
    }
});

app.use('/loginUser', loginUser);

if (require('./dbconfig').prod) {
    app.use('/api', passport.authenticate('jwt', {session: false}), function (req, res, next) {
        next();
    });
} else {
    console.log('Setting Default Domain for dev');
    app.use('/api', function (req, res, next) {
        next();
    });
}


app.use('/api', require('./routes'));

app.listen(port, function () {
    console.log('Listening on port ' + port);
});
