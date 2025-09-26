# Concordium Ledger SDK Documentation

This directory contains detailed documentation for each method available in the Concordium Ledger SDK.

## Available Methods

### Key Management
- [getPublicKey](./getPublicKey.md) - Get the public key for a specific BIP32 path
- [exportPrivateKeyLegacy](./exportPrivateKeyLegacy.md) - Export a private key using the legacy method
- [exportPrivateKeyNew](./exportPrivateKeyNew.md) - Export a private key using the new method

### Address Verification
- [verifyAddress](./verifyAddress.md) - Verify an address on the Ledger device

### Transfer Transactions
- [signTransfer](./signTransfer.md) - Sign a simple transfer transaction
- [signTransferWithMemo](./signTransferWithMemo.md) - Sign a transfer transaction with memo
- [signTransferWithSchedule](./signTransferWithSchedule.md) - Sign a transfer transaction with schedule
- [signTransferWithScheduleAndMemo](./signTransferWithScheduleAndMemo.md) - Sign a transfer transaction with schedule and memo
- [signTransferToPublic](./signTransferToPublic.md) - Sign a transfer to public transaction

### Baker and Delegation
- [signConfigureBaker](./signConfigureBaker.md) - Sign a configure baker transaction
- [signConfigureDelegation](./signConfigureDelegation.md) - Sign a configure delegation transaction

### Smart Contracts
- [signDeployModule](./signDeployModule.md) - Sign a deploy module transaction
- [signInitContract](./signInitContract.md) - Sign an init contract transaction
- [signUpdateContract](./signUpdateContract.md) - Sign an update contract transaction

### Data and Credentials
- [signRegisterData](./signRegisterData.md) - Sign a register data transaction
- [signCredentialDeployment](./signCredentialDeployment.md) - Sign a credential deployment transaction
- [signUpdateCredentials](./signUpdateCredentials.md) - Sign an update credentials transaction
- [signPublicInfoForIp](./signPublicInfoForIp.md) - Sign public information for Identity Provider

### PLT (Private Ledger Transaction)
- [signPLT](./signPLT.md) - Sign a PLT (Private Ledger Transaction) transaction

## Getting Started

Each documentation file contains:
- Method description
- Parameter definitions with types
- Return value specifications
- Complete working examples with imports and setup

For general usage information and installation instructions, see the main [README](../README.md) file.
