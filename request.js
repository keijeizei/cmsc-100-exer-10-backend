const request = require("request");

data = {
	username: "yagoo",
	content: "Test post."
}

editdata = {
	_id: "608f864571b59728282dd025",
	content: "Edited."
}

deletedata = {
	_id: "608f864571b59728282dd025"
}

// POST request
// request('http://localhost:3001/add-post', {
// 	method: "POST",
// 	headers: {
// 		'Content-Type': 'application/json'
// 	},
// 	body: JSON.stringify(data) },
// 	(err, response, body) => {
// 		console.log(body);
// });

// request('http://localhost:3001/edit-post', {
// 	method: "POST",
// 	headers: {
// 		'Content-Type': 'application/json'
// 	},
// 	body: JSON.stringify(editdata) },
// 	(err, response, body) => {
// 		console.log(body);
// });


request('http://localhost:3001/delete-post', {
	method: "POST",
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify(deletedata) },
	(err, response, body) => {
		console.log(body);
});