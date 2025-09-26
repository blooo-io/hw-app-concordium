# SignUpdateContract

Sign an update contract transaction.

## Parameters

*   `tx` **IUpdateContractTransaction** - A transaction object.
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

const updateContract = {
  amount: CcdAmount.fromMicroCcd("1000000000000"),
  address: {
    index: BigInt(1234),
    subindex: BigInt(5678)
  },
  receiveName: {
    value: "Test Contract",
  },
  message: {
    buffer: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  }
};

const tx = {
  sender,
  nonce: nonce.toString(),
  expiry: BigInt(123456),
  energyAmount: '1234',
  transactionKind: AccountTransactionType.Update,
  payload: updateContract,
};

const { signature } = await ccd.signUpdateContract(tx, "44/919/0/0/0/0");
```
