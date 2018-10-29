
 const chai = require('chai');
 const chaiHttp = require('chai-http');

 const {TEST_DATABASE_URL} = require(`../config`);
 const {app, runServer, closeServer} = require(`../server`);
 
 const expect = chai.expect;
 chai.use(chaiHttp);

 describe('API functional', function() {
    before(function() {
      return runServer(TEST_DATABASE_URL);
    });
    after(function() {
        return closeServer();
    });
   it('should 200 on GET requests', function() {
     return chai.request(app)
       .get('/api/availableConversations/')
       .then(function(res) {
        expect(res).to.have.status(200);
       });
   });
 });