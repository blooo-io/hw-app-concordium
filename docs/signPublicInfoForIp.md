# SignPublicInfoForIp

Sign public information for Identity Provider.

## Parameters

*   `tx` **IPublicInfoForIpTransaction** - A transaction object.
*   `path` **string** - A BIP32 path.

## Return

*   `signature` **string** - The signature.

## Examples

```javascript
import Concordium from "@blooo/hw-app-concordium";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";

const transport = await TransportWebHID.create();
const ccd = new Concordium(transport);

const transactionPublicInfoForIp = {
  idCredPub: "85d8a7aa296c162e4e2f0d6bfbdc562db240e28942f7f3ddef6979a1133b5c719ec3581869aaf88388824b0f6755e63c",
  regId: "85d8a7aa296c162e4e2f0d6bfbdc562db240e28942f7f3ddef6979a1133b5c719ec3581869aaf88388824b0f6755e63c",
  publicKeys: {
    keys: {
      1: {
        schemeId: "Ed25519",
        verifyKey: "f78929ec8a9819f6ae2e10e79522b6b311949635fecc3d924d9d1e23f8e9e1c3"
      },
      2: {
        schemeId: "Ed25519",
        verifyKey: "f78929ec8a9819f6ae2e10e79522b6b311949635fecc3d924d9d1e23f8e9e1c3"
      }
    },
    threshold: 12
  }
};

const { signature } = await ccd.signPublicInfoForIp(transactionPublicInfoForIp, "44/919/0/0/0/0");
```
