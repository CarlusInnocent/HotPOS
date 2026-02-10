const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'products.json');
const cleanedOut = path.join(__dirname, 'cleaned-products.json');
const stockOut = path.join(__dirname, 'stock-seed.json');
const importedCategoryId = 1;
const branchId = 1; // Main Branch id

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function slugify(name) {
  const base = String(name || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'SKU';
}

function uniqueSku(name, legacyId, counterMap) {
  const base = slugify(name).slice(0, 40);
  let sku = base;
  while (counterMap.has(sku)) {
    const count = counterMap.get(base) || 1;
    counterMap.set(base, count + 1);
    sku = `${base}-${String(count + 1).padStart(2, '0')}`;
  }
  counterMap.set(sku, 1);
  return sku;
}

function main() {
  const data = readJson(inputPath);
  const skuMap = new Map();
  const cleaned = [];
  const stock = [];

  for (const item of data) {
    const legacyId = String(item['ID'] ?? '').trim();
    const name = String(item['Product Name'] ?? '').trim();
    const buying = toNumber(item['Buying Price']);
    const selling = toNumber(item['Selling Price']);
    const sku = uniqueSku(name || `PRODUCT-${legacyId || cleaned.length + 1}`, legacyId, skuMap);

    cleaned.push({
      legacyId,
      name,
      sku,
      categoryId: importedCategoryId,
      categoryName: 'Imported',
      description: undefined,
      unitOfMeasure: 'pcs',
      sellingPrice: selling,
      taxRate: 0,
      reorderLevel: 10,
      requiresSerial: false,
      isActive: true,
    });

    stock.push({
      branchId,
      legacyProductId: legacyId,
      productSku: sku,
      productName: name,
      quantity: toNumber(item['Stock']),
      costPrice: buying,
      sellingPrice: selling,
      reorderLevel: 10,
    });
  }

  fs.writeFileSync(cleanedOut, JSON.stringify(cleaned, null, 2));
  fs.writeFileSync(stockOut, JSON.stringify(stock, null, 2));
  console.log(`Wrote ${cleaned.length} products -> ${cleanedOut}`);
  console.log(`Wrote ${stock.length} stock rows -> ${stockOut}`);
}

main();
