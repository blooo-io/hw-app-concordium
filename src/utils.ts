import { AccountAddress, AccountTransactionType, getAccountTransactionHandler } from "@concordium/web-sdk";

export function isAccountTransactionHandlerExists(transactionKind: AccountTransactionType) {
  switch (transactionKind) {
    case AccountTransactionType.Transfer:
      return true;
    case AccountTransactionType.TransferWithMemo:
      return true;
    case AccountTransactionType.DeployModule:
      return true;
    case AccountTransactionType.InitContract:
      return true;
    case AccountTransactionType.Update:
      return true;
    case AccountTransactionType.UpdateCredentials:
      return true;
    case AccountTransactionType.RegisterData:
      return true;
    case AccountTransactionType.ConfigureDelegation:
      return true;
    case AccountTransactionType.ConfigureBaker:
      return true;
    default:
      return false;
  }
}

/**
 * Encodes a 64 bit unsigned integer to a Buffer using big endian.
 * @param value a 64 bit integer
 * @param useLittleEndian a boolean value, if not given, the value is serialized in big endian.
 * @returns big endian serialization of the input
 */
export function encodeWord64(value, useLittleEndian = false) {
  if (value > BigInt(18446744073709551615) || value < BigInt(0)) {
    throw new Error('The input has to be a 64 bit unsigned integer but it was: ' + value);
  }
  const arr = new ArrayBuffer(8);
  const view = new DataView(arr);
  view.setBigUint64(0, value, useLittleEndian);
  return Buffer.from(new Uint8Array(arr));
}
/**
* Encodes a 32 bit signed integer to a Buffer using big endian.
* @param value a 32 bit integer
* @param useLittleEndian a boolean value, if not given, the value is serialized in big endian.
* @returns big endian serialization of the input
*/
export function encodeInt32(value, useLittleEndian = false) {
  if (value < -2147483648 || value > 2147483647 || !Number.isInteger(value)) {
    throw new Error('The input has to be a 32 bit signed integer but it was: ' + value);
  }
  const arr = new ArrayBuffer(4);
  const view = new DataView(arr);
  view.setInt32(0, value, useLittleEndian);
  return Buffer.from(new Int8Array(arr));
}
/**
* Encodes a 32 bit unsigned integer to a Buffer.
* @param value a 32 bit integer
* @param useLittleEndian a boolean value, if not given, the value is serialized in big endian.
* @returns big endian serialization of the input
*/
export function encodeWord32(value, useLittleEndian = false) {
  if (value > 4294967295 || value < 0 || !Number.isInteger(value)) {
    throw new Error('The input has to be a 32 bit unsigned integer but it was: ' + value);
  }
  const arr = new ArrayBuffer(4);
  const view = new DataView(arr);
  view.setUint32(0, value, useLittleEndian);
  return Buffer.from(new Uint8Array(arr));
}

/**
 * Encodes a 16 bit unsigned integer to a Buffer using big endian.
 * @param value a 16 bit integer
 * @param useLittleEndian a boolean value, if not given, the value is serialized in big endian.
 * @returns big endian serialization of the input
 */
export function encodeWord16(value, useLittleEndian = false) {
  if (value > 65535 || value < 0 || !Number.isInteger(value)) {
      throw new Error('The input has to be a 16 bit unsigned integer but it was: ' + value);
  }
  const arr = new ArrayBuffer(2);
  const view = new DataView(arr);
  view.setUint16(0, value, useLittleEndian);
  return Buffer.from(new Uint8Array(arr));
}

/**
 * Encodes a 8 bit signed integer to a Buffer using big endian.
 * @param value a 8 bit integer
 * @returns big endian serialization of the input
 */
export function encodeInt8(value: number): Buffer {
  if (value > 127 || value < -128 || !Number.isInteger(value)) {
    throw new Error('The input has to be a 8 bit signed integer but it was: ' + value);
  }
  return Buffer.from(Buffer.of(value));
}

export function encodeDataBlob(blob) {
  const length = encodeWord16(blob.data.length);
  return Buffer.concat([length, blob.data]);
}

function serializeSchedule(payload: any) {
  const toAddressBuffer = AccountAddress.toBuffer(payload.toAddress);
  const scheduleLength = encodeInt8(payload.schedule.length);
  const bufferArray = payload.schedule.map((item: { timestamp: string, amount: string }) => {
    const timestampBuffer = encodeWord64(item.timestamp);
    const amountBuffer = encodeWord64(item.amount);
    return Buffer.concat([timestampBuffer, amountBuffer]);
  });

  return Buffer.concat([toAddressBuffer, scheduleLength, ...bufferArray]);
}

function serializeScheduleAndMemo(payload: any) {
  const toAddressBuffer = AccountAddress.toBuffer(payload.toAddress);
  const scheduleLength = encodeInt8(payload.schedule.length);
  const bufferArray = payload.schedule.map((item: { timestamp: string, amount: string }) => {
    const timestampBuffer = encodeWord64(item.timestamp);
    const amountBuffer = encodeWord64(item.amount);
    return Buffer.concat([timestampBuffer, amountBuffer]);
  });
  const serializedMemo = encodeDataBlob(payload.memo);

  return Buffer.concat([toAddressBuffer, serializedMemo, scheduleLength, ...bufferArray]);
}

/**
 * Serialization of an account transaction header. The payload size is a part of the header,
 * but is factored out of the type as it always has to be derived from the serialized
 * transaction payload, which cannot happen until the payload has been constructed.
 * @param header the account transaction header with metadata about the transaction
 * @param payloadSize the byte size of the serialized payload
 * @returns the serialized account transaction header
 */
const serializeAccountTransactionHeader = (accountTransaction, payloadSize) => {
  const serializedSender = AccountAddress.toBuffer(accountTransaction.sender);
  const serializedNonce = encodeWord64(accountTransaction.nonce);
  const serializedEnergyAmount = encodeWord64(accountTransaction.energyAmount);
  const serializedPayloadSize = encodeWord32(payloadSize);
  const serializedExpiry = encodeWord64(accountTransaction.expiry);
  return Buffer.concat([
    serializedSender,
    serializedNonce,
    serializedEnergyAmount,
    serializedPayloadSize,
    serializedExpiry,
  ]);
}

/**
* Serializes a transaction and its signatures. This serialization when sha256 hashed
* is considered as the transaction hash, and is used to look up the status of a
* submitted transaction.
* @param accountTransaction the transaction to serialize
* @param signatures signatures on the signed digest of the transaction
* @returns the serialization of the account transaction, which is used to calculate the transaction hash
*/
export const serializeAccountTransaction = (accountTransaction) => {
  const serializedType = Buffer.from(Uint8Array.of(accountTransaction.transactionKind));
  let serializedPayload;

  if (isAccountTransactionHandlerExists(accountTransaction.transactionKind)) {
    const accountTransactionHandler = getAccountTransactionHandler(accountTransaction.transactionKind);
    serializedPayload = accountTransactionHandler.serialize(accountTransaction.payload);
  } else if (accountTransaction.transactionKind === AccountTransactionType.TransferWithSchedule) {
    serializedPayload = serializeSchedule(accountTransaction.payload);
  } else if (accountTransaction.transactionKind === AccountTransactionType.TransferWithScheduleAndMemo) {
    serializedPayload = serializeScheduleAndMemo(accountTransaction.payload);
  }

  const serializedHeader = serializeAccountTransactionHeader(accountTransaction, serializedPayload.length + 1);
  return Buffer.concat([
    serializedHeader,
    serializedType,
    serializedPayload,
  ]);
}