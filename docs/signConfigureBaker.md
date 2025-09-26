# signConfigureBaker

Sign a configure baker transaction.

## Parameters

*   `tx` **IConfigureBakerTransaction** - A transaction object.
*   `path` **string** - A BIP32 path.

## Return

*   `signature` **string** - The signature.

## Examples

```javascript
import { AccountAddress, CcdAmount, AccountTransactionType } from "@concordium/web-sdk";
import Concordium from "@blooo/hw-app-concordium";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";

const transport = await TransportWebHID.create();
const ccd = new Concordium(transport);

const sender = AccountAddress.fromBase58("4McQDikzr3GXi52Xjgcm2XZbq7E8YF7gzATZScZ5U59eLLkKjg");
const toAddress = AccountAddress.fromBase58("4McQDikzr3GXi52Xjgcm2XZbq7E8YF7gzATZScZ5U59eLLkKjg");

const configureBaker = {
    stake: CcdAmount.fromMicroCcd("999"),
    restakeEarnings: false,
    openForDelegation: 0,
    keys: {
      signatureVerifyKey: "7873cd57848d7aea7be03fbb3f1e8b9e69987fc73f13e473356776a16f26c96b",
      electionVerifyKey: "32f892fb3d0dc6138976b6848259cf730e37fa4a61a659c782ec6def978c0828",
      aggregationVerifyKey: "7873cd57848d7aea7be03fbb3f1e8b9e69987fc73f13e473356776a16f26c96b32f892fb3d0dc6138976b6848259cf730e37fa4a61a659c782ec6def978c082832f892fb3d0dc6138976b6848259cf730e37fa4a61a659c782ec6def978c0828",
      proofAggregation: "957aec4b2b7ed979ba2079d62246d135aefd61e7f46690c452fec8bcbb593481e229f6f1968194a09cf612490887e71d96730e2d852201e53fec9c89d36f8a90",
      proofSig: "a47cdf9133572e9ad5c02c3a7ffd1d05db7bb98860d918092454146153d62788f224c0157c65853ed4a0245ab3e0a593a3f85fa81cc4cb99eeaa643bfc793eab",
      proofElection: "01fc695a8c51d4599cbe032a39832ad49bab900d88105b01d025b760b0d0d555b8c828f2d8fe29cc78c6307d979e6358b8bba9cf4d8200f272cc85b2a3813eff",
    },
    metadataUrl: "https://example.com",
    transactionFeeCommission: 10,
    bakingRewardCommission: 10,
    finalizationRewardCommission: 10,
    suspended: true
  };

  const tx = {
    sender,
    nonce: nonce.toString(),
    expiry: BigInt(123456),
    energyAmount: '1234',
    transactionKind: AccountTransactionType.ConfigureBaker,
    payload: configureBaker,
  };

  const { signature } = await ccd.signConfigureBaker(tx, "44/919/0/0/0/0");
```
