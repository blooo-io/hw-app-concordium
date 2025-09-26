# SignTransferWithScheduleAndMemo

Sign a transfer transaction with schedule and memo.

## Parameters

*   `tx` **ISimpleTransferWithScheduleAndMemoTransaction** - A transaction object.
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

const simpleTransferWithScheduleAndMemo = {
  toAddress: toAddress,
  schedule: [
    { timestamp: "123456", amount: "999" }, { timestamp: "123456", amount: "999" }, { timestamp: "123456", amount: "999" },
    { timestamp: "123456", amount: "999" }, { timestamp: "123456", amount: "999" }, { timestamp: "123456", amount: "999" },
    { timestamp: "123456", amount: "999" }, { timestamp: "123456", amount: "999" }, { timestamp: "123456", amount: "999" },
  ],
  memo: "dtest",
};

const tx = {
  sender,
  nonce: nonce.toString(),
  expiry: BigInt(123),
  energyAmount: '1234',
  transactionKind: AccountTransactionType.TransferWithScheduleAndMemo,
  payload: simpleTransferWithScheduleAndMemo,
};

const { signature } = await ccd.signTransferWithScheduleAndMemo(tx, "44/919/0/0/0/0");
```
