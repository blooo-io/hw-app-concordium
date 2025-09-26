# signUpdateCredentials

Sign an update credentials transaction.

## Parameters

*   `tx` **IUpdateCredentialsTransaction** - A transaction object.
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

const credentialValues = {
  credId: "85d8a7aa296c162e4e2f0d6bfbdc562db240e28942f7f3ddef6979a1133b5c719ec3581869aaf88388824b0f6755e63c",
  ipIdentity: 1234,
  revocationThreshold: 2,
  credentialPublicKeys: {
    keys: {
      1: {
        schemeId: "Ed25519",
        verifyKey: "f78929ec8a9819f6ae2e10e79522b6b311949635fecc3d924d9d1e23f8e9e1c3",
      }
    },
    threshold: 12
  },
  policy: {
    validTo: "202412",
    createdAt: "202412",
    revealedAttributes: {
      "sex": "30",
      "dob": "40",
    },
  },
  arData: {
    "1": {
      encIdCredPubShare: "aca024ce6083d4956edad825c3721da9b61e5b3712606ba1465f7818a43849121bdb3e4d99624e9a74b9436cc8948d178b9b144122aa070372e3fadee4998e1cc21161186a3d19698ad245e10912810df1aaddda16a27f654716108e27758099",
    }
  },
  proofs: "...",
};

const updateCredentials = {
  newCredentials: [
    {
      index: 1,
      cdi: credentialValues
    },
    {
      index: 2,
      cdi: credentialValues
    }
  ],
  removeCredentialIds: [
    '85d8a7aa296c162e4e2f0d6bfbdc562db240e28942f7f3ddef6979a1133b5c719ec3581869aaf88388824b0f6755e63c',
    '85d8a7aa296c162e4e2f0d6bfbdc562db240e28942f7f3ddef6979a1133b5c719ec3581869aaf88388824b0f6755e63c',
    '85d8a7aa296c162e4e2f0d6bfbdc562db240e28942f7f3ddef6979a1133b5c719ec3581869aaf88388824b0f6755e63c'
  ],
  threshold: 2,
};

const tx = {
  sender,
  nonce: nonce.toString(),
  expiry: BigInt(123456),
  energyAmount: '1234',
  transactionKind: AccountTransactionType.UpdateCredentials,
  payload: updateCredentials,
};

const { signature } = await ccd.signUpdateCredentials(tx, "44/919/0/0/0/0");
```
