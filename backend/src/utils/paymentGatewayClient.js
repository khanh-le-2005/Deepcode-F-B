// src/utils/paymentGatewayClient.js
import axios from "axios";

const paymentGateway = axios.create({
  baseURL: process.env.PAYMENT_GATEWAY_URL || "http://localhost:8000/api",
  timeout: 10000, // Timeout 10s
});

export default paymentGateway;
