import { AccountTransactionType, AttributeKey, CcdAmount, ConfigureBakerPayload, ConfigureDelegationPayload, DataBlob, DeployModulePayload, InitContractPayload, UpdateContractPayload } from "@concordium/common-sdk";
import { AccountAddress } from "@concordium/web-sdk";

export enum ExportType {
  PRF_KEY_SEED = 1,
  PRF_KEY = 2,
}
export enum Mode {
  NO_DISPLAY = 0,
  DISPLAY = 1,
  EXPORT_CRED_ID = 2
}

export type Hex = string;

export interface IExportPrivateKeyData {
  identity: number;
  identityProvider: number;
}

export interface ISimpleTransfer {
  amount: CcdAmount,
  toAddress: AccountAddress.Type,
}

export interface ISimpleTransferTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: ISimpleTransfer,
}

export interface ISimpleTransferWithMemo {
  amount: CcdAmount,
  toAddress: AccountAddress.Type,
  memo: string | DataBlob,
}

export interface ISimpleTransferWithMemoTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: ISimpleTransferWithMemo,
}

export interface ISimpleTransferWithSchedule {
  toAddress: AccountAddress.Type,
  schedule: { timestamp: string, amount: string }[],
}

export interface ISimpleTransferWithScheduleTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: ISimpleTransferWithSchedule,
}

export interface IConfigureDelegationTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: ConfigureDelegationPayload,
}

export interface IConfigureBakerTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: ConfigureBakerPayload,
}

export interface ISimpleTransferWithScheduleAndMemo {
  toAddress: AccountAddress.Type,
  schedule: { timestamp: string, amount: string }[],
  memo: string | DataBlob,
}

export interface ISimpleTransferWithScheduleAndMemoTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: ISimpleTransferWithScheduleAndMemo,
}

export interface IRegisterData {
  data: string | DataBlob,
}

export interface IRegisterDataTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: IRegisterData,
}

export interface ITransferToPublic {
  remainingAmount: Hex,
  transferAmount: CcdAmount,
  index: string,
  proofs: Hex,
}

export interface ITransferToPublicTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: ITransferToPublic,
}

export interface IDeployModuleTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: DeployModulePayload,
}

export interface IInitContractTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: InitContractPayload,
}

export interface IUpdateContractTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: UpdateContractPayload,
}

export interface IVerifyKey {
  schemeId: string,
  verifyKey: Hex,
}

export interface ICredentialPublicKeys {
  keys: {
    [key: number]: IVerifyKey,
  },
  threshold: number,
}

export interface ICredentialPolicy {
  validTo: string,
  createdAt: string,
  revealedAttributes: Record<AttributeKey, string>;
}

export interface ChainArData {
  encIdCredPubShare: Hex;
}
export interface CredentialDeploymentCommitments {
  cmmPrf: string;
  cmmCredCounter: string;
  cmmIdCredSecSharingCoeff: string[];
  cmmAttributes: Record<AttributeKey, string>;
  cmmMaxAccounts: string;
}

export interface ICredentialDeploymentTransaction {
  credId: Hex,
  ipIdentity: number,
  revocationThreshold: number,
  credentialPublicKeys: ICredentialPublicKeys,
  policy: ICredentialPolicy,
  arData: Record<string, ChainArData>,
  proofs: Hex,
  commitments: CredentialDeploymentCommitments,
}

export interface ICredential {
  index: number,
  cdi: ICredentialDeploymentTransaction,
}

export interface IUpdateCredentials {
  newCredentials: ICredential[],
  removeCredentialIds: Hex[],
  threshold: number,
}

export interface IUpdateCredentialsTransaction {
  sender: AccountAddress.Type,
  nonce: string,
  expiry: BigInt,
  energyAmount: string,
  transactionKind: AccountTransactionType,
  payload: IUpdateCredentials,
}

export interface IPublicInfoForIpTransaction {
  idCredPub: Hex,
  regId: Hex,
  publicKeys: ICredentialPublicKeys,
}

export declare type AccountTransaction = ISimpleTransferTransaction | IPublicInfoForIpTransaction | ICredentialDeploymentTransaction | ISimpleTransferWithMemoTransaction | ISimpleTransferWithScheduleTransaction | ITransferToPublicTransaction | ISimpleTransferWithScheduleAndMemoTransaction | IRegisterDataTransaction | IDeployModuleTransaction | IInitContractTransaction | IUpdateContractTransaction | IUpdateCredentialsTransaction | IConfigureBakerTransaction | IConfigureDelegationTransaction;
