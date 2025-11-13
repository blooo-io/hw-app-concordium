# signPLT

Sign a PLT (Protocol Level Token) transaction.

## Parameters

*   `tx` **IPLTTransaction** - A PLT transaction object.
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

const pltTransaction = {
  sender,
  nonce: '321',
  expiry: BigInt(123456),
  energyAmount: '1234',
  transactionKind: AccountTransactionType.TokenUpdate,
  payload: {
    tokenName: "PLT Token",
    operations: "81A1687472616E73666572A266616D6F756E74C482211904C769726563697069656E74D99D73A201D99D71A10119039703582020A845815BD43A1999E90FBF971537A70392EB38F89E6BD32B3DD70E1A9551D7"
  }
};

const { signature } = await ccd.signPLT(pltTransaction, "44/919/0/0/0/0");
```
