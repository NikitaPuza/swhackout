const express = require('express');
const path = require('path');
const helmet = require('helmet');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const redis = require('redis');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

const store = new RedisStore({url:'//redis-11046.c9.us-east-1-4.ec2.cloud.redislabs.com:11046'});

app.use(helmet());
app.use(session({
	store: store,
	secret: 'milhouse',
	resave: true,
	saveUninitialized: false,
	name: 'store-search-cookie',
	ttl: 900000,
	prefix:'session',
	cookie: {maxAge: 900000}
}));

app.use(passport.initialize());
app.use(passport.session());

let userprofile

passport.use(new FacebookStrategy({
    clientID: '663527113857308',
    clientSecret: '2d2bf833552930100b344bad56ace8b0',
    callbackURL: "http://localhost:3000/auth/facebook/callback"
    },
  (accessToken, refreshToken, profile, done) => {
    console.log(profile)
    userprofile = profile
    	done(null, profile);
		}
));

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function ensureAuthenticated(req, res, next) {
	if (userprofile.displayName) {
		console.log(req.sessionID);
		return next();
	}
	res.redirect(302, '/login');
}

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {failureRedirect: '/login', successRedirect: '/' }));


app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/',
  ensureAuthenticated,
  (req, res) => {
    console.log(userprofile.displayName)
  parsedProfile = JSON.stringify(userprofile)
  res.render('index', {profile: userprofile.displayName})
})
module.exports = app;
