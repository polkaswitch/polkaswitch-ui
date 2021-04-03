
window.WalletJS = {
  initialize: function() {
    window.ethereum.on('accountsChanged', function (accounts) {
      // Time to reload your interface with accounts[0]!
    });

    window.ethereum.on('disconnect', function(providerRpcError) {
    });
  },

  _mint: async function(value) {
    var abi = await fetch('/abi/METH.abi');
    window.abiMeth = await abi.json();
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const methAddress = "0x62a545BE35AEA3dc50D2d45cfA90657Ef3EBcFE8";

    const incrementer = new window.ethers.Contract(methAddress, abiMeth, signer);
    const contractFn = async () => {
      console.log(
        `Calling the mint function in contract at address: ${methAddress}`
      );

      // Sign-Send Tx and Wait for Receipt
      const createReceipt = await incrementer.mint(window.ethereum.selectedAddress, value);
      await createReceipt.wait();

      console.log(`Tx successful with hash: ${createReceipt.hash}`);
    };

    const approveFn = async () => {
      console.log(
        `Calling the approve function in contract at address: ${methAddress}`
      );

      // Sign-Send Tx and Wait for Receipt
      const createReceipt = await incrementer.approve(window.ethereum.selectedAddress, value);
      await createReceipt.wait();

      console.log(`Tx successful with hash: ${createReceipt.hash}`);
    }

    await contractFn();
    // await approveFn();
  },

  isSupported: function() {
    return (typeof window.ethereum !== 'undefined');
  },

  isConnected: function() {
    return window.ethereum && window.ethereum.selectedAddress;
  },

  currentAddress: function() {
    return this.isConnected() ? window.ethereum.selectedAddress : undefined;
  },

  connectWallet: function() {
    return new Promise(function (resolve, reject) {
      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(function(accounts) {
          // Metamask currently only ever provide a single account
          const account = accounts[0];
          console.log('Ethereum Account: ', account);
          resolve(account);
        })
        .catch(function(e) {
          console.error(e);
          reject(e);
        });
    });
  }
};

module.exports = window.WalletJS;
