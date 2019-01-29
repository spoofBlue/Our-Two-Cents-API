 
console.log(`Hello server.js`);

// Dependencies
require('dotenv').config();

const express = require('express');
const morgan = require(`morgan`);
const mongoose = require(`mongoose`);
const passport = require(`passport`);
const cors = require('cors');

const { router : userRouter} = require(`./users`);
const { router : authRouter, localStrategy, jwtStrategy } = require('./auth');
const { router : conversationRouter} = require('./conversations');
const { router : availableConvoRouter} = require('./available-conversations');
const { DATABASE_URL, PORT, CLIENT_ORIGIN } = require(`./config.js`);

// Setup Dependencies
const app = express();

mongoose.Promise = global.Promise;

// Misc Middleware
app.use(morgan(`dev`));

app.use(express.json());

// CORS
app.use(
    cors({
        origin: CLIENT_ORIGIN
    })
);

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
    if (req.method === 'OPTIONS') {
      return res.send(204);
    }
    next();
});

//Passport Strategies
passport.use(localStrategy);
passport.use(jwtStrategy);

// Routing
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/availableConversations', availableConvoRouter);

const jwtAuth = passport.authenticate('jwt', { session: false });

// A protected endpoint which needs a valid JWT to access it
app.get('/validate', jwtAuth, (req, res) => {
    return res.json({
        data: 'Access Confirmed.'
    });
});

// Open/Close Server
let server;

function runServer(database_url, port=PORT) {  //database and port connection through config.js
    return new Promise((resolve, reject) => {
        mongoose.connect(database_url, function(error) {
            if (error) {
                console.log(`Mongoose failed to connect.`);
                return(reject(error));
            }
            server = app.listen(port, () => {
                console.log(`Your app is listening on port ${port}`);
                resolve();
            })
            .on('error', err => {
                mongoose.disconnect();
                console.log("Error in runServer, failed to listen at server.");
                reject(err);
            });
        });
    });
}

function closeServer() {
    return mongoose.disconnect()
    .then(() => {
        return new Promise((resolve, reject) => {
            console.log(`closing server`);
            server.close(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

if (require.main === module) {
    runServer(DATABASE_URL).catch(function(err) {
        console.error(err);
    });
};

// Export App
module.exports = {app, runServer, closeServer};

 // Note, our database name is:
 // our-two-cents--users
