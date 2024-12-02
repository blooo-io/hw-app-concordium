import BIPPath from "bip32-path";
import { serializeAccountTransaction } from "./utils";
import { DataBlob } from "@concordium/common-sdk/lib/types/DataBlob";
import { Buffer as NodeBuffer } from 'buffer/index';
const MAX_CHUNK_SIZE = 255;

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

const serializeTransactionPayloads = ( path: string, rawTx: Buffer): Buffer[] => {
  const paths = splitPath(path);
  let offset = 0;
  const payloads: Buffer[] = [];
  let buffer = Buffer.alloc(
    1 + paths.length * 4
  );
  buffer[0] = paths.length;
  paths.forEach((element, index) => {
    buffer.writeUInt32BE(element, 1 + 4 * index);
  });
  payloads.push(buffer);
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
  const payloads = serializeTransactionPayloads(path, txSerialized);
  return { payloads };
}

export const serializeSimpleTransfer = (txn: any, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};

export const serializeSimpleTransferWithMemo = (txn: any, path: string): { payloads: Buffer[] } => {
  // Convert the string to a buffer
  const memo: string = txn.payload.memo;
  const memoBuffer = NodeBuffer.from(memo, 'utf-8');
  // Encode the buffer as a DataBlob
  txn.payload.memo = new DataBlob(memoBuffer);

  return serializeTransaction(txn, path);
};

export const serializeConfigureDelegation = (txn: any, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};

export const serializeConfigureBaker = (txn: any, path: string): { payloads: Buffer[] } => {
  return serializeTransaction(txn, path);
};

export const serializeTransferWithSchedule = (txn: any, path: string): { payloads: Buffer[] } => {
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
