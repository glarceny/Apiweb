import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Buffer } from 'buffer';
import { CONFIG } from './config';
import { DB } from './database';
import { PakasirService } from './services/pakasir';
import { PteroService } from './services/pterodactyl';
import { CATALOG } from '../constants';

const app = express();

app.use(cors());
app.use(bodyParser.json());

// === AUTHENTICATION ROUTES ===
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (DB.users.find(email)) {
        return res.status(400).json({ success: false, message: "Email sudah terdaftar" });
    }
    const newUser = {
        id: `user_${Date.now()}`,
        name,
        email,
        password, 
        balance: 0,
        picture: `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff`
    };
    DB.users.save(newUser);
    res.json({ success: true, message: "Registrasi berhasil", data: newUser });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = DB.users.find(email);
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: "Email atau password salah" });
    }
    const token = Buffer.from(`${user.id}:${CONFIG.SECRET_KEY}`).toString('base64');
    res.json({ 
        success: true, 
        data: { id: user.id, name: user.name, email: user.email, balance: user.balance, picture: user.picture, token } 
    });
});

app.get('/api/products', (req, res) => {
    res.json({ success: true, data: CATALOG });
});

// === ORDER ROUTES (Logic from PHP) ===

// 1. Create Order (with Anti-Double Order Check)
app.post('/api/order', async (req, res) => {
    const { userId, productId, usernameReq } = req.body;
    
    const user = DB.users.findById(userId);
    if (!user) return res.status(401).json({ success: false, message: "User tidak valid" });

    // A. ANTI DOUBLE ORDER (Pending Lock)
    const userTransactions = DB.transactions.findByUser(user.email);
    const existingPending = userTransactions.find((t: any) => {
        if (t.status !== 'pending') return false;
        const createdTime = new Date(t.created_at).getTime();
        const timeDiff = Date.now() - createdTime;
        return timeDiff < 1800 * 1000; // Less than 30 minutes
    });

    if (existingPending) {
        return res.status(400).json({ 
            success: false, 
            message: "Selesaikan tagihan sebelumnya sebelum membuat pesanan baru!",
            data: existingPending // Return existing trx to redirect user
        });
    }

    // B. Validate Product
    let product: any = null;
    Object.values(CATALOG).forEach((arr: any) => {
        const found = arr.find((p: any) => p.id === productId);
        if (found) product = found;
    });

    if (!product) return res.status(400).json({ success: false, message: "Produk tidak ditemukan" });

    // C. Validate Username
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(usernameReq)) {
        return res.status(400).json({ success: false, message: "Username hanya boleh huruf, angka, garis bawah, dan 3-16 karakter." });
    }

    const orderId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
        // D. Request QRIS
        const paymentData = await PakasirService.createQris(orderId, product.price);

        const trx = {
            order_id: orderId,
            user_id: userId,
            user_email: user.email,
            amount: paymentData.total_amount,
            original_price: product.price,
            qr_string: paymentData.qr_string,
            paket_type: product.id,
            paket_name: product.name,
            username_req: usernameReq,
            status: 'pending',
            created_at: new Date().toISOString(),
            server_created: false
        };

        DB.transactions.save(trx);
        res.json({ success: true, data: trx });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Action: Cancel Order (with Anti-Spam Time Lock)
app.post('/api/order/:orderId/cancel', (req, res) => {
    const { orderId } = req.params;
    const trx = DB.transactions.find(orderId);

    if (!trx) return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan" });
    if (trx.status !== 'pending') return res.status(400).json({ success: false, message: "Status tidak dapat dibatalkan" });

    // Anti Spam Check (120 seconds lock)
    const createdTime = new Date(trx.created_at).getTime();
    const timeDiff = (Date.now() - createdTime) / 1000; // in seconds
    const minWait = 120;

    if (timeDiff < minWait) {
        const waitLeft = Math.ceil(minWait - timeDiff);
        return res.status(429).json({ 
            success: false, 
            message: `Proteksi Spam Aktif. Mohon tunggu ${waitLeft} detik lagi sebelum membatalkan.` 
        });
    }

    trx.status = 'cancelled';
    DB.transactions.save(trx);
    res.json({ success: true, message: "Pesanan dibatalkan", data: trx });
});

// 3. Action: Simulate Payment (Sandbox Only)
app.post('/api/order/:orderId/simulate', async (req, res) => {
    if (!CONFIG.PAKASIR.MODE_SANDBOX) {
        return res.status(403).json({ success: false, message: "Fitur ini hanya aktif di Mode Sandbox/Test." });
    }

    const { orderId } = req.params;
    const trx = DB.transactions.find(orderId);
    if (!trx) return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan" });

    const result = await PakasirService.simulatePayment(orderId, trx.amount);
    
    if (result.success) {
        res.json({ success: true, message: "Simulasi pembayaran terkirim. Tunggu sistem memproses." });
    } else {
        res.status(500).json({ success: false, message: result.message });
    }
});

// 4. Action: Check Status (Heartbeat & Auto Deploy)
app.get('/api/order/:orderId/status', async (req, res) => {
    const { orderId } = req.params;
    const trx = DB.transactions.find(orderId);

    if (!trx) return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan" });

    // 1. Cek Expired Local (30 Menit)
    if (trx.status === 'pending') {
        const createdTime = new Date(trx.created_at).getTime();
        if (Date.now() - createdTime > 1800 * 1000) {
            trx.status = 'expired';
            DB.transactions.save(trx);
            return res.json({ success: true, data: trx });
        }
    }

    // 2. If already paid, check for deployment retry
    if (trx.status === 'paid') {
        if (!trx.server_created) {
            await deployServer(trx);
        }
        return res.json({ success: true, data: trx });
    }
    
    // 3. If final status
    if (trx.status === 'cancelled' || trx.status === 'expired') {
        return res.json({ success: true, data: trx });
    }

    // 4. Check API Payment Gateway
    const gatewayStatus = await PakasirService.checkStatus(orderId, trx.original_price);
    
    if (['completed', 'success', 'settlement'].includes(gatewayStatus)) {
        trx.status = 'paid';
        await deployServer(trx);
        DB.transactions.save(trx);
    } else if (gatewayStatus === 'expired') {
        trx.status = 'expired';
        DB.transactions.save(trx);
    }

    res.json({ success: true, data: trx });
});

// Helper: Server Deployment Logic
async function deployServer(trx: any) {
    if (trx.server_created) return;

    try {
        // Find Product
        let product: any = null;
        Object.values(CATALOG).forEach((arr: any) => {
            const found = arr.find((p: any) => p.id === trx.paket_type);
            if (found) product = found;
        });
        if (!product) return;

        // Create Ptero User
        const pteroUser = await PteroService.createUser(trx.username_req, trx.user_email);
        
        if (pteroUser) {
            // Create Server
            const server = await PteroService.createServer(pteroUser.id, product, trx.username_req);
            
            trx.server_created = true;
            trx.server_detail = {
                uuid: server.uuid,
                identifier: server.identifier,
                panel_url: CONFIG.PTERODACTYL.URL,
                username: pteroUser.username,
                password: pteroUser.password,
                ip: server.allocation_ip,
                port: server.allocation_port
            };
            DB.transactions.save(trx); // Ensure we save the server details immediately
        }
    } catch (err) {
        console.error("Deploy Failed:", err);
    }
}

app.get('/api/history/:userId', (req, res) => {
    const user = DB.users.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false });
    const trxs = DB.transactions.findByUser(user.email);
    res.json({ success: true, data: trxs });
});

app.listen(CONFIG.PORT, () => {
    console.log(`OrbitCloud Backend running on http://localhost:${CONFIG.PORT}`);
});