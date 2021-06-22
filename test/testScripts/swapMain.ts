// Example showing SOR with Vault batchSwap and Subgraph pool data, run using: $ ts-node ./test/testScripts/swapMain.ts
require('dotenv').config();
import { BigNumber } from 'bignumber.js';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { Contract } from '@ethersproject/contracts';
import { MaxUint256 } from '@ethersproject/constants';
import { SOR, SwapInfo, SwapTypes, fetchSubgraphPools } from '../../src';
import { scale } from '../../src/bmath';
import vaultArtifact from '../../src/abi/Vault.json';
import erc20abi from '../abi/ERC20.json';

export type FundManagement = {
    sender: string;
    recipient: string;
    fromInternalBalance: boolean;
    toInternalBalance: boolean;
};

const BAL = '0xba100000625a3754423978a60c9317c58a424e3d';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
const vaultAddr = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

async function simpleSwap() {
    // If running this example make sure you have a .env file saved in root DIR with INFURA=your_key
    const provider = new JsonRpcProvider(
        `https://mainnet.infura.io/v3/${process.env.INFURA}`
    );

    // Add TRADE_KEY pk to env for address that will exectute trade
    const wallet = new Wallet(process.env.TRADER_KEY, provider);
    console.log(`Trader Address: ${wallet.address}`);

    // gasPrice is used by SOR as a factor to determine how many pools to swap against.
    // i.e. higher cost means more costly to trade against lots of different pools.
    // Can be changed in future using sor.gasPrice = newPrice
    const gasPrice = new BigNumber('40000000000');
    // This determines the max no of pools the SOR will use to swap.
    const maxNoPools = 4;
    const chainId = 1;
    const tokenIn = BAL;
    const tokenOut = WETH;
    const swapType = SwapTypes.SwapExactOut;
    // In normalized format, i.e. 1USDC = 1
    const swapAmount = new BigNumber(0.1);
    const decimalsIn = 18;
    const decimalsOut = 18;

    // Fetch pools list from Subgraph
    // Uses default API or value set in env
    // Can also pass in API address via parameter
    let subgraphPools = await fetchSubgraphPools(
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'
    );
    console.log(subgraphPools);

    const sor = new SOR(provider, gasPrice, maxNoPools, chainId, subgraphPools);

    // This calculates the cost to make a swap which is used as an input to sor to allow it to make gas efficient recommendations.
    // Can be set once and will be used for further swap calculations.
    // Defaults to 0 if not called or can be set manually using: await sor.setCostOutputToken(tokenOut, manualPriceBn)
    // tokenOut for SwapExactIn, tokenIn for SwapExactOut
    // const cost = await sor.setCostOutputToken(tokenOut, decimalsOut);
    const cost = await sor.setCostOutputToken(tokenIn, decimalsIn);

    console.log('Cost:');
    console.log(cost.toString());

    // Fetch refreshed pools list from Subgraph
    subgraphPools = await fetchSubgraphPools(
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'
    );
    // Will get onChain data for refreshed pools list
    await sor.fetchPools(true, subgraphPools);

    const isFinishedFetchingOnChain = sor.finishedFetchingOnChain;
    console.log(`isFinishedFetchingOnChain ${isFinishedFetchingOnChain}`);

    const swapInfo: SwapInfo = await sor.getSwaps(
        tokenIn,
        tokenOut,
        swapType,
        swapAmount
    );

    console.log(swapInfo.returnAmount.toString());
    console.log(swapInfo.swaps);

    // The rest of the code executes a swap using real wallet funds

    // Vault needs approval for swapping
    // console.log('Approving vault...');
    // let tokenInContract = new Contract(
    //     tokenIn,
    //     erc20abi,
    //     provider
    // );

    // let txApprove = await tokenInContract.connect(wallet).approve(vaultAddr, MaxUint256);
    // console.log(txApprove);

    // const vaultContract = new Contract(vaultAddr, vaultArtifact, provider);
    // vaultContract.connect(wallet);

    // const funds: FundManagement = {
    //     sender: wallet.address,
    //     recipient: wallet.address,
    //     fromInternalBalance: false,
    //     toInternalBalance: false,
    // };

    // // Limits:
    // // +ve means max to send
    // // -ve mean min to receive
    // // For a multihop the intermediate tokens should be 0
    // // This is where slippage tolerance would be added
    // const limits = [];
    // swapInfo.tokenAddresses.forEach((token, i) => {
    //     if (token.toLowerCase() === tokenIn.toLowerCase()) {
    //         limits[i] = scale(swapAmount, decimalsIn).toString();
    //     } else if (token.toLowerCase() === tokenOut.toLowerCase()) {
    //         limits[i] = swapInfo.returnAmount.times(-1).toString();
    //     } else {
    //         limits[i] = '0';
    //     }
    // });
    // const deadline = MaxUint256;

    // console.log(funds);
    // console.log(swapInfo.tokenAddresses);
    // console.log(limits);

    // console.log('Swapping...');
    // let tx = await vaultContract
    //     .connect(wallet)
    //     .batchSwap(
    //         swapType,
    //         swapInfo.swaps,
    //         swapInfo.tokenAddresses,
    //         funds,
    //         limits,
    //         deadline,
    //         {
    //             gasLimit: '200000',
    //             gasPrice: '20000000000',
    //         }
    //     );

    // console.log(`tx: ${tx.hash}`);
}

simpleSwap();
