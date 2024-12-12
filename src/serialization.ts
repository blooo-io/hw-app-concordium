import BIPPath from "bip32-path";
import { encodeDataBlob, encodeInt8, encodeWord16, encodeWord64, serializeAccountTransaction, serializeAccountTransactionHeader } from "./utils";
import { DataBlob } from "@concordium/common-sdk/lib/types/DataBlob";
import { Buffer as NodeBuffer } from 'buffer/index';
import { AccountAddress } from "@concordium/web-sdk";
import { serializeCredentialDeploymentInfo } from "@concordium/common-sdk/lib/serialization";
import { encodeWord8, encodeWord8FromString, serializeMap, serializeVerifyKey } from "@concordium/common-sdk/lib/serializationHelpers";
import { AccountTransaction, IConfigureBakerTransaction, IConfigureDelegationTransaction, ICredentialDeploymentTransaction, IDeployModuleTransaction, IInitContractTransaction, IPublicInfoForIpTransaction, IRegisterDataTransaction, ISimpleTransferTransaction, ISimpleTransferWithMemoTransaction, ISimpleTransferWithScheduleAndMemoTransaction, ISimpleTransferWithScheduleTransaction, ITransferToPublicTransaction, IUpdateContractTransaction, IUpdateCredentialsTransaction } from "./type";

// Transaction-related constants
const MAX_CHUNK_SIZE = 255;
const MAX_SCHEDULE_CHUNK_SIZE = 15;
const HEADER_LENGTH = 60;
const TRANSACTION_KIND_LENGTH = 1;
const INDEX_LENGTH = 1;
const ONE_OCTET_LENGTH = 1;
const BITMAP_LENGTH = 2;

// Payload-related constants
const STAKING_PAYLOAD_LENGTH = 8;
const RESTAKE_EARNINGS_PAYLOAD_LENGTH = 1;
const OPEN_FOR_DELEGATION_PAYLOAD_LENGTH = 1;

// Key-related constants
const KEYS_AGGREGATION_LENGTH = 160;
const KEYS_ELECTION_AND_SIGNATURE_LENGTH = 192;
const KEYS_PAYLOAD_LENGTH = KEYS_ELECTION_AND_SIGNATURE_LENGTH + KEYS_AGGREGATION_LENGTH;
const KEY_LENGTH = 32;

// Metadata and commission-related constants
const METADATA_URL_LENGTH = 2;
const TRANSACTION_FEE_COMMISSION_LENGTH = 4;
const BAKING_REWARD_COMMISSION_LENGTH = 4;
const FINALIZATION_REWARD_COMMISSION_LENGTH = 4;

// Deploy module constants
const VERSION_LENGTH = 4;
const SOURCE_LENGTH_LENGTH = 4;
const AMOUNT_LENGTH = 8;
const MODULE_REF_LENGTH = 32;
const UPDATE_INDEX_LENGTH = 8;
const UPDATE_SUB_INDEX_LENGTH = 8;
// Credential and identity-related constants
const REG_ID_LENGTH = 48;
const IP_IDENTITY_LENGTH = 4;
const AR_DATA_LENGTH = 2;
const ID_CRED_PUB_SHARE_LENGTH = 96;
const VALID_TO_LENGTH = 3;
const CREATED_AT_LENGTH = 3;
const ATTRIBUTES_LENGTH = 2;
const TAG_LENGTH = 1;
const VALUE_LENGTH = 1;
const PROOF_LENGTH_LENGTH = 4;
const CREDENTIAL_ID_LENGTH = 48;

/**
 * Serializes a BIP32 path into a buffer.
 * @param {number[]} path - The BIP32 path as an array of numbers.
 * @returns {Buffer} - The serialized path as a buffer.
 */
const serializePath = (path: number[]): Buffer => {
  const buf = Buffer.alloc(1 + path.length * 4);
  buf.writeUInt8(path.length, 0);
  for (const [i, num] of path.entries()) {
    buf.writeUInt32BE(num, 1 + i * 4);
  }
  return buf;
};

/**
 * Splits a BIP32 path string into an array of numbers.
 * @param {string} path - The BIP32 path as a string.
 * @returns {number[]} - The path as an array of numbers.
 */
export const splitPath = (path: string): number[] => {
  const result: number[] = [];
  const components = path.split("/");
  components.forEach((element) => {
    let number = parseInt(element, 10);
    if (isNaN(number)) {
      return;
    }
    if (element.length > 1 && element.endsWith("'")) {
      number += 0x80000000;
    }
    result.push(number);
  });
  return result;
};

/**
 * Converts a BIP32 path string to a buffer.
 * @param {string} originalPath - The BIP32 path as a string.
 * @returns {Buffer} - The path as a buffer.
 */
export const pathToBuffer = (originalPath: string): Buffer => {
  const path = originalPath;
  const pathNums: number[] = BIPPath.fromString(path).toPathArray();
  return serializePath(pathNums);
};

/**
 * Serializes transaction payloads with a derivation path.
 * @param {string} path - The BIP32 path as a string.
 * @param {Buffer} rawTx - The raw transaction data.
 * @returns {Buffer[]} - An array of serialized payload buffers.
 */
const serializeTransactionPayloadsWithDerivationPath = (path: string, rawTx: Buffer): Buffer[] => {
  const paths = splitPath(path);
  let offset = 0;
  const payloads: Buffer[] = [];
  let pathBuffer = Buffer.alloc(1 + paths.length * 4);
  pathBuffer[0] = paths.length;
  paths.forEach((element, index) => {
    pathBuffer.writeUInt32BE(element, 1 + 4 * index);
  });

  while (offset !== rawTx.length) {
    const first = offset === 0;
    let chunkSize =
      offset + MAX_CHUNK_SIZE > rawTx.length
        ? rawTx.length - offset
        : MAX_CHUNK_SIZE;

    // Allocate buffer for the first chunk with pathBuffer size
    const buffer = Buffer.alloc(first ? pathBuffer.length + chunkSize : chunkSize);

    if (first) {
      // Copy pathBuffer to the beginning of the first chunk
      pathBuffer.copy(buffer, 0);
      rawTx.copy(buffer, pathBuffer.length, offset, offset + chunkSize);
    } else {
      rawTx.copy(buffer, 0, offset, offset + chunkSize);
    }

    payloads.push(buffer);
    offset += chunkSize;
  }
  return payloads;
};

/**
 * Serializes transaction payloads without a derivation path.
 * @param {Buffer} rawTx - The raw transaction data.
 * @returns {Buffer[]} - An array of serialized payload buffers.
 */
export const serializeTransactionPayloads = (rawTx: Buffer): Buffer[] => {
  let offset = 0;
  const payloads: Buffer[] = [];
  while (offset !== rawTx.length) {
    let chunkSize =
      offset + MAX_CHUNK_SIZE > rawTx.length
        ? rawTx.length - offset
        : MAX_CHUNK_SIZE;

    const buffer = Buffer.alloc(
      chunkSize
    );

    rawTx.copy(buffer, 0, offset, offset + chunkSize);

    payloads.push(buffer);
    offset += chunkSize;
  }
  return payloads;
};

/**
 * Serializes an account transaction with a derivation path.
 * @param {AccountTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloads: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeTransaction = (txn: AccountTransaction, path: string): { payloads: Buffer[] } => {
  const txSerialized = serializeAccountTransaction(txn);
  const payloads = serializeTransactionPayloadsWithDerivationPath(path, txSerialized);
  return { payloads };
}

/**
 * Serializes a simple transfer transaction.
 * @param {ISimpleTransferTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloads: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeSimpleTransfer = (txn: ISimpleTransferTransaction, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};

/**
 * Serializes a simple transfer transaction with a memo.
 * @param {ISimpleTransferWithMemoTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloadHeaderAddressMemoLength: Buffer[], payloadsMemo: Buffer[], payloadsAmount: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeSimpleTransferWithMemo = (txn: ISimpleTransferWithMemoTransaction, path: string): { payloadHeaderAddressMemoLength: Buffer[], payloadsMemo: Buffer[], payloadsAmount: Buffer[] } => {
  // Convert the string to a buffer
  const memo: string = txn.payload.memo.toString();
  const memoBuffer = NodeBuffer.from(memo, 'utf-8');
  // Encode the buffer as a DataBlob
  txn.payload.memo = new DataBlob(memoBuffer);

  const serializedType = Buffer.from(Uint8Array.of(txn.transactionKind));
  const serializedToAddress = AccountAddress.toBuffer(txn.payload.toAddress);
  const serializedAmount = encodeWord64(txn.payload.amount.microCcdAmount);
  const serializedMemo = encodeDataBlob(txn.payload.memo);
  const memoLength = serializedMemo.subarray(0, 2);

  const payloadSize = serializedType.length + serializedMemo.length + serializedAmount.length + serializedToAddress.length;
  const serializedHeader = serializeAccountTransactionHeader(txn, payloadSize);
  const serializedHeaderAddressMemoLength = Buffer.concat([serializedHeader, serializedType, serializedToAddress, memoLength]);

  const payloadHeaderAddressMemoLength = serializeTransactionPayloadsWithDerivationPath(path, serializedHeaderAddressMemoLength);
  const payloadsMemo = serializeTransactionPayloads(serializedMemo.subarray(2));
  const payloadsAmount = serializeTransactionPayloads(serializedAmount);

  return { payloadHeaderAddressMemoLength, payloadsMemo, payloadsAmount };
};

/**
 * Serializes a transfer transaction with a schedule.
 * @param {ISimpleTransferWithScheduleTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloadHeaderAddressScheduleLength: Buffer[], payloadsSchedule: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeTransferWithSchedule = (txn: ISimpleTransferWithScheduleTransaction, path: string): { payloadHeaderAddressScheduleLength: Buffer[], payloadsSchedule: Buffer[] } => {
  const serializedType = Buffer.from(Uint8Array.of(txn.transactionKind));
  const toAddressBuffer = AccountAddress.toBuffer(txn.payload.toAddress);
  const scheduleLength = encodeInt8(txn.payload.schedule.length);
  const scheduleBuffer = txn.payload.schedule.map((item: { timestamp: string, amount: string }) => {
    const timestampBuffer = encodeWord64(item.timestamp);
    const amountBuffer = encodeWord64(item.amount);
    return Buffer.concat([timestampBuffer, amountBuffer]);
  });
  const serializedSchedule = Buffer.concat([...scheduleBuffer]);


  const payloadSize = serializedType.length + scheduleLength.length + serializedSchedule.length + toAddressBuffer.length;
  const serializedHeader = serializeAccountTransactionHeader(txn, payloadSize);
  const serializedHeaderAddressScheduleLength = Buffer.concat([serializedHeader, serializedType, toAddressBuffer, scheduleLength]);

  const payloadHeaderAddressScheduleLength = serializeTransactionPayloadsWithDerivationPath(path, serializedHeaderAddressScheduleLength);
  const payloadsSchedule: Buffer[] = [];

  let remainingPairs = txn.payload.schedule.length
  for (let i = 0; i < scheduleBuffer.length; i += MAX_SCHEDULE_CHUNK_SIZE) {
    const offset = remainingPairs > MAX_SCHEDULE_CHUNK_SIZE ? MAX_SCHEDULE_CHUNK_SIZE : remainingPairs
    const scheduleChunk = serializeTransactionPayloads(serializedSchedule.subarray(i * 16, (i + offset) * 16));
    payloadsSchedule.push(...scheduleChunk);
    remainingPairs = txn.payload.schedule.length - MAX_SCHEDULE_CHUNK_SIZE
  }
  return { payloadHeaderAddressScheduleLength, payloadsSchedule };
};

/**
 * Serializes a configure delegation transaction.
 * @param {IConfigureDelegationTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloads: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeConfigureDelegation = (txn: IConfigureDelegationTransaction, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};

/**
 * Serializes a configure baker transaction.
 * @param {IConfigureBakerTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloadHeaderKindAndBitmap: Buffer, payloadFirstBatch: Buffer, payloadAggregationKeys: Buffer, payloadUrlLength: Buffer, payloadURL: Buffer, payloadCommissionFee: Buffer }} - An object containing serialized payloads.
 */
export const serializeConfigureBaker = (txn: IConfigureBakerTransaction, path: string): { payloadHeaderKindAndBitmap: Buffer, payloadFirstBatch: Buffer, payloadAggregationKeys: Buffer, payloadUrlLength: Buffer, payloadURL: Buffer, payloadCommissionFee: Buffer } => {
  let stake: Buffer = Buffer.alloc(0);
  let restakeEarnings: Buffer = Buffer.alloc(0);
  let openForDelegation: Buffer = Buffer.alloc(0);
  let keys: Buffer = Buffer.alloc(0);
  let metadataUrl: Buffer = Buffer.alloc(0);
  let url: Buffer = Buffer.alloc(0);
  let transactionFeeCommission: Buffer = Buffer.alloc(0);
  let bakingRewardCommission: Buffer = Buffer.alloc(0);
  let finalizationRewardCommission: Buffer = Buffer.alloc(0);
  let offset: number = 0;

  const txSerialized = serializeAccountTransaction(txn);
  const headerKindAndBitmap = txSerialized.subarray(0, HEADER_LENGTH + TRANSACTION_KIND_LENGTH + BITMAP_LENGTH);
  offset += HEADER_LENGTH + TRANSACTION_KIND_LENGTH + BITMAP_LENGTH;
  if (txn.payload.hasOwnProperty('stake')) {
    stake = txSerialized.subarray(offset, offset + STAKING_PAYLOAD_LENGTH);
    offset += STAKING_PAYLOAD_LENGTH;
  }
  if (txn.payload.hasOwnProperty('restakeEarnings')) {
    restakeEarnings = txSerialized.subarray(offset, offset + RESTAKE_EARNINGS_PAYLOAD_LENGTH);
    offset += RESTAKE_EARNINGS_PAYLOAD_LENGTH;
  }
  if (txn.payload.hasOwnProperty('openForDelegation')) {
    openForDelegation = txSerialized.subarray(offset, offset + OPEN_FOR_DELEGATION_PAYLOAD_LENGTH);
    offset += OPEN_FOR_DELEGATION_PAYLOAD_LENGTH;
  }
  if (txn.payload.hasOwnProperty('keys')) {
    keys = txSerialized.subarray(offset, offset + KEYS_PAYLOAD_LENGTH);
    offset += KEYS_PAYLOAD_LENGTH;
  }
  if (txn.payload.hasOwnProperty('metadataUrl')) {
    metadataUrl = txSerialized.subarray(offset, offset + METADATA_URL_LENGTH);
    offset += METADATA_URL_LENGTH;
    url = txSerialized.subarray(offset, offset + metadataUrl.readUInt16BE(0));
    offset += metadataUrl.readUInt16BE(0);
  }
  if (txn.payload.hasOwnProperty('transactionFeeCommission')) {
    transactionFeeCommission = txSerialized.subarray(offset, offset + TRANSACTION_FEE_COMMISSION_LENGTH);
    offset += TRANSACTION_FEE_COMMISSION_LENGTH;
  }
  if (txn.payload.hasOwnProperty('bakingRewardCommission')) {
    bakingRewardCommission = txSerialized.subarray(offset, offset + BAKING_REWARD_COMMISSION_LENGTH);
    offset += BAKING_REWARD_COMMISSION_LENGTH;
  }
  if (txn.payload.hasOwnProperty('finalizationRewardCommission')) {
    finalizationRewardCommission = txSerialized.subarray(offset, offset + FINALIZATION_REWARD_COMMISSION_LENGTH);
  }

  const payloadHeaderKindAndBitmap = serializeTransactionPayloadsWithDerivationPath(path, headerKindAndBitmap);
  const payloadFirstBatch = Buffer.concat([stake, restakeEarnings, openForDelegation, keys.subarray(0, KEYS_ELECTION_AND_SIGNATURE_LENGTH)]);
  const payloadAggregationKeys = keys.subarray(KEYS_ELECTION_AND_SIGNATURE_LENGTH);
  const payloadUrlLength = metadataUrl;
  const payloadURL = url;
  const payloadCommissionFee = Buffer.concat([transactionFeeCommission, bakingRewardCommission, finalizationRewardCommission]);

  return { payloadHeaderKindAndBitmap: payloadHeaderKindAndBitmap[0], payloadFirstBatch, payloadAggregationKeys, payloadUrlLength, payloadURL, payloadCommissionFee };
};

/**
 * Serializes a transfer transaction with a schedule and memo.
 * @param {ISimpleTransferWithScheduleAndMemoTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloadHeaderAddressScheduleLengthAndMemoLength: Buffer[], payloadMemo: Buffer[], payloadsSchedule: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeTransferWithScheduleAndMemo = (txn: ISimpleTransferWithScheduleAndMemoTransaction, path: string): { payloadHeaderAddressScheduleLengthAndMemoLength: Buffer[], payloadMemo: Buffer[], payloadsSchedule: Buffer[] } => {
  // Convert the string to a buffer
  const memo: string = txn.payload.memo as string;
  const memoBuffer = NodeBuffer.from(memo, 'utf-8');
  // Encode the buffer as a DataBlob
  txn.payload.memo = new DataBlob(memoBuffer);

  const toAddressBuffer = AccountAddress.toBuffer(txn.payload.toAddress);
  const scheduleLength = encodeInt8(txn.payload.schedule.length);
  const scheduleBufferArray = txn.payload.schedule.map((item: { timestamp: string, amount: string }) => {
    const timestampBuffer = encodeWord64(item.timestamp);
    const amountBuffer = encodeWord64(item.amount);
    return Buffer.concat([timestampBuffer, amountBuffer]);
  });

  const serializedSchedule = Buffer.concat([...scheduleBufferArray]);
  const serializedMemo = encodeDataBlob(txn.payload.memo);
  const serializedType = Buffer.from(Uint8Array.of(txn.transactionKind));

  const payloadSize = serializedType.length + scheduleLength.length + serializedSchedule.length + toAddressBuffer.length + serializedMemo.length;
  const serializedHeader = serializeAccountTransactionHeader(txn, payloadSize);
  const serializedHeaderAddressScheduleLengthAndMemoLength = Buffer.concat([serializedHeader, serializedType, toAddressBuffer, scheduleLength, serializedMemo.subarray(0, 2)]);

  const payloadHeaderAddressScheduleLengthAndMemoLength = serializeTransactionPayloadsWithDerivationPath(path, serializedHeaderAddressScheduleLengthAndMemoLength);
  const payloadMemo = serializeTransactionPayloads(serializedMemo.subarray(2));
  const payloadsSchedule: Buffer[] = [];

  let remainingPairs = txn.payload.schedule.length
  for (let i = 0; i < scheduleBufferArray.length; i += MAX_SCHEDULE_CHUNK_SIZE) {
    const offset = remainingPairs > MAX_SCHEDULE_CHUNK_SIZE ? MAX_SCHEDULE_CHUNK_SIZE : remainingPairs
    const scheduleChunk = serializeTransactionPayloads(serializedSchedule.subarray(i * 16, (i + offset) * 16));
    payloadsSchedule.push(...scheduleChunk);
    remainingPairs = txn.payload.schedule.length - MAX_SCHEDULE_CHUNK_SIZE
  }

  return { payloadHeaderAddressScheduleLengthAndMemoLength, payloadMemo, payloadsSchedule };
};

/**
 * Serializes a register data transaction.
 * @param {IRegisterDataTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloadHeader: Buffer[], payloadsData: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeRegisterData = (txn: IRegisterDataTransaction, path: string): { payloadHeader: Buffer[], payloadsData: Buffer[] } => {
  // Convert the string to a buffer
  const data: string = txn.payload.data as string;
  const dataBuffer = NodeBuffer.from(data, 'utf-8');
  // Encode the buffer as a DataBlob
  txn.payload.data = new DataBlob(dataBuffer);

  const serializedData = encodeDataBlob(txn.payload.data);
  const serializedType = Buffer.from(Uint8Array.of(txn.transactionKind));

  const payloadSize = serializedType.length + serializedData.length;
  const serializedHeader = serializeAccountTransactionHeader(txn, payloadSize);
  const serializedHeaderAndKind = Buffer.concat([serializedHeader, serializedType, serializedData.subarray(0, 2)]);

  const payloadHeader = serializeTransactionPayloadsWithDerivationPath(path, serializedHeaderAndKind);
  const payloadsData = serializeTransactionPayloads(serializedData.subarray(2));

  return { payloadHeader, payloadsData };
};

/**
 * Serializes a transfer to public transaction.
 * @param {ITransferToPublicTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloadHeader: Buffer[], payloadsAmountAndProofsLength: Buffer[], payloadsProofs: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeTransferToPublic = (txn: ITransferToPublicTransaction, path: string): { payloadHeader: Buffer[], payloadsAmountAndProofsLength: Buffer[], payloadsProofs: Buffer[] } => {
  const remainingAmount = Buffer.from(txn.payload.remainingAmount, 'hex');
  const transferAmount = encodeWord64(txn.payload.transferAmount.microCcdAmount);
  const index = encodeWord64(txn.payload.index);
  const proofs = Buffer.from(txn.payload.proofs, 'hex');
  const proofsLength = encodeWord16(proofs.length);

  const serializedType = Buffer.from(Uint8Array.of(txn.transactionKind));
  const payloadSize = remainingAmount.length + transferAmount.length + index.length + proofsLength.length + proofs.length + serializedType.length;
  const serializedHeader = serializeAccountTransactionHeader(txn, payloadSize);
  const serializedHeaderAndKind = Buffer.concat([serializedHeader, serializedType]);
  const serializedAmountAndProofsLength = Buffer.concat([remainingAmount, transferAmount, index, proofsLength]);

  const payloadHeader = serializeTransactionPayloadsWithDerivationPath(path, serializedHeaderAndKind);
  const payloadsAmountAndProofsLength = serializeTransactionPayloads(serializedAmountAndProofsLength);
  const payloadsProofs = serializeTransactionPayloads(proofs);

  return { payloadHeader, payloadsAmountAndProofsLength, payloadsProofs };
};

/**
 * Serializes a deploy module transaction.
 * @param {IDeployModuleTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloads: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeDeployModule = (txn: IDeployModuleTransaction, path: string): { payloadsHeaderAndVersion: Buffer[], payloadSource: Buffer } => {
  const txSerialized = serializeAccountTransaction(txn);
  const headerAndVersion = txSerialized.subarray(0, HEADER_LENGTH + TRANSACTION_KIND_LENGTH + VERSION_LENGTH + SOURCE_LENGTH_LENGTH);
  const payloadSource = txSerialized.subarray(HEADER_LENGTH + TRANSACTION_KIND_LENGTH + VERSION_LENGTH + SOURCE_LENGTH_LENGTH);

  const payloadsHeaderAndVersion = serializeTransactionPayloadsWithDerivationPath(path, headerAndVersion);
  return {payloadsHeaderAndVersion, payloadSource};
};

/**
 * Serializes an init contract transaction.
 * @param {IInitContractTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloads: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeInitContract = (txn: IInitContractTransaction, path: string): { payloadsHeaderAndData: Buffer[], payloadsName: Buffer[], payloadsParam: Buffer[] } => {
  const txSerialized = serializeAccountTransaction(txn);
  let offset = 0;
  const headerAndData = txSerialized.subarray(0, HEADER_LENGTH + TRANSACTION_KIND_LENGTH + AMOUNT_LENGTH + MODULE_REF_LENGTH);
  offset += HEADER_LENGTH + TRANSACTION_KIND_LENGTH + AMOUNT_LENGTH + MODULE_REF_LENGTH;
  const payloadsHeaderAndData = serializeTransactionPayloadsWithDerivationPath(path, headerAndData);

  const nameLength = txSerialized.subarray(offset, offset + 2*ONE_OCTET_LENGTH);
  offset += 2*ONE_OCTET_LENGTH;
  const name = txSerialized.subarray(offset, offset + nameLength.readUInt16BE(0));
  offset += nameLength.readUInt16BE(0);
  const payloadsName = serializeTransactionPayloads(Buffer.concat([nameLength, name]));

  const paramLength = txSerialized.subarray(offset, offset + 2*ONE_OCTET_LENGTH);
  offset += 2*ONE_OCTET_LENGTH;
  const param = txSerialized.subarray(offset, offset + paramLength.readUInt16BE(0));
  offset += paramLength.readUInt16BE(0);
  const payloadsParam = serializeTransactionPayloads(Buffer.concat([paramLength, param]));

  return { payloadsHeaderAndData, payloadsName, payloadsParam };
};

/**
 * Serializes an update contract transaction.
 * @param {IUpdateContractTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloads: Buffer[] }} - An object containing serialized payloads.
 */
export const serializeUpdateContract = (txn: IUpdateContractTransaction, path: string): { payloadsHeaderAndData: Buffer[], payloadsName: Buffer[], payloadsParam: Buffer[] } => {
  const txSerialized = serializeAccountTransaction(txn);
  let offset = 0;
  const headerAndData = txSerialized.subarray(0, HEADER_LENGTH + TRANSACTION_KIND_LENGTH + AMOUNT_LENGTH + UPDATE_INDEX_LENGTH + UPDATE_SUB_INDEX_LENGTH);
  offset += HEADER_LENGTH + TRANSACTION_KIND_LENGTH + AMOUNT_LENGTH + UPDATE_INDEX_LENGTH + UPDATE_SUB_INDEX_LENGTH;
  const payloadsHeaderAndData = serializeTransactionPayloadsWithDerivationPath(path, headerAndData);

  const nameLength = txSerialized.subarray(offset, offset + 2*ONE_OCTET_LENGTH);
  offset += 2*ONE_OCTET_LENGTH;
  const name = txSerialized.subarray(offset, offset + nameLength.readUInt16BE(0));
  offset += nameLength.readUInt16BE(0);
  const payloadsName = serializeTransactionPayloads(Buffer.concat([nameLength, name]));

  const paramLength = txSerialized.subarray(offset, offset + 2*ONE_OCTET_LENGTH);
  offset += 2*ONE_OCTET_LENGTH;
  const param = txSerialized.subarray(offset, offset + paramLength.readUInt16BE(0));
  offset += paramLength.readUInt16BE(0);
  const payloadsParam = serializeTransactionPayloads(Buffer.concat([paramLength, param]));

  return { payloadsHeaderAndData, payloadsName, payloadsParam };
};

/**
 * Serializes a credential deployment transaction.
 * @param {ICredentialDeploymentTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloadDerivationPath: Buffer, numberOfVerificationKeys: Buffer, keyIndexAndSchemeAndVerificationKey: Buffer, thresholdAndRegIdAndIPIdentity: Buffer, encIdCredPubShareAndKey: Buffer, validToAndCreatedAtAndAttributesLength: Buffer, attributesLength: Buffer, tag: Buffer[], valueLength: Buffer[], value: Buffer[], proofLength: Buffer, proofs: Buffer }} - An object containing serialized payloads.
 */
export const serializeCredentialDeployment = (txn: ICredentialDeploymentTransaction, path: string): { payloadDerivationPath: Buffer, numberOfVerificationKeys: Buffer, keyIndexAndSchemeAndVerificationKey: Buffer, thresholdAndRegIdAndIPIdentity: Buffer, encIdCredPubShareAndKey: Buffer, validToAndCreatedAtAndAttributesLength: Buffer, attributesLength: Buffer, tag: Buffer[], valueLength: Buffer[], value: Buffer[], proofLength: Buffer, proofs: Buffer } => {
  let offset = 0;
  const txSerialized = serializeCredentialDeploymentInfo(txn);
  const payloadDerivationPath = pathToBuffer(path);
  let tag: Buffer[] = [];
  let valueLength: Buffer[] = [];
  let value: Buffer[] = [];
  let proofLength: Buffer = Buffer.alloc(0);
  let proofs: Buffer = Buffer.alloc(0);

  const numberOfVerificationKeys = Buffer.from(txSerialized.subarray(offset, offset + INDEX_LENGTH));
  offset += INDEX_LENGTH;
  const keyIndexAndSchemeAndVerificationKey = Buffer.from(txSerialized.subarray(offset, offset + 2 * ONE_OCTET_LENGTH + KEY_LENGTH));
  offset += 2 * ONE_OCTET_LENGTH + KEY_LENGTH;
  const thresholdAndRegIdAndIPIdentity = Buffer.from(txSerialized.subarray(offset, offset + 2 * ONE_OCTET_LENGTH + REG_ID_LENGTH + IP_IDENTITY_LENGTH + AR_DATA_LENGTH));
  offset += 2 * ONE_OCTET_LENGTH + REG_ID_LENGTH + IP_IDENTITY_LENGTH + AR_DATA_LENGTH;
  const encIdCredPubShareAndKey = Buffer.from(txSerialized.subarray(offset, offset + 4 * ONE_OCTET_LENGTH + ID_CRED_PUB_SHARE_LENGTH));
  offset += 4 * ONE_OCTET_LENGTH + ID_CRED_PUB_SHARE_LENGTH;
  const validToAndCreatedAtAndAttributesLength = Buffer.from(txSerialized.subarray(offset, offset + ATTRIBUTES_LENGTH + VALID_TO_LENGTH + CREATED_AT_LENGTH));
  offset += ATTRIBUTES_LENGTH + VALID_TO_LENGTH + CREATED_AT_LENGTH;
  const attributesLength = validToAndCreatedAtAndAttributesLength.subarray(-ATTRIBUTES_LENGTH);
  tag = [];
  valueLength = [];
  value = [];
  for (let j = 0; j < attributesLength.readUInt16BE(0); j++) {
    tag.push(Buffer.from(txSerialized.subarray(offset, offset + TAG_LENGTH)));
    offset += TAG_LENGTH;
    valueLength.push(Buffer.from(txSerialized.subarray(offset, offset + VALUE_LENGTH)));
    offset += VALUE_LENGTH;
    value.push(Buffer.from(txSerialized.subarray(offset, offset + valueLength[j].readUInt8(0))));
    offset += valueLength[j].readUInt8(0);
  }

  proofLength = Buffer.from(txSerialized.subarray(offset, offset + PROOF_LENGTH_LENGTH));
  offset += PROOF_LENGTH_LENGTH;
  proofs = Buffer.from(txSerialized.subarray(offset, offset + proofLength.readUInt32BE(0)));

  return { payloadDerivationPath, numberOfVerificationKeys, keyIndexAndSchemeAndVerificationKey, thresholdAndRegIdAndIPIdentity, encIdCredPubShareAndKey, validToAndCreatedAtAndAttributesLength, attributesLength, tag, valueLength, value, proofLength, proofs };
};

/**
 * Serializes an update credentials transaction.
 * @param {IUpdateCredentialsTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloadHeaderKindAndIndexLength: Buffer[], credentialIndex: Buffer[], numberOfVerificationKeys: Buffer[], keyIndexAndSchemeAndVerificationKey: Buffer[], thresholdAndRegIdAndIPIdentity: Buffer[], encIdCredPubShareAndKey: Buffer[], validToAndCreatedAtAndAttributesLength: Buffer[], attributesLength: Buffer[], tag: Buffer[][], valueLength: Buffer[][], value: Buffer[][], proofLength: Buffer[], proofs: Buffer[], credentialIdCount: Buffer, credentialIds: Buffer[], threshold: Buffer }} - An object containing serialized payloads.
 */
export const serializeUpdateCredentials = (txn: IUpdateCredentialsTransaction, path: string): { payloadHeaderKindAndIndexLength: Buffer[], credentialIndex: Buffer[], numberOfVerificationKeys: Buffer[], keyIndexAndSchemeAndVerificationKey: Buffer[], thresholdAndRegIdAndIPIdentity: Buffer[], encIdCredPubShareAndKey: Buffer[], validToAndCreatedAtAndAttributesLength: Buffer[], attributesLength: Buffer[], tag: Buffer[][], valueLength: Buffer[][], value: Buffer[][], proofLength: Buffer[], proofs: Buffer[], credentialIdCount: Buffer, credentialIds: Buffer[], threshold: Buffer } => {
  let offset = 0;
  const txSerialized = serializeAccountTransaction(txn);
  const headerKindAndIndexLength = txSerialized.subarray(offset, offset + HEADER_LENGTH + TRANSACTION_KIND_LENGTH + INDEX_LENGTH);
  const payloadHeaderKindAndIndexLength = serializeTransactionPayloadsWithDerivationPath(path, headerKindAndIndexLength);
  offset += HEADER_LENGTH + TRANSACTION_KIND_LENGTH + INDEX_LENGTH;

  let credentialIndex: Buffer[] = [];
  let numberOfVerificationKeys: Buffer[] = [];
  let keyIndexAndSchemeAndVerificationKey: Buffer[] = [];
  let thresholdAndRegIdAndIPIdentity: Buffer[] = [];
  let encIdCredPubShareAndKey: Buffer[] = [];
  let validToAndCreatedAtAndAttributesLength: Buffer[] = [];
  let attributesLength: Buffer[] = [];
  let tag: Buffer[][] = [[]];
  let valueLength: Buffer[][] = [[]];
  let value: Buffer[][] = [[]];
  let proofLength: Buffer[] = [];
  let proofs: Buffer[] = [];

  for (let i = 0; i < txn.payload.newCredentials.length; i++) {
    credentialIndex[i] = txSerialized.subarray(offset, offset + INDEX_LENGTH);
    offset += INDEX_LENGTH;
    numberOfVerificationKeys[i] = txSerialized.subarray(offset, offset + INDEX_LENGTH);
    offset += INDEX_LENGTH;
    keyIndexAndSchemeAndVerificationKey[i] = txSerialized.subarray(offset, offset + 2 * ONE_OCTET_LENGTH + KEY_LENGTH);
    offset += 2 * ONE_OCTET_LENGTH + KEY_LENGTH;
    thresholdAndRegIdAndIPIdentity[i] = txSerialized.subarray(offset, offset + 2 * ONE_OCTET_LENGTH + REG_ID_LENGTH + IP_IDENTITY_LENGTH + AR_DATA_LENGTH);
    offset += 2 * ONE_OCTET_LENGTH + REG_ID_LENGTH + IP_IDENTITY_LENGTH + AR_DATA_LENGTH;
    encIdCredPubShareAndKey[i] = txSerialized.subarray(offset, offset + 4 * ONE_OCTET_LENGTH + ID_CRED_PUB_SHARE_LENGTH);
    offset += 4 * ONE_OCTET_LENGTH + ID_CRED_PUB_SHARE_LENGTH;
    validToAndCreatedAtAndAttributesLength[i] = txSerialized.subarray(offset, offset + ATTRIBUTES_LENGTH + VALID_TO_LENGTH + CREATED_AT_LENGTH);
    offset += ATTRIBUTES_LENGTH + VALID_TO_LENGTH + CREATED_AT_LENGTH;
    attributesLength[i] = validToAndCreatedAtAndAttributesLength[i].subarray(-ATTRIBUTES_LENGTH);
    tag[i] = [];
    valueLength[i] = [];
    value[i] = [];
    for (let j = 0; j < attributesLength[i].readUInt16BE(0); j++) {
      tag[i].push(txSerialized.subarray(offset, offset + TAG_LENGTH));
      offset += TAG_LENGTH;
      valueLength[i].push(txSerialized.subarray(offset, offset + VALUE_LENGTH));
      offset += VALUE_LENGTH;
      value[i].push(txSerialized.subarray(offset, offset + valueLength[i][j].readUInt8(0)));
      offset += valueLength[i][j].readUInt8(0);
    }

    proofLength[i] = txSerialized.subarray(offset, offset + PROOF_LENGTH_LENGTH);
    offset += PROOF_LENGTH_LENGTH;
    proofs[i] = txSerialized.subarray(offset, offset + proofLength[i].readUInt32BE(0));
    offset += proofLength[i].readUInt32BE(0);
  }
  const credentialIdCount = txSerialized.subarray(offset, offset + ONE_OCTET_LENGTH);
  offset += ONE_OCTET_LENGTH;

  const credentialIds: Buffer[] = [];
  for (let i = 0; i < credentialIdCount.readUInt8(0); i++) {
    credentialIds.push(txSerialized.subarray(offset, offset + CREDENTIAL_ID_LENGTH));
    offset += CREDENTIAL_ID_LENGTH;
  }
  const threshold = txSerialized.subarray(offset, offset + ONE_OCTET_LENGTH);

  return { payloadHeaderKindAndIndexLength, credentialIndex, numberOfVerificationKeys, keyIndexAndSchemeAndVerificationKey, thresholdAndRegIdAndIPIdentity, encIdCredPubShareAndKey, validToAndCreatedAtAndAttributesLength, attributesLength, tag, valueLength, value, proofLength, proofs, credentialIdCount, credentialIds, threshold };
};

/**
 * Serializes public information for an IP transaction.
 * @param {IPublicInfoForIpTransaction} txn - The transaction to serialize.
 * @param {string} path - The BIP32 path as a string.
 * @returns {{ payloadIdCredPubAndRegIdAndKeysLenght: Buffer, payloadKeys: Buffer[], payloadThreshold: Buffer }} - An object containing serialized payloads.
 */
export const serializePublicInfoForIp = (txn: IPublicInfoForIpTransaction, path: string): { payloadIdCredPubAndRegIdAndKeysLenght: Buffer, payloadKeys: Buffer[], payloadThreshold: Buffer } => {

  const pathBuffer = pathToBuffer(path);

  const serializedIdCredPub = Buffer.from(txn.idCredPub, 'hex');
  const serializedRegId = Buffer.from(txn.regId, 'hex');
  const serializedPublicKeys = serializeMap(txn.publicKeys.keys, encodeWord8, encodeWord8FromString, serializeVerifyKey);
  const payloadThreshold = encodeInt8(txn.publicKeys.threshold);

  const payloadIdCredPubAndRegIdAndKeysLenght = Buffer.concat([pathBuffer,serializedIdCredPub, serializedRegId, serializedPublicKeys.subarray(0, 1)]);

  let payloadKeys: Buffer[] = [];
  for (let i = 0; i < Object.keys(txn.publicKeys.keys).length; i++) {
    payloadKeys.push(Buffer.concat([serializedPublicKeys.subarray(i * (KEY_LENGTH + 2 * ONE_OCTET_LENGTH) + 1, (i + 1) * (KEY_LENGTH + 2 * ONE_OCTET_LENGTH) + 1)]));
  }

  return { payloadIdCredPubAndRegIdAndKeysLenght, payloadKeys, payloadThreshold };
};
