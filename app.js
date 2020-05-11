var express = require("express"),
	app = express(),
	bodyParser = require("body-parser"),
	passport = require("passport"),
	localStrategy = require("passport-local"),
	mongoose = require("mongoose"),
	flash = require('connect-flash'),
	methodOverride = require('method-override'),
	dotenv = require('dotenv').config(),
	User = require("./models/user"),
	Campground = require("./models/campground"),
	Comment = require("./models/comments"),
	
	//Requiring Routes
	commentsRoutes = require('./routes/comments'),
	campgroundRoutes = require('./routes/campgrounds'),
	indexRoutes = require('./routes/index');
	//seedDB = require("./seeds");

//dotenv.config();
app.locals.moment = require('moment');
app.use(express.static(__dirname + "/public"));

//seedDB(); //seed the database
 
mongoose.connect("mongodb://localhost:27017/yelp_camp", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true});

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
 
app.use(require("express-session")({
	secret: "Juro solentemente não fazer nada de bom",
	resave: false,
	saveUninitialized: false
}))

app.use(flash());
app.use(methodOverride('_method'))
app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash('error');
	res.locals.success = req.flash('success');
	next();
})

app.use('/', indexRoutes);
app.use('/campgrounds/:id/comments',commentsRoutes);
app.use('/campgrounds', campgroundRoutes);

app.listen(4000, function(){
	console.log("Server is running");
})