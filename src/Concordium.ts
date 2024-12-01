import Transport from "@ledgerhq/hw-transport";
import { StatusCodes } from "@ledgerhq/errors";
import {
  pathToBuffer,
  serializeConfigureDelegation,
  serializeSimpleTransfer,
  serializeSimpleTransferWithMemo,
  serializeTransferWithSchedule,
} from "./serialization";
import BigNumber from "bignumber.js";
import { encodeInt32 } from "./utils";

const LEDGER_CLA = 0xe0;

// FOR GET VERSION AND APP NAME
const NONE = 0x00;

// FOR VERIFY ADRESS
const P1_LEGACY_VERIFY_ADDRESS = 0x00;
const P1_VERIFY_ADDRESS = 0x01;

// FOR GET PUBLIC KEY
const P1_NON_CONFIRM = 0x00;
const P1_CONFIRM = 0x01;
const P2_SIGNED_KEY = 0x01;

// FOR SIGN TRANSACTION
const P1_FIRST_CHUNK = 0x00;
const P2_MORE = 0x80;
const P2_LAST = 0x00;

const INS = {
  VERIFY_ADDRESS: 0x00,
  GET_PUBLIC_KEY: 0x01,
  GET_VERSION: 0x03,
  GET_APP_NAME: 0x04,
  SIGN_TX: 0x06,
};

const concordium_path = "44'/919'/0'/0/0/0";
const concordium_legacy_path = "1105'/0'/0'/0/";

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
        "verifyAddress",
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
   * Legacy Verify address.
   *
   * @returns status
   *
   * @example
   * concordium.verifyAddressLegacy().then(r => r.status)
   */
  async verifyAddressLegacy(id: number, cred: number): Promise<{ status: string }> {
    try {
      const idEncoded = encodeInt32(id);
      const credEncoded = encodeInt32(cred);
      await this.sendToDevice(
        INS.VERIFY_ADDRESS,
        P1_LEGACY_VERIFY_ADDRESS,
        NONE,
        Buffer.concat([idEncoded, credEncoded])
      );
      return { status: "success" };
    } catch (error) {
      return { status: "failed" };
    }
  }

  /**
   * Verify address.
   *
   * @returns status
   *
   * @example
   * concordium.verifyAddress().then(r => r.status)
   */
  async verifyAddress(idp: number, id: number, cred: number): Promise<{ status: string }> {
    try {
      const idEncoded = encodeInt32(id);
      const idpEncoded = encodeInt32(idp);
      const credEncoded = encodeInt32(cred);
      await this.sendToDevice(
        INS.VERIFY_ADDRESS,
        P1_VERIFY_ADDRESS,
        NONE,
        Buffer.concat([idpEncoded, idEncoded, credEncoded])
      );
      return { status: "success" };
    } catch (error) {
      return { status: "failed" };
    };
  }

  /**
   * Get Concordium address (public key) for a BIP32 path.
   *
   * @param path a BIP32 path
   * @param display flag to show display
   * @param signedKey flag to sign key
   * @returns an object with the address field
   *
   * @example
   * concordium.getPublicKey("1105'/0'/0'/0/0/0/0/", true, false)
   */
  async getPublicKey(path: string, display?: boolean, signedKey?: boolean): Promise<{ publicKey: string }> {
    const pathBuffer = pathToBuffer(path);

    const publicKeyBuffer = await this.sendToDevice(
      INS.GET_PUBLIC_KEY,
      display ? P1_CONFIRM : P1_NON_CONFIRM,
      signedKey ? P2_SIGNED_KEY : NONE,
      pathBuffer
    );

    const publicKeyLength = publicKeyBuffer[0];

    return {
      publicKey: publicKeyBuffer.subarray(1, 1 + publicKeyLength).toString("hex"),
    };
  }

  /**
   * Signs a Concordium transaction using the specified account index.
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns An object containing the signature and the signed transaction.
   * @throws Error if the user declines the transaction.
   * @example
   * concordium.signTransfer(txn).then(r => r.signature)
   */
  async signTransfer(txn, path: string): Promise<{ signature: string, transaction: string }> {

    const { payloads } = serializeSimpleTransfer(txn, path);

    let response;

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

    const transaction = payloads.slice(1);

    return {
      signature: response.toString("hex"),
      transaction: Buffer.concat(transaction).toString("hex"),
    };
  }

  async signTransferWithMemo(txn, path: string): Promise<{ signature: string[]; transaction }> {


    const { payloads } = serializeSimpleTransferWithMemo(txn, path);

    let response;

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
    const transaction = payloads.slice(1);

    return {
      signature: response.toString("hex"),
      transaction: Buffer.concat(transaction).toString("hex"),
    };
  }

  async signTransferWithSchedule(txn, path: string): Promise<{ signature: string[]; transaction }> {


    const { payloads } = serializeTransferWithSchedule(txn, path);

    let response;

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

    const transaction = payloads.slice(1);

    return {
      signature: response.toString("hex"),
      transaction: Buffer.concat(transaction).toString("hex"),
    };
  }

  async signConfigureDelegation(txn, path: string): Promise<{ signature: string[]; transaction }> {


    const { payloads } = serializeConfigureDelegation(txn, path);

    let response;

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

    const transaction = payloads.slice(1);


    return {
      signature: response.toString("hex"),
      transaction: Buffer.concat(transaction).toString("hex"),
    };
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
