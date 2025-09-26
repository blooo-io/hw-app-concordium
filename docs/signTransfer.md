# SignTransfer

Sign a simple transfer transaction.

## Parameters

*   `tx` **ISimpleTransferTransaction** - A transaction object.
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

const simpleTransfer = {
    amount: CcdAmount.fromMicroCcd("999"),
    toAddress,
};

const tx = {
    sender,
    nonce: nonce.toString(),
    expiry: BigInt(1745517351),
    energyAmount: '100',
    transactionKind: AccountTransactionType.Transfer,
    payload: simpleTransfer,
};

const { signature } = await ccd.signTransfer(tx, "44/919/0/0/0/0");
```
