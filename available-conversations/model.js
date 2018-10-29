
const mongoose = require(`mongoose`);

const AvailableConversationSchema = mongoose.Schema({
    conversationId : {type : String},
    hostUserId : {type : String, required : true},
    hostUsername : {type : String, required : true},
    hostViewpoint : {type : String, required : true},
    topicId : {type : String, required : true},
    topicName : {type : String, required : true},
    status : {type : String, default : 'available'},
    timeMadeAvailable : { type: Date, default: Date.now()},
});

AvailableConversationSchema.methods.serialize = function() {
    return {
        conversationId : this._id,
        hostUserId : this.hostUserId,
        hostUsername : this.hostUsername,
        hostViewpoint : this.hostViewpoint,
        topicId : this.topicId,
        topicName : this.topicName,
        status : this.status
    }
}

const AvailableConversations = mongoose.model(`AvailableConversations`, AvailableConversationSchema);

module.exports = {AvailableConversations};