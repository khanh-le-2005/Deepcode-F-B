import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandCoins, Clock, CheckCircle2, Search, Table2, Banknote, Timer } from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { Order } from '../../../types';
import { cn } from '../../../lib/cn';
import { Button } from '../../../components/Button';

const socket = io();

export const AdminPaymentRequests = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [liveRequests, setLiveRequests] = useState<any[]>([]); // Lưu các yêu cầu qua Socket (do BE chưa lưu DB)
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRequests();

        // Listen for socket events
        socket.on('payment-requested', (data) => {
            toast.info(`Bàn ${data.tableName || data.tableId} vừa yêu cầu thanh toán tiền mặt!`, {
                position: "top-center",
                autoClose: 10000
            });
            
            // Thêm vào danh sách "Live" để hiển thị tạm thời
            setLiveRequests(prev => {
                // Tránh trùng lặp bàn
                const exists = prev.find(r => r.tableId === data.tableId);
                if (exists) return prev;
                return [data, ...prev];
            });
        });

        socket.on('order-updated', () => fetchRequests());
        socket.on('order-paid', () => fetchRequests());

        return () => {
            socket.off('payment-requested');
            socket.off('order-updated');
            socket.off('order-paid');
        };
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await axios.get('/api/orders');
            // Lọc các đơn hàng đang active (giả định)
            const activeOrders = (res.data || []).filter((o: any) => o.status === 'active');
            setOrders(activeOrders);
        } catch (err) {
            console.error("Failed to fetch payment requests:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async (orderId: string, tableId?: string) => {
        if (!window.confirm('Xác nhận đã thu tiền mặt và đóng phiên cho bàn này?')) return;
        try {
            await axios.post(`/api/orders/${orderId}/complete`);
            toast.success('Đã xác nhận thanh toán & giải phóng bàn!');
            
            // Xóa khỏi danh sách live nếu có
            if (tableId) {
                setLiveRequests(prev => prev.filter(r => r.tableId !== tableId));
            }
            fetchRequests();
        } catch (err) {
            toast.error('Lỗi khi xác nhận thanh toán.');
        }
    };

    const allRequests = [
        ...liveRequests.map(lr => ({ ...lr, isLive: true })),
        ...orders.filter(o => !liveRequests.find(lr => lr.orderId === (o as any)._id))
    ];

    const filteredRequests = allRequests.filter(o => 
        (o.tableId || '').includes(searchTerm) || 
        (o.tableName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif flex items-center gap-4">
                        <HandCoins className="w-10 h-10 text-brand" />
                        Yêu Cầu Thanh Toán
                    </h2>
                    <p className="text-gray-500 font-medium mt-1 italic">Lưu ý: Yêu cầu qua Socket sẽ biến mất nếu làm mới trang (do Backend chưa lưu trạng thái này).</p>
                </div>

                <div className="relative group min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors" />
                    <input
                        type="text"
                        placeholder="Tìm số bàn..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-card transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center">
                    <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredRequests.map((order, i) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.05 }}
                                key={(order as any)._id || order.id || order.orderId}
                                className="premium-card p-8 flex flex-col border-l-8 border-l-brand"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                            <Table2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900">Bàn {order.tableName || order.tableId}</h3>
                                            <p className="text-[10px] font-black text-brand uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                                <Timer className="w-3 h-3" />
                                                Chờ thanh toán {order.isLive && "(Gần đây)"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tổng tiền</span>
                                        <span className="text-xl font-black text-slate-950">{(order.total || 0).toLocaleString()}đ</span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 mb-8 space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-500 italic">
                                        <span>Phương thức:</span>
                                        <span className="text-slate-900">Tiền mặt tại quầy</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 italic">
                                        <span>Số món:</span>
                                        <span className="text-slate-900">{order.items?.length || '?'} món</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => handleConfirmPayment((order as any)._id || order.id || order.orderId, order.tableId)}
                                    className="w-full bg-slate-950 hover:bg-slate-900 text-white rounded-xl h-14 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 group transition-all"
                                >
                                    <Banknote className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    Xác nhận thu tiền
                                </Button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {!loading && filteredRequests.length === 0 && (
                <div className="premium-card py-32 flex flex-col items-center justify-center text-center opacity-60">
                    <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-6">
                        <HandCoins className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Không có yêu cầu nào</h3>
                    <p className="text-gray-400 font-medium">Hiện tại không có bàn nào yêu cầu tính tiền mặt</p>
                </div>
            )}
        </div>
    );
};
