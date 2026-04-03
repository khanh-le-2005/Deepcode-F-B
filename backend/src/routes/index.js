import express from 'express';
import menuRoutes from "./menuRoutes.js";
import tableRoutes from "./tableRoutes.js";
import orderRoutes from "./orderRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import statsRoutes from "./statsRoutes.js";
import authRoutes from "./authRoutes.js";
import comboRoutes from "./ComboRoutes.js";
import imageRoutes from "./imageRoutes.js";
import bankAccountRoutes from "./bankAccountRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import weeklyMenuRoutes from "./weeklyMenuRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/images", imageRoutes);
router.use("/menu", menuRoutes);
router.use("/weekly-menu", weeklyMenuRoutes);
router.use("/combos", comboRoutes);
router.use("/tables", tableRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/stats", statsRoutes);
router.use("/bank-accounts", bankAccountRoutes);

export default router;
