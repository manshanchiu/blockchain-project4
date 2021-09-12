import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const ORACLE_FEE = Web3.utils.toWei("1", "ether");
const TEST_ORACLES_COUNT = 20;
const memoryOracles = [];
const GAS = 3000000;

web3.eth.getAccounts().then((accounts) => {
  // register 20 oracles
  for (let i = 0; i < TEST_ORACLES_COUNT; i++) {
    let oracle = accounts[30 + i];
    flightSuretyApp.methods
      .registerOracle()
      .send(
        { from: oracle, value: ORACLE_FEE, gas: GAS},
        (error, response) => {
          if (error) {
            console.log(error);
          } else {
            console.log("Added oracle #" + (i + 1), " ", oracle);
            memoryOracles.push({ oracle });

            flightSuretyApp.methods
              .getMyIndexes()
              .call({ from: oracle, gas: GAS}, (error, response) => {
                memoryOracles[i].indices = response;
              });
          }
        }
      );
  }
});


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event)
    const oracleIndex = event.returnValues[0];
    const airline = event.returnValues[1];
    const flightCode = event.returnValues[2];
    const timestamp = event.returnValues[3];

    let statusCode = Math.floor(Math.random() * 6) * 10;
    let responsed = 0;
    memoryOracles.forEach((oracle, i) => {
      if (oracle.indices.includes(oracleIndex)) {
        flightSuretyApp.methods
            .submitOracleResponse(
              oracleIndex,
              airline,
              flightCode,
              timestamp,
              statusCode
            )
            .send({ from: oracle.oracle,gas: GAS }, (error, response) => {
              if (error) {
                console.log(error.message);
              }
            });
          responsed++;
      }
      if (responsed >=3){
        return;
      }
    })
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


