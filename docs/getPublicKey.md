# GetPublicKey

Get the public key for a specific BIP32 path.

## Parameters

*   `path` **string** - A BIP32 path.
*   `display` **boolean** - Flag to show display.
*   `signedKey` **boolean** - Flag to sign key.

## Return

*   `publicKey` **string** - The public key.
*   `signedPublicKey` **string** - Only if signedKey is true. The signed public key.

## Examples

```javascript
const { publicKey } = await ccd.getPublicKey("44/919/0/0/0/0", true, false);
// Or
const { publicKey, signedPublicKey } = await ccd.getPublicKey("44/919/0/0/0/0", true, true);
```
