# ExportPrivateKeyLegacy

Export a private key using the legacy method.

## Parameters

*   `data` **IExportPrivateKeyData** - The data required for exporting the private key. Contains `identity` (number) and `identityProvider` (number).
*   `exportType` **ExportType** - The type of export: `ExportType.PRF_KEY_SEED` (1) or `ExportType.PRF_KEY` (2).
*   `mode` **Mode** - The display mode: `Mode.NO_DISPLAY` (0), `Mode.DISPLAY` (1), or `Mode.EXPORT_CRED_ID` (2).

## Return

*   `privateKey` **string** - The private key.
*   `credentialId` **string** - Only if mode is `Mode.EXPORT_CRED_ID`. The credential ID.

## Examples

```javascript
import Concordium, { ExportType, Mode } from "@blooo/hw-app-concordium";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";

const transport = await TransportWebHID.create();
const ccd = new Concordium(transport);

const data = {
  identity: 0,
  identityProvider: 1
};

// Export private key without display
const { privateKey } = await ccd.exportPrivateKeyLegacy(
  data, 
  ExportType.PRF_KEY, 
  Mode.NO_DISPLAY
);

// Export private key with credential ID
const { privateKey: keyWithCredId, credentialId } = await ccd.exportPrivateKeyLegacy(
  data,
  ExportType.PRF_KEY_SEED,
  Mode.EXPORT_CRED_ID
);
```
