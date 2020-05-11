var mongoose = require('mongoose');

var commentSchema = new mongoose.Schema({
	text: String,
	editedByAdmin: {
		type: Boolean,
		default: false
	},
	createdAt: { 
		type: Date, 
		default: Date.now 
	},
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		username: String
	}
});

module.exports = mongoose.model("Comment", commentSchema);