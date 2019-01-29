
const mongoose = require(`mongoose`);
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    userId : {type : String, required : true},
    username : {type : String, required : true},
    timeSent : {type: Date, default: Date.now() },
    text : {type : String, required : true}
});

const ConversationSchema = mongoose.Schema({
    _id : {type : String},
    conversationId : {type : String, required : true},
    channelURL : {type : String, required : true},
    hostUserId : {type : String, required : true},
    hostUsername : {type : String, required : true},
    guestUserId : {type : String, required : true},
    guestUsername : {type : String, required : true},
    topicId : {type : String, required : true},
    topicName : {type : String, required : true},
    messageList : {type : [messageSchema], default : []},
    timeStarted : { type: Date, default: Date.now() },
    conversationFinished : {type : Boolean, default : false}
});

ConversationSchema.methods.serialize = function() {
    return {
        conversationId : this.conversationId,
        channelURL : this.channelURL,
        hostUserId : this.hostUserId,
        hostUsername : this.hostUsername ,
        guestUserId : this.guestUserId,
        guestUsername : this.guestUsername,
        topicId : this.topicId,
        topicName : this.topicName
    }
}

ConversationSchema.methods.getMessageList = function() {
    return {
        messageList : this.messageList
    }
}

const Conversations = mongoose.model(`Conversations`, ConversationSchema);

module.exports = {Conversations};

/*
possible schema architecture, combining availableConversation with Conversation:
const ConversationSchema = mongoose.Schema({
    conversationId : {type : String, required : true},
    hostUserId : {type : String, required : true},
    hostUsername : {type : String, required : true},
    guestUserId : {type : String, required : true},
    guestUsername : {type : String, required : true},
    topicId : {type : String, required : true},
    topicName : {type : String, required : true},
    messageList : {type : [messageSchema]},
    metaData : {
        conversationAvailable : {type : Boolean},
        timeMadeAvailable : { type: Date},
        conversationStarted : {type : Boolean},
        timeStarted : { type: Date, default: Date.now },
        conversationFinished : {type : Boolean},
        timeFinished : { type: Date}
    }
});
*/