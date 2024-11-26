import { AccountAddress, getAccountTransactionHandler } from "@concordium/web-sdk";


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
 * Serialization of an account transaction header. The payload size is a part of the header,
 * but is factored out of the type as it always has to be derived from the serialized
 * transaction payload, which cannot happen until the payload has been constructed.
 * @param header the account transaction header with metadata about the transaction
 * @param payloadSize the byte size of the serialized payload
 * @returns the serialized account transaction header
 */
const serializeAccountTransactionHeader = (accountTransaction, payloadSize) => {
  console.log("GUI Sender: ", accountTransaction.sender);
  const serializedSender = AccountAddress.toBuffer(accountTransaction.sender);
  console.log("GUI Sender: ", serializedSender);
  const serializedNonce = encodeWord64(accountTransaction.nonce);
  console.log("GUI Nonce: ", serializedNonce);
  const serializedEnergyAmount = encodeWord64(accountTransaction.energyAmount);
  console.log("GUI Energy: ", serializedEnergyAmount);
  const serializedPayloadSize = encodeWord32(payloadSize);
  console.log("GUI Size: ", serializedPayloadSize);
  const serializedExpiry = encodeWord64(accountTransaction.expiry);
  console.log("GUI Expiry: ", serializedExpiry);
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
  const accountTransactionHandler = getAccountTransactionHandler(accountTransaction.transactionKind);
  const serializedPayload = accountTransactionHandler.serialize(accountTransaction.payload);
  const serializedHeader = serializeAccountTransactionHeader(accountTransaction, serializedPayload.length + 1);
  return Buffer.concat([
      serializedHeader,
      serializedType,
      serializedPayload,
  ]);
}