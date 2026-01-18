import fs from 'fs';
import path from 'path';
import { CONFIG } from './config';

// Ensure DB directory exists
if (!fs.existsSync(CONFIG.DB_PATH)) {
    fs.mkdirSync(CONFIG.DB_PATH, { recursive: true });
}

const FILES = {
    USERS: path.join(CONFIG.DB_PATH, 'users.json'),
    TRANSACTIONS: path.join(CONFIG.DB_PATH, 'transactions.json'),
    PRODUCTS: path.join(CONFIG.DB_PATH, 'products.json') // Optional if you want dynamic products
};

// Generic Read
const readJson = (file: string) => {
    if (!fs.existsSync(file)) return [];
    try {
        const data = fs.readFileSync(file, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
};

// Generic Write
const writeJson = (file: string, data: any) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

export const DB = {
    users: {
        getAll: () => readJson(FILES.USERS),
        find: (email: string) => readJson(FILES.USERS).find((u: any) => u.email === email),
        findById: (id: string) => readJson(FILES.USERS).find((u: any) => u.id === id),
        save: (user: any) => {
            const users = readJson(FILES.USERS);
            const index = users.findIndex((u: any) => u.id === user.id);
            if (index >= 0) users[index] = user;
            else users.push(user);
            writeJson(FILES.USERS, users);
        }
    },
    transactions: {
        getAll: () => readJson(FILES.TRANSACTIONS),
        find: (order_id: string) => readJson(FILES.TRANSACTIONS).find((t: any) => t.order_id === order_id),
        findByUser: (user_email: string) => readJson(FILES.TRANSACTIONS).filter((t: any) => t.user_email === user_email),
        save: (trx: any) => {
            const trxs = readJson(FILES.TRANSACTIONS);
            const index = trxs.findIndex((t: any) => t.order_id === trx.order_id);
            if (index >= 0) trxs[index] = trx;
            else trxs.push(trx);
            writeJson(FILES.TRANSACTIONS, trxs);
        }
    }
};