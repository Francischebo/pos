<?php
// scripts/check_crud.php
require_once __DIR__ . '/../sqlite_helper.php';
require_once __DIR__ . '/../log.php';

app_log('INFO', 'Starting CRUD checks');

// 1. Product
$product = ['id' => 99991, 'name' => 'TEST PRODUCT', 'category' => 'Test', 'brand' => 'Acme', 'imageUrl' => '', 'price' => 100];
sqlite_upsert_product($product);
$products = sqlite_get_products();
echo "Products count: " . count($products) . "\n";

// 2. Variant
$variant = ['id' => 99991, 'productId' => 99991, 'sku' => 'TP-001', 'barcode' => '00099991', 'price' => 100, 'cost' => 70, 'taxRate' => 0, 'reorderPoint' => 1];
sqlite_upsert_variant($variant);
$variants = sqlite_get_variants();
echo "Variants count: " . count($variants) . "\n";

// 3. Lot
sqlite_insert_lot(99991, 'LOT-TEST-1', 10, null, 70);
$lots = sqlite_get_lots_by_variant(99991);
echo "Lots for variant 99991: " . count($lots) . "\n";

// 4. Profile (user)
$profile = ['id' => 'script-user-1', 'name' => 'Script User', 'email' => 'script@example.com', 'role' => 'admin'];
sqlite_upsert_profile($profile);
$profiles = sqlite_get_profiles();
echo "Profiles count: " . count($profiles) . "\n";

// 5. Purchase Order
$po = ['id' => 'po-test-1', 'poNumber' => 'PO-TEST-1', 'supplierId' => 1, 'date' => date('c'), 'items' => [['variantId' => 99991, 'qty' => 5]], 'status' => 'Open', 'total' => 500];
sqlite_insert_purchase_order($po);
$pendingPos = sqlite_get_pending_purchase_orders();
echo "Pending POs: " . count($pendingPos) . "\n";

// 6. GRN
$grn = ['id' => 'grn-test-1', 'grnNumber' => 'GRN-TEST-1', 'supplierId' => 1, 'date' => date('c'), 'items' => [['variantId' => 99991, 'qty' => 5]]];
sqlite_insert_goods_receipt_note($grn);
$pendingGrns = sqlite_get_pending_grns();
echo "Pending GRNs: " . count($pendingGrns) . "\n";

// 7. Invoice
$inv = ['id' => 'inv-test-1', 'invoiceNumber' => 'INV-TEST-1', 'supplierId' => 1, 'date' => date('c'), 'items' => [['variantId' => 99991, 'qty' => 5]], 'total' => 500, 'status' => 'Open'];
sqlite_insert_purchase_invoice($inv);
$pendingInvs = sqlite_get_pending_purchase_invoices();
echo "Pending Invoices: " . count($pendingInvs) . "\n";

// 8. Stock adjustment log
sqlite_insert_stock_adjustment_log(99991, 10, 15, 'Test adjust', 'script-user-1');
$logs = sqlite_get_pending_stock_adjustment_logs();
echo "Pending stock logs: " . count($logs) . "\n";

// 9. Transaction
$tx = ['id' => 'tx-test-1', 'date' => date('c'), 'items' => [['id' => 99991,'quantity'=>1,'name'=>'TEST PRODUCT']], 'subtotal' => 100, 'tax' => 0, 'total' => 100, 'amountPaid' => 100, 'customer' => null, 'paymentMethods' => [['method'=>'Cash','amount'=>100]], 'status' => 'Completed', 'type' => 'Sale', 'user' => ['id'=>'script-user-1','name'=>'Script User']];
sqlite_insert_transaction($tx);
$pendingTx = sqlite_get_transactions_pending_sync();
echo "Pending transactions: " . count($pendingTx) . "\n";

// 10. Cleanup tests: update variant, update lot, delete created rows
sqlite_update_variant(99991, ['price' => 120]);
$variants = sqlite_get_variants();
echo "Variant price updated in DB (raw): " . print_r(array_filter($variants, fn($v)=>$v['id']==99991), true) . "\n";

$firstLot = $lots[0] ?? null;
if ($firstLot) {
    sqlite_update_lot($firstLot['id'], ['quantity' => 12]);
    $updatedLots = sqlite_get_lots_by_variant(99991);
    echo "Updated lot qty: " . ($updatedLots[0]['quantity'] ?? 'N/A') . "\n";
    sqlite_delete_lot($firstLot['id']);
}

// Delete sample rows
sqlite_delete_variant(99991);
sqlite_delete_product(99991);
sqlite_delete_profile('script-user-1');
sqlite_delete_purchase_order('po-test-1');
sqlite_delete_grn('grn-test-1');
sqlite_delete_purchase_invoice('inv-test-1');

echo "CRUD checks complete\n";
?>