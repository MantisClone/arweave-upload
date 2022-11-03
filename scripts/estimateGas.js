const ethers = require('ethers');
const { tokens } = require('../app/controllers/tokens.js');

/**
Print gas estimates for uploading a file to Arweave
Export PRIVATE_KEY before running
 */
async function estimateGas(providerUrl, tokenAddress, bundlrAddress) {

    const userAddress = '0x519145B771a6e450461af89980e5C17Ff6Fd8A92';
    const priceWei = ethers.BigNumber.from(634380980125554);

    // Create provider
    const provider = ethers.getDefaultProvider(providerUrl);
    console.log(`network = ${JSON.stringify(await provider.getNetwork())}`);

    // Create server wallet
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`server wallet address = ${wallet.address}`);
    console.log(`user wallet address = ${userAddress}`);

    // Create payment token contract handle
    const abi = [
        'function transferFrom(address from, address to, uint256 value) external returns (bool)',
        'function deposit(uint256 value) external',
        'function withdraw(uint256 value) external',
        'function transfer(address to, uint256 value) external returns (bool)'
    ];
    const token = new ethers.Contract(tokenAddress, abi, wallet);
    console.log(`payment token address = ${token.address}`);

    // Estimate gas costs for full upload process
    let transferFromEstimate;
    try {
        transferFromEstimate = await token.estimateGas.transferFrom(userAddress, wallet.address, priceWei);
    }
    catch(err) {
        console.log(`Error occurred while estimating transferFrom gas cost. ${err.name}: ${err.message}`);
        return;
    }
    console.log(`transferFromEstimate = ${transferFromEstimate}`);


    let unwrapEstimate;
    try {
        unwrapEstimate = await token.estimateGas.withdraw(priceWei);
    }
    catch(err) {
        console.log(`Error occurred while estimating withdraw gas cost. ${err.name}: ${err.message}`);
        return;
    }
    console.log(`unwrapEstimate = ${unwrapEstimate}`);

    let sendEthEstimate
    try {
        sendEthEstimate = await wallet.estimateGas({to: bundlrAddress, value: priceWei}); // Assume price not dependent on "to" address
    }
    catch(err) {
        console.log(`Error occurred while estimating send ETH gas cost. ${err.name}: ${err.message}`);
        return;
    }
    console.log(`sendEthEstimate = ${sendEthEstimate}`);

    let wrapEstimate;
    try {
        wrapEstimate = await token.estimateGas.deposit(priceWei); // Assume price not dependent on amount
    }
    catch(err) {
        console.log(`Error occurred while estimating deposit gas cost. ${err.name}: ${err.message}`);
        return;
    }
    console.log(`wrapEstimate = ${wrapEstimate}`);

    let transferEstimate;
    try {
        transferEstimate = await token.estimateGas.transfer(userAddress, priceWei); // Assume price not dependent on amount
    }
    catch(err) {
        console.log(`Error occurred while estimating transfer gas cost. ${err.name}: ${err.message}`);
        return;
    }
    console.log(`transferEstimate = ${transferEstimate}`);

    let gasEstimate = transferFromEstimate.add(sendEthEstimate).add(transferEstimate).add(unwrapEstimate).add(wrapEstimate);
    console.log(`gasEstimate = ${gasEstimate}`);

}

(async() => {
    tokens.forEach(async (token) => {
        if([80001, 5].includes(token.chainId)) {
            await estimateGas(
                token.providerUrl,
                token.wrappedAddress,
                '0x853758425e953739F5438fd6fd0Efe04A477b039'
            );
        }
    })
})();
