# VerifyAddress

Verify an address on the Ledger device.

## Parameters

*   `isLegacy` **boolean** - Flag to indicate if the legacy mode is used.
*   `id` **number** - The identity number.
*   `cred` **number** - The credential number.
*   `idp` **number** - Mandatory only if isLegacy is false. The identity provider number.

## Return

*   `status` **string** - The status of the verification.

## Examples

```javascript
const { status } = await ccd.verifyAddress(true, 12, 12);
// Or
const { status } = await ccd.verifyAddress(false, 12, 12, 12);
```
