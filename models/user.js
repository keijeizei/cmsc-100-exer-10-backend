const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
	fname: { type: String, required: true },
	lname: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	username: { type: String, required: true },
	picture: { type: String, required: false },
	karma: { type: Number, required: true },
	friendlist: { type: Array, required: true },
	incomingFriendList: { type: Array, required: true },
	outgoingFriendList: { type: Array, required: true },
});

UserSchema.pre("save", function(next) {
	const user = this;

	if(!user.isModified("password")) return next();

	return bcrypt.genSalt((saltError, salt) => {
		if(saltError) { return next(saltError); }

		return bcrypt.hash(user.password, salt, (hashError, hash) => {
			if (hashError) { return next(hashError); }

			user.password = hash;
			return next();
		});
	});
});

UserSchema.methods.comparePassword = function(password, callback) {
	bcrypt.compare(password, this.password, callback);
}

module.exports = mongoose.model("User", UserSchema);