const e = require('express');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/exer10database', {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

// to avoid findOneAndUpdate() deprecation warning
mongoose.set('useFindAndModify', false);

const User = mongoose.model('User', {
	fname: String,
	lname: String,
	email: String,
	password: String,
	username: String,
	picture: String,
	karma: Number,
	friendlist: Array,
	incomingFriendList: Array,
	outgoingFriendList: Array
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
		user.friendlist.push(req.query.username)

		feed = [];

		var i = 0;
		for(const friend of user.friendlist) {
			Post.find({
				username: friend
			}, (e, post) => {
				feed = [...feed, ...post];
				
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
	date = new Date().getTime();
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

exports.handleFriendRequest = (req, res) => {
	// database update of the target does not need to be waited
	// so res.send are placed at the callback of the username database update command
	User.findOne({
		username: req.body.username
	}, (err, user) => {
		// username sends a friend request to target
		if(req.body.command === 0) {
			// already sent a request, cancelling
			if(user.outgoingFriendList.includes(req.body.target)) {
				User.findOneAndUpdate({ username: req.body.target }, {
					$pull: { incomingFriendList: req.body.username }
				}, (err) => { if(err) console.log(err) });

				User.findOneAndUpdate({ username: req.body.username }, {
					$pull: { outgoingFriendList: req.body.target }
				}, (err) => { if(!err) res.send(true); else console.log(err) });
			}
			// sucessful friend request sent
			else {
				User.findOneAndUpdate({ username: req.body.target }, {
					$push: { incomingFriendList: req.body.username }
				}, (err) => { if(err) console.log(err) });

				User.findOneAndUpdate({ username: req.body.username }, {
					$push: { outgoingFriendList: req.body.target }
				}, (err) => { if(!err) res.send(true); else console.log(err) });
			}
		}
		// target sent a friend request to username, username accepts it
		else if(req.body.command === 1) {
			// successful accept, put target on user's friends
			if(user.incomingFriendList.includes(req.body.target)) {
				User.findOneAndUpdate({ username: req.body.target }, {
					$push: { friendlist: req.body.username },
					$pull: { outgoingFriendList: req.body.username }
				}, (err) => { if(err) console.log(err) });

				User.findOneAndUpdate({ username: req.body.username }, {
					$push: { friendlist: req.body.target },
					$pull: { incomingFriendList: req.body.target }
				}, (err) => { if(!err) res.send(true); else console.log(err) });
			}
		}
	});
}

exports.handleVote = (req, res) => {
	// nested if-else are used to minimize the database queries and avoid using more async functions
	Post.findOne({
		_id: req.body._id
	}, (err, post) => {
		// downvote
		if(req.body.command === 0) {
			// post already downvoted, removing downvote
			if(post.down.includes(req.body.username)) {
				// post upvoted, removing upvote first
				if(post.up.includes(req.body.username)) {
					Post.findByIdAndUpdate(req.body._id, {
						up: post.up.filter(p => p !== req.body.username),
						down: post.down.filter(p => p !== req.body.username)
					}, (err) => { if(!err) res.send(true)});
				}
				// post not upvoted
				else {
					Post.findByIdAndUpdate(req.body._id, {
						down: post.down.filter(p => p !== req.body.username)
					}, (err) => { if(!err) res.send(true)});
				}
			}
			// regular downvote
			else {
				// post upvoted, removing upvote first
				if(post.up.includes(req.body.username)) {
					Post.findByIdAndUpdate(req.body._id, {
						up: post.up.filter(p => p !== req.body.username),
						down: [...post.down, req.body.username]
					}, (err) => { if(!err) res.send(true)});
				}
				// post not upvoted
				else {
					Post.findByIdAndUpdate(req.body._id, {
						down: [...post.down, req.body.username]
					}, (err) => { if(!err) res.send(true) });
				}
			}
		}

		// upvote
		else if(req.body.command === 1) {			
			// post already upvoted, removing upvote
			if(post.up.includes(req.body.username)) {
				// post downvoted, removing downvote first
				if(post.down.includes(req.body.username)) {
					Post.findByIdAndUpdate(req.body._id, {
						up: post.up.filter(p => p !== req.body.username),
						down: post.down.filter(p => p !== req.body.username)
					}, (err) => { if(!err) res.send(true) });
				}
				// post not downvoted
				else {
					Post.findByIdAndUpdate(req.body._id, {
						up: post.up.filter(p => p !== req.body.username)
					}, (err) => { if(!err) res.send(true) });
				}
			}
			// regular upvote
			else {
				// post downvoted, removing downvote first
				if(post.down.includes(req.body.username)) {
					Post.findByIdAndUpdate(req.body._id, {
						up: [...post.up, req.body.username],
						down: post.down.filter(p => p !== req.body.username)
					}, (err) => { if(!err) res.send(true) });
				}
				// post not downvoted
				else {
					Post.findByIdAndUpdate(req.body._id, {
						up: [...post.up, req.body.username]
					}, (err) => { if(!err) res.send(true) });
				}
			}
		}
	});
}

exports.login = (req, res) => {
	// req.body.username can either be a username or an email address
	User.findOne({
		$or: [
			{
				email: {$regex: req.body.username, $options:'i'}
			},
			{
				username: {$regex: req.body.username, $options:'i'}
			}
		]
	},
	(err, user) => {
		if(user) {
			// user exists and password is correct
			if(user.password === req.body.password) {
				res.send({
					success: true,
					clientusername: user.username
				})
			}
			// user exists but password is incorrect
			else {
				res.send({
					success: false,
					clientusername: user.username
				})
			}
		}
		// user does not exist
		else {
			res.send({
				success: false,
				clientusername: null
			})
		}
	});
}
