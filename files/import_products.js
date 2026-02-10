const fs = require('fs');
const path = require('path');

const base = 'http://localhost:8081/api';
const creds = { username: 'admin', password: 'admin123' };
const productsPath = path.join(__dirname, 'cleaned-products.json');
const stockPath = path.join(__dirname, 'stock-seed.json');

async function login() {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.token) throw new Error('No token returned from login');
  return data.token;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function fetchAllProducts(token) {
  // Fetch all existing products to build SKU→ID map
  const res = await fetch(`${base}/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }
  return await res.json();
}

async function fetchStockByBranch(branchId, token) {
  // Fetch existing stock items for a branch
  const res = await fetch(`${base}/stock/branch/${branchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch stock for branch ${branchId}: ${res.status}`);
  }
  return await res.json();
}

async function createProduct(prod, token) {
  const payload = {
    categoryId: prod.categoryId,
    sku: prod.sku,
    name: prod.name,
    description: prod.description ?? null,
    unitOfMeasure: prod.unitOfMeasure,
    requiresSerial: prod.requiresSerial,
    reorderLevel: prod.reorderLevel,
    sellingPrice: prod.sellingPrice,
    isActive: prod.isActive,
  };
  const res = await fetch(`${base}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Product ${prod.sku} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return await res.json();
}

async function upsertStock(stockRow, productId, stockItemId, token) {
  if (stockItemId) {
    // Use PUT to set absolute quantity (not add)
    const payload = {
      quantity: stockRow.quantity ?? 0,
      costPrice: stockRow.costPrice ?? 0,
      sellingPrice: stockRow.sellingPrice ?? 0,
    };
    const res = await fetch(`${base}/stock/${stockItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stock ${stockRow.productSku} PUT failed: ${res.status} ${res.statusText} ${text}`);
    }
    return await res.json();
  } else {
    // Create new stock item via adjust (for new products)
    const params = new URLSearchParams({
      branchId: String(stockRow.branchId),
      productId: String(productId),
      quantity: String(stockRow.quantity ?? 0),
      costPrice: String(stockRow.costPrice ?? 0),
      sellingPrice: String(stockRow.sellingPrice ?? 0),
    });
    const res = await fetch(`${base}/stock/adjust?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stock ${stockRow.productSku} POST failed: ${res.status} ${res.statusText} ${text}`);
    }
    return await res.json();
  }
}

async function run() {
  console.log('Reading input files...');
  const products = readJson(productsPath);
  const stock = readJson(stockPath);

  console.log(`Products: ${products.length}, Stock rows: ${stock.length}`);
  const token = await login();
  console.log('Authenticated.');

  // Fetch existing products to build SKU→ID map
  console.log('Fetching existing products...');
  const existingProducts = await fetchAllProducts(token);
  const skuToId = new Map();
  for (const p of existingProducts) {
    skuToId.set(p.sku, p.id);
  }
  console.log(`Found ${existingProducts.length} existing products in DB.`);

  // Create only products that don't exist yet
  const productErrors = [];
  let created = 0;
  let skipped = 0;

  for (const prod of products) {
    if (skuToId.has(prod.sku)) {
      skipped++;
      continue; // Already exists, skip creation
    }
    try {
      const result = await createProduct(prod, token);
      skuToId.set(result.sku, result.id);
      created++;
    } catch (err) {
      productErrors.push({ sku: prod.sku, error: err.message });
      console.warn(err.message);
    }
  }

  console.log(`Product import done. Created: ${created}, Skipped (existing): ${skipped}, Failed: ${productErrors.length}`);

  // Fetch existing stock items to get their IDs for PUT updates
  console.log('Fetching existing stock items...');
  const existingStock = await fetchStockByBranch(1, token);
  const productIdToStockId = new Map();
  for (const item of existingStock) {
    productIdToStockId.set(item.productId, item.id);
  }
  console.log(`Found ${existingStock.length} existing stock items.`);

  console.log('Importing stock...');
  const stockErrors = [];
  let stockSuccess = 0;

  for (const row of stock) {
    const productId = skuToId.get(row.productSku);
    if (!productId) {
      stockErrors.push({ sku: row.productSku, error: 'No productId (product failed or duplicate SKU)' });
      continue;
    }
    const stockItemId = productIdToStockId.get(productId);
    try {
      await upsertStock(row, productId, stockItemId, token);
      stockSuccess += 1;
    } catch (err) {
      stockErrors.push({ sku: row.productSku, error: err.message });
      console.warn(err.message);
    }
  }

  console.log(`Stock import done. Success: ${stockSuccess}, Failed: ${stockErrors.length}`);

  if (productErrors.length || stockErrors.length) {
    const summary = { productErrors, stockErrors };
    const outPath = path.join(__dirname, 'import-errors.json');
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
    console.log(`Errors written to ${outPath}`);
  } else {
    console.log('Import completed with no errors.');
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
