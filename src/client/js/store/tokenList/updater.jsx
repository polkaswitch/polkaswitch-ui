const { useEffect } = require("react");
const { useDispatch } = require("react-redux");
const NETWORKS = require("../../../defi/networks");
const axios = require('axios').default;
const { updateTokenList } = require("./slice");

exports.Updater = () => {
    
    useEffect(() => {
        Object.keys(NETWORKS).forEach(network => {
            let tokenListUrl = NETWORKS[network].tokenList;
            axios.get(tokenListUrl).then(res => {
                dispatch(updateTokenList(res.data))
            })
        })
    }, []);

    return null;
}