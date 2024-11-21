import Transport from "@ledgerhq/hw-transport";
import { StatusCodes } from "@ledgerhq/errors";
import {
  pathToBuffer,
  serializeSignature,
  serializeConcordiumTransaction,
} from "./serialization";
import BigNumber from "bignumber.js";
import * as ConcordiumSDK from "@concordium/web-sdk";

const LEDGER_CLA = 0xe0;
const CLA_OFFSET = 0x00;

// FOR GET VERSION AND APP NAME
const NONE = 0x00;

// FOR GET PUBLIC KEY
const P1_NON_CONFIRM = 0x00;
const P1_CONFIRM = 0x01;

// FOR SIGN TRANSACTION
const P1_FIRST_CHUNK = 0x00;
const P2_MORE = 0x80;
const P2_LAST = 0x00;

const INS = {
  GET_VERSION: 0x03,
  GET_APP_NAME: 0x04,
  GET_PUBLIC_KEY: 0x05,
  SIGN_TX: 0x06,
};

const concordium_path = "1105'/0'/0'/0/";

/**
 * Concordium API
 *
 * @param transport a transport for sending commands to a device
 * @param scrambleKey a scramble key
 *
 * @example
 * import Concordium from "@ledgerhq/hw-app-concordium";
 * const Concordium = new Concordium(transport);
 */
export default class Concordium {
  private transport: Transport;

  constructor(
    transport: Transport,
    scrambleKey = "concordium_default_scramble_key"
  ) {
    this.transport = transport;
    this.transport.decorateAppAPIMethods(
      this,
      [
        "getVersion",
        "getAddress",
        "signTransaction",
      ],
      scrambleKey
    );
  }

  /**
   * Get application version.
   *
   * @returns version object
   *
   * @example
   * concordium.getVersion().then(r => r.version)
   */
  async getVersion(): Promise<{ version: string }> {
    const [major, minor, patch] = await this.sendToDevice(
      INS.GET_VERSION,
      NONE,
      NONE,
      Buffer.from([])
    );
    return {
      version: `${major}.${minor}.${patch}`,
    };
  }

  /**
   * Get Concordium address (public key) for a BIP32 path.
   *
   * @param path a BIP32 path
   * @param display flag to show display
   * @param accountIndex index of account address
   * @returns an object with the address field
   *
   * @example
   * concordium.getAddress("1105'/0'/0'/0/").then(r => r.address)
   */
  async getAddress(
    path: string,
    display?: boolean,
    accountIndex = 0
  ): Promise<{
    address: string;
    publicKey: string;
    chainCode: string | undefined;
  }> {
    const pathBuffer = pathToBuffer(path + accountIndex);

    const addressBuffer = await this.sendToDevice(
      INS.GET_PUBLIC_KEY,
      display ? P1_CONFIRM : P1_NON_CONFIRM,
      NONE,
      pathBuffer
    );

    const publicKeyLength = addressBuffer[0];
    const addressLength = addressBuffer[1 + publicKeyLength];
    const chainCodeLength = addressBuffer[1 + publicKeyLength + 1 + addressLength];
    return {
      publicKey: addressBuffer.subarray(1, 1 + publicKeyLength).toString("hex"),
      address:
        "0x" +
        addressBuffer
          .subarray(
            1 + publicKeyLength + 1,
            1 + publicKeyLength + 1 + addressLength
          )
          .toString("ascii"),
      chainCode: addressBuffer
            .subarray(
              1 + publicKeyLength + 1 + addressLength + 1,
              1 + publicKeyLength + 1 + addressLength + chainCodeLength
            )
            .toString("hex"),
    };
  }

  /**
   * Signs a Concordium transaction using the specified account index.
   * @param txn - The transaction to sign.
   * @param accountIndex - The index of the account to use for signing. Default is 0.
   * @returns An object containing the signature and the signed transaction.
   * @throws Error if the user declines the transaction.
   * @example
   * concordium.signTransfer(txn).then(r => r.signature)
   */
  async signTransfer(txn:ConcordiumSDK.AccountTransaction, accountIndex=0): Promise<{ signature: string[]; transaction: ConcordiumSDK.AccountTransaction }> {

    const { payloads } = serializeConcordiumTransaction(txn, concordium_path + accountIndex);

    let response = Buffer.from([1,2,3]);

    for (let i = 0; i < payloads.length; i++) {
      const lastChunk = i === payloads.length - 1;
      response = await this.sendToDevice(
        INS.SIGN_TX,
        P1_FIRST_CHUNK + i,
        lastChunk ? P2_LAST : P2_MORE,
        payloads[i]
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    const signature= [""];
    // const signature = this.serializeAndFormatSignature(
    //   response,
    //   chainId,
    //   chainIdTruncated,
    //   txType
    // );


    return {
      signature: signature,
      transaction: txn,
    };
  }

  private serializeAndFormatSignature(
    response: Buffer,
    chainId: BigNumber,
    chainIdTruncated: number,
    txType: string | null
  ): string[] {

    const { v, r, s } = serializeSignature(
      response,
      chainId,
      chainIdTruncated,
      txType
    );


    let signature = ["0x" + v, "0x" + r, "0x" + s];
    return signature;
  }

  private async sendToDevice(
    instruction: number,
    p1: number,
    p2: number = 0x00,
    payload: Buffer
  ) {
    const acceptStatusList = [StatusCodes.OK];
    const reply = await this.transport.send(
      LEDGER_CLA,
      instruction,
      p1,
      p2,
      payload,
      acceptStatusList
    );

    this.throwOnFailure(reply);

    return reply.subarray(0, reply.length - 2);
  }

  private throwOnFailure(reply: Buffer) {
    // transport makes sure reply has a valid length
    const status = reply.readUInt16BE(reply.length - 2);

    switch (status) {
      default:
        return;
    }
  }
}
