var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "wasp twice young staff penalty canvas cabbage cave replace bird stadium wheat";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: '*',
      // gas: 9999999999,
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};