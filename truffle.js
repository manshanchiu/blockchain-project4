var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "ritual later flee cattle apology frozen guitar indoor arm twice welcome tomato";

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