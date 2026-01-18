import axios from 'axios';
import { CONFIG } from '../config';

const api = axios.create({
    baseURL: CONFIG.PAKASIR.BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

export const PakasirService = {
    // Create QRIS Transaction
    createQris: async (orderId: string, amount: number) => {
        try {
            const payload = {
                project: CONFIG.PAKASIR.PROJECT_SLUG,
                order_id: orderId,
                amount: amount,
                api_key: CONFIG.PAKASIR.API_KEY
            };

            const res = await api.post('/transactioncreate/qris', payload);
            
            if (res.data && res.data.payment) {
                return {
                    qr_string: res.data.payment.payment_number,
                    total_amount: res.data.payment.total_payment,
                    expired_at: res.data.payment.expired_at
                };
            }
            throw new Error("Invalid response from Payment Gateway");
        } catch (error: any) {
            console.error("Pakasir Create Error:", error.response?.data || error.message);
            throw error;
        }
    },

    // Check Transaction Status
    checkStatus: async (orderId: string, amount: number) => {
        try {
            const url = `/transactiondetail?project=${CONFIG.PAKASIR.PROJECT_SLUG}&amount=${amount}&order_id=${orderId}&api_key=${CONFIG.PAKASIR.API_KEY}`;
            const res = await api.get(url);
            
            if (res.data && res.data.transaction) {
                return res.data.transaction.status; // 'completed', 'pending', etc.
            }
            return 'pending';
        } catch (error: any) {
            console.error("Pakasir Check Error:", error.message);
            return 'pending';
        }
    },

    // Simulate Payment (Sandbox Mode)
    simulatePayment: async (orderId: string, amount: number) => {
        try {
            const payload = {
                project: CONFIG.PAKASIR.PROJECT_SLUG,
                order_id: orderId,
                amount: amount,
                api_key: CONFIG.PAKASIR.API_KEY
            };
            const res = await api.post('/paymentsimulation', payload);
            return { success: true, data: res.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.message || "Simulation Failed" };
        }
    }
};