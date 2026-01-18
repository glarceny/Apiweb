// === REAL BACKEND CONFIGURATION ===
// Replace these values with your actual API keys.

export const CONFIG = {
  // Server Settings
  PORT: 3000,
  SECRET_KEY: "change_this_secret_key_random_string", // For session security
  
  // Database Path (File Based JSON)
  DB_PATH: "./database",

  // Pakasir Payment Gateway
  PAKASIR: {
    MODE_SANDBOX: true, // Enable/Disable Simulation Mode (matches $is_sandbox in PHP)
    PROJECT_SLUG: "your_project_slug", // e.g. 'orbitcloud'
    API_KEY: "your_pakasir_api_key",
    BASE_URL: "https://app.pakasir.com/api"
  },

  // Pterodactyl Panel
  PTERODACTYL: {
    URL: "https://panel.yourdomain.com", // Your Panel URL
    API_KEY: "ptla_your_application_api_key", // Application API Key (Not Account API)
    
    // Node & Egg Configuration IDs
    NODE_ID: 1, // The Node ID where servers will be created
    
    // Egg IDs for each category
    EGGS: {
      linux: { egg_id: 1, nest_id: 1, docker_image: "ghcr.io/pterodactyl/yolks:java_17", startup: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar" },
      windows: { egg_id: 5, nest_id: 1, docker_image: "ghcr.io/parkervcp/wine:latest", startup: "./samp-server.exe" }, // Example for SAMP
      nodejs: { egg_id: 15, nest_id: 5, docker_image: "ghcr.io/pterodactyl/yolks:nodejs_18", startup: "npm start" }
    }
  }
};