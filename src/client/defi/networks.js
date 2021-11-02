module.exports = {
    56: {
        "enabled": true,
        "name": "Smart Chain",
        "aggregatorAddress": "0x08C1242F51a16f9451D873644ED4E29E224Da71e",
        "crossChainAggregatorAddress": "0x7cfDd47854ccf321285f6A8726c9fA64bD621D9C",
        "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
        "bridgeURI": "https://app.nerve.fi/bridge",
        "tokenList": "/tokens/56.list.json",
        "chainId": "56",
        "nodeProvider": "https://api-smart-chain.polkaswitch.com/fff0dd6bf467085a65f5e23ea585adfa5da745e1/",
        "explorerBaseUrl": "https://bscscan.com/tx/",
        "gasApi": false,
        "chain": {
            "chainId": "0x38",
            "rpcUrls": [
                "https://bsc-dataseed.binance.org/"
            ],
            "chainName": "Smart Chain Mainnet",
            "nativeCurrency": {
                "name": "BNB",
                "symbol": "BNB",
                "decimals": 18
            }
        },
        "defaultPair": {
            "to": "0x55d398326f99059fF775485246999027B3197955",
            "from": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        },
        "topTokens": [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0x55d398326f99059fF775485246999027B3197955",
            "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
            "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
            "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
            "0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7"
        ],
        "tradeView": {
            "platform": "binance-smart-chain",
            "lineUrl": "https://api.coingecko.com/api/v3/coins/binance-smart-chain",
            "candleStickUrl": "https://api.coingecko.com/api/v3/coins"
        },
        "crossChainSupported": true,
        "supportedCrossChainTokens": [
            "USDT",
            "USDC",
            "DAI"
        ]
    },
    100: {
        "enabled": true,
        "name": "xDai",
        "aggregatorAddress": "0x45886377b9930b1fDf0A16EE966F70A0240eD029",
        "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/xdai/info/logo.png",
        "bridgeURI": "https://bridge.xdaichain.com/",
        "tokenList": "/tokens/100.list.json",
        "chainId": "100",
        "nodeProvider": "https://rpc.xdaichain.com/",
        "explorerBaseUrl": "https://blockscout.com/xdai/mainnet/tx/",
        "gasApi": false,
        "chain": {
            "chainId": "0x64",
            "rpcUrls": [
                "https://rpc.xdaichain.com/"
            ],
            "chainName": "xDai Chain",
            "nativeCurrency": {
                "name": "xDai",
                "symbol": "xDai",
                "decimals": 18
            }
        },
        "defaultPair": {
            "to": "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
            "from": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        },
        "topTokens": [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83",
            "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
            "0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252",
            "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1",
            "0x7f7440C5098462f833E123B44B8A03E1d9785BAb"
        ],
        "tradeView": {
            "platform": "xdai",
            "lineUrl": "https://api.coingecko.com/api/v3/coins/xdai",
            "candleStickUrl": "https://api.coingecko.com/api/v3/coins"
        },
        "crossChainSupported": false,
        "supportedCrossChainTokens": []
    },
    137: {
        "enabled": true,
        "name": "Polygon",
        "aggregatorAddress": "0xB9E1505be481FC3fb8E87E92554E45FE6FbcFB7e",
        "crossChainAggregatorAddress": "0xA6d27b5B051F2C24E768C7859b2468CbE356ABCd",
        "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
        "bridgeURI": "https://wallet.matic.network/",
        "tokenList": "/tokens/137.list.json",
        "chainId": "137",
        "nodeProvider": "https://api-matic.polkaswitch.com/3d041599a52783f163b2515d3ab10f900fc61c01/",
        "explorerBaseUrl": "https://polygonscan.com/tx/",
        "gasApi": "https://gasstation-mainnet.matic.network",
        "chain": {
            "chainId": "0x89",
            "rpcUrls": [
                "https://rpc-mainnet.maticvigil.com"
            ],
            "chainName": "Matic Mainnet",
            "nativeCurrency": {
                "name": "Matic",
                "symbol": "MATIC",
                "decimals": 18
            }
        },
        "defaultPair": {
            "to": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
            "from": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        },
        "topTokens": [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
            "0xb33EaAd8d922B1083446DC23f610c2567fB5180f",
            "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
            "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
        ],
        "tradeView": {
            "platform": "polygon-pos",
            "lineUrl": "https://api.coingecko.com/api/v3/coins/polygon-pos",
            "candleStickUrl": "https://api.coingecko.com/api/v3/coins"
        },
        "crossChainSupported": true,
        "supportedCrossChainTokens": [
            "USDT",
            "USDC",
            "DAI"
        ]
    },
    250: {
        "enabled": true,
        "name": "Fantom",
        "aggregatorAddress": "0xF09ecB66eF88973eBE7B0B5B5d700050F200c85D",
        "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/info/logo.png",
        "bridgeURI": "https://multichain.xyz/",
        "tokenList": "/tokens/250.list.json",
        "chainId": "250",
        "nodeProvider": "https://rpcapi.fantom.network",
        "explorerBaseUrl": "https://ftmscan.com/tx/",
        "gasApi": false,
        "chain": {
            "chainId": "0xFA",
            "rpcUrls": [
                "https://rpcapi.fantom.network"
            ],
            "chainName": "Fantom",
            "nativeCurrency": {
                "name": "Fantom",
                "symbol": "FTM",
                "decimals": 18
            }
        },
        "defaultPair": {
            "to": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
            "from": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        },
        "topTokens": [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
            "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
            "0x321162cd933e2be498cd2267a90534a804051b11",
            "0x74b23882a30290451a17c44f4f05243b6b58c76d",
            "0xae75a438b2e0cb8bb01ec1e1e376de11d44477cc"
        ],
        "tradeView": {
            "platform": "fantom",
            "lineUrl": "https://api.coingecko.com/api/v3/coins/fantom",
            "candleStickUrl": "https://api.coingecko.com/api/v3/coins"
        },
        "crossChainSupported": false,
        "supportedCrossChainTokens": []
    },
    1287: {
        "enabled": false,
        "name": "Arbitrum",
        "aggregatorAddress": "0x689236A0C4A391FdD76dE5c6a759C7984166d166",
        "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        "bridgeURI": "https://wallet.matic.network/",
        "tokenList": "/tokens/eth.list.json",
        "chainId": "1287",
        "nodeProvider": "https://api-matic.polkaswitch.com/3d041599a52783f163b2515d3ab10f900fc61c01/",
        "explorerBaseUrl": "https://polygonscan.com/tx/",
        "gasApi": "https://ethgasstation.info/json/ethgasAPI.json",
        "chain": {
            "chainId": "0x507",
            "rpcUrls": [
                "https://rpc.testnet.moonbeam.network"
            ],
            "chainName": "Moonbeam Alphanet"
        },
        "defaultPair": {
            "to": "0x806628fC9c801A5a7CcF8FfBC8a0ae3348C5F913",
            "from": "0x798fA7Cf084129616B0108452aF3E1d5d1B32179"
        },
        "topTokens": [
            "ETH",
            "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            "0x514910771AF9Ca656af840dff83E8264EcF986CA",
            "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
            "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
            "0xba100000625a3754423978a60c9317c58a424e3D",
            "0xE41d2489571d322189246DaFA5ebDe1F4699F498",
            "0xd26114cd6EE289AccF82350c8d8487fedB8A0C07"
        ],
        "tradeView": {
            "platform": "ethereum",
            "lineUrl": "https://api.coingecko.com/api/v3/coins/ethereum",
            "candleStickUrl": "https://api.coingecko.com/api/v3/coins"
        },
        "crossChainSupported": false,
        "supportedCrossChainTokens": []
    },
    43114: {
        "enabled": true,
        "name": "Avalanche",
        "aggregatorAddress": "0xCB18f49410349419c1b3E43C3d011cE96c720eDE",
        "logoURI": "https://assets.coingecko.com/coins/images/12559/large/coin-round-red.png",
        "bridgeURI": "https://bridge.avax.network/",
        "tokenList": "/tokens/43114.list.json",
        "chainId": "43114",
        "nodeProvider": "https://api.avax.network/ext/bc/C/rpc",
        "nodeProvider2": "https://avalanche--mainnet--rpc.datahub.figment.io/apikey/b56dcd7987f05a43637a94ad98d546be/ext/bc/C/rpc",
        "explorerBaseUrl": "https://cchain.explorer.avax.network/tx/",
        "gasApi": false,
        "chain": {
            "chainId": "0xA86A",
            "rpcUrls": [
                "https://api.avax.network/ext/bc/C/rpc"
            ],
            "chainName": "Avalanche Mainnet",
            "nativeCurrency": {
                "name": "AVAX",
                "symbol": "AVAX",
                "decimals": 18
            }
        },
        "defaultPair": {
            "to": "0xde3A24028580884448a5397872046a019649b084",
            "from": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        },
        "topTokens": [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0xde3A24028580884448a5397872046a019649b084",
            "0xf20d962a6c8f70c731bd838a3a388D7d48fA6e15",
            "0x408D4cD0ADb7ceBd1F1A1C33A0Ba2098E1295bAB",
            "0x8cE2Dee54bB9921a2AE0A63dBb2DF8eD88B91dD9",
            "0x60781C2586D68229fde47564546784ab3fACA982",
            "0xaEb044650278731Ef3DC244692AB9F64C78FfaEA"
        ],
        "tradeView": {
            "platform": "avalanche",
            "lineUrl": "https://api.coingecko.com/api/v3/coins/avalanche",
            "candleStickUrl": "https://api.coingecko.com/api/v3/coins"
        },
        "crossChainSupported": true,
        "supportedCrossChainTokens": [
            "USDT",
            "DAI"
        ]
    }
}