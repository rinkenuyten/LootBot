var mongoose = require('mongoose'),
	User = mongoose.model('Users');

exports.createUser = function(userData){
    var newUser = new User(userData);
	return newUser.save();
};

exports.getUserById = function(userId){
    return User.findOne({ userId: userId });
};

exports.updateUser = function(userData){
    return User.findOneAndUpdate({ userId: userData.userId }, userData, {new: true});
};