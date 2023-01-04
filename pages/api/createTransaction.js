import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createTransferCheckedInstruction, getAssociatedTokenAddress, getMint } from "@solana/spl-token";
import BigNumber from "bignumber.js";
import products from "./products.json";

const usdcAddress = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
// Make sure you replace this with your wallet address!
const sellerAddress = 'HuaRNjL2kygnhw8wbexEedpr7C8RMWrTxDbKK8PhXfqQ'
const sellerPublicKey = new PublicKey(sellerAddress);

const createTransaction = async (req, res) => {
  console.log('req:', req);
  try {
    // Extract the transaction data from the request body
    const { buyer, orderID, itemID } = req.body;
    console.log('buyer:', buyer);

    // If we don't have something we need, stop!
    if (!buyer) {
      return res.status(400).json({
        message: "Missing buyer address",
      });
    }

    if (!orderID) {
      return res.status(400).json({
        message: "Missing order ID",
      });
    }

    // Fetch item price from products.json using itemID
    const itemPrice = products.find((item) => item.id === itemID).price;

    if (!itemPrice) {
      return res.status(404).json({
        message: "Item not found. please check item ID",
      });
    }
    
    // Convert our price to the correct format
    const bigAmount = BigNumber(itemPrice);
    const buyerPublicKey = new PublicKey(buyer);

    const network = WalletAdapterNetwork.Mainnet;
    const endpoint = clusterApiUrl(network);
    // const endpoint = 'https://solana-api.projectserum.com';
    console.log('endpoint transaction:', endpoint);

    const connection = new Connection(endpoint);

    console.log("connection", connection);

    // const buyerUsdcAddress = await getAssociatedTokenAddress(usdcAddress, buyerPublicKey);
    // const shopUsdcAddress = await getAssociatedTokenAddress(usdcAddress, sellerPublicKey);

    // A blockhash is sort of like an ID for a block. It lets you identify each block.
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    
    // This is new, we're getting the mint address of the token we want to transfer
    // const usdcMint = await getMint(connection, usdcAddress);
    
    // The first two things we need - a recent block ID 
    // and the public key of the fee payer 
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: buyerPublicKey,
    });

    console.log("tx", tx);

    // This is the "action" that the transaction will take
    // We're just going to transfer some SOL
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: buyerPublicKey,
      // Lamports are the smallest unit of SOL, like Gwei with Ethereum
      lamports: bigAmount.multipliedBy(LAMPORTS_PER_SOL).toNumber(), 
      toPubkey: sellerPublicKey,
    });

    // Here we're creating a different type of transfer instruction
    // const transferInstruction = createTransferCheckedInstruction(
    //     buyerUsdcAddress, 
    //     usdcAddress,     // This is the address of the token we want to transfer
    //     shopUsdcAddress, 
    //     buyerPublicKey, 
    //     bigAmount.toNumber() * 10 ** (await usdcMint).decimals, 
    //     usdcMint.decimals // The token could have any number of decimals
    //   );

    // We're adding more instructions to the transaction
    transferInstruction.keys.push({
      // We'll use our OrderId to find this transaction later
      pubkey: new PublicKey(orderID), 
      isSigner: false,
      isWritable: false,
    });

    tx.add(transferInstruction);
  
    // Formatting our transaction
    const serializedTransaction = tx.serialize({
      requireAllSignatures: false,
    });
    const base64 = serializedTransaction.toString("base64");

    res.status(200).json({
      transaction: base64,
    });
  } catch (error) {
    console.error("tx error:", error);

    res.status(500).json({ error: "error creating tx" });
    return;
  }
}

export default function handler(req, res) {
  if (req.method === "POST") {
    createTransaction(req, res);
  } else {
    res.status(405).end();
  }
}