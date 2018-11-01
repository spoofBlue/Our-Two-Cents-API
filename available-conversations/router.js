
const express = require(`express`);
const bodyParser = require(`body-parser`);

const {AvailableConversations} = require(`./model`);

// Further package accessibility
const router = express.Router();
const jsonParser = bodyParser.json();

// Routing

// GET all available conversations. Getting their relevant data.
router.get(`/`, (req, res) => {
    // Can potentially place a filter in here. (Filter by topicName)
    AvailableConversations
        .find({status : "available"})
        .then(availableConversations => {
            res.status(200).json(availableConversations.map(availConvo => availConvo.serialize()));  
        })
        .catch(err => {
            return res.status(500).json({message :`Internal Server Error`});
        });
});

// User gets information on this specific availableConversation.  Don't have a purpose for this, yet.
router.get(`/:id`, (req, res) => {
    AvailableConversations
        .findById(req.params.id)
        .then(availableConversation => {
            res.status(200).json(availableConversation.serialize());  
        })
        .catch(err => {
            return res.status(500).json({message :`Internal Server Error`});
        });
});

// POST. When person initially creates a conversation. Has relevant info on it.
router.post(`/`, jsonParser, (req, res) => {
    console.log(`conversation post request. req.body=`,req.body);
    AvailableConversations
    .create({
        hostUserId : req.body.hostUserId,
        hostUsername : req.body.hostUsername,
        hostViewpoint : req.body.hostViewpoint,
        topicId : req.body.topicId,
        topicName : req.body.topicName
    })
    .then(availConvo => res.status(201).json(availConvo.serialize()))
    .catch(error => {
        console.log('error.message=', error.message);
        const message = `Failed to create the conversation at this time.`;
        return res.status(400).send(message);
    });
});

// PUT or DELETE.  When the host cancels their previously made conversation.  status changed to 'cancelled'
// When the guest chooses the conversation, status changed to joined.
// Alternatively, we could delete this availableConversation entirely and show no trace of it's existance.
// Regardless, this must be reflected to others who attempt to GET the specific availableConversation. status = !'available' or no existing can turn them away.

router.put(`/:id`, jsonParser, (req, res) => {
    if (!(req.params.id && req.body.conversationId && req.params.id === req.body.conversationId)) {
        const msg = `${req.params.id} and ${req.body.conversationId} not the same.`;
        return res.status(400).json({message : msg});
    }

    const toUpdate = {};
    if (req.body.status) {
        toUpdate.status = req.body.status
    }

    AvailableConversations
    .findById(req.params.id)
    .then(availConvo => {
        if (availConvo.status !== 'available') {
            return res.status(200).send({status : 'unavailable'});
        } else if (availConvo.status === 'available') {
            AvailableConversations
            .findByIdAndUpdate(req.params.id, {$set : toUpdate}, {new : true})
            .then(convo => {
                if (req.body.status === 'joined') {
                    res.status(200).json(convo.serialize());
                }
                res.status(200).send({status : availConvo.status});
            })
            .catch(err => {
                console.log(err.message);
                const message = `The conversation is no longer available.`;
                return res.status(400).send(message);
            });
        }
    })
    .catch(error => {
        return res.status(400).send(error);
    });
});

// I don't have a purpose for this one yet.
router.delete(`/:id`, (req, res) => {
    AvailableConversations.findByIdAndRemove(req.params.id)
    .then(() => res.status(204).end())
    .catch(error => {
        res.status(400).send(error.message);
    });
});

router.use('*', function(req, res) {
    res.status(404).json({ message: 'Routing Not Found.' });
});

//Export
module.exports = {router};