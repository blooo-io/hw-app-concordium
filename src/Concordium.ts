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
  serializeUpdateCredentials,
  serializeCredentialDeployment,
  serializePublicInfoForIp
} from "./serialization";
import { encodeInt32, encodeInt8, encodeWord64 } from "./utils";
import { Mode, ExportType, IExportPrivateKeyData, ISimpleTransferTransaction, ISimpleTransferWithMemoTransaction, ISimpleTransferWithScheduleTransaction, ISimpleTransferWithScheduleAndMemoTransaction, IConfigureDelegationTransaction, IRegisterDataTransaction, ITransferToPublicTransaction, IDeployModuleTransaction, IInitContractTransaction, IUpdateContractTransaction, IPublicInfoForIpTransaction, ICredentialDeploymentTransaction, IUpdateCredentialsTransaction, IConfigureBakerTransaction } from "./type";


const PRIVATE_KEY_LENGTH = 32;

const LEDGER_CLA = 0xe0;
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

// Deploy Module
const P1_SOURCE = 0x01;

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
  VERIFY_ADDRESS: 0x00,
  GET_PUBLIC_KEY: 0x01,
  SIGN_TRANSFER: 0x02,
  SIGN_TRANSFER_SCHEDULE: 0x03,
  SIGN_CREDENTIAL_DEPLOYMENT: 0x04,
  EXPORT_PRIVATE_KEY: 0x05,
  SIGN_TRANSFER_TO_PUBLIC: 0x12,
  SIGN_CONFIGURE_DELEGATION: 0x17,
  SIGN_CONFIGURE_BAKER: 0x18,
  SIGN_PUBLIC_INFO_FOR_IP: 0x20,
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
 * import Concordium from "@blooo-io/hw-app-concordium";
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
        "getAddress",
        "verifyAddress",
        "verifyAddressLegacy",
        "getPublicKey",
        "exportPrivateKey",
        "signTransfer",
        "signTransferWithMemo",
        "signTransferWithSchedule",
        "signTransferWithScheduleAndMemo",
        "signConfigureDelegation",
        "signConfigureBaker",
        "signRegisterData",
        "signTransferToPublic",
        "signDeployModule",
        "signInitContract",
        "signUpdateContract",
        "signPublicInfoForIp",
        "signUpdateCredentials",
        "signCredentialDeployment",
      ],
      scrambleKey
    );
  }

  /**
   * Verify address.
   *
   * @param isLegacy - Flag to indicate if the legacy mode is used.
   * @param id - The identity number.
   * @param cred - The credential number.
   * @param idp - Mandatory if isLegacy is false. The identity provider number.
   * @returns A promise that resolves to an object containing the status.
   *
   * @example
   * concordium.verifyAddress(12,12,12).then(r => r.status)
   */
  async verifyAddress(isLegacy: boolean, id: number, cred: number, idp?: number): Promise<{ status: string }> {
    try {
      const idEncoded = encodeInt32(id);
      let payload = Buffer.from(idEncoded);
      if (!isLegacy) {
        const idpEncoded = encodeInt32(idp);
        payload = Buffer.concat([payload, idpEncoded]);
      }
      const credEncoded = encodeInt32(cred);
      payload = Buffer.concat([payload, credEncoded]);
      await this.sendToDevice(
        INS.VERIFY_ADDRESS,
        isLegacy ? P1_LEGACY_VERIFY_ADDRESS : P1_VERIFY_ADDRESS,
        NONE,
        payload
      );
      return { status: "success" };
    } catch (error) {
      return { status: "failed" };
    };
  }

  /**
   * Get Concordium address (public key) for a BIP32 path.
   *
   * @param path - A BIP32 path.
   * @param display - Flag to show display.
   * @param signedKey - Flag to sign key.
   * @returns A promise that resolves to an object with the public key and optionally the signed public key.
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

    const publicKeyLength: number = publicKeyBuffer[0];

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
   * Export a private key.
   *
   * @param data - The data required for exporting the private key.
   * @param exportType - The type of export, either PRF_KEY_SEED or PRF_KEY.
   * @param mode - The mode, either DISPLAY, NO_DISPLAY, or EXPORT_CRED_ID.
   * @param isLegacy - Flag to indicate if the legacy mode is used.
   * @returns A promise that resolves to an object with the private key and optionally the credential ID.
   */
  async exportPrivateKey(data: IExportPrivateKeyData, exportType: ExportType, mode: Mode, isLegacy: boolean): Promise<{ privateKey: string, credentialId?: string }> {
    let payload = Buffer.alloc(0);
    const isLegacyEncoded = isLegacy ? encodeInt8(0) : encodeInt8(1);
    const identityEncoded = encodeInt32(data.identity);
    payload = Buffer.concat([payload, isLegacyEncoded, identityEncoded]);

    if (!isLegacy) {
      const identityProviderEncoded = encodeInt32(data.identityProvider);
      payload = Buffer.concat([payload, identityProviderEncoded]);
    }

    const exportedPrivateKey = await this.sendToDevice(
      INS.EXPORT_PRIVATE_KEY,
      mode,
      exportType,
      payload
    );

    if (mode === Mode.EXPORT_CRED_ID) {
      return {
        privateKey: exportedPrivateKey.subarray(0, PRIVATE_KEY_LENGTH).toString("hex"),
        credentialId: exportedPrivateKey.subarray(PRIVATE_KEY_LENGTH).toString("hex"),
      };
    }

    return {
      privateKey: exportedPrivateKey.toString("hex"),
    };
  }

  /**
   * Signs a Concordium transaction using the specified account index.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   * @throws Error if the user declines the transaction.
   *
   * @example
   * concordium.signTransfer(txn).then(r => r.signature)
   */
  async signTransfer(txn: ISimpleTransferTransaction, path: string): Promise<{ signature: string }> {

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

    return {
      signature: response.toString("hex"),
    };
  }

  /**
   * Signs a simple transfer with a memo.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signTransferWithMemo(txn: ISimpleTransferWithMemoTransaction, path: string): Promise<{ signature: string[] }> {


    const { payloadHeaderAddressMemoLength, payloadsMemo, payloadsAmount } = serializeSimpleTransferWithMemo(txn, path);

    let response;
    await this.sendToDevice(
      INS.SIGN_TRANSFER_MEMO,
      P1_INITIAL_WITH_MEMO,
      NONE,
      payloadHeaderAddressMemoLength[0]
    );
    await this.sendToDevice(
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

  /**
   * Signs a transfer with a schedule.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signTransferWithSchedule(txn: ISimpleTransferWithScheduleTransaction, path: string): Promise<{ signature: string[] }> {


    const { payloadHeaderAddressScheduleLength, payloadsSchedule } = serializeTransferWithSchedule(txn, path);

    let response;

    await this.sendToDevice(
      INS.SIGN_TRANSFER_SCHEDULE,
      P1_INITIAL_PACKET,
      NONE,
      payloadHeaderAddressScheduleLength[0]
    );

    for (const schedule of payloadsSchedule) {
      response = await this.sendToDevice(
        INS.SIGN_TRANSFER_SCHEDULE,
        P1_SCHEDULED_TRANSFER_PAIRS,
        NONE,
        schedule
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  /**
   * Signs a transfer with a schedule and a memo.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signTransferWithScheduleAndMemo(txn: ISimpleTransferWithScheduleAndMemoTransaction, path: string): Promise<{ signature: string[] }> {


    const { payloadHeaderAddressScheduleLengthAndMemoLength, payloadMemo, payloadsSchedule } = serializeTransferWithScheduleAndMemo(txn, path);

    let response;
    await this.sendToDevice(
      INS.SIGN_TRANSFER_SCHEDULE_AND_MEMO,
      P1_INITIAL_WITH_MEMO_SCHEDULE,
      NONE,
      payloadHeaderAddressScheduleLengthAndMemoLength[0]
    );
    await this.sendToDevice(
      INS.SIGN_TRANSFER_SCHEDULE_AND_MEMO,
      P1_MEMO_SCHEDULE,
      NONE,
      payloadMemo[0]
    );

    for (const schedule of payloadsSchedule) {
      response = await this.sendToDevice(
        INS.SIGN_TRANSFER_SCHEDULE_AND_MEMO,
        P1_SCHEDULED_TRANSFER_PAIRS,
        NONE,
        schedule
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  /**
   * Signs a configure delegation transaction.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signConfigureDelegation(txn: IConfigureDelegationTransaction, path: string): Promise<{ signature: string[] }> {


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

  /**
   * Signs a configure baker transaction.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signConfigureBaker(txn: IConfigureBakerTransaction, path: string): Promise<{ signature: string[] }> {

    const { payloadHeaderKindAndBitmap, payloadFirstBatch, payloadAggregationKeys, payloadUrlLength, payloadURL, payloadCommissionFee } = serializeConfigureBaker(txn, path);

    let response;

    await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_INITIAL_PACKET,
      NONE,
      payloadHeaderKindAndBitmap
    );
    await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_FIRST_BATCH,
      NONE,
      payloadFirstBatch
    );
    await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_AGGREGATION_KEY,
      NONE,
      payloadAggregationKeys
    );
    await this.sendToDevice(
      INS.SIGN_CONFIGURE_BAKER,
      P1_URL_LENGTH,
      NONE,
      payloadUrlLength
    );
    await this.sendToDevice(
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

  /**
   * Signs a register data transaction.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signRegisterData(txn: IRegisterDataTransaction, path: string): Promise<{ signature: string[] }> {

    const { payloadHeader, payloadsData } = serializeRegisterData(txn, path);

    let response;
    await this.sendToDevice(
      INS.SIGN_REGISTER_DATA,
      P1_INITIAL_PACKET,
      NONE,
      payloadHeader[0]
    );

    for (const data of payloadsData) {
      response = await this.sendToDevice(
        INS.SIGN_REGISTER_DATA,
        P1_DATA,
        NONE,
        data
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  /**
   * Signs a transfer to public transaction.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signTransferToPublic(txn: ITransferToPublicTransaction, path: string): Promise<{ signature: string[] }> {

    const { payloadHeader, payloadsAmountAndProofsLength, payloadsProofs } = serializeTransferToPublic(txn, path);

    let response;

    await this.sendToDevice(
      INS.SIGN_TRANSFER_TO_PUBLIC,
      P1_INITIAL_PACKET,
      NONE,
      payloadHeader[0]
    );

    await this.sendToDevice(
      INS.SIGN_TRANSFER_TO_PUBLIC,
      P1_REMAINING_AMOUNT,
      NONE,
      payloadsAmountAndProofsLength[0]
    );

    for (const proof of payloadsProofs) {
      response = await this.sendToDevice(
        INS.SIGN_TRANSFER_TO_PUBLIC,
        P1_PROOF,
        NONE,
        proof
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  /**
   * Signs a deploy module transaction.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signDeployModule(txn: IDeployModuleTransaction, path: string): Promise<{ signature: string[] }> {

    const { payloadsHeaderAndVersion, payloadSource } = serializeDeployModule(txn, path);

    let response;
    await this.sendToDevice(
      INS.SIGN_DEPLOY_MODULE,
      P1_INITIAL_PACKET,
      P2_LAST,
      payloadsHeaderAndVersion[0]
    );

    response = await this.sendToDevice(
      INS.SIGN_DEPLOY_MODULE,
      P1_SOURCE,
      P2_LAST,
      payloadSource
    );

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  /**
   * Signs an init contract transaction.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signInitContract(txn: IInitContractTransaction, path: string): Promise<{ signature: string[] }> {

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

  /**
   * Signs an update contract transaction.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signUpdateContract(txn: IUpdateContractTransaction, path: string): Promise<{ signature: string[] }> {

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

  /**
   * Signs public info for IP transaction.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signPublicInfoForIp(txn: IPublicInfoForIpTransaction, path: string): Promise<{ signature: string[] }> {

    const { payloadIdCredPubAndRegIdAndKeysLenght, payloadKeys, payloadThreshold } = serializePublicInfoForIp(txn, path);

    let response;

    await this.sendToDevice(
      INS.SIGN_PUBLIC_INFO_FOR_IP,
      P1_INITIAL_PACKET,
      NONE,
      payloadIdCredPubAndRegIdAndKeysLenght
    );

    for (const key of payloadKeys) {
      await this.sendToDevice(
        INS.SIGN_PUBLIC_INFO_FOR_IP,
        P1_VERIFICATION_KEY,
        NONE,
        key
      );
    }

    response = await this.sendToDevice(
      INS.SIGN_PUBLIC_INFO_FOR_IP,
      P1_SIGNATURE_THRESHOLD,
      NONE,
      payloadThreshold
    );

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  /**
   * Signs a credential deployment transaction.
   *
   * @param txn - The transaction to sign.
   * @param isNew - Flag indicating if it's a new credential.
   * @param addressOrExpiry - The address or expiry date.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signCredentialDeployment(txn: ICredentialDeploymentTransaction, isNew: boolean, addressOrExpiry: string | BigInt, path: string): Promise<{ signature: string[] }> {

    const { payloadDerivationPath, numberOfVerificationKeys, keyIndexAndSchemeAndVerificationKey, thresholdAndRegIdAndIPIdentity, encIdCredPubShareAndKey, validToAndCreatedAtAndAttributesLength, tag, valueLength, value, proofLength, proofs } = serializeCredentialDeployment(txn, path);

    let response;
    await this.sendToDevice(
      INS.SIGN_CREDENTIAL_DEPLOYMENT,
      P1_INITIAL_PACKET,
      NONE,
      payloadDerivationPath
    );


    await this.sendToDevice(
      INS.SIGN_CREDENTIAL_DEPLOYMENT,
      P1_VERIFICATION_KEY_LENGTH,
      NONE,
      numberOfVerificationKeys
    );
    await this.sendToDevice(
      INS.SIGN_CREDENTIAL_DEPLOYMENT,
      P1_VERIFICATION_KEY,
      NONE,
      keyIndexAndSchemeAndVerificationKey
    );
    await this.sendToDevice(
      INS.SIGN_CREDENTIAL_DEPLOYMENT,
      P1_SIGNATURE_THRESHOLD,
      NONE,
      thresholdAndRegIdAndIPIdentity
    );
    await this.sendToDevice(
      INS.SIGN_CREDENTIAL_DEPLOYMENT,
      P1_AR_IDENTITY,
      NONE,
      encIdCredPubShareAndKey
    );
    await this.sendToDevice(
      INS.SIGN_CREDENTIAL_DEPLOYMENT,
      P1_CREDENTIAL_DATES,
      NONE,
      validToAndCreatedAtAndAttributesLength
    );
    for (let i = 0; i < Object.keys(txn.policy.revealedAttributes).length; i++) {
      const tagAndValueLength = Buffer.concat([tag[i], valueLength[i]])
      await this.sendToDevice(
        INS.SIGN_CREDENTIAL_DEPLOYMENT,
        P1_ATTRIBUTE_TAG,
        NONE,
        tagAndValueLength
      );
      await this.sendToDevice(
        INS.SIGN_CREDENTIAL_DEPLOYMENT,
        P1_ATTRIBUTE_VALUE,
        NONE,
        value[i]
      );
    }
    await this.sendToDevice(
      INS.SIGN_CREDENTIAL_DEPLOYMENT,
      P1_LENGTH_OF_PROOFS,
      NONE,
      proofLength
    );

    const proofPayload = serializeTransactionPayloads(proofs);
    for (const proof of proofPayload) {
      await this.sendToDevice(
        INS.SIGN_CREDENTIAL_DEPLOYMENT,
        P1_PROOFS,
        NONE,
        proof
      );
    }

    if (isNew) {
      const isNew = encodeInt8(0);
      const serializeExpiry = encodeWord64(addressOrExpiry as BigInt);
      const expiry = Buffer.concat([isNew, serializeExpiry])
      response = await this.sendToDevice(
        INS.SIGN_CREDENTIAL_DEPLOYMENT,
        P1_NEW_OR_EXISTING,
        NONE,
        expiry
      );
    } else {
      const isNew = encodeInt8(1);
      const address = Buffer.concat([isNew, Buffer.from(addressOrExpiry as string, "hex")])
      response = await this.sendToDevice(
        INS.SIGN_CREDENTIAL_DEPLOYMENT,
        P1_NEW_OR_EXISTING,
        NONE,
        address
      );
    }

    if (response.length === 1) throw new Error("User has declined.");

    return {
      signature: response.toString("hex"),
    };
  }

  /**
   * Signs an update credentials transaction.
   *
   * @param txn - The transaction to sign.
   * @param path - The derivation path to use for signing.
   * @returns A promise that resolves to an object containing the signature.
   */
  async signUpdateCredentials(txn: IUpdateCredentialsTransaction, path: string): Promise<{ signature: string[] }> {

    const { payloadHeaderKindAndIndexLength, credentialIndex, numberOfVerificationKeys, keyIndexAndSchemeAndVerificationKey, thresholdAndRegIdAndIPIdentity, encIdCredPubShareAndKey, validToAndCreatedAtAndAttributesLength, tag, valueLength, value, proofLength, proofs, credentialIdCount, credentialIds, threshold } = serializeUpdateCredentials(txn, path);

    let response;
    await this.sendToDevice(
      INS.SIGN_UPDATE_CREDENTIALS,
      NONE,
      P2_CREDENTIAL_INITIAL,
      payloadHeaderKindAndIndexLength[0]
    );

    for (let i = 0; i < txn.payload.newCredentials.length; i++) {
      await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        NONE,
        P2_CREDENTIAL_CREDENTIAL_INDEX,
        credentialIndex[i]
      );
      await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_VERIFICATION_KEY_LENGTH,
        P2_CREDENTIAL_CREDENTIAL,
        numberOfVerificationKeys[i]
      );
      await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_VERIFICATION_KEY,
        P2_CREDENTIAL_CREDENTIAL,
        keyIndexAndSchemeAndVerificationKey[i]
      );
      await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_SIGNATURE_THRESHOLD,
        P2_CREDENTIAL_CREDENTIAL,
        thresholdAndRegIdAndIPIdentity[i]
      );
      await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_AR_IDENTITY,
        P2_CREDENTIAL_CREDENTIAL,
        encIdCredPubShareAndKey[i]
      );
      await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_CREDENTIAL_DATES,
        P2_CREDENTIAL_CREDENTIAL,
        validToAndCreatedAtAndAttributesLength[i]
      );
      for (let j = 0; j < Object.keys(txn.payload.newCredentials[i].cdi.policy.revealedAttributes).length; j++) {
        const tagAndValueLength = Buffer.concat([tag[i][j], valueLength[i][j]])
        await this.sendToDevice(
          INS.SIGN_UPDATE_CREDENTIALS,
          P1_ATTRIBUTE_TAG,
          P2_CREDENTIAL_CREDENTIAL,
          tagAndValueLength
        );
        await this.sendToDevice(
          INS.SIGN_UPDATE_CREDENTIALS,
          P1_ATTRIBUTE_VALUE,
          P2_CREDENTIAL_CREDENTIAL,
          value[i][j]
        );
      }
      await this.sendToDevice(
        INS.SIGN_UPDATE_CREDENTIALS,
        P1_LENGTH_OF_PROOFS,
        P2_CREDENTIAL_CREDENTIAL,
        proofLength[i]
      );

      const proofPayload = serializeTransactionPayloads(proofs[i]);
      for (const proof of proofPayload) {
        await this.sendToDevice(
          INS.SIGN_UPDATE_CREDENTIALS,
          P1_PROOFS,
          P2_CREDENTIAL_CREDENTIAL,
          proof
        );
      }
    }

    await this.sendToDevice(
      INS.SIGN_UPDATE_CREDENTIALS,
      NONE,
      P2_CREDENTIAL_ID_COUNT,
      credentialIdCount
    );
    for (let i = 0; i < txn.payload.removeCredentialIds.length; i++) {
      await this.sendToDevice(
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

  /**
   * Sends a command to the device.
   *
   * @param instruction - The instruction code.
   * @param p1 - The first parameter.
   * @param p2 - The second parameter.
   * @param payload - The payload to send.
   * @returns A promise that resolves to the device's response.
   */
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

  /**
   * Throws an error if the device response indicates a failure.
   *
   * @param reply - The device's response.
   */
  private throwOnFailure(reply: Buffer) {
    // transport makes sure reply has a valid length
    const status = reply.readUInt16BE(reply.length - 2);

    switch (status) {
      default:
        return;
    }
  }
}
