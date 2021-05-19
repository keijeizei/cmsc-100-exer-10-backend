const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
	timestamp: { type: String, required: true },
	username: { type: String, required: true },
	content: { type: String, required: true },
	up: { type: Array, required: true },
	down: { type: Array, required: true },
});

module.exports = mongoose.model("Post", PostSchema);