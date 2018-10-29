
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
            return res.status(500).json({message :`Internal Server Error`});
        });
}

const convoFinished = (req, res, next) => {
    Conversations
        .findById(req.params.id)
        .then(conversation => {
            // Verifies the conversation is still ongoing.  Even if it isn't, still let the user have this updated information.
            if (conversation.conversationFinished) {
                const msg = `Someone has left this conversation.`;
                return res.status(200).json(conversation.serialize());  // which includes (conversationFinished = true) info.
            } else {
                next();
            }
        })
        .catch(err => {
            return res.status(500).json({message :`Internal Server Error`});
        });
}

router.use(`/:id`, convoAuth, convoFinished);

// User get initial convoData this way. Also checks in here for updates in messageList.
router.get(`/:id`, (req, res) => {
    Conversations
        .findById(req.params.id)
        .then(conversation => {
            res.status(200).json(conversation.serialize());  
        })
        .catch(err => {
            return res.status(500).json({message :`Internal Server Error`});
        });
});

// POST This occurs when the two people connect for a conversation for the first time.  The person who joins the conversation technically
// posts the conversation.

router.post(`/`, jsonParser, (req, res) => {
    checkPostRequestForErrors(req)
    .then((errorMessage) => {
        console.log(`errorMessage in post request block=`, errorMessage);
        if (errorMessage.length > 0) {
            return res.status(422).json(errorMessage);
        }
        Conversations
        .create({
            /// !!!! Fill me in !!!! continue fixing from here.  Don't forget to bring in checkPostRequestForErrors (like user/router)
        })
    })
    .then(user => res.status(201).json(user.serialize()))
    .catch(error => {
        console.log('error.message=', error.message);
        const message = `Failed to start the conversation at this time.`;
        return res.status(400).send(message);
    });
});

// UPDATE  Whenver a user posts a new message, or a user leaves the conversation, will they update this conversation.

// DELETE  Will we delete these conversations permanently?  Will we have them removed after several days/hours to save space?
// Perhaps won't be concerned with deletion specifics until another iteration.

router.use('*', function (req, res) {
    res.status(404).json({ message: 'Routing Not Found.' });
});

//Export
module.exports = {router};
