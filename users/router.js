
const express = require(`express`);
const bodyParser = require(`body-parser`);
const passport = require(`passport`);

const {Users} = require(`./model`);
const {localStrategy, jwtStrategy} = require(`../auth`);

//Passport Strategies
passport.use(localStrategy);
passport.use(jwtStrategy);

// Further package accessibility
const router = express.Router();
const jsonParser = bodyParser.json();
const jwtAuth = passport.authenticate('jwt', { session: false });


// Routing
router.get(`/`, jwtAuth, (req, res) => {
    const filters = {};
    const queryableFields = [`userEmail`];  // May apply other filters, so making an array.
    queryableFields.forEach(field => {
        if (req.query[field]) {
            filters[field] = req.query[field];
        }
    });
    Users
        .find(filters)
        .then(users => {
            res.status(200).json(users.map(user => user.serialize()));
        })
        .catch(err => {
            return res.status(500).json({message :`Internal Server Error`});
        });
});

router.get(`/:id`, jwtAuth, (req, res) => {
    Users
        .findById(req.params.id)
        .then(user => {
            res.status(200).json(user.serialize());  
        })
        .catch(err => {
            return res.status(500).json({message :`Internal Server Error`});
        });
});

router.post(`/`, jsonParser, (req, res) => {
    checkPostRequestForErrors(req)
    .then((errorMessage) => {
        console.log(`errorMessage in post request block=`, errorMessage);
        if (errorMessage.length > 0) {
            return res.status(422).json(errorMessage);
        }
        return Users.hashPassword(req.body.userPassword);
    })
    .then(hashedPassword => {
        Users
        .create({
            userPassword : hashedPassword ,
            username : req.body.username ,
            userFullName : req.body.userFullName ,
            userLastName : req.body.userLastName ,
            userEmail : req.body.userEmail
        })
        .then(user => res.status(201).json(user.serialize()))
        .catch(err => {
            console.log('err=', err.message);
            const message = `Failed to create user.`;
            return res.status(400).send(message);
        });
    })
    .catch(function(error) {
        console.log('error.message=', error.message);
        const message = `Failed to hash password before creating user.`;
        return res.status(400).send(message);
    });
});

router.put(`/:id`, jwtAuth, jsonParser, (req, res) => {
    if (!(req.params.id && req.body.userId && req.params.id === req.body.userId)) {
        const msg = `${req.params.id} and ${req.body.userId} not the same`;
        return res.status(400).json({message : msg});
    }

    const errorMessage = checkPutRequestForErrors(req);
    if (errorMessage.length > 0) {
        return res.status(422).json(errorMessage);
    }

    const toUpdate = {};
    const updateableFields = [`userPassword`,`username`,`userFullName`,`userEmail`];
    updateableFields.forEach(field => {
        if (field in req.body) {
            if (field === "userPassword") {
                return Users.hashPassword(req.body.userPassword)
                .then(hashedPassword => {
                    toUpdate[field] = hashedPassword;
                })
                .catch(function(error) {
                    return res.status(400).send(error);
                });
            } else {
                toUpdate[field] = req.body[field];
            }
        }
    });

    Users
    .findByIdAndUpdate(req.params.id, {$set : toUpdate})
    .then(() => res.status(204).end())
    .catch(error => {
        return res.status(400).send(error);
    });
});

router.delete(`/:id`, jwtAuth, (req, res) => {
    Users.findByIdAndRemove(req.params.id)
    .then(() => res.status(204).end())
    .catch(error => {
        res.status(400).send(error.message);
    });
});

// Helper functions
function checkPostRequestForErrors(req) {
    // Checks fields to make sure standards are met.  Including: having required fields, certain fields are strings, userEmail and userPassword
    // are explicitly trimmed,  password adhere to character length requirements, and userEmail is unique in database.
    // Returns the array errorMessage, which populates only if errors occur.
    const requiredFields = ['username', `userPassword`, `userFullName`, `userEmail`];
    const stringFields = ['username', 'userPassword', `userFullName`, `userEmail`];
    const explicitlyTrimmedFields = ['userEmail', 'userPassword'];
    const sizedFields = {
        userPassword: { min: 10, max: 72 }
        // bcrypt truncates after 72 characters, so let's not give the illusion of security by storing extra (unused) info.
    }; 

    let errorMessage = [];

    requiredFields.forEach(field => {
        if (!(field in req.body)) {
            errorMessage.push({
                message : `The field ${field} is missing from the request.` ,
                field : field
            });
        }
    });

    stringFields.forEach(field => {
        if ((field in req.body) && typeof req.body[field] !== 'string') {
            errorMessage.push({
                message : `The field ${field} is not a string.` ,
                field : field
            });
        }
    });

    explicitlyTrimmedFields.forEach(field => {
        if ((field in req.body) && req.body[field].trim() !== req.body[field]) {
            errorMessage.push({
                message : `The field ${field} cannot not start or end with whitespace.` ,
                field : field
            });
        }
    });

    Object.keys(sizedFields).forEach(field => {
        if ('min' in sizedFields[field] && req.body[field] && req.body[field].trim().length < sizedFields[field].min) {
            errorMessage.push({
                message : `The field ${field} must be more than ${sizedFields[field].min} characters.` ,
                field : field
            });
        }
    });
    Object.keys(sizedFields).forEach(field => {
        if ('max' in sizedFields[field] && req.body[field] && req.body[field].trim().length > sizedFields[field].max) {
            errorMessage.push({
                message : `The field ${field} must be less than ${sizedFields[field].max} characters.` ,
                field : field
            });
        }
    });

    const checkNotDuplicate = new Promise((response, reject) => {
        Users
        .find({username : req.body.username})
        .countDocuments()
        .then(count => {
            if (count > 0) {
                errorMessage.push({
                    //message : `That email already has an account associated with it. You can log through this email!` ,
                    message : `That username is already taken. The username must be unique.`,
                    field : `userEmail`
                });
            }
            console.log(`errorMessage Users.find for duplicates=`, errorMessage);
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

function checkPutRequestForErrors(req) {
    // Checks fields to make sure standards are met.  Including: certain fields are strings, username and password
    // are explicitly trimmed, username and password adhere to character length requirements, and username is unique in database.
    // Returns the array errorMessage, which populates only if errors occur.
    const stringFields = ['username', 'userPassword', `userFullName`, 'userEmail'];
    const explicitlyTrimmedFields = ['username', 'userPassword', 'userEmail'];
    const sizedFields = {
        username: { min: 3 },
        userPassword: { min: 10, max: 72 }
          // bcrypt truncates after 72 characters, so let's not give the illusion of security by storing extra (unused) info.
      };

    let errorMessage = [];

    stringFields.forEach(field => {
        if ((field in req.body) && typeof req.body[field] !== 'string') {
            errorMessage.push(`The field ${field} is not a string.`);
        }
    });

    explicitlyTrimmedFields.forEach(field => {
        if ((field in req.body) && req.body[field].trim() !== req.body[field]) {
            errorMessage.push(`The field ${field} cannot not start or end with whitespace.`);
        }
    });

    Object.keys(sizedFields).forEach(field => {
        if ('min' in sizedFields[field] && req.body[field] && req.body[field].trim().length < sizedFields[field].min) {
            errorMessage.push(`The field ${field} must be more than ${sizedFields[field].min} characters.`);
        }
    });
    Object.keys(sizedFields).forEach(field => {
        if ('max' in sizedFields[field] && req.body[field] && req.body[field].trim().length > sizedFields[field].max) {
            errorMessage.push(`The field ${field} must be less than ${sizedFields[field].max} characters.`);
        }
    });

    const checkNotDuplicate = new Promise((response, reject) => {
        Users
        .find({username : req.body.username})
        .countDocuments()
        .then(count => {
            if (count > 0) {
                errorMessage.push({
                    //message : `That email already has an account associated with it. You can log through this email!` ,
                    message : `That username is already taken. The username must be unique.`,
                    field : `userEmail`
                });
            }
            console.log(`errorMessage Users.find for duplicates=`, errorMessage);
            response();
        })
        .catch(() => {
            reject(`Database currently down. Please try again later.`);
        });   
    });

    return checkNotDuplicate
    .then(() => {
        console.log(`checkPostRequestforErrors. made into the then statement. errorMessage=`, errorMessage);
        return errorMessage;  // This array may still be empty at this point.
    })
    .catch(() => {
        console.log(`checkPostRequestforErrors. made into the catch statement. errorMessage=`, errorMessage);
        errorMessage.push({
            message : `Database currently down. Please try again later.` ,
            field : null
        });
        return errorMessage;
    });
}

router.use('*', function (req, res) {
    res.status(404).json({ message: 'Routing Not Found.' });
});

//Export
module.exports = {router};