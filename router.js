const controller = require('./controller');

module.exports = (app) => {
	app.get('/get-feed', controller.getFeed);
	app.get('/search', controller.search);
	app.get('/user-details', controller.userDetails);
	app.get('/user-friends', controller.userFriends);

	app.get('/all-users', controller.allUsers);
	app.get('/all-posts', controller.allPosts);

	app.post('/add-post', controller.addPost);
	app.post('/delete-post', controller.deletePost);
	app.post('/edit-post', controller.editPost);
	app.post('/login', controller.login);
};
