const ethers = require('ethers');

// Export PRIVATE_KEY before running

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
    let unwrapEstimate;
    let sendEthEstimate
    let wrapEstimate;
    let transferEstimate;
    try {
        // 1. Pull ERC-20 token from userAddress
        transferFromEstimate = await token.estimateGas.transferFrom(userAddress, wallet.address, priceWei);
        console.log(`transferFromEstimate = ${transferFromEstimate}`);
        // 2. Unwrap if necessary
        unwrapEstimate = await token.estimateGas.withdraw(priceWei);
        console.log(`unwrapEstimate = ${unwrapEstimate}`);
        // 3. Push funds to Bundlr account
        sendEthEstimate = await wallet.estimateGas({to: bundlrAddress, value: priceWei}); // Assume price not dependent on "to" address
        console.log(`sendEthEstimate = ${sendEthEstimate}`);
        // 4. Possibly refund in case of non-recoverable failure
        wrapEstimate = await token.estimateGas.deposit(priceWei); // Assume price not dependent on amount
        console.log(`wrapEstimate = ${wrapEstimate}`);
        transferEstimate = await token.estimateGas.transfer(userAddress, priceWei); // Assume price not dependent on amount
        console.log(`transferEstimate = ${transferEstimate}`);
    }
    catch(err) {
        console.log(`Error occurred while estimating gas costs for upload. ${err.name}: ${err.message}`);
        return;
    }

    let gasEstimate = transferFromEstimate.add(sendEthEstimate).add(transferEstimate).add(unwrapEstimate).add(wrapEstimate);
    console.log(`gasEstimate = ${gasEstimate}`);

}

(async() => {
	await estimateGas(
        'https://rpc-mumbai.maticvigil.com/',
        '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
        '0x853758425e953739F5438fd6fd0Efe04A477b039'
    );
})();
