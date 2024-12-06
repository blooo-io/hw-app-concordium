import BIPPath from "bip32-path";
import { encodeDataBlob, encodeInt8, encodeWord16, encodeWord64, serializeAccountTransaction, serializeAccountTransactionHeader } from "./utils";
import { DataBlob } from "@concordium/common-sdk/lib/types/DataBlob";
import { Buffer as NodeBuffer } from 'buffer/index';
import { AccountAddress } from "@concordium/web-sdk";
const MAX_CHUNK_SIZE = 255;
const MAX_SCHEDULE_CHUNK_SIZE = 15;

const serializePath = (path: number[]): Buffer => {
  const buf = Buffer.alloc(1 + path.length * 4);
  buf.writeUInt8(path.length, 0);
  for (const [i, num] of path.entries()) {
    buf.writeUInt32BE(num, 1 + i * 4);
  }
  return buf;
};

export const splitPath = (path: string): number[] => {
  const result: number[] = [];
  const components = path.split("/");
  components.forEach((element) => {
    let number = parseInt(element, 10);
    if (isNaN(number)) {
      return;
    }
    if (element.length > 1 && element[element.length - 1] === "'") {
      number += 0x80000000;
    }
    result.push(number);
  });
  return result;
};

export const pathToBuffer = (originalPath: string): Buffer => {
  const path = originalPath;
  const pathNums: number[] = BIPPath.fromString(path).toPathArray();
  return serializePath(pathNums);
};

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


const serializeTransactionPayloads = (rawTx: Buffer): Buffer[] => {
  let offset = 0;
  const payloads: Buffer[] = [];
  while (offset !== rawTx.length) {
    const first = offset === 0;
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


export const serializeTransaction = (txn: any, path: string): { payloads: Buffer[] } => {
  const txSerialized = serializeAccountTransaction(txn);
  const payloads = serializeTransactionPayloadsWithDerivationPath(path, txSerialized);
  return { payloads };
}

export const serializeSimpleTransfer = (txn: any, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};

export const serializeSimpleTransferWithMemo = (txn: any, path: string): { payloadHeaderAddressMemoLength: Buffer[], payloadsMemo: Buffer[], payloadsAmount: Buffer[] } => {
  // Convert the string to a buffer
  const memo: string = txn.payload.memo;
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

export const serializeTransferWithSchedule = (txn: any, path: string): { payloadHeaderAddressScheduleLength: Buffer[], payloadsSchedule: Buffer[] } => {
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

export const serializeConfigureDelegation = (txn: any, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};

export const serializeConfigureBaker = (txn: any, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};


export const serializeTransferWithScheduleAndMemo = (txn: any, path: string): { payloads: Buffer[] } => {
  // Convert the string to a buffer
  const memo: string = txn.payload.memo;
  const memoBuffer = NodeBuffer.from(memo, 'utf-8');
  // Encode the buffer as a DataBlob
  txn.payload.memo = new DataBlob(memoBuffer);
  return serializeTransaction(txn, path);
};

export const serializeRegisterData = (txn: any, path: string): { payloadHeader: Buffer[], payloadsData: Buffer[] } => {
  // Convert the string to a buffer
  const data: string = txn.payload.data;
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

export const serializeTransferToPublic = (txn: any, path: string): { payloadHeader: Buffer[], payloadsAmountAndProofsLength: Buffer[], payloadsProofs: Buffer[] } => {
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

export const serializeDeployModule = (txn: any, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};

export const serializeInitContract = (txn: any, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};