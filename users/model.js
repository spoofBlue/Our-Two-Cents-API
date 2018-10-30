
const mongoose = require(`mongoose`);
const bcrypt = require('bcryptjs');

const UserSchema = mongoose.Schema({
    "userId" : {type : String},
    "username" : {type : String},
    "userEmail" : {type : String , required : true},
    "userFullName" : {type : String, required : true},
    "userPassword" : {type : String , required : true}
});

/*
UserSchema.virtual(`username`).get(function() {
    return `${this.userFirstName.trim()} ${this.userLastName.trim()}`
});
*/

UserSchema.methods.serialize = function() {
    return {
        username : this.username,
        userId : this._id ,
        userEmail : this.userEmail,
        userFullName : this.userFullName
    }
}

UserSchema.methods.validatePassword = function(password) {
    return bcrypt.compare(password, this.userPassword);
};

UserSchema.statics.hashPassword = function(password) {
    return bcrypt.hash(password, 10);
};

const Users = mongoose.model(`Users`, UserSchema);

module.exports = {Users};