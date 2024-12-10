import Transport from "@ledgerhq/hw-transport";
import { StatusCodes } from "@ledgerhq/errors";
import {
  pathToBuffer,
  serializeConfigureDelegation,
  serializeSimpleTransfer,
  serializeSimpleTransferWithMemo,
  serializeTransferWithSchedule,
  serializeConfigureBaker,
  serializeTransferWithScheduleAndMemo,
  serializeRegisterData,
  serializeTransferToPublic,
  serializeDeployModule,
  serializeInitContract,
  serializeUpdateContract,
  serializeTransactionPayloads,
  serializeUpdateCredentials
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
const P1_FIRST_BATCH = 0x01;
const P1_AGGREGATION_KEY = 0x02;
const P1_URL_LENGTH = 0x03;
const P1_URL = 0x04;
const P1_COMMISSION_FEE = 0x05;

const P1_FIRST_CHUNK = 0x00;
const P1_INITIAL_WITH_MEMO = 0x01;
const P1_INITIAL_WITH_MEMO_SCHEDULE = 0x02;
const P1_MEMO_SCHEDULE = 0x03;
const P1_REMAINING_AMOUNT = 0x01;
const P1_DATA = 0x01;
const P1_PROOF = 0x02;
const P1_MEMO = 0x02;
const P1_AMOUNT = 0x03;
const P2_MORE = 0x80;
const P2_LAST = 0x00;
const P1_INITIAL_PACKET = 0x00;
const P1_SCHEDULED_TRANSFER_PAIRS = 0x01;

// Update Credentials
const P2_CREDENTIAL_INITIAL = 0x00;
const P2_CREDENTIAL_CREDENTIAL_INDEX = 0x01;
const P2_CREDENTIAL_CREDENTIAL = 0x02;
const P2_CREDENTIAL_ID_COUNT = 0x03;
const P2_CREDENTIAL_ID = 0x04;
const P2_THRESHOLD = 0x05;

//Deploy Credential
const P1_VERIFICATION_KEY_LENGTH = 0x0A;
const P1_VERIFICATION_KEY = 0x01;
const P1_SIGNATURE_THRESHOLD = 0x02;
const P1_AR_IDENTITY = 0x03;
const P1_CREDENTIAL_DATES = 0x04;
const P1_ATTRIBUTE_TAG = 0x05;
const P1_ATTRIBUTE_VALUE = 0x06;
const P1_LENGTH_OF_PROOFS = 0x07;
const P1_PROOFS = 0x08;
const P1_NEW_OR_EXISTING = 0x09

const INS = {
  // GET_VERSION: 0x03,
  VERIFY_ADDRESS: 0x00,
  GET_PUBLIC_KEY: 0x01,
  SIGN_TRANSFER: 0x02,
  SIGN_TRANSFER_SCHEDULE: 0x03,
  SIGN_TRANSFER_TO_PUBLIC: 0x12,
  SIGN_CONFIGURE_DELEGATION: 0x17,
  SIGN_CONFIGURE_BAKER: 0x18,
  GET_APP_NAME: 0x21,
  SIGN_UPDATE_CREDENTIALS: 0x31,
  SIGN_TRANSFER_MEMO: 0x32,
  SIGN_TRANSFER_SCHEDULE_AND_MEMO: 0x34,
  SIGN_REGISTER_DATA: 0x35,
  SIGN_DEPLOY_MODULE: 0x06,
  SIGN_INIT_CONTRACT: 0x06,
  SIGN_UPDATE_CONTRACT: 0x06,
};

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

  // /**
  //  * Get application version.
  //  *
  //  * @returns version object
  //  *
  //  * @example
  //  * concordium.getVersion().then(r => r.version)
  //  */
  // async getVersion(): Promise<{ version: string }> {
  //   const [major, minor, patch] = await this.sendToDevice(
  //     INS.GET_VERSION,
  //     NONE,
  //     NONE,
  //     Buffer.from([])
  //   );
  //   return {
  //     version: `${major}.${minor}.${patch}`,
  //   };
  // }

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
  async getPublicKey(path: string, display?: boolean, signedKey?: boolean): Promise<{ publicKey: string, signedPublicKey?: string }> {
    const pathBuffer = pathToBuffer(path);

    const publicKeyBuffer = await this.sendToDevice(
      INS.GET_PUBLIC_KEY,
      display ? P1_NON_CONFIRM : P1_CONFIRM,
      signedKey ? P2_SIGNED_KEY : NONE,
      pathBuffer
    );

    const publicKeyLength = publicKeyBuffer[0];

    if (signedKey) {
      return {
        publicKey: publicKeyBuffer.subarray(1, 1 + publicKeyLength).toString("hex"),
        signedPublicKey: publicKeyBuffer.subarray(1 + publicKeyLength).toString("hex"),
      };
    }

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
        INS.SIGN_TRANSFER,
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

  async signTransferWithMemo(txn, path: string): Promise<{ signature: string[] }> {


    const { payloadHeaderAddressMemoLength, payloadsMemo, payloadsAmount } = serializeSimpleTransferWithMemo(txn, path);

    let response;
    response = await this.sendToDevice(
      INS.SIGN_TRANSFER_MEMO,
      P1_INITIAL_WITH_MEMO,
      NONE,
      payloadHeaderAddressMemoLength[0]
    );
    response = await this.sendToDevice(
      INS.SIGN_TRANSFER_MEMO,
      P1_MEMO,
      NONE,
      payloadsMemo[0]
    );
    response = await this.sendToDevice(
      INS.SIGN_TRANSFER_MEMO,
      P1_AMOUNT,
      NONE,
      payloadsAmount[0]
    );

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signTransferWithSchedule(txn, path: string): Promise<{ signature: string[] }> {


    const { payloadHeaderAddressScheduleLength, payloadsSchedule } = serializeTransferWithSchedule(txn, path);

    let response;

    response = await this.sendToDevice(
      INS.SIGN_TRANSFER_SCHEDULE,
      P1_INITIAL_PACKET,
      NONE,
      payloadHeaderAddressScheduleLength[0]
    );

    for (let i = 0; i < payloadsSchedule.length; i++) {
      const lastChunk = i === payloadsSchedule.length - 1;
      response = await this.sendToDevice(
        INS.SIGN_TRANSFER_SCHEDULE,
        P1_SCHEDULED_TRANSFER_PAIRS,
        NONE,
        payloadsSchedule[i]
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signTransferWithScheduleAndMemo(txn, path: string): Promise<{ signature: string[] }> {


    const { payloadHeaderAddressScheduleLengthAndMemoLength, payloadMemo, payloadsSchedule } = serializeTransferWithScheduleAndMemo(txn, path);

    let response;
    response = await this.sendToDevice(
      INS.SIGN_TRANSFER_SCHEDULE_AND_MEMO,
      P1_INITIAL_WITH_MEMO_SCHEDULE,
      NONE,
      payloadHeaderAddressScheduleLengthAndMemoLength[0]
    );
    response = await this.sendToDevice(
      INS.SIGN_TRANSFER_SCHEDULE_AND_MEMO,
      P1_MEMO_SCHEDULE,
      NONE,
      payloadMemo[0]
    );

    for (let i = 0; i < payloadsSchedule.length; i++) {
      response = await this.sendToDevice(
        INS.SIGN_TRANSFER_SCHEDULE_AND_MEMO,
        P1_SCHEDULED_TRANSFER_PAIRS,
        NONE,
        payloadsSchedule[i]
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signConfigureDelegation(txn, path: string): Promise<{ signature: string[] }> {


    const { payloads } = serializeConfigureDelegation(txn, path);

    let response;

    for (let i = 0; i < payloads.length; i++) {
      const lastChunk = i === payloads.length - 1;
      response = await this.sendToDevice(
        INS.SIGN_CONFIGURE_DELEGATION,
        P1_FIRST_CHUNK + i,
        lastChunk ? P2_LAST : P2_MORE,
        payloads[i]
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signConfigureBaker(txn, path: string): Promise<{ signature: string[] }> {

    const { payloadHeaderKindAndBitmap, payloadFirstBatch, payloadAggregationKeys, payloadUrlLength, payloadURL, payloadCommissionFee } = serializeConfigureBaker(txn, path);

    let response;

    response = await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_INITIAL_PACKET,
      NONE,
      payloadHeaderKindAndBitmap
    );
    response = await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_FIRST_BATCH,
      NONE,
      payloadFirstBatch
    );
    response = await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_AGGREGATION_KEY,
      NONE,
      payloadAggregationKeys
    );
    response = await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_URL_LENGTH,
      NONE,
      payloadUrlLength
    );
    response = await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_URL,
      NONE,
      payloadURL
    );
    response = await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_COMMISSION_FEE,
      NONE,
      payloadCommissionFee
    );

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signRegisterData(txn, path: string): Promise<{ signature: string[] }> {

    const { payloadHeader, payloadsData } = serializeRegisterData(txn, path);

    let response;
    response = await this.sendToDevice(
      INS.SIGN_REGISTER_DATA,
      P1_INITIAL_PACKET,
      NONE,
      payloadHeader[0]
    );

    for (let i = 0; i < payloadsData.length; i++) {
      response = await this.sendToDevice(
        INS.SIGN_REGISTER_DATA,
        P1_DATA,
        NONE,
        payloadsData[i]
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signTransferToPublic(txn, path: string): Promise<{ signature: string[] }> {

    const { payloadHeader, payloadsAmountAndProofsLength, payloadsProofs } = serializeTransferToPublic(txn, path);

    let response;

    response = await this.sendToDevice(
      INS.SIGN_TRANSFER_TO_PUBLIC,
      P1_INITIAL_PACKET,
      NONE,
      payloadHeader[0]
    );

    response = await this.sendToDevice(
      INS.SIGN_TRANSFER_TO_PUBLIC,
      P1_REMAINING_AMOUNT,
      NONE,
      payloadsAmountAndProofsLength[0]
    );

    for (let i = 0; i < payloadsProofs.length; i++) {
      response = await this.sendToDevice(
        INS.SIGN_TRANSFER_TO_PUBLIC,
        P1_PROOF,
        NONE,
        payloadsProofs[i]
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signDeployModule(txn, path: string): Promise<{ signature: string[] }> {

    const { payloads } = serializeDeployModule(txn, path);

    let response;

    for (let i = 0; i < payloads.length; i++) {
      const lastChunk = i === payloads.length - 1;
      response = await this.sendToDevice(
        INS.SIGN_DEPLOY_MODULE,
        P1_FIRST_CHUNK + i,
        lastChunk ? P2_LAST : P2_MORE,
        payloads[i]
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signInitContract(txn, path: string): Promise<{ signature: string[] }> {

    const { payloads } = serializeInitContract(txn, path);

    let response;

    for (let i = 0; i < payloads.length; i++) {
      const lastChunk = i === payloads.length - 1;
      response = await this.sendToDevice(
        INS.SIGN_INIT_CONTRACT,
        P1_FIRST_CHUNK + i,
        lastChunk ? P2_LAST : P2_MORE,
        payloads[i]
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signUpdateContract(txn, path: string): Promise<{ signature: string[] }> {

    const { payloads } = serializeUpdateContract(txn, path);

    let response;

    for (let i = 0; i < payloads.length; i++) {
      const lastChunk = i === payloads.length - 1;
      response = await this.sendToDevice(
        INS.SIGN_UPDATE_CONTRACT,
        P1_FIRST_CHUNK + i,
        lastChunk ? P2_LAST : P2_MORE,
        payloads[i]
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  async signUpdateCredentials(txn, path: string): Promise<{ signature: string[] }> {

    const { payloadHeaderKindAndIndexLength, credentialIndex, numberOfVerificationKeys, keyIndexAndSchemeAndVerificationKey, thresholdAndRegIdAndIPIdentity, encIdCredPubShareAndKey, validToAndCreatedAtAndAttributesLength, tag, valueLength, value, proofLength, proofs, credentialIdCount, credentialIds, threshold } = serializeUpdateCredentials(txn, path);

    let response;
    response = await this.sendToDevice(
      INS.SIGN_UPDATE_CREDENTIALS,
      NONE,
      P2_CREDENTIAL_INITIAL,
      payloadHeaderKindAndIndexLength[0]
    );

    for (let i = 0; i < txn.payload.newCredentials.length; i++) {
      response = await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        NONE,
        P2_CREDENTIAL_CREDENTIAL_INDEX,
        credentialIndex[i]
      );
      response = await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_VERIFICATION_KEY_LENGTH,
        P2_CREDENTIAL_CREDENTIAL,
        numberOfVerificationKeys[i]
      );
      response = await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_VERIFICATION_KEY,
        P2_CREDENTIAL_CREDENTIAL,
        keyIndexAndSchemeAndVerificationKey[i]
      );
      response = await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_SIGNATURE_THRESHOLD,
        P2_CREDENTIAL_CREDENTIAL,
        thresholdAndRegIdAndIPIdentity[i]
      );
      response = await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_AR_IDENTITY,
        P2_CREDENTIAL_CREDENTIAL,
        encIdCredPubShareAndKey[i]
      );
      response = await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_CREDENTIAL_DATES,
        P2_CREDENTIAL_CREDENTIAL,
        validToAndCreatedAtAndAttributesLength[i]
      );
      for (let j = 0; j < Object.keys(txn.payload.newCredentials[i].cdi.policy.revealedAttributes).length; j++) {
        const tagAndValueLength = Buffer.concat([tag[i][j], valueLength[i][j]])
        response = await this.sendToDevice(
          INS.SIGN_UPDATE_CREDENTIALS,
          P1_ATTRIBUTE_TAG,
          P2_CREDENTIAL_CREDENTIAL,
          tagAndValueLength
        );
        response = await this.sendToDevice(
          INS.SIGN_UPDATE_CREDENTIALS,
          P1_ATTRIBUTE_VALUE,
          P2_CREDENTIAL_CREDENTIAL,
          value[i][j]
        );
      }
      response = await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_LENGTH_OF_PROOFS,
        P2_CREDENTIAL_CREDENTIAL,
        proofLength[i]
      );

      const proofPayload = serializeTransactionPayloads(proofs[i]);
      for (let j = 0; j < proofPayload.length; j++) {
        response = await this.sendToDevice(
          INS.SIGN_UPDATE_CREDENTIALS,
          P1_PROOFS,
          P2_CREDENTIAL_CREDENTIAL,
          proofPayload[j]
        );
      }
    }

    response = await this.sendToDevice(
      INS.SIGN_UPDATE_CREDENTIALS,
      NONE,
      P2_CREDENTIAL_ID_COUNT,
      credentialIdCount
    );
    for (let i = 0; i < txn.payload.removeCredentialIds.length; i++) {
      response = await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        NONE,
        P2_CREDENTIAL_ID,
        credentialIds[i]
      );
    }
    response = await this.sendToDevice(
      INS.SIGN_UPDATE_CREDENTIALS,
      NONE,
      P2_THRESHOLD,
      threshold
    );

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
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
