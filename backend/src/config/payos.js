import { PayOS } from "@payos/node";
import dotenv from "dotenv";

dotenv.config();

console.log("PayOS Config Check:", {
  clientId: !!process.env.PAYOS_CLIENT_ID,
  apiKey: !!process.env.PAYOS_API_KEY,
  checksumKey: !!process.env.PAYOS_CHECKSUM_KEY
});

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY
});

export default payos;
