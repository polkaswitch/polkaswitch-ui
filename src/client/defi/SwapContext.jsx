const { useState } = require("react");

const initialContext = {
    txMode: "SWAP",
    fromNetwork: undefined,
    toNetwork: undefined,
    tokenSelected: "",
    setTo: undefined,
    setFrom: undefined,
    setToken: undefined
};

const SwapContext = React.createContext(initialContext)

exports.SwapContextProvider = () => {
    const [txMode, setTxMode] = useState("SWAP");
    const [toNetwork, setTo] = useState(137);
    const [fromNetwork, setFrom] = useState(1);
    const [token, setToken] = useState("");

    return <SwapContext.Provider value={{
        txMode,
        toNetwork,
        fromNetwork,
        setTo,
        setFrom,
        setTxMode,
        token,
        setToken
    }}></SwapContext.Provider>
}