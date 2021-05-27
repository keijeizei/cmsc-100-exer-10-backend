const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
require('./models/user');
require('./models/post');

mongoose.connect('mongodb://localhost:27017/exer10database', {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

// to avoid findOneAndUpdate() deprecation warning
mongoose.set('useFindAndModify', false);


const User = mongoose.model("User");

const Post = mongoose.model("Post");

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

// allUsers and allPosts are for debugging purposes and are not used by the front-end
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
		up: [req.body.username],
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
	// database update of the TARGET does not need to be waited
	// so res.send is placed at the callback of the USERNAME database update command
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
		// username unfriends target, friendship is mutually revoked
		else if(req.body.command === 2) {
			User.findOneAndUpdate({ username: req.body.target }, {
				$pull: { friendlist: req.body.username }
			}, (err) => { if(err) console.log(err) });

			User.findOneAndUpdate({ username: req.body.username }, {
				$pull: { friendlist: req.body.target }
			}, (err) => { if(!err) res.send(true); else console.log(err) });
		}
	});
}

exports.handleVote = (req, res) => {
	Post.findOne({
		_id: req.body._id
	}, (err, post) => {
		// downvote
		if(req.body.command === 0) {
			// post already downvoted, removing downvote instead
			if(post.down.includes(req.body.username)) {
				Post.findByIdAndUpdate(req.body._id, {
					$pull: { down: req.body.username }
				}, (err) => { if(!err) res.send(true)});
				adjustKarma(post.username, 1);
			}
			// regular downvote (downvote and remove upvote if upvoted earlier)
			else {
				Post.findByIdAndUpdate(req.body._id, {
					$push: { down: req.body.username },
					$pull: { up: req.body.username }
				}, (err) => { if(!err) res.send(true)});
				adjustKarma(post.username, -1);
			}
		}

		// upvote
		else if(req.body.command === 1) {			
			// post already upvoted, removing upvote instead
			if(post.up.includes(req.body.username)) {
				Post.findByIdAndUpdate(req.body._id, {
					$pull: { up: req.body.username }
				}, (err) => { if(!err) res.send(true)});
				adjustKarma(post.username, -1);
			}
			// regular upvote (upvote and remove downvote if downvoted earlier)
			else {
				Post.findByIdAndUpdate(req.body._id, {
					$push: { up: req.body.username },
					$pull: { down: req.body.username }
				}, (err) => { if(!err) res.send(true)});
				adjustKarma(post.username, 1);
			}
		}
	});

	// function to adjust author's karma after someone votes
	// a more sophisticated algorithm could be implemented but
	// this is enough for demonstration purposes.
	adjustKarma = (username, value) => {
		console.log(username, value)
		User.findOneAndUpdate({ username: username }, {
			$inc: { karma: value }
		}, (err) => {if(err) console.log(err)})
	}
}

exports.login = (req, res) => {
	// req.body.username can either be a username or an email address
	User.findOne({
		$or: [
			{
				email: req.body.username
			},
			{
				username: req.body.username
			}
		]
	},
	(err, user) => {
		if(user) {
			user.comparePassword(req.body.password, (err, isMatch) => {
				if(err || !isMatch) {
					// user exists but password is incorrect
					res.send({ 
						success: false,
						clientusername: user.username
					});
					console.log(`User ${user.username} entered an incorrect password.`);
				}
				else {
					// user exists and password is correct
					const token = jwt.sign({ _id: user._id }, "THIS_IS_A_SECRET_STRING");
					
					res.send({
						success: true,
						clientusername: user.username,
						token
					});
					console.log(`User ${user.username} logged in.`);
				}
			})
		}
		// user does not exist
		else {
			res.send({
				success: false,
				clientusername: null
			});
			console.log(`User ${req.body.username} logged in but account does not exist.`);
		}
	});
}

exports.signup = (req, res) => {
	User.findOne({
		username: req.body.username
	}, (err, user) => {
		// username is available
		if(!user) {
			const newUser = new User({
				fname: req.body.fname,
				lname: req.body.lname,
				email: req.body.email,
				username: req.body.username,
				password: req.body.password,
				karma: 0,
				friendlist: [],
				incomingFriendList: [],
				outgoingFriendList: []
			});
			// save the user in the database
			newUser.save((err, u) => {
				if(!err) {
					const token = jwt.sign({ _id: u._id }, "THIS_IS_A_SECRET_STRING");
		
					res.send({
						success: true,
						clientusername: u.username,
						usernametaken: false,
						token
					});
					console.log(`User ${req.body.username} account creation successful.`);
				}
				else {
					console.log(err)
					res.send({
						sucess: false,
						usernametaken: false
					})
				}
			});
		}
		// username already taken
		else {
			res.send({
				sucess: false,
				usernametaken: true
			})
		}
	})
}

exports.checkIfLoggedIn = (req, res) => {
	// no cookies / no authToken cookie sent
	if(!req.cookies || !req.cookies.authToken) {
		res.send({ isLoggedIn: false });
	}
	// token is present. validate it
	else {
		jwt.verify(
			req.cookies.authToken,
			"THIS_IS_A_SECRET_STRING",
			(err, tokenPayload) => {
			// error validating token
			if (err) {
				res.send({ isLoggedIn: false });
			}
			else {
				const userId = tokenPayload._id;

				// check if user exists
				User.findById(userId, (userErr, user) => {
					// failed to find user based on id inside token payload
					if (userErr || !user) {
						res.send({ isLoggedIn: false });
					}
					// token and user id are valid
					else {
						res.send({ isLoggedIn: true });
						console.log(`User ${user.username} validated to be logged in.`);
					}
				});
			}
		});
	}
}