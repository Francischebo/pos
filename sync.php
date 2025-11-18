<?php
// sync.php
// Synchronize pending SQLite records to Supabase (or a remote API) when online.

require_once __DIR__ . '/sqlite_helper.php';
require_once __DIR__ . '/log.php';

$supabase_url = getenv('SUPABASE_URL') ?: null;
$supabase_key = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: null;

if (!$supabase_url || !$supabase_key) {
    app_log('ERROR', 'Supabase credentials not set; set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
    echo "Supabase configuration missing\n";
    exit(1);
}

$payments = sqlite_get_pending_payments();
foreach ($payments as $p) {
    // Upsert into Supabase table `payments` via REST (service role key required)
    $payload = [
        'phone_number' => $p['phone_number'],
        'amount' => $p['amount'],
        'checkout_request_id' => $p['checkout_request_id'],
        'status' => $p['status'],
        'mpesa_receipt' => $p['mpesa_receipt'],
        'created_at' => $p['created_at']
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, rtrim($supabase_url, '/') . '/rest/v1/payments');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabase_key,
        'Authorization: Bearer ' . $supabase_key,
        'Prefer: resolution=merge-duplicates'
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $status >= 400) {
        app_log('ERROR', 'Failed to sync payment to Supabase', ['err' => $err, 'status' => $status, 'response' => $resp]);
        echo "Failed to sync payment id={$p['id']}\n";
        continue;
    }
    sqlite_mark_payment_synced($p['id']);
    app_log('INFO', 'Synced payment to Supabase', ['checkout_request_id' => $p['checkout_request_id']]);
    echo "Synced payment id={$p['id']}\n";
}

$callbacks = sqlite_get_pending_callbacks();
foreach ($callbacks as $c) {
    $payload = [
        'checkout_request_id' => $c['checkout_request_id'],
        'payload' => $c['payload'],
        'received_at' => $c['received_at']
    ];
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, rtrim($supabase_url, '/') . '/rest/v1/callbacks');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabase_key,
        'Authorization: Bearer ' . $supabase_key,
        'Prefer: resolution=merge-duplicates'
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $status >= 400) {
        app_log('ERROR', 'Failed to sync callback to Supabase', ['err' => $err, 'status' => $status, 'response' => $resp]);
        echo "Failed to sync callback id={$c['id']}\n";
        continue;
    }
    sqlite_mark_callback_synced($c['id']);
    app_log('INFO', 'Synced callback to Supabase', ['checkout_request_id' => $c['checkout_request_id']]);
    echo "Synced callback id={$c['id']}\n";
}

// Sync products
$pendingProducts = sqlite_get_pending_products();
foreach ($pendingProducts as $p) {
    $payload = json_decode($p['data'], true);
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, rtrim($supabase_url, '/') . '/rest/v1/products');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabase_key,
        'Authorization: Bearer ' . $supabase_key,
        'Prefer: resolution=merge-duplicates'
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $status >= 400) {
        app_log('ERROR', 'Failed to sync product to Supabase', ['err' => $err, 'status' => $status, 'response' => $resp]);
        echo "Failed to sync product id={$p['id']}\n";
        continue;
    }
    sqlite_mark_product_synced($p['id']);
    app_log('INFO', 'Synced product to Supabase', ['id' => $p['id']]);
    echo "Synced product id={$p['id']}\n";
}

// Sync lots (if variants had lots split out)
function sync_table($rows, $tableName, $supabase_url, $supabase_key, $markFnName) {
    foreach ($rows as $r) {
        $payload = $r;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, rtrim($supabase_url, '/') . '/rest/v1/' . $tableName);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'apikey: ' . $supabase_key,
            'Authorization: Bearer ' . $supabase_key,
            'Prefer: resolution=merge-duplicates'
        ]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($err || $status >= 400) {
            app_log('ERROR', "Failed to sync {$tableName} to Supabase", ['err' => $err, 'status' => $status, 'response' => $resp]);
            echo "Failed to sync {$tableName} id={$r['id']}\n";
            continue;
        }
        // call mark function if exists
        if (function_exists($markFnName)) {
            $markFnName($r['id']);
        }
        app_log('INFO', "Synced {$tableName} to Supabase", ['id' => $r['id']]);
        echo "Synced {$tableName} id={$r['id']}\n";
    }
}

$pendingLots = sqlite_get_pending_lots();
if (!empty($pendingLots)) sync_table($pendingLots, 'lots', $supabase_url, $supabase_key, 'sqlite_mark_lot_synced');

$pendingPOs = sqlite_get_pending_purchase_orders();
if (!empty($pendingPOs)) sync_table($pendingPOs, 'purchase_orders', $supabase_url, $supabase_key, 'sqlite_mark_purchase_order_synced');

$pendingGRNs = sqlite_get_pending_grns();
if (!empty($pendingGRNs)) sync_table($pendingGRNs, 'goods_receipt_notes', $supabase_url, $supabase_key, 'sqlite_mark_grn_synced');

$pendingPIs = sqlite_get_pending_purchase_invoices();
if (!empty($pendingPIs)) sync_table($pendingPIs, 'purchase_invoices', $supabase_url, $supabase_key, 'sqlite_mark_purchase_invoice_synced');

$pendingStockLogs = sqlite_get_pending_stock_adjustment_logs();
if (!empty($pendingStockLogs)) sync_table($pendingStockLogs, 'stock_adjustment_logs', $supabase_url, $supabase_key, 'sqlite_mark_stock_adjustment_log_synced');

// Sync profiles (frontend expects 'profiles')
$pendingProfiles = sqlite_get_pending_profiles();
if (!empty($pendingProfiles)) sync_table($pendingProfiles, 'profiles', $supabase_url, $supabase_key, 'sqlite_mark_profile_synced');

// Sync users
$pendingUsers = sqlite_get_pending_users();
foreach ($pendingUsers as $u) {
    $payload = json_decode($u['data'], true);
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, rtrim($supabase_url, '/') . '/rest/v1/users');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabase_key,
        'Authorization: Bearer ' . $supabase_key,
        'Prefer: resolution=merge-duplicates'
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $status >= 400) {
        app_log('ERROR', 'Failed to sync user to Supabase', ['err' => $err, 'status' => $status, 'response' => $resp]);
        echo "Failed to sync user id={$u['id']}\n";
        continue;
    }
    sqlite_mark_user_synced($u['id']);
    app_log('INFO', 'Synced user to Supabase', ['id' => $u['id']]);
    echo "Synced user id={$u['id']}\n";
}

// Sync customers
$pendingCustomers = sqlite_get_pending_customers();
foreach ($pendingCustomers as $c) {
    $payload = json_decode($c['data'], true);
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, rtrim($supabase_url, '/') . '/rest/v1/customers');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabase_key,
        'Authorization: Bearer ' . $supabase_key,
        'Prefer: resolution=merge-duplicates'
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $status >= 400) {
        app_log('ERROR', 'Failed to sync customer to Supabase', ['err' => $err, 'status' => $status, 'response' => $resp]);
        echo "Failed to sync customer id={$c['id']}\n";
        continue;
    }
    sqlite_mark_customer_synced($c['id']);
    app_log('INFO', 'Synced customer to Supabase', ['id' => $c['id']]);
    echo "Synced customer id={$c['id']}\n";
}

// Sync suppliers
$pendingSuppliers = sqlite_get_pending_suppliers();
foreach ($pendingSuppliers as $s) {
    $payload = json_decode($s['data'], true);
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, rtrim($supabase_url, '/') . '/rest/v1/suppliers');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabase_key,
        'Authorization: Bearer ' . $supabase_key,
        'Prefer: resolution=merge-duplicates'
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $status >= 400) {
        app_log('ERROR', 'Failed to sync supplier to Supabase', ['err' => $err, 'status' => $status, 'response' => $resp]);
        echo "Failed to sync supplier id={$s['id']}\n";
        continue;
    }
    sqlite_mark_supplier_synced($s['id']);
    app_log('INFO', 'Synced supplier to Supabase', ['id' => $s['id']]);
    echo "Synced supplier id={$s['id']}\n";
}

// Sync transactions
$pendingTx = sqlite_get_pending_transactions();
foreach ($pendingTx as $t) {
    $payload = [
        'id' => $t['id'],
        'date' => $t['date'],
        'items' => json_decode($t['items'], true),
        'subtotal' => $t['subtotal'],
        'tax' => $t['tax'],
        'total' => $t['total'],
        'amountPaid' => $t['amountPaid'],
        'customer' => json_decode($t['customer'], true),
        'paymentMethods' => json_decode($t['paymentMethods'], true),
        'status' => $t['status'],
        'type' => $t['type'],
        'user' => json_decode($t['user'], true)
    ];
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, rtrim($supabase_url, '/') . '/rest/v1/transactions');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $supabase_key,
        'Authorization: Bearer ' . $supabase_key,
        'Prefer: resolution=merge-duplicates'
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $status >= 400) {
        app_log('ERROR', 'Failed to sync transaction to Supabase', ['err' => $err, 'status' => $status, 'response' => $resp]);
        echo "Failed to sync transaction id={$t['id']}\n";
        continue;
    }
    sqlite_mark_transaction_synced($t['id']);
    app_log('INFO', 'Synced transaction to Supabase', ['id' => $t['id']]);
    echo "Synced transaction id={$t['id']}\n";
}


echo "Sync complete\n";

?>
