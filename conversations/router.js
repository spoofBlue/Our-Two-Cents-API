
const express = require(`express`);
const bodyParser = require(`body-parser`);

const {Conversations} = require(`./model`);

// Further package accessibility
const router = express.Router();
const jsonParser = bodyParser.json();

// Routing

const convoAuth = (req, res, next) => {
    Conversations
        .findById(req.params.id)
        .then(conversation => {
            // Verifies the conversation exists, and the user's Id is the same as one of the individuals in the conversation.
            // Could put hostUserId and guestUserId into a list of participates, then see if req.body.userId is in the list. Just fyi if scaling past 1-on-1 convos.
            if (!(conversation.conversationId && req.body.userId && (req.body.userId === conversation.hostUserId) || (req.body.userId === conversation.guestUserId))) {
                const msg = `You do not have access to this conversation. Please return to the home page.`;
                return res.status(400).json({message : msg});
            } else {
                next();
            }
        })
        .catch(err => {
            console.log(`in convoAuth error. err=`, err);
            return res.status(500).json({message :`Internal Server Error.`});
        });
}

const convoFinished = (req, res, next) => {
    Conversations
        .findById(req.params.id)
        .then(conversation => {
            // Verifies the conversation is still ongoing.
            if (conversation.conversationFinished) {
                const msg = `Someone has left this conversation.`;
                return res.status(200).json(conversation.serialize());  // which includes (conversationFinished = true) info.
            } else {
                next();
            }
        })
        .catch(err => {
            console.log(`in convoFinished error. err=`, err);
            return res.status(500).json({message :`Internal Server Error.`});
        });
}

// !!! don't need anymore now that middleware in requests themselves. router.use(`/:id`, convoAuth, convoFinished);

// User get initial convoData this way. 
// !!!! If not using the 3rd party API for messaging, can check in here for updates in messageList.
router.get(`/:id`, (req, res) => {
    Conversations
        .findById(req.params.id)
        .then(conversation => {
            console.log(conversation.serialize());
            res.status(200).json(conversation.serialize());  
        })
        .catch(err => {
            return res.status(500).json({message :`Internal Server Error`});
        });
});

// POST This occurs when the two people connect to a conversation for the first time.  The person who joins the conversation technically
// posts the conversation.

router.post(`/`, jsonParser, (req, res) => {
    console.log(`in conversations POST. req.body=`, req.body);
    checkPostRequestForErrors(req)
    .then((errorMessage) => {
        console.log(`errorMessage in post request block=`, errorMessage);
        if (errorMessage.length > 0) {
            return res.status(422).json(errorMessage);
        } 
        Conversations
        .create({
            _id : req.body.conversationId,
            channelURL : req.body.channelURL,
            conversationId : req.body.conversationId,
            hostUserId : req.body.hostUserId,
            hostUsername : req.body.hostUsername,
            guestUserId : req.body.guestUserId,
            guestUsername : req.body.guestUsername,
            topicId : req.body.topicId,
            topicName : req.body.topicName
        })
        .then(convo => res.status(201).json(convo.serialize()))
        .catch(error => {
            console.log('error.message=', error.message);
            const message = `Failed to start the conversation at this time.`;
            return res.status(400).send(message);
        });
    });
});

// UPDATE  Whenver a user posts a new message, or a user leaves the conversation, will they update this conversation.
// !!! May not utilize these if I use a 3rd party API.
router.put(`/:id`, [jsonParser, convoAuth, convoFinished], (req, res) => {
    if (!(req.params.id && req.body.userId && req.params.id === req.body.userId)) {
        const msg = `${req.params.id} and ${req.body.userId} not the same`;
        return res.status(400).json({message : msg});
    }

    const toUpdate = {};
    const updateableFields = [`messageList`,`conversationFinished`];
    updateableFields.forEach(field => {
        toUpdate[field] = req.body[field];
    });

    Conversations
    .findByIdAndUpdate(req.params.id, {$set : toUpdate})
    .then(() => res.status(204).end())
    .catch(error => {
        return res.status(400).send(error);
    });
});

// DELETE  Will we delete these conversations permanently?  Will we have them removed after several days/hours to save space?
// Perhaps won't be concerned with deletion specifics until another iteration.
router.delete(`/:id`, convoAuth, (req, res) => {
    Conversations.findByIdAndRemove(req.params.id)
    .then(() => res.status(204).end())
    .catch(error => {
        res.status(400).send(error.message);
    });
});

router.use('*', function (req, res) {
    res.status(404).json({ message: 'Routing Not Found.' });
});

// Helper functions
function checkPostRequestForErrors(req) {
    // Checks fields to make sure standards are met.  Including: having required fields, certain fields are strings, userEmail and userPassword
    // are explicitly trimmed,  password adhere to character length requirements, and userEmail is unique in database.
    // Returns the array errorMessage, which populates only if errors occur.
    let errorMessage = [];
    const requiredFields = [`channelURL`, `conversationId`, `hostUserId`,`guestUserId`];

    requiredFields.forEach(field => {
        if (!(field in req.body)) {
            errorMessage.push({
                message : `The field ${field} is missing from the request.` ,
                field : field
            });
        }
    });

    checkNotDuplicate = new Promise((response, reject) => {
        Conversations
        .find({conversationId : req.body.conversationId})
        .countDocuments()
        .then(count => {
            if (count > 0) {
                errorMessage.push({
                    message : `This conversation has already been created!` ,
                });
            }
            console.log(`errorMessage Users.Conversations for duplicates=`, errorMessage);
            response();
        })
        .catch(() => {
            reject(`Server currently down. Please try again later.`);
        });   
    });

    return checkNotDuplicate
    .then(() => {
        console.log(`checkPostRequestforErrors. made into the then statement. errorMessage=`, errorMessage);
        return errorMessage;
    })
    .catch(() => {
        console.log(`checkPostRequestforErrors. made into the catch statement. errorMessage=`, errorMessage);
        errorMessage.push({
            message : `Server currently down. Please try again later.` ,
            field : null
        });
        return errorMessage;
    });
}

//Export
module.exports = {router};
