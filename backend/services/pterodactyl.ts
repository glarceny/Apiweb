import axios from 'axios';
import { CONFIG } from '../config';

const api = axios.create({
    baseURL: `${CONFIG.PTERODACTYL.URL}/api/application`,
    headers: {
        'Authorization': `Bearer ${CONFIG.PTERODACTYL.API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 30000 // 30s timeout
});

export const PteroService = {
    // Create Pterodactyl User
    createUser: async (username: string, email: string) => {
        // Generate random password
        const password = Math.random().toString(36).slice(-8) + "Aa1!"; 
        
        try {
            // Check if user exists first (by email) - simplistic check
            // In a real scenario, you might want to list users and filter
            const payload = {
                email,
                username: username.substring(0, 60),
                first_name: username,
                last_name: "User",
                password: password
            };
            
            const res = await api.post('/users', payload);
            return { id: res.data.attributes.id, password, ...res.data.attributes };
        } catch (error: any) {
            console.error("Ptero Create User Error:", error.response?.data?.errors || error.message);
            
            // Fallback: If user exists, we can't retrieve password, but we return ID if we could search
            // For this implementation, we assume unique email/username or return null
            return null;
        }
    },

    // Find Available Allocation (Port) and return details
    getAllocation: async (nodeId: number) => {
        try {
            const res = await api.get(`/nodes/${nodeId}/allocations?per_page=100`);
            const allocations = res.data.data;
            const free = allocations.find((a: any) => !a.attributes.assigned);
            
            if (free) {
                return {
                    id: free.attributes.id,
                    ip: free.attributes.alias || free.attributes.ip,
                    port: free.attributes.port
                };
            }
            return null;
        } catch (error) {
            console.error("Ptero Alloc Error:", error);
            return null;
        }
    },

    // Create Server
    createServer: async (userId: number, product: any, usernameReq: string) => {
        const category = product.category as keyof typeof CONFIG.PTERODACTYL.EGGS;
        const conf = CONFIG.PTERODACTYL.EGGS[category];
        const nodeId = CONFIG.PTERODACTYL.NODE_ID;

        // 1. Get Allocation
        const allocation = await PteroService.getAllocation(nodeId);
        if (!allocation) throw new Error("No allocations available on node");

        // 2. Prepare Data
        const serverName = `${product.name} - ${usernameReq}`;
        const data = {
            name: serverName,
            user: userId,
            egg: conf.egg_id,
            docker_image: conf.docker_image,
            startup: conf.startup,
            environment: {
                // Simplified environment variables based on egg
                "MAX_PLAYERS": "50",
                "CMD_RUN": "npm start" 
            },
            limits: {
                memory: product.ram,
                swap: 0,
                disk: product.disk,
                io: 500,
                cpu: product.cpu
            },
            feature_limits: {
                databases: 1,
                allocations: 0,
                backups: 0
            },
            allocation: {
                default: allocation.id
            },
            nest: conf.nest_id,
            node: nodeId
        };

        // 3. Send Request
        try {
            const res = await api.post('/servers', data);
            return {
                ...res.data.attributes,
                allocation_ip: allocation.ip,
                allocation_port: allocation.port
            };
        } catch (error: any) {
             console.error("Ptero Create Server Error:", error.response?.data?.errors || error.message);
             throw new Error("Failed to deploy server on panel");
        }
    }
};