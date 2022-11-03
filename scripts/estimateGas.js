const ethers = require('ethers');
const { tokens } = require('../app/controllers/tokens.js');

/**
Print gas estimates for uploading a file to Arweave
Export PRIVATE_KEY and TEST_PRIVATE_KEY before running
 */
async function estimateGas(providerUrl, tokenAddress, bundlrAddress) {

    const priceWei = ethers.BigNumber.from(634380980125554);

    // Create provider
    const provider = ethers.getDefaultProvider(providerUrl);
    console.log(`network = ${JSON.stringify(await provider.getNetwork())}`);

    // Create server wallet
    const serverWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`server wallet address = ${serverWallet.address}`);

    // Create user wallet
    const userWallet = new ethers.Wallet(process.env.TEST_PRIVATE_KEY, provider);
    console.log(`user wallet address = ${userWallet.address}`);

    // Create payment token contract handle
    const abi = [
        'function transferFrom(address from, address to, uint256 value) external returns (bool)',
        'function approve(address, uint256) external returns (bool)',
        'function balanceOf(address owner) external view returns (uint256)',
        'function deposit(uint256 value) external',
        'function withdraw(uint256 value) external',
        'function transfer(address to, uint256 value) external returns (bool)'
    ];
    const token = new ethers.Contract(tokenAddress, abi, serverWallet);
    console.log(`payment token address = ${token.address}`);

    // Grant infinite approval
    await (await token.approve(serverWallet.address, ethers.constants.MaxInt256)).wait();

	// Check that user has sufficient funds
	let userBalance;
	try {
		userBalance = await token.balanceOf(userAddress);
	}
	catch(err) {
		console.log(`Error occurred while checking user token balance. ${err.name}: ${err.message}`);
		return;
	}
	console.log(`userBalance = ${userBalance}`);
	if(userBalance.lt(priceWei)) {
		console.log(`User balance is less than current price. current price: ${priceWei}, userBalance: ${userBalance}`);
		return;
	}

    // Estimate gas costs for full upload process
    let transferFromEstimate;
    try {
        transferFromEstimate = await token.estimateGas.transferFrom(userWallet.address, serverWallet.address, priceWei);
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
        sendEthEstimate = await serverWallet.estimateGas({to: bundlrAddress, value: priceWei}); // Assume price not dependent on "to" address
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
        transferEstimate = await token.estimateGas.transfer(userWallet.address, priceWei); // Assume price not dependent on amount
    }
    catch(err) {
        console.log(`Error occurred while estimating transfer gas cost. ${err.name}: ${err.message}`);
        return;
    }
    console.log(`transferEstimate = ${transferEstimate}`);

    let gasEstimate = transferFromEstimate.add(sendEthEstimate).add(transferEstimate).add(unwrapEstimate).add(wrapEstimate);
    console.log(`gasEstimate = ${gasEstimate}`);

    // Revoke approval
    await (await token.approve(serverWallet.address, ethers.BigNumber.from(0))).wait();
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
