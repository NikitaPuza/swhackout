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
const algoliasearch = require('algoliasearch');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


app.use(function(req, res, next){
  res.io = io;
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var client = algoliasearch('Y8Q3VSESJ3', '2b9e09d99f2c106b00faed00c2664917');
var index = client.initIndex('swhackout');

const store = new RedisStore({url:'//redis-11046.c9.us-east-1-4.ec2.cloud.redislabs.com:11046'});

app.use(helmet());
app.use(session({
	store: store,
	secret: 'milhouse',
	resave: true,
	saveUninitialized: false,
	name: 'fbauth',
	ttl: 5000,
	prefix:'session',
	cookie: {maxAge: 5000}
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new FacebookStrategy({
    clientID: '663527113857308',
    clientSecret: '2d2bf833552930100b344bad56ace8b0',
    callbackURL: "https://swhackout.herokuapp.com/auth/facebook/callback"
    },
  (accessToken, refreshToken, profile, done) => {
    index.addObject({
      name: profile.displayName
    }, profile.id, function(err, content) {
  console.log('objectID=' + content.objectID);
});
    	done(null, profile);
		}
));

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});


function ensureAuthenticated(req, res, next) {
	if (req.user != undefined) {
		console.log(req.user);
		return next();
	}
	res.redirect(302, '/login');
  console.log(req.passport)
}

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {failureRedirect: '/login', successRedirect: '/' }));


app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/', (req, res) => {
    res.redirect(302, '/events')
  //console.log(userProfile);
  parse = JSON.stringify(req.user._json);
  res.render('index', {profile: parse})
})

app.get('/events', function (req, res) {
  if (req.user == undefined) {
    res.redirect(302, '/login');
  }
  // req.user = {'_json':  {'name': "Testy McTesterson", "id": "39874678"}};
  var multiplier = 4;
  var red_number = parseInt(req.user._json.id) % 256;
  var green_number = (parseInt(req.user._json.id) / 256) % 256;
  var blue_number = (parseInt(req.user._json.id) / 256 / 256) % 256;
  var max_num = Math.max(red_number, green_number, blue_number);
  var min_num = Math.min(red_number, green_number, blue_number);

  if (red_number == max_num) {
    red_number *= multiplier;
    red_number = Math.min(red_number, 256);
  } else if (red_number == min_num) {
    red_number /= multiplier;
  }
  if (green_number == max_num) {
    green_number *= multiplier;
    green_number = Math.min(green_number, 256);
  } else if (green_number == min_num) {
    green_number /= multiplier;
  }
  if (blue_number == max_num) {
    blue_number *= multiplier;
    blue_number = Math.min(blue_number, 256);
  } else if (blue_number == min_num) {
    blue_number /= multiplier;
  }
  var colors = {
    'r': red_number,
    'g': green_number,
    'b': blue_number
  };
  res.render('events', {profile: req.user._json, colors: colors});
});
app.get('/people', function (req, res) {
  res.render('people')
})

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});



module.exports = {app: app, server: server};