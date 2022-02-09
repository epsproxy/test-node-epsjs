const express = require('express');
const web3 = require('web3');
const { EpsHelper, WassiePawnHelper, LoomLockNFTHelper } = require('@epsproxy/epsjs');

const app = express();

//Infura HttpProvider Endpoint
const registerAddress = "0xfa3D2d059E9c0d348dB185B32581ded8E8243924"
const mainnetProvider = new web3.providers.HttpProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161")
const epsHelper = new EpsHelper(registerAddress, mainnetProvider)

app.get('/', async function(req, res) {
    console.log(`Received Address = ${req.query.userAddress}`)
    const userAddress = req.query.userAddress
    try {
        await epsHelper.init()
        const wassieHelper =  await WassiePawnHelper.init(mainnetProvider)
        const loomlockNFTHelper = await LoomLockNFTHelper.init(mainnetProvider)

        /*
         * Fetch the nominator address from the EPS register. This is backwards compatible
         * with any address that does not have a register entry. Possible return values are:
         * 1) Address is not a proxy operating for a nominator:
         *    * Nominator = the address passed in.
         *    * Delivery = the address passed in.
         *    * isProxied = false
         * 2) Address is a proxy, i.e. it is operating on behalf of the nominator and 
         *    therefore represents all balances and priviledges assocaited with the nominator:
         *    * Nominator = the nominator from the register i.e. the address this is acting for
         *    * Delivery = the delivery address from the register
         *    * isProxied = true
         * 3) Address is a nominator. In this situation the address we have recieved has nominated
         *    another address (the proxy) to operate on its behalf. As the proxy is representing
         *    the balances and priveldges of this address it is vital that this address receives none
         *    of these benefits, as otherwise two addresses are representing the same holding:
         *    * The call to the register will revert with "Nominator address cannot interact directly, 
         *      only through the proxy address". This address should be treated as having no assets
        */
        const registerDetails = await epsHelper.getAddresses(userAddress)
        const nominator = registerDetails[0]
        const delivery = registerDetails[1]
        const isProxied = registerDetails[2]
        console.log(`Nominator Address = ${nominator}`)
        console.log(`Delivery Address = ${delivery}`)
        console.log(`isProxied = ${isProxied}`)

        /*
         * In subsequent processing we need to use the nominator address returned above, as the holdings
         * we wish to query are for this address (which is either the passed in address (no register entry)
         * or the nominator that the proxy is acting on behalf of). If we were checking balances, as per current
         * processing, we use the nominator in that balance check, not the address passed into the function.
         * 
         * Get the loans. Note that if we are simply looking to establish a discord role of 'loomlockers' we
         * are just looking for an array length > 0.  
        */
        const loans = await wassieHelper.getLoans(nominator)

        /*
        * Get the sigils. Note that these are the sigils for any NFTs held by the address plus the sigils
        * for any NFTs the user has loans against..  
        */
        const addressSigils = await loomlockNFTHelper.addressSigils(nominator)
        res.send({registerDetails, loans, addressSigils})

    } catch (e) {
        res.send("error"+e)
    }
});
app.listen(5000, () => console.log('test-node-epsjs listening on port 5000!'))
