import { ProductCatalog } from './types';

// Catalog data mocking what would come from config.php/database
export const CATALOG: ProductCatalog = {
  linux: [
    { id: 'linux_1', name: 'Nano Linux', price: 15000, ram: 1024, disk: 2048, cpu: 50, extra: 'Slot: 30 Players', category: 'linux' },
    { id: 'linux_2', name: 'Mega Linux', price: 35000, ram: 2048, disk: 5120, cpu: 100, extra: 'Slot: 100 Players', category: 'linux' },
    { id: 'linux_3', name: 'Giga Linux', price: 65000, ram: 4096, disk: 10240, cpu: 200, extra: 'Slot: Unlimited', category: 'linux' },
  ],
  windows: [
    { id: 'win_1', name: 'Starter Win', price: 45000, ram: 2048, disk: 15360, cpu: 100, extra: 'RDP Access', category: 'windows' },
    { id: 'win_2', name: 'Pro Win', price: 85000, ram: 4096, disk: 25600, cpu: 200, extra: 'RDP + Admin', category: 'windows' },
  ],
  nodejs: [
    { id: 'node_1', name: 'Bot Starter', price: 10000, ram: 512, disk: 1024, cpu: 40, extra: 'NPM Support', category: 'nodejs' },
    { id: 'node_2', name: 'Bot Pro', price: 25000, ram: 1024, disk: 2048, cpu: 80, extra: 'NPM + PM2', category: 'nodejs' },
    { id: 'node_3', name: 'Bot Master', price: 50000, ram: 2048, disk: 5120, cpu: 150, extra: 'Priority Support', category: 'nodejs' },
  ]
};

export const MOCK_USER = {
  name: "Budi Santoso",
  email: "budi@gmail.com",
  picture: "https://picsum.photos/200",
  balance: 0
};

export const SIMULATION_MODE = true; // Simulates config.json sandbox toggle