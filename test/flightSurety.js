
var Test = require('../config/testConfig.js');
var web3 = require("web3");

const Web3 = new web3("http://127.0.0.1:8545/");

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let airline = await config.flightSuretyData.getAirline.call(newAirline); 

    // ASSERT
    assert.equal(airline.inited, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it("(airline) can register an airline using registerAirline() if it is funded", async () => {
    await config.flightSuretyApp.submitAirlineFunds({
      from: config.firstAirline,
      value: web3.utils.toWei("10", "wei"),
      nonce: await Web3.eth.getTransactionCount(config.firstAirline),
    });

    let newAirline = accounts[2];

    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let airline = await config.flightSuretyData.getAirline.call(newAirline); 
    assert.equal(airline.inited, true, "Airline should be able to register another airline if it has provided funding");
  });

  it("(airline) registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines", async () => {
    await config.flightSuretyApp.submitAirlineFunds({
        from: config.firstAirline,
        value: web3.utils.toWei("10", "wei"),
    });
    await config.flightSuretyApp.registerAirline(
        accounts[2],
        {
          from: config.firstAirline,
        }
    );
    await config.flightSuretyApp.registerAirline(
        accounts[3],
        {
            from: config.firstAirline,
        }
    );
    await config.flightSuretyApp.registerAirline(
        accounts[4],
        {
            from: config.firstAirline,
        }
    );
    await config.flightSuretyApp.registerAirline(
      accounts[5],
      {
        from: config.firstAirline,
      }
    );
    const fifthAirline = await config.flightSuretyData.getAirline.call(
      accounts[5]
    );

    assert.equal(
      fifthAirline.isRegistered,
      false,
      "The 5th airline registered should require multi-party consensus"
    );

    // Fund and vote
    await config.flightSuretyApp.submitAirlineFunds({
        from: accounts[2],
        value: web3.utils.toWei("10", "wei"),
        nonce: await Web3.eth.getTransactionCount(accounts[2]),
    });
    await config.flightSuretyApp.registerAirline(accounts[5], {
        from: accounts[2]
    });
    await config.flightSuretyApp.submitAirlineFunds({
        from: accounts[3],
        value: web3.utils.toWei("10", "wei"),
        nonce: await Web3.eth.getTransactionCount(accounts[3]),
    });
    await config.flightSuretyApp.registerAirline(accounts[5], {
        from: accounts[3]
    });

    const fifthAirlineOnceVoted = await config.flightSuretyData.getAirline.call(
      accounts[5]
    );

    assert.equal(
      fifthAirlineOnceVoted.isRegistered,
      true,
      "The 5th airline registered should require multi-party consensus"
    );
  });
});
