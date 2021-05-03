const e = require('express');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/exer10database', {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

// to avoid findOneAndUpdate() deprecatin warning
mongoose.set('useFindAndModify', false);

const User = mongoose.model('User', {
	fname: String,
	lname: String,
	email: String,
	password: String,
	username: String,
	picture: String,
	karma: Number,
	friendlist: Array
});

const Post = mongoose.model('Post', {
	timestamp: String,
	username: String,
	content: String,
	up: Array,
	down: Array
})

exports.getFeed = (req, res) => {
	User.findOne({
		username: req.query.username
	}, (err, user) => {
		// append own username to the list since user's posts are also part of the feed
		user.friendlist.push({username: req.query.username, status: 0})

		feed = [];

		var i = 0;
		for(const friend of user.friendlist) {
			Post.find({
				username: friend.username
			}, (e, post) => {
				if(friend.status === 0) {
					feed = [...feed, ...post];
				}

				// send is inside the callback function because find is async
				if(i === user.friendlist.length - 1) {
					res.send(feed);
				}
				i++;
			})
		};
	});
};

exports.search = (req, res) => {
	// split the name into words, this allows the client to search full names and even usernames
	names = req.query.name.split(" ");

	searchResults = [];
	for(const name of names) {
		User.find({
			$or: [
				{
					fname: {$regex: name, $options:'i'}
				},
				{
					lname: {$regex: name, $options:'i'}
				},
				{
					username: {$regex: name, $options:'i'}
				}
			]
		}, (err, users) => {
			var i = 0;
			// check every user if they are already in searchResults
			for(const user of users) {
				if(!searchResults.includes(user)) {
					searchResults.push(user);	// add if they are not
				}
			}
			// send is inside the callback function because find is async
			if(i === names.length - 1) {
				res.send(searchResults);
			}
			i++;
		});
	}
};

exports.userDetails = (req, res) => {
	// password field is omitted from the result
	User.findOne({
		username: req.query.username
	}, "-password",
	(err, user) => {
		res.send(user)
	});
};

exports.userFriends = (req, res) => {
	User.findOne({
		username: req.query.username
	}, (err, user) => {
		res.send(user.friendlist)
	});
};

exports.allUsers = (req, res) => {
	User.find({}, (err, users) => {
		res.send(users);
	});
};

exports.allPosts = (req, res) => {
	Post.find({}, (err, posts) => {
		res.send(posts);
	});
};

exports.addPost = (req, res) => {
	date = new Date();
	const newPost = new Post({
		timestamp: date,
		username: req.body.username,
		content: req.body.content,
		up: [],
		down: []
	});
	newPost.save((err) => {
		if(!err) {
			res.send(true);
		}
		else {
			console.log(err);
			res.send(false);
		}
	});
};

exports.deletePost = (req, res) => {
	Post.findByIdAndDelete(req.body._id,
		(err) => {
		if(!err) {
			res.send(true);
		}
		else {
			console.log(err);
			res.send(false);
		}
	});
};

exports.editPost = (req, res) => {
	Post.findByIdAndUpdate(req.body._id, {
		content: req.body.content
	}, (err) => {
		if(!err) {
			res.send(true);
		}
		else {
			console.log(err);
			res.send(false);
		}
	});
};
