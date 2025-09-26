# SignTransferWithMemo

Sign a transfer transaction with memo.

## Parameters

*   `tx` **ISimpleTransferWithMemoTransaction** - A transaction object.
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

const simpleTransferWithMemo = {
  amount: CcdAmount.fromMicroCcd("999"),
  toAddress,
  memo: "Test memo",
};

const txWithMemo = {
  sender,
  nonce: "1234",
  expiry: BigInt(123456),
  energyAmount: '1234',
  transactionKind: AccountTransactionType.TransferWithMemo,
  payload: simpleTransferWithMemo,
};

const { signature } = await ccd.signTransferWithMemo(txWithMemo, "44/919/0/0/0/0");
```
