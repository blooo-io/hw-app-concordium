// import Concordium from "./src/Concordium";
import { AccountAddress, AccountTransactionType, CcdAmount, SequenceNumber, TransactionExpiry } from "@concordium/web-sdk";
import { serializeAccountTransaction } from "./lib-es/utils.js";
import { encodeInt32, encodeInt8 } from "@concordium/common-sdk/lib/serializationHelpers.js";
import { serializeConcordiumTransaction } from "./lib-es/serialization.js"
// import { createTransport } from "@ledgerhq/hw-transport-mocker";

// const transport = createTransport();
// const concordium = new Concordium(transport);

const DERIVATION = "44'/8217'/0'/0/0";

// Address used for testing (default speculos address, pub & priv key)
const test_sender_address = "4McQDikzr3GXi52Xjgcm2XZbq7E8YF7gzATZScZ5U59eLLkKjg";
const test_sender_publicKey =
  "0x31553d8c312ef1668adcf75f179a59accb85ffad9ea2a8ecf91049d9cdafc4706f3eb10091a459826803d353b3e3a98af0e999cd44353879930d8baf0779fde7";
const test_sender_privateKey =
  "0xba988b41f30ab65c5b8df817aa27468292d089db601892b01bccf0028d0d95bb";
const test_receiver_address = "4McQDikzr3GXi52Xjgcm2XZbq7E8YF7gzATZScZ5U59eLLkKjg";

const sender = AccountAddress.fromBase58(test_sender_address);
  const toAddress = AccountAddress.fromBase58(test_receiver_address);
  const nonce = SequenceNumber.create(1234);
  // const nextNonce: NextAccountNonce = await client.getNextAccountNonce(sender);

  const header = {
    expiry: TransactionExpiry.futureMinutes(60),
    nonce,
    sender,
  };

  // Include memo if it is given otherwise don't

  const simpleTransfer = {
    amount: CcdAmount.fromMicroCcd("999"),
    toAddress,
  };

  const accountTransaction = {
    header: header,
    payload: simpleTransfer,
    type: AccountTransactionType.Transfer,
  };
  const idEncoded = encodeInt32(0);
  const credEncoded = encodeInt32(0);
console.log("GUI TEST", Buffer.concat([idEncoded,credEncoded]).toString("hex"));


  const transaction = {
    sender,
    nonce: nonce.toString(),
    expiry: BigInt(123456),
    energyAmount: '1234',
    transactionKind: AccountTransactionType.Transfer,
    payload: simpleTransfer,
};
const txSerialized = serializeAccountTransaction(transaction);
console.log("Hex transaction", txSerialized.toString('hex'));

const trx = serializeConcordiumTransaction(transaction, "44'/919'/0'/0/0")
console.log("GUI TX: ", trx);

// const tx = Buffer.from(,txSerialized])
// console.log("Transaction", tx);
