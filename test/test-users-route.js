
`use strict`;

const chai = require(`chai`);
const chaiHttp = require(`chai-http`);
const mongoose = require(`mongoose`);
const faker = require(`faker`);
const jwt = require('jsonwebtoken');

const {app, runServer, closeServer} = require(`../server`);
const {Users} = require(`../users`);
const {JWT_SECRET, TEST_DATABASE_URL} = require(`../config`);

chai.use(chaiHttp);
const expect = chai.expect;

let JWT_KEY;

function seedUserData() {
    console.info('Seeding user data.');
    const seedUserData = [];
    const userList = [];

    for (let i=0; i<2; i++) {
        const promise = new Promise(function(resolve, reject) {
            const unhashed = "hellohello";
        
            return Users.hashPassword(unhashed)
            .then(function(password) {
            return userList.push(generateUser(password));
            })
            .then(function() {
                resolve();
            })
            .catch(function(error) {
                reject(error);
            });
        });
        seedUserData.push(promise);
    }

    return Promise.all(seedUserData)
    .then(function() {
        return Users.insertMany(userList);
    })
    .catch(function(error) {
        return error;
    })
}

function generateUser(password) {
    const sampleUser = {
        userPassword : password ,
        userFirstName : generateString() ,
        userLastName : generateString() ,
        userEmail : generateFakerName()
    }
    return sampleUser;
}

function generateString() {
    const strings = ["WordsOfInfo", "TextOrName", "StreetOrInfo", "ThingsInAString", "LettersGenerated"];
    return strings[Math.floor(Math.random() * strings.length)];
}

function generateFakerName() {
    const name = faker.name.findName()
    return `${name}@email.com`;
}

function tearSeedDb() {
    console.warn(`Dropping database.`);
    return mongoose.connection.dropDatabase();
}

function getAuthenticationJWT(username, password) {
    // Pass in credenitials seeded into the database. Retrieves a JWT token and returns it.
    // note: renaming userEmail to username for jwt.sign's strict terms.
    return chai.request(app)
    .post('/api/auth/login')
    .send({ username : username, password : password})
    .then(res => {
        JWT_KEY = res.body.authToken;
    })
    .catch(function(error) {
        return error;
    });
}

describe(`User Integration Testing`, function() {
    const password = "hellohello";
    
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });
    beforeEach(function() {
        return seedUserData()
        .then(function() {
            return Users.findOne();
        })
        .then(function(user) {
            userEmail = user.userEmail;
            return getAuthenticationJWT(userEmail, password);
        })
        .catch(function(error) {
            throw error;
        });
    });
    afterEach(function() {
        return tearSeedDb();
    });
    after(function() {
        return closeServer();
    });

    describe(`User GET requests`, function() {
        it('should return all existing users', function() {
            let res;
            return chai.request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${JWT_KEY}`)
            .then(function(_res) {
                res = _res;
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an(`array`);
                expect(res.body).to.have.lengthOf.at.least(1);
                return Users.countDocuments();
            })
            .then(function(count) {
                expect(res.body).to.have.lengthOf(count);
            })
            .catch(function(err) {
                throw err;
            });
        });

        it(`should show a user has all the correct Keys in it`, function() {
            let resUser;
            const userKeys = [`username`,`userId`,`userFirstName`,`userLastName`,`userEmail`];
            return chai.request(app)
                .get(`/api/users`)
                .set('Authorization', `Bearer ${JWT_KEY}`)
                .then(function(_res) {
                    resUser = _res.body[0];

                    expect(resUser).to.have.keys(userKeys);
                    return Users.findById(resUser.userId);
                })
                .then(function(chosenUser) {
                    userKeys.forEach(function(key) {
                        if (key !== "userId") {
                            expect(resUser[key]).to.equal(chosenUser[key]);
                        }
                    });
                    expect(chosenUser).to.have.property(`userPassword`);
                })
                .catch(function(error) {
                    throw error;
                });
        });

        it(`should return the user through the GET request specifying a particular id `, function() {
            const userKeys = [`userId`,`userFirstName`,`userLastName`,`userEmail`];

            let resUser;
            return Users.findOne()
            .then(function(user) {
                return chai.request(app)
                .get(`/api/users/${user._id}`)
                .set('Authorization', `Bearer ${JWT_KEY}`)
                .then(function(_res) {
                    resUser = _res.body;
                    userKeys.forEach(function(key) {
                        if (key !== "userId") {
                            expect(resUser[key]).to.equal(user[key]);
                        }
                    });
                    return Users.findById(resUser.userId);
                })
                .then(function(chosenUser) {
                    expect(chosenUser._id.toString()).to.equal(resUser.userId);
                });
            })
            .catch(function(error) {
                throw error;
            });
        });
    });

    describe(`User POST requests`, function() {
        it(`should post a new user into the database with all required keys (with correct values).`, function() {
            let newUser = generateUser("hellohello");
            const userKeys = [`username`,`userId`,`userFirstName`,`userLastName`,`userEmail`];
            let resUser;
            return chai.request(app)
            .post(`/api/users`)
            .send(newUser)
            .then(function(_res) {
                resUser = _res;
                expect(resUser).to.have.status(201);
                expect(resUser).to.be.json;
                expect(resUser.body).to.be.a('object');
                expect(resUser.body).to.have.keys(userKeys);
                return Users.find({userId : resUser.body.usersId});
            })
            .then(function(dbUser) {
                userKeys.forEach(function(key) {
                    if (key !== "userId") {
                        expect(resUser[key]).to.equal(dbUser[key]);
                    }
                });
            })
            .catch(function(error) {
                throw error;
            });
        });

        it(`should not post a request that is missing certain keys in req.body`, function() {
            const badUser = {
                userEmail : "ralph@oh.com" ,
                userPassword : "gingersnaps"
            }
            
            return chai.request(app)
            .post(`/api/users`)
            .set('Authorization', `Bearer ${JWT_KEY}`, "content-type", "application/json")
            .send(badUser)
            .then(function(_res) {
                expect(_res).to.have.status(422);
            })
            .catch(function(error) {
                expect(error).to.have.status(422);
            });
        });
    });

    describe(`user PUT requests`, function() {
        it(`should make a PUT request and replace the intended information.`, function() {
            let updateInfo = {
                userId : "person" ,
                userFirstName : "Hill" ,
                userEmail : "newEmail@d.com" ,
                userDescription : "Hello, I have diner take all my food!"
            };
            // Note updating all the fields except userPassword, userLastName.
            const userKeys = [`userPassword`,`userFirstName`,`userEmail`];

            let chosenUser;
            return Users.findOne()
            .then(function(user) {
                chosenUser = user;
                updateInfo["userId"] = chosenUser._id;
                return chai.request(app)
                .put(`/api/users/${chosenUser._id}`)
                .set('Authorization', `Bearer ${JWT_KEY}`, "content-type", "application/json")
                .send(updateInfo)
                .then(function(_res) {
                    expect(_res).to.have.status(204);
                    return Users.findById(chosenUser._id);
                })
                .then(function(dbUser) {
                    userKeys.forEach(function(key) {
                        if (updateInfo[key]) {
                            expect(dbUser[key]).to.equal(updateInfo[key]);
                        }
                    });
                })
                .catch(function(error) {
                    throw error;
                });
            })
            .catch(function(error) {
                throw error;
            });
        });

        it(`should fail to update a user because the id in the user's info is invalid`, function() {
            const badId = "1";
            let updateInfo = {
                userFirstName : "Hill" ,
                userEmail : "newEmail@d.com" ,
            };

            let chosenUser;
            Users.findOne()
            .then(function(user) {
                chosenUser = user;
                updateInfo["userId"] = badId;
                return chai.request(app)
                .put(`/api/users/${chosenUser._id}`)
                .set('Authorization', `Bearer ${JWT_KEY}`, "content-type", "application/json")
                .send(updateInfo)
                .then(function(_res) {
                    expect(_res).to.have.status(400);
                    expect(_res).to.have.property("message");
                })
                .catch(function(error) {
                    expect(error.name).to.equal(`AssertionError`);
                });
            })
            .catch(function(error) {
                throw error;
            });
        });
    });
    

    describe(`user DELETE requests`, function() {

        it(`should delete a user of the database`, function() {
            let chosenUser;

            getAuthenticationJWT()
            .then(function(res) {
                return Users.findOne();
            })
            .then(function(user) {
                chosenUser = user;
                return chai.request(app)
                .delete(`/api/users/${chosenUser._id}`)
                .set('Authorization', `Bearer ${JWT_KEY}`)
                .then(function(_res) {
                    expect(_res).to.have.status(204);
                    return Users.findById(chosenUser._id);
                })
                .then(function(result) {
                    expect(result).to.be.null;
                })
                .catch(function(err) {
                    throw err;
                });
            })
            .catch(function(err) {
                throw err;
            });
        });

        it(`should fail to delete a user, as the id given in routing is not valid. Other users still exist.`, function() {
            const badId = "1";
            let chosenUser;

            return Users.findOne()
            .then(function(user) {
                chosenUser = user;
                return chai.request(app)
                .delete(`/api/users/${badId}`)
                .set('Authorization', `Bearer ${JWT_KEY}`)
                .then(function(_res) {
                    expect(_res).to.have.status(400);
                    return Users.findOne(chosenUser)
                })
                .then(function(result) {
                    expect(result).to.be.an(`object`);
                    expect(result).to.be.not.empty;
                })
                .catch(function(expectedError) {
                    expect(expectedError).to.have.status(400);
                });
            })
            .catch(function(error) {
                throw error;
            });
        });
    });
});