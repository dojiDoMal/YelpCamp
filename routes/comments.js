var express = require('express'),
	router = express.Router({mergeParams: true}),
	middleware = require('../middleware'),
	Campground = require('../models/campground'),
	Comment = require('../models/comments');

//New Route
router.get("/new", middleware.isLoggedIn, (req, res) => {
Campground.findById(req.params.id, (err, campground) => {
		if(err){
			console.log(err)
		} else {
			res.render("comments/new", {campground: campground})
		}
	})	
})

//Create Route
router.post("/", middleware.isLoggedIn, (req, res) => {
	Campground.findById(req.params.id, (err, campground) => {
		if(err){
			console.log(err)
			res.redirect('/campgrounds')
		} else {
			Comment.create(req.body.comment, (err, comment) => {
				if(err){
					req.flash('error', 'Something Went Wrong')
					console.log(err)
				} else {
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					comment.save();
					campground.comments.push(comment);
					campground.save();
					req.flash('success', 'Successfully added comment')
					res.redirect('/campgrounds/' + campground._id);
				}
			})
		}
	})
})

//Edit Route
router.get('/:comment_id/edit', middleware.checkCommentOwnership, (req, res) => {
	Comment.findById(req.params.comment_id, (err, foundComment) => {
		if(err){
			res.redirect('back')
		} else {
	res.render('comments/edit', {campground_id: req.params.id, comment: foundComment})
		}
	})
})

//Update Route
router.put('/:comment_id', middleware.checkCommentOwnership, (req, res) => {
	if(req.user.isAdmin){
		req.body.comment.editedByAdmin = true;
	}
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, updatedComment) => {		
		if(err){
			res.redirect('back')
		} else {
			res.redirect('/campgrounds/' + req.params.id)
		}
	})
})

//Destroy Route
router.delete('/:comment_id', middleware.checkCommentOwnership, (req, res) => {
	Comment.findByIdAndRemove(req.params.comment_id, (err) => {
		if(err){ 
			res.redirect('back')
		} else {
			req.flash('success', 'Comment deleted')
			res.redirect('/campgrounds/' + req.params.id)
		}
	})
})

module.exports = router;