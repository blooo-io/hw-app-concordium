# SignDeployModule

Sign a deploy module transaction.

## Parameters

*   `tx` **IDeployModuleTransaction** - A transaction object.
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

const deployModule = {
    version: 12,
    source: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
};

const tx = {
    sender,
    nonce: nonce.toString(),
    expiry: BigInt(123456),
    energyAmount: '1234',
    transactionKind: AccountTransactionType.DeployModule,
    payload: deployModule,
};

const { signature } = await ccd.signDeployModule(tx, "44/919/0/0/0/0");
```
