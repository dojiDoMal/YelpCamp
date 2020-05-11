var express = require('express'),
	router = express.Router(),
	request = require('request'),
	multer = require('multer'),
	middleware = require('../middleware'),
	Campground = require('../models/campground')

var storage = multer.diskStorage({
	filename: function(req, file, callback) {
		callback(null, Date.now() + file.originalname)
	}
})

var imageFilter = function(req, file, cb) {
	if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
		return cb(new Error('Only image files are allowed!'), false)
	}
	cb(null, true)
}

var upload = multer({storage: storage, fileFilter: imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({
	cloud_name: 'dne0nskq7',
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
})

router.get("/", (req, res) => {
	Campground.find({}, (err, allCampgrounds) => {
		if(err){
			console.log(err);
		} else {
			res.render("campgrounds/index", {campgrounds: allCampgrounds, page: 'campgrounds'})
		}
	})
})

router.post("/", middleware.isLoggedIn, upload.single('image'), (req, res) => {
	cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
		if(err){
			req.flash('error', err.message)
			return res.redirect('back')
		}
  // add cloudinary url for the image to the campground object under image property
  req.body.campground.image = result.secure_url;
	req.body.campground.imageId = result.public_id;
  // add author to campground
  req.body.campground.author = {
    id: req.user._id,
    username: req.user.username
  }
  Campground.create(req.body.campground, function(err, campground) {
    	if (err) {
      		req.flash('error', err.message);
      		return res.redirect('back');
    	}
    		res.redirect('/campgrounds/' + campground.id);
  		});
	});
})

//New campground
router.get("/new", middleware.isLoggedIn, (req, res) => {
	res.render("campgrounds/new");
})

//Show campground
router.get("/:id", (req, res) => {	Campground.findById(req.params.id).populate("comments").exec((err, foundCampground) => {
		if(err){
			console.log(err)
		} else {
			res.render("campgrounds/show", {campground: foundCampground})
		}
	})
})

//Edit Route
router.get('/:id/edit', middleware.checkCampgroundOwnership, (req, res) => {
	Campground.findById(req.params.id, (err, foundCampground) => {
		res.render('campgrounds/edit', {campground: foundCampground})
	})
})

//Update Route
router.put('/:id', middleware.checkCampgroundOwnership, upload.single('image'), (req, res) => {
	Campground.findById(req.params.id, req.body.campground, async (err, updatedCampground) => {
		if(err){
			req.flash('error', err.message)
			res.redirect('back')
		} else {
			if(req.file){
				try{
					await cloudinary.v2.uploader.destroy(campground.imageId); 
					var result = await cloudinary.v2.uploader.upload(req.file.path);
					campground.imageId = result.public_id;
					campground.image = result.secure_url;
				} catch(err){
					req.flash('error', err.message)
					return res.redirect('back')
				}					
			}
			campground.name = req.body.name;
			campground.description = req.body.description;
			campground.save();
			req.flash('success', 'Successfully Updated!');
			res.redirect('/campgrounds/' + req.params.id)
		}
	})
})

//Destroy Route
router.delete('/:id', middleware.checkCampgroundOwnership, (req, res) => {
	Campground.findById(req.params.id, async (err, campground) => {	
		if(err){
			req.flash('error', err.message)
			return res.redirect('back')
		}
		try{
			await cloudinary.v2.uploader.destroy(campground.imageId)
			campground.remove();
			res.flash('success', 'Campground deleted successfully!')
			res.redirect('/campgrounds')
		} catch(err) {
			if(err){
				req.flash('error', err.message)
				return res.redirect('back')
			}		
		}

	})
})

module.exports = router;