import {
  openTransportReplayer,
  RecordStore,
} from "@ledgerhq/hw-transport-mocker";
import Concordium from "../src/Concordium";
import { listen } from "@ledgerhq/logs";
import { AccountAddress, AccountTransaction, AccountTransactionHeader, AccountTransactionType, CcdAmount, SequenceNumber, TransactionExpiry } from "@concordium/web-sdk";


listen((log) => console.log(log));

const testnetChainId = 1001; // 0x03e9
const mainnetChainId = 8217; // 0x2019

const CHAIN_ID = testnetChainId;
const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16);



const DERIVATION = "44'/8217'/0'/0/0";

// Address used for testing (default speculos address, pub & priv key)
const test_sender_address = "0x6E93a3ACfbaDF457F29fb0E57FA42274004c32EA";
const test_sender_publicKey =
  "0x31553d8c312ef1668adcf75f179a59accb85ffad9ea2a8ecf91049d9cdafc4706f3eb10091a459826803d353b3e3a98af0e999cd44353879930d8baf0779fde7";
const test_sender_privateKey =
  "0xba988b41f30ab65c5b8df817aa27468292d089db601892b01bccf0028d0d95bb";
const test_receiver_address = "0x0EE56B604c869E3792c99E35C1C424f88F87dC8a";

async function performSigningAndValidation(
  apdus: string[],
  txn: AccountTransaction
) {
    for (let apdu of apdus) {
      let index = apdus.indexOf(apdu);
      if (index % 2 == 0) {
        apdus[index] = `=> ${apdu}`;
      } else {
        apdus[index] = `<= ${apdu}`;
      }
    }
    const transport = await openTransportReplayer(
      RecordStore.fromString(apdus.join("\n"))
    );
    const concordium = new Concordium(transport);
    const { signature, transaction } = await concordium.signTransfer(txn as AccountTransaction);
    console.log("SIGNATURE: ",signature);
    console.log("TRANSCATION: ",transaction);

    // await validateTransaction(transaction);
}

// const validateTransaction = async (
//   signedTxn: AccountTransaction,
//   expectedAddress: string = test_sender_address
// ) => {
//   const recoveredAddress = getRecoveredAddressFromSignedTxn(signedTxn);
//   const signaturesGeneratedByLedger = signedTxn.signatures;
//   const signaturesGeneratedByCaver = await signTransactionWithCaver(signedTxn);
//   let secondCheck = (recoveredAddress==expectedAddress);
//   if(!secondCheck){
//     expect(signaturesGeneratedByLedger).toEqual(signaturesGeneratedByCaver);
//   }
//   expect(recoveredAddress).toEqual(expectedAddress);
// };

// const getRecoveredPublicKeyFromSignedTxn = (
//   signedTxn: AbstractTransaction,
//   index = 0
// ) => {
//   let signedRawTx = signedTxn.getRawTransaction();
//   const recoveredPubkey = caver.transaction.recoverPublicKeys(signedRawTx);
//   return recoveredPubkey[index];
// };

// const getRecoveredAddressFromSignedTxn = (signedTxn: AbstractTransaction) => {
//   const recoveredPubkey = getRecoveredPublicKeyFromSignedTxn(signedTxn);
//   const recoveredAddress = caver.utils.publicKeyToAddress(recoveredPubkey);
//   return recoveredAddress;
// };

test("getVersion", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
            => e003000000
            <= 0101009000
        `)
  );
  const concordium = new Concordium(transport);
  const result = await concordium.getVersion();
  expect(result).toEqual({
    version: "1.1.0",
  });
});

test("getAddress without display", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
        => e005000015058000002c80002019800000000000000000000000
        <= 410431553d8c312ef1668adcf75f179a59accb85ffad9ea2a8ecf91049d9cdafc4706f3eb10091a459826803d353b3e3a98af0e999cd44353879930d8baf0779fde7283645393361334143666261444634353746323966623045353746413432323734303034633332454120dcb69125be45c0042ab9761246917b526bb2b3c5aec55d37e32624ae6c87f2679000
    `)
  );
  const concordium = new Concordium(transport);
  const { address } = await concordium.getAddress(DERIVATION, false);
  expect(address).toEqual(test_sender_address);
});

test("getAddress with display", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
        => e005010015058000002c80002019800000000000000000000000
        <= 410431553d8c312ef1668adcf75f179a59accb85ffad9ea2a8ecf91049d9cdafc4706f3eb10091a459826803d353b3e3a98af0e999cd44353879930d8baf0779fde7283645393361334143666261444634353746323966623045353746413432323734303034633332454120dcb69125be45c0042ab9761246917b526bb2b3c5aec55d37e32624ae6c87f2679000
        `)
  );
  const concordium = new Concordium(transport);
  const { address } = await concordium.getAddress(DERIVATION, true);
  expect(address).toEqual(test_sender_address);
});

test("signTransfer without memo", async () => {


  const sender = AccountAddress.fromBase58(test_sender_address);
  const toAddress = AccountAddress.fromBase58(test_receiver_address);
  const nonce = SequenceNumber.create(1234);
  // const nextNonce: NextAccountNonce = await client.getNextAccountNonce(sender);

  const header: AccountTransactionHeader = {
    expiry: TransactionExpiry.futureMinutes(60),
    nonce,
    sender,
  };

  // Include memo if it is given otherwise don't

  const simpleTransfer = {
    amount: CcdAmount.fromMicroCcd("999"),
    toAddress,
  };

  const accountTransaction: AccountTransaction = {
    header: header,
    payload: simpleTransfer,
    type: AccountTransactionType.Transfer,
  };

  // Sign transaction
  await performSigningAndValidation(
    [
      "e006008015058000002c80002019800000000000000000000000",
      "9000",
      "e006010028e719850ba43b7400830493e0940ee56b604c869e3792c99e35c1c424f88f87dc8a01808203e98080",
      "f68186ff6cd6a5e891b1dc9165ae349a4cda5ad2432a81a541b8189ac8f7b020603f8dc7a0a8120a392982d8bb44be6ea34757d85b366558389e16cc26b67ead729000",
    ],
    accountTransaction
  );;

  // const transactionHash = await client.sendAccountTransaction(accountTransaction, signature);
  // const status = await client.waitForTransactionFinalization(transactionHash);
});