import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from './src/models/Order.js';
import { Payment } from './src/models/Payment.js';
import { Table } from './src/models/Table.js';
import { BankAccount } from './src/models/BankAccount.js';

dotenv.config();

const reconcile = async () => {
    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Tìm tất cả Order đã thanh toán
        const paidOrders = await Order.find({ paymentStatus: 'paid' });
        console.log(`🔍 Found ${paidOrders.length} paid orders.`);

        let createdCount = 0;
        const defaultBank = await BankAccount.findOne({ isDefault: true });
        const bankName = defaultBank 
            ? `${defaultBank.bankName} - ${defaultBank.accountNo} (${defaultBank.accountName})`
            : 'MBBank / Không rõ STK';

        for (const order of paidOrders) {
            // 2. Kiểm tra xem đã có bản ghi Payment chưa
            const existingPayment = await Payment.findOne({ orderId: order._id });
            
            if (!existingPayment) {
                console.log(`⚠️  Missing payment for Order #${order.orderCode} (${order.tableName || order.tableId}). Creating...`);
                
                let tableName = order.tableName;
                if (!tableName && order.tableId) {
                    const table = await Table.findById(order.tableId).catch(() => null);
                    tableName = table ? table.name : order.tableId;
                }

                await Payment.create({
                    orderId: order._id,
                    amount: order.total,
                    method: 'Chuyển khoản (PayOS)',
                    bankAccountId: defaultBank?._id || null,
                    tableName: tableName || 'Bàn không xác định',
                    bankNameSnapshot: bankName,
                    cashierName: 'Hệ thống (Phục hồi dữ liệu)',
                    status: 'success',
                    createdAt: order.completedAt || order.updatedAt || new Date()
                });
                createdCount++;
            }
        }

        console.log(`🏁 Reconciliation finished. Created ${createdCount} missing payment records.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during reconciliation:', error);
        process.exit(1);
    }
};

reconcile();
