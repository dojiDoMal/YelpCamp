var express = require('express'),
	router = express.Router(),	
	middleware = require('../middleware'),
	passport = require('passport'),
	User = require('../models/user'),
	aSync = require('async'),
	//OAuth is not working, maybe look for alternatives
	nodemailer = require('nodemailer'),
	crypto = require('crypto'),
	Campground = require('../models/campground'),
	secretCode = 'A6G7H8';

//Root Route
router.get("/", (req, res) => {
	res.render("landing"); 
})

//Auth Routes
router.get('/register', (req, res) => {
	res.render('register', {page: 'register'});
})

router.post('/register', (req, res) => {
	var newUser = new User({
		username: req.body.username, 
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email,
		avatar: req.body.avatar
	});
	if(req.body.adminCode === secretCode){
		newUser.isAdmin = true;
	}
	User.register(newUser, req.body.password, (err, user) => {
		if(err){
    		return res.render("register", {error: err.message});
		} else {
			passport.authenticate('local')(req, res, () => {
				req.flash('success', 'Successfully Signed Up! Welcome to YelpCamp!' + req.body.username)
				res.redirect('/campgrounds');
			})
		}
	})
})

//Show Login Form
router.get('/login', (req, res) => {
	res.render('login', {page: 'login'});
})

//Handle Login Logic
router.post('/login', passport.authenticate('local', {
		successRedirect: '/campgrounds',
		failureRedirect: '/login'
	}), (req, res) => {})

//Logout Route
router.get('/logout', (req, res) => {
	req.logout();
	req.flash('error', 'Logged you out!');
	res.redirect('/campgrounds');
})

// forgot password
router.get('/forgot', (req, res) => {
  res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
  aSync.waterfall([
    function(done){
	  //This generates a token that expires after x amount of time
      crypto.randomBytes(20, (err, buf) => {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user){
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
		host: 'smtp.gmail.com',
    	port: 465,
    	secure: true,
        auth: {
			type: 'OAuth2',
          	user: 'anderson.am.new@gmail.com',
			clientId: '966375865986-t88q9v0r5qe35l7gva7aoet2gor7f14f.apps.googleusercontent.com',
			clientSecret: 'NmpXpdUF6wmi0hp3cedcFLhu',
			refreshToken: '1//04yS2LAMYu3a1CgYIARAAGAQSNwF-L9IrfGpC9ozNgHxxLyZmed7Oz2Qp-mPyWNyuzfGNvuo7sdlfbRVaia13jmAQ5Ui2QpQ93oM',
        }
      });
      var mailOptions = {
        to: user.email,
        from: process.env.APP_EMAIL,
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  aSync.waterfall([
    function(done){
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail', 
		host: 'smtp.gmail.com',
    	port: 465,
    	secure: true,
        auth: {
			type: 'OAuth2',
          	user: 'anderson.am.new@gmail.com',
			clientId: '966375865986-t88q9v0r5qe35l7gva7aoet2gor7f14f.apps.googleusercontent.com',
			clientSecret: 'NmpXpdUF6wmi0hp3cedcFLhu',
			refreshToken: '1//04yS2LAMYu3a1CgYIARAAGAQSNwF-L9IrfGpC9ozNgHxxLyZmed7Oz2Qp-mPyWNyuzfGNvuo7sdlfbRVaia13jmAQ5Ui2QpQ93oM',
        }
      });
      var mailOptions = {
        to: user.email,
        from: process.env.APP_EMAIL,
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, (err) => {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});

// User Profile Route
router.get('/users/:id', (req, res) => {
	User.findById(req.params.id, (err, foundUser) => {
		if(err){
			req.flash('error', 'User Not Found');
			return res.redirect('/');
		} else {
			Campground.find().where('author.id').equals(foundUser._id).exec((err, campgrounds) => {
				if(err){
					req.flash('error', 'Can not find the campground of user');
					return res.redirect('/')
				}
				res.render('users/show', {user: foundUser, campgrounds: campgrounds})
			})	
		}
	})
})

module.exports = router;