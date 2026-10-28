const { Pool } = require('pg');

// 1. Configure the connection pool
const pool = new Pool({
  user: 'postgres',           // Your default admin username
  host: 'localhost',          // Local server
  database: 'postgres',       // Database name
  password: 'admin',  // Replace with your admin password
  port: 5432,                 // Default port
});

async function manageDatabase() {
  try {
    console.log("Connecting to PostgreSQL...");
   
   

    const insertQuery=`INSERT INTO products (
    name,
    description,
    brand,
    sku,
    inventory_count,
    price,
    sale_price,
    created_at,
    category
)
SELECT 
    -- Product name
    (ARRAY['Wireless', 'Ultra', 'Pro', 'Smart', 'Eco', 'Compact', 'Ergonomic'])[floor(random() * 7 + 1)] || ' ' ||
    (ARRAY['Headphones', 'Watch', 'Mouse', 'Keyboard', 'Speaker', 'Monitor', 'Backpack', 'Charger'])[floor(random() * 8 + 1)] AS name,

    -- Description
    'High quality product designed for daily use and maximum performance.' AS description,

    -- Brand
    (ARRAY['TechCorp', 'Aura', 'Nexus', 'Pulse', 'Vortex'])[floor(random() * 5 + 1)] AS brand,

    -- Unique SKU (e.g., SKU-1001, SKU-1002)
    'SKU-' || (1000 + i)::text AS sku,

    -- Random inventory count between 0 and 150
    floor(random() * 151)::integer AS inventory_count,

    -- Base price between 10.00 and 500.00
    ROUND((random() * 490 + 10)::numeric, 2) AS price,

    -- Sale price: ~30% chance to have a discounted price, otherwise NULL
    CASE 
        WHEN random() < 0.3 THEN ROUND((random() * 50 + 10)::numeric, 2) 
        ELSE NULL 
    END AS sale_price,

    -- Created at: Random timestamp within the last 90 days
    NOW() - (random() * interval '90 days') AS created_at,

    -- Category
    (ARRAY['Electronics', 'Accessories', 'Office', 'Audio', 'Gadgets'])[floor(random() * 5 + 1)] AS category

FROM generate_series(1, 100) AS i;`;
await pool.query(insertQuery);
console.log("✅ Data insertion completed.");

const selectQuery = "SELECT id, name, brand, sku,inventory_count,price,sale_price,created_at,category FROM products ";
const result = await pool.query(selectQuery);

    
console.log("\n📊 Current Products in Database:");

    
    console.table(result.rows); // Prints the data in a clean, readable table format

  } catch (err) {
    console.error("❌ Database error:", err.message);
  } finally {
    // 5. Close the pool connections when done
    await pool.end();
    console.log("\nDisconnected from PostgreSQL.");
  }
}

manageDatabase();