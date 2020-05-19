var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var UserSchema = new Schema(
    {
        userId: String,
        amount: Number
    }
);

module.exports = mongoose.model('Users', UserSchema);