# ExportPrivateKeyNew

Export a private key using the new method.

## Parameters

*   `exportType` **ExportTypeNew** - The type of export: "identity_credential_creation", "account_creation", "id_recovery", "account_credential_discovery", or "creation_of_zk_proof".
*   `identityIndex` **number** - The identity index.
*   `idpIndex` **number** - The identity provider index.
*   `accountIndex` **number** - Optional. The account index (only used for some export types).

## Return

*   `privateKey` **string** - The private key.

## Examples

```javascript
import Concordium from "@blooo/hw-app-concordium";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";

const transport = await TransportWebHID.create();
const ccd = new Concordium(transport);

// Export private key for identity credential creation
const { privateKey } = await ccd.exportPrivateKeyNew(
  "identity_credential_creation",
  0, // identityIndex
  1  // idpIndex
);

// Export private key for account creation with account index
const { privateKey: accountKey } = await ccd.exportPrivateKeyNew(
  "account_creation",
  0, // identityIndex
  1, // idpIndex
  0  // accountIndex
);
```
