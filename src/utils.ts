import { AccountAddress, AccountTransactionType, getAccountTransactionHandler } from "@concordium/web-sdk";

/**
 * Checks if a transaction handler exists for a given transaction kind.
 * @param transactionKind The type of account transaction.
 * @returns True if a handler exists, false otherwise.
 */
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
 * Encodes a 64-bit unsigned integer to a Buffer using big endian.
 * @param value A 64-bit integer.
 * @param useLittleEndian A boolean value, if not given, the value is serialized in big endian.
 * @returns Big endian serialization of the input.
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
 * Encodes a 32-bit signed integer to a Buffer using big endian.
 * @param value A 32-bit integer.
 * @param useLittleEndian A boolean value, if not given, the value is serialized in big endian.
 * @returns Big endian serialization of the input.
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
 * Encodes a 32-bit unsigned integer to a Buffer.
 * @param value A 32-bit integer.
 * @param useLittleEndian A boolean value, if not given, the value is serialized in big endian.
 * @returns Big endian serialization of the input.
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
 * Encodes a 16-bit unsigned integer to a Buffer using big endian.
 * @param value A 16-bit integer.
 * @param useLittleEndian A boolean value, if not given, the value is serialized in big endian.
 * @returns Big endian serialization of the input.
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
 * Encodes an 8-bit signed integer to a Buffer using big endian.
 * @param value An 8-bit integer.
 * @returns Big endian serialization of the input.
 */
export function encodeInt8(value: number): Buffer {
  if (value > 127 || value < -128 || !Number.isInteger(value)) {
    throw new Error('The input has to be a 8 bit signed integer but it was: ' + value);
  }
  return Buffer.from(Buffer.of(value));
}

/**
 * Encodes a data blob with its length as a prefix.
 * @param blob The data blob to encode.
 * @returns A Buffer containing the length-prefixed data blob.
 */
export function encodeDataBlob(blob) {
  const length = encodeWord16(blob.data.length);
  return Buffer.concat([length, blob.data]);
}

/**
 * Serializes a schedule payload.
 * @param payload The schedule payload to serialize.
 * @returns A Buffer containing the serialized schedule.
 */
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

/**
 * Serializes a schedule and memo payload.
 * @param payload The schedule and memo payload to serialize.
 * @returns An object containing the serialized address and memo, and the schedule.
 */
function serializeScheduleAndMemo(payload: any) {
  const toAddressBuffer = AccountAddress.toBuffer(payload.toAddress);
  const scheduleLength = encodeInt8(payload.schedule.length);
  const bufferArray = payload.schedule.map((item: { timestamp: string, amount: string }) => {
    const timestampBuffer = encodeWord64(item.timestamp);
    const amountBuffer = encodeWord64(item.amount);
    return Buffer.concat([timestampBuffer, amountBuffer]);
  });
  const serializedMemo = encodeDataBlob(payload.memo);

  return {
    addressAndMemo: Buffer.concat([toAddressBuffer, serializedMemo]),
    schedule: Buffer.concat([scheduleLength, ...bufferArray]),
  };
}

/**
 * Serializes a transfer with memo payload.
 * @param payload The transfer with memo payload to serialize.
 * @returns An object containing the serialized address and memo, and the amount.
 */
function serializeTransferWithMemo(payload: any) {
  const serializedToAddress = AccountAddress.toBuffer(payload.toAddress);
  const serializedMemo = encodeDataBlob(payload.memo);
  const serializedAmount = encodeWord64(payload.amount.microCcdAmount);

  return {
    addressAndMemo: Buffer.concat([serializedToAddress, serializedMemo]),
    amount: serializedAmount,
  };
}

/**
 * Serializes a transfer to public payload.
 * @param payload The transfer to public payload to serialize.
 * @returns A Buffer containing the serialized transfer to public data.
 */
function serializeTransferToPublic(payload: any) {
  const remainingAmount = Buffer.from(payload.remainingAmount, 'hex');
  const transferAmount = encodeWord64(payload.transferAmount.microCcdAmount);
  const index = encodeWord64(payload.index);
  const proofs = Buffer.from(payload.proofs, 'hex');
  const proofsLength = encodeWord16(proofs.length);
  return Buffer.concat([remainingAmount, transferAmount, index, proofsLength, proofs]);
}

/**
 * Serializes an account transaction header.
 * @param accountTransaction The account transaction header with metadata about the transaction.
 * @param payloadSize The byte size of the serialized payload.
 * @returns The serialized account transaction header.
 */
export const serializeAccountTransactionHeader = (accountTransaction, payloadSize) => {
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
 * Serializes a transaction and its signatures.
 * This serialization when sha256 hashed is considered as the transaction hash,
 * and is used to look up the status of a submitted transaction.
 * @param accountTransaction The transaction to serialize.
 * @param signatures Signatures on the signed digest of the transaction.
 * @returns The serialization of the account transaction, which is used to calculate the transaction hash.
 */
export const serializeAccountTransaction = (accountTransaction) => {
  const serializedType = Buffer.from(Uint8Array.of(accountTransaction.transactionKind));
  let serializedPayload;

  if (isAccountTransactionHandlerExists(accountTransaction.transactionKind) && accountTransaction.transactionKind !== AccountTransactionType.TransferWithMemo) {
    const accountTransactionHandler = getAccountTransactionHandler(accountTransaction.transactionKind);
    serializedPayload = accountTransactionHandler.serialize(accountTransaction.payload);
  } else if (accountTransaction.transactionKind === AccountTransactionType.TransferWithSchedule) {
    serializedPayload = serializeSchedule(accountTransaction.payload);
  } else if (accountTransaction.transactionKind === AccountTransactionType.TransferWithScheduleAndMemo) {
    serializedPayload = serializeScheduleAndMemo(accountTransaction.payload);
  } else if (accountTransaction.transactionKind === AccountTransactionType.TransferToPublic) {
    serializedPayload = serializeTransferToPublic(accountTransaction.payload);
  } else if (accountTransaction.transactionKind === AccountTransactionType.TransferWithMemo) {
    serializedPayload = serializeTransferWithMemo(accountTransaction.payload);
  }

  const serializedHeader = serializeAccountTransactionHeader(accountTransaction, serializedPayload.length + 1);
  return Buffer.concat([
    serializedHeader,
    serializedType,
    serializedPayload,
  ]);
}