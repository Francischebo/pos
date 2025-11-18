<?php
// sqlite_helper.php
// Lightweight SQLite helper for offline storage.

// Provide a PDO-based compatibility layer when the SQLite3 extension is not enabled.
if (!class_exists('SQLite3')) {
    if (!defined('SQLITE3_TEXT')) define('SQLITE3_TEXT', 2);
    if (!defined('SQLITE3_INTEGER')) define('SQLITE3_INTEGER', 1);
    if (!defined('SQLITE3_FLOAT')) define('SQLITE3_FLOAT', 3);
    if (!defined('SQLITE3_ASSOC')) define('SQLITE3_ASSOC', 1);

    class SQLitePDOResult {
        private $stmt;
        public function __construct($stmt) { $this->stmt = $stmt; }
        public function fetchArray($mode = null) {
            $row = $this->stmt->fetch(PDO::FETCH_ASSOC);
            return $row !== false ? $row : false;
        }
        public function fetchAllAssoc() {
            return $this->stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }

    class SQLitePDOStatement {
        private $stmt;
        public function __construct($stmt) { $this->stmt = $stmt; }
        public function bindValue($param, $value, $type = null) {
            $pdoType = PDO::PARAM_STR;
            if ($type === SQLITE3_INTEGER) $pdoType = PDO::PARAM_INT;
            // no direct float type in PDO; store as string or let PDO decide
            $this->stmt->bindValue($param, $value, $pdoType);
        }
        public function execute() {
            $this->stmt->execute();
            return new SQLitePDOResult($this->stmt);
        }
    }

    class SQLitePDOAdapter {
        private $pdo;
        public function __construct($file) {
            $this->pdo = new PDO('sqlite:' . $file);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }
        public function exec($sql) {
            return $this->pdo->exec($sql);
        }
        public function prepare($sql) {
            $stmt = $this->pdo->prepare($sql);
            return new SQLitePDOStatement($stmt);
        }
        public function query($sql) {
            $stmt = $this->pdo->query($sql);
            return new SQLitePDOResult($stmt);
        }
    }
}

function get_app_data_dir() {
    // Allow overriding via env var for testing/packaging
    $env = getenv('MOBET_DATA_DIR');
    if ($env && is_string($env) && $env !== '') return rtrim($env, "\/\\");

    $os = PHP_OS_FAMILY ?? php_uname('s');
    if (stripos($os, 'Windows') !== false) {
        $base = getenv('APPDATA') ?: getenv('LOCALAPPDATA');
        if (!$base) $base = __DIR__;
        return rtrim($base, "\/\\") . DIRECTORY_SEPARATOR . 'Mobet POS KENYA';
    }
    // macOS
    if (stripos($os, 'Darwin') !== false || stripos($os, 'Mac') !== false) {
        $home = getenv('HOME') ?: __DIR__;
        return rtrim($home, "\/\\") . DIRECTORY_SEPARATOR . 'Library' . DIRECTORY_SEPARATOR . 'Application Support' . DIRECTORY_SEPARATOR . 'Mobet POS KENYA';
    }
    // Linux/other
    $xdg = getenv('XDG_DATA_HOME') ?: (getenv('HOME') ? rtrim(getenv('HOME'), "\/\\") . DIRECTORY_SEPARATOR . '.local' . DIRECTORY_SEPARATOR . 'share' : __DIR__);
    return rtrim($xdg, "\/\\") . DIRECTORY_SEPARATOR . 'Mobet POS KENYA';
}

function sqlite_init($path = null) {
    // Preferred DB location in an OS-writable folder for packaged apps
    $dataDir = get_app_data_dir();
    if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);

    // Default DB file inside data dir
    $defaultDb = $dataDir . DIRECTORY_SEPARATOR . 'app.db';
    $dbfile = $path ?: $defaultDb;

    // Migrate legacy DB files (if present) into the new data dir on first run
    $legacyCandidates = [
        __DIR__ . '/offline.db',
        __DIR__ . '/database/app.db',
        __DIR__ . '/app.db'
    ];
    foreach ($legacyCandidates as $candidate) {
        if (file_exists($candidate) && !file_exists($dbfile)) {
            @copy($candidate, $dbfile);
            @chmod($dbfile, 0644);
            // keep the original as a backup (do not delete automatically)
            @file_put_contents($candidate . '.migrated', date('c') . " -> migrated to " . $dbfile . PHP_EOL, FILE_APPEND | LOCK_EX);
            break;
        }
    }

    if (class_exists('SQLite3')) {
        $db = new SQLite3($dbfile);
    } else {
        // Use PDO adapter when SQLite3 extension is not available
        $db = new SQLitePDOAdapter($dbfile);
    }

    // Create payments table
    $db->exec("CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT,
        amount REAL,
        checkout_request_id TEXT UNIQUE,
        status TEXT DEFAULT 'PENDING',
        mpesa_receipt TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
    )");

    // Create callbacks table
    $db->exec("CREATE TABLE IF NOT EXISTS callbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkout_request_id TEXT,
        payload TEXT NOT NULL,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0
    )");

    // Create audits table
    $db->exec("CREATE TABLE IF NOT EXISTS audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkout_request_id TEXT,
        event TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
    )");

    // Core application tables (products, variants, users, customers, suppliers, transactions)
    $db->exec("CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT,
        category TEXT,
        brand TEXT,
        imageUrl TEXT,
        data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS variants (
        id INTEGER PRIMARY KEY,
        productId INTEGER,
        sku TEXT,
        barcode TEXT,
        price REAL,
        cost REAL,
        taxRate REAL,
        reorderPoint INTEGER,
        lots JSON,
        sellingMethod TEXT,
        storageUom TEXT,
        data JSON,
        synced INTEGER DEFAULT 0
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        email TEXT,
        data JSON,
        synced INTEGER DEFAULT 0
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY,
        name TEXT,
        phone TEXT,
        loyaltyPoints REAL DEFAULT 0,
        storeCredit REAL DEFAULT 0,
        lastSeen DATETIME,
        data JSON,
        synced INTEGER DEFAULT 0
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY,
        name TEXT,
        contactPerson TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        data JSON,
        synced INTEGER DEFAULT 0
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date DATETIME,
        items JSON,
        subtotal REAL,
        tax REAL,
        total REAL,
        amountPaid REAL,
        customer JSON,
        paymentMethods JSON,
        status TEXT,
        type TEXT,
        user JSON,
        synced INTEGER DEFAULT 0
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS company_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Lots table (frontend expects lots as separate table)
    $db->exec("CREATE TABLE IF NOT EXISTS lots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_id INTEGER,
        lot_number TEXT,
        quantity INTEGER DEFAULT 0,
        expiry_date TEXT,
        purchase_price REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
    )");

    // Purchase orders & related tables
    $db->exec("CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        po_number TEXT,
        supplier_id INTEGER,
        date DATETIME,
        items JSON,
        status TEXT,
        total REAL,
        data JSON,
        synced INTEGER DEFAULT 0
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS goods_receipt_notes (
        id TEXT PRIMARY KEY,
        grn_number TEXT,
        supplier_id INTEGER,
        date DATETIME,
        items JSON,
        data JSON,
        synced INTEGER DEFAULT 0
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS purchase_invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT,
        supplier_id INTEGER,
        date DATETIME,
        items JSON,
        total REAL,
        status TEXT,
        data JSON,
        synced INTEGER DEFAULT 0
    )");

    // Stock adjustment logs
    $db->exec("CREATE TABLE IF NOT EXISTS stock_adjustment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_id INTEGER,
        previous_qty INTEGER,
        new_qty INTEGER,
        reason TEXT,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
    )");

    // Profiles (frontend reads from 'profiles')
    $db->exec("CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        role TEXT,
        data JSON,
        synced INTEGER DEFAULT 0
    )");

    // Ensure snake_case columns exist for compatibility with frontend/supabase
    if (!function_exists('ensure_column')) {
        function ensure_column($db, $table, $column, $definition = 'TEXT') {
            try {
                $res = $db->query("PRAGMA table_info($table)");
                $exists = false;
                while ($r = $res->fetchArray(SQLITE3_ASSOC)) {
                    if ($r['name'] === $column) { $exists = true; break; }
                }
                if (!$exists) {
                    $db->exec("ALTER TABLE $table ADD COLUMN $column $definition");
                }
            } catch (Exception $e) {
                // ignore - best effort
            }
        }
    }

    // products
    ensure_column($db, 'products', 'image_url', 'TEXT');
    // variants
    ensure_column($db, 'variants', 'product_id', 'INTEGER');
    ensure_column($db, 'variants', 'tax_rate', 'REAL');
    ensure_column($db, 'variants', 'reorder_point', 'INTEGER');
    ensure_column($db, 'variants', 'selling_method', 'TEXT');
    ensure_column($db, 'variants', 'storage_uom', 'TEXT');
    // customers
    ensure_column($db, 'customers', 'loyalty_points', 'REAL');
    ensure_column($db, 'customers', 'store_credit', 'REAL');
    ensure_column($db, 'customers', 'last_seen', 'DATETIME');
    // suppliers
    ensure_column($db, 'suppliers', 'contact_person', 'TEXT');
    // transactions
    ensure_column($db, 'transactions', 'amount_paid', 'REAL');
    ensure_column($db, 'transactions', 'payment_methods', 'JSON');
    // variants/lots already migrated to separate 'lots' table
    // purchase order/grn/invoice use items/data JSON fields already present


    return $db;
}

function sqlite_insert_payment($phone, $amount, $checkout_request_id, $status = 'PENDING') {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT OR IGNORE INTO payments (phone_number, amount, checkout_request_id, status) VALUES (:phone, :amount, :cid, :status)');
    $stmt->bindValue(':phone', $phone, SQLITE3_TEXT);
    $stmt->bindValue(':amount', $amount, SQLITE3_FLOAT);
    $stmt->bindValue(':cid', $checkout_request_id, SQLITE3_TEXT);
    $stmt->bindValue(':status', $status, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_update_payment_status($checkout_request_id, $status, $mpesa_receipt = '') {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE payments SET status = :status, mpesa_receipt = :receipt, synced = 0 WHERE checkout_request_id = :cid');
    $stmt->bindValue(':status', $status, SQLITE3_TEXT);
    $stmt->bindValue(':receipt', $mpesa_receipt, SQLITE3_TEXT);
    $stmt->bindValue(':cid', $checkout_request_id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_insert_callback($checkout_request_id, $payload) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT INTO callbacks (checkout_request_id, payload) VALUES (:cid, :payload)');
    $stmt->bindValue(':cid', $checkout_request_id, SQLITE3_TEXT);
    $stmt->bindValue(':payload', $payload, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_pending_payments() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM payments WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_get_payment_by_checkout($checkout_request_id) {
    $db = sqlite_init();
    $stmt = $db->prepare('SELECT * FROM payments WHERE checkout_request_id = :cid LIMIT 1');
    $stmt->bindValue(':cid', $checkout_request_id, SQLITE3_TEXT);
    $res = $stmt->execute();
    if ($res) {
        $row = $res->fetchArray(SQLITE3_ASSOC);
        return $row ?: null;
    }
    return null;
}

function sqlite_insert_audit($checkout_request_id, $event, $details = null) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT INTO audits (checkout_request_id, event, details) VALUES (:cid, :event, :details)');
    $stmt->bindValue(':cid', $checkout_request_id, SQLITE3_TEXT);
    $stmt->bindValue(':event', $event, SQLITE3_TEXT);
    $stmt->bindValue(':details', $details, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

// Basic product CRUD
function sqlite_upsert_product($product) {
    $db = sqlite_init();
    // write both camelCase and snake_case columns for compatibility
    $stmt = $db->prepare('INSERT OR REPLACE INTO products (id, name, category, brand, imageUrl, image_url, data, synced) VALUES (:id, :name, :category, :brand, :imageUrl, :image_url, :data, 0)');
    $stmt->bindValue(':id', $product['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':name', $product['name'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':category', $product['category'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':brand', $product['brand'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':imageUrl', $product['imageUrl'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':image_url', $product['imageUrl'] ?? ($product['image_url'] ?? ''), SQLITE3_TEXT);
    $stmt->bindValue(':data', json_encode($product), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_products() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM products');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode($r['data'], true);
    return $rows;
}

// Users
function sqlite_upsert_user($user) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT OR REPLACE INTO users (id, name, role, email, data, synced) VALUES (:id, :name, :role, :email, :data, 0)');
    $stmt->bindValue(':id', $user['id'], SQLITE3_TEXT);
    $stmt->bindValue(':name', $user['name'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':role', $user['role'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':email', $user['email'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':data', json_encode($user), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_users() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM users');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode($r['data'], true);
    return $rows;
}

// Customers
function sqlite_upsert_customer($c) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT OR REPLACE INTO customers (id, name, phone, loyaltyPoints, loyalty_points, storeCredit, store_credit, lastSeen, last_seen, data, synced) VALUES (:id, :name, :phone, :lp, :loyalty_points, :sc, :store_credit, :lastSeen, :last_seen, :data, 0)');
    $stmt->bindValue(':id', $c['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':name', $c['name'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':phone', $c['phone'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':lp', $c['loyaltyPoints'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':loyalty_points', $c['loyaltyPoints'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':sc', $c['storeCredit'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':store_credit', $c['storeCredit'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':lastSeen', isset($c['lastSeen']) ? $c['lastSeen'] : null, SQLITE3_TEXT);
    $stmt->bindValue(':last_seen', isset($c['lastSeen']) ? $c['lastSeen'] : null, SQLITE3_TEXT);
    $stmt->bindValue(':data', json_encode($c), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_customers() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM customers');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode($r['data'], true);
    return $rows;
}

// Suppliers
function sqlite_upsert_supplier($s) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT OR REPLACE INTO suppliers (id, name, contactPerson, contact_person, phone, email, address, data, synced) VALUES (:id, :name, :contact, :contact_person, :phone, :email, :address, :data, 0)');
    $stmt->bindValue(':id', $s['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':name', $s['name'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':contact', $s['contactPerson'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':contact_person', $s['contactPerson'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':phone', $s['phone'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':email', $s['email'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':address', $s['address'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':data', json_encode($s), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_suppliers() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM suppliers');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode($r['data'], true);
    return $rows;
}

// Transactions
function sqlite_insert_transaction($tx) {
    $db = sqlite_init();
    // write both camelCase and snake_case columns for transaction
    $stmt = $db->prepare('INSERT OR REPLACE INTO transactions (id, date, items, subtotal, tax, total, amountPaid, amount_paid, customer, paymentMethods, payment_methods, status, type, user, synced) VALUES (:id, :date, :items, :subtotal, :tax, :total, :amountPaid, :amount_paid, :customer, :paymentMethods, :payment_methods, :status, :type, :user, 0)');
    $stmt->bindValue(':id', $tx['id'], SQLITE3_TEXT);
    $stmt->bindValue(':date', $tx['date'] ?? date('c'), SQLITE3_TEXT);
    $stmt->bindValue(':items', json_encode($tx['items'] ?? []), SQLITE3_TEXT);
    $stmt->bindValue(':subtotal', $tx['subtotal'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':tax', $tx['tax'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':total', $tx['total'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':amountPaid', $tx['amountPaid'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':amount_paid', $tx['amountPaid'] ?? ($tx['amount_paid'] ?? 0), SQLITE3_FLOAT);
    $stmt->bindValue(':customer', json_encode($tx['customer'] ?? null), SQLITE3_TEXT);
    $stmt->bindValue(':paymentMethods', json_encode($tx['paymentMethods'] ?? []), SQLITE3_TEXT);
    $stmt->bindValue(':payment_methods', json_encode($tx['paymentMethods'] ?? ($tx['payment_methods'] ?? [])), SQLITE3_TEXT);
    $stmt->bindValue(':status', $tx['status'] ?? 'Completed', SQLITE3_TEXT);
    $stmt->bindValue(':type', $tx['type'] ?? 'Sale', SQLITE3_TEXT);
    $stmt->bindValue(':user', json_encode($tx['user'] ?? null), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_transactions_pending_sync() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM transactions WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode(json_encode($r), true);
    return $rows;
}

function sqlite_get_pending_callbacks() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM callbacks WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_mark_payment_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE payments SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_mark_callback_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE callbacks SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_mark_product_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE products SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_mark_user_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE users SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_mark_customer_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE customers SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_mark_supplier_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE suppliers SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_mark_transaction_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE transactions SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_pending_products() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM products WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_get_pending_users() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM users WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_get_pending_customers() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM customers WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_get_pending_suppliers() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM suppliers WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_get_pending_transactions() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM transactions WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

// Lots helpers
function sqlite_insert_lot($variant_id, $lot_number, $quantity = 0, $expiry_date = null, $purchase_price = 0) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT INTO lots (variant_id, lot_number, quantity, expiry_date, purchase_price) VALUES (:vid, :lot, :qty, :exp, :price)');
    $stmt->bindValue(':vid', $variant_id, SQLITE3_INTEGER);
    $stmt->bindValue(':lot', $lot_number, SQLITE3_TEXT);
    $stmt->bindValue(':qty', $quantity, SQLITE3_INTEGER);
    $stmt->bindValue(':exp', $expiry_date, SQLITE3_TEXT);
    $stmt->bindValue(':price', $purchase_price, SQLITE3_FLOAT);
    return $stmt->execute() !== false;
}

function sqlite_get_lots_by_variant($variant_id) {
    $db = sqlite_init();
    $stmt = $db->prepare('SELECT * FROM lots WHERE variant_id = :vid');
    $stmt->bindValue(':vid', $variant_id, SQLITE3_INTEGER);
    $res = $stmt->execute();
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_get_pending_lots() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM lots WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_mark_lot_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE lots SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

// Purchase orders / GRN / invoices helpers
function sqlite_insert_purchase_order($po) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT OR REPLACE INTO purchase_orders (id, po_number, supplier_id, date, items, status, total, data, synced) VALUES (:id, :po, :supplier, :date, :items, :status, :total, :data, 0)');
    $stmt->bindValue(':id', $po['id'], SQLITE3_TEXT);
    $stmt->bindValue(':po', $po['poNumber'] ?? ($po['po_number'] ?? ''), SQLITE3_TEXT);
    $stmt->bindValue(':supplier', $po['supplierId'] ?? ($po['supplier_id'] ?? null), SQLITE3_INTEGER);
    $stmt->bindValue(':date', $po['date'] ?? null, SQLITE3_TEXT);
    $stmt->bindValue(':items', json_encode($po['items'] ?? []), SQLITE3_TEXT);
    $stmt->bindValue(':status', $po['status'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':total', $po['total'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':data', json_encode($po), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_pending_purchase_orders() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM purchase_orders WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode($r['data'], true) ?: $r;
    return $rows;
}

function sqlite_mark_purchase_order_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE purchase_orders SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_insert_goods_receipt_note($grn) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT OR REPLACE INTO goods_receipt_notes (id, grn_number, supplier_id, date, items, data, synced) VALUES (:id, :grn, :supplier, :date, :items, :data, 0)');
    $stmt->bindValue(':id', $grn['id'], SQLITE3_TEXT);
    $stmt->bindValue(':grn', $grn['grnNumber'] ?? ($grn['grn_number'] ?? ''), SQLITE3_TEXT);
    $stmt->bindValue(':supplier', $grn['supplierId'] ?? ($grn['supplier_id'] ?? null), SQLITE3_INTEGER);
    $stmt->bindValue(':date', $grn['date'] ?? null, SQLITE3_TEXT);
    $stmt->bindValue(':items', json_encode($grn['items'] ?? []), SQLITE3_TEXT);
    $stmt->bindValue(':data', json_encode($grn), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_pending_grns() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM goods_receipt_notes WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode($r['data'], true) ?: $r;
    return $rows;
}

function sqlite_mark_grn_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE goods_receipt_notes SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_insert_purchase_invoice($inv) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT OR REPLACE INTO purchase_invoices (id, invoice_number, supplier_id, date, items, total, status, data, synced) VALUES (:id, :inv, :supplier, :date, :items, :total, :status, :data, 0)');
    $stmt->bindValue(':id', $inv['id'], SQLITE3_TEXT);
    $stmt->bindValue(':inv', $inv['invoiceNumber'] ?? ($inv['invoice_number'] ?? ''), SQLITE3_TEXT);
    $stmt->bindValue(':supplier', $inv['supplierId'] ?? ($inv['supplier_id'] ?? null), SQLITE3_INTEGER);
    $stmt->bindValue(':date', $inv['date'] ?? null, SQLITE3_TEXT);
    $stmt->bindValue(':items', json_encode($inv['items'] ?? []), SQLITE3_TEXT);
    $stmt->bindValue(':total', $inv['total'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':status', $inv['status'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':data', json_encode($inv), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_pending_purchase_invoices() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM purchase_invoices WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode($r['data'], true) ?: $r;
    return $rows;
}

function sqlite_mark_purchase_invoice_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE purchase_invoices SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

// Stock adjustment logs
function sqlite_insert_stock_adjustment_log($variant_id, $previous_qty, $new_qty, $reason, $user_id = null) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT INTO stock_adjustment_logs (variant_id, previous_qty, new_qty, reason, user_id) VALUES (:vid, :prev, :new, :reason, :user)');
    $stmt->bindValue(':vid', $variant_id, SQLITE3_INTEGER);
    $stmt->bindValue(':prev', $previous_qty, SQLITE3_INTEGER);
    $stmt->bindValue(':new', $new_qty, SQLITE3_INTEGER);
    $stmt->bindValue(':reason', $reason, SQLITE3_TEXT);
    $stmt->bindValue(':user', $user_id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_pending_stock_adjustment_logs() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM stock_adjustment_logs WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_mark_stock_adjustment_log_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE stock_adjustment_logs SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

// Profiles (match frontend 'profiles')
function sqlite_upsert_profile($profile) {
    $db = sqlite_init();
    $stmt = $db->prepare('INSERT OR REPLACE INTO profiles (id, name, email, role, data, synced) VALUES (:id, :name, :email, :role, :data, 0)');
    $stmt->bindValue(':id', $profile['id'], SQLITE3_TEXT);
    $stmt->bindValue(':name', $profile['name'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':email', $profile['email'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':role', $profile['role'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':data', json_encode($profile), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_profiles() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM profiles');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode($r['data'], true);
    return $rows;
}

function sqlite_get_pending_profiles() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM profiles WHERE synced = 0');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = json_decode($r['data'], true) ?: $r;
    return $rows;
}

function sqlite_mark_profile_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE profiles SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

// Migration helpers: migrate variant.lots JSON into lots table
function sqlite_migrate_variant_lots() {
    $db = sqlite_init();
    $res = $db->query('SELECT id, lots FROM variants');
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) {
        $variantId = $r['id'];
        if (empty($r['lots'])) continue;
        $lots = json_decode($r['lots'], true);
        if (!is_array($lots)) continue;
        foreach ($lots as $lot) {
            $lotNumber = $lot['lotNumber'] ?? ($lot['lot_number'] ?? null);
            $qty = $lot['quantity'] ?? ($lot['qty'] ?? 0);
            $expiry = $lot['expiryDate'] ?? ($lot['expiry_date'] ?? null);
            $price = $lot['purchasePrice'] ?? ($lot['purchase_price'] ?? 0);
            sqlite_insert_lot($variantId, $lotNumber, $qty, $expiry, $price);
        }
    }
    return true;
}

// Migrate users -> profiles
function sqlite_migrate_users_to_profiles() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM users');
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) {
        $data = json_decode($r['data'], true) ?: [];
        $profile = [
            'id' => $r['id'],
            'name' => $r['name'] ?? ($data['name'] ?? ''),
            'email' => $r['email'] ?? ($data['email'] ?? ''),
            'role' => $r['role'] ?? ($data['role'] ?? ''),
        ];
        sqlite_upsert_profile($profile);
    }
    return true;
}

// --- Additional CRUD helpers ---
// Variants CRUD
function sqlite_upsert_variant($variant) {
    $db = sqlite_init();
    // write both camelCase and snake_case columns
    $stmt = $db->prepare('INSERT OR REPLACE INTO variants (id, productId, product_id, sku, barcode, price, cost, taxRate, tax_rate, reorderPoint, reorder_point, lots, sellingMethod, selling_method, storageUom, storage_uom, data, synced) VALUES (:id, :productId, :product_id, :sku, :barcode, :price, :cost, :taxRate, :tax_rate, :reorderPoint, :reorder_point, :lots, :sellingMethod, :selling_method, :storageUom, :storage_uom, :data, 0)');
    $stmt->bindValue(':id', $variant['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':productId', $variant['productId'] ?? ($variant['product_id'] ?? null), SQLITE3_INTEGER);
    $stmt->bindValue(':product_id', $variant['productId'] ?? ($variant['product_id'] ?? null), SQLITE3_INTEGER);
    $stmt->bindValue(':sku', $variant['sku'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':barcode', $variant['barcode'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':price', $variant['price'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':cost', $variant['cost'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':taxRate', $variant['taxRate'] ?? ($variant['tax_rate'] ?? 0), SQLITE3_FLOAT);
    $stmt->bindValue(':tax_rate', $variant['taxRate'] ?? ($variant['tax_rate'] ?? 0), SQLITE3_FLOAT);
    $stmt->bindValue(':reorderPoint', $variant['reorderPoint'] ?? ($variant['reorder_point'] ?? 0), SQLITE3_INTEGER);
    $stmt->bindValue(':reorder_point', $variant['reorderPoint'] ?? ($variant['reorder_point'] ?? 0), SQLITE3_INTEGER);
    $stmt->bindValue(':lots', isset($variant['lots']) ? json_encode($variant['lots']) : ($variant['lots'] ?? null), SQLITE3_TEXT);
    $stmt->bindValue(':sellingMethod', $variant['sellingMethod'] ?? ($variant['selling_method'] ?? ''), SQLITE3_TEXT);
    $stmt->bindValue(':selling_method', $variant['sellingMethod'] ?? ($variant['selling_method'] ?? ''), SQLITE3_TEXT);
    $stmt->bindValue(':storageUom', $variant['storageUom'] ?? ($variant['storage_uom'] ?? ''), SQLITE3_TEXT);
    $stmt->bindValue(':storage_uom', $variant['storageUom'] ?? ($variant['storage_uom'] ?? ''), SQLITE3_TEXT);
    $stmt->bindValue(':data', json_encode($variant), SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_get_variants() {
    $db = sqlite_init();
    $res = $db->query('SELECT * FROM variants');
    $rows = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $rows[] = $r;
    return $rows;
}

function sqlite_update_variant($id, $fields) {
    $db = sqlite_init();
    $sets = [];
    $params = [];
    foreach ($fields as $k => $v) {
        $sets[] = "$k = :$k";
        $params[":$k"] = $v;
    }
    if (empty($sets)) return false;
    $sql = 'UPDATE variants SET ' . implode(', ', $sets) . ', synced = 0 WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($params as $p => $v) $stmt->bindValue($p, $v, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_delete_variant($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('DELETE FROM variants WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_mark_variant_synced($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('UPDATE variants SET synced = 1 WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

// Lots update/delete
function sqlite_update_lot($id, $fields) {
    $db = sqlite_init();
    $sets = [];
    foreach ($fields as $k => $v) $sets[] = "$k = :$k";
    if (empty($sets)) return false;
    $sql = 'UPDATE lots SET ' . implode(', ', $sets) . ', synced = 0 WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($fields as $k => $v) $stmt->bindValue(':'.$k, $v, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_delete_lot($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('DELETE FROM lots WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

// Product update/delete
function sqlite_update_product($id, $fields) {
    $db = sqlite_init();
    $sets = [];
    foreach ($fields as $k => $v) $sets[] = "$k = :$k";
    if (empty($sets)) return false;
    $sql = 'UPDATE products SET ' . implode(', ', $sets) . ', synced = 0 WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($fields as $k => $v) $stmt->bindValue(':'.$k, $v, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_delete_product($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('DELETE FROM products WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

// Purchase orders / GRN / invoices update & delete
function sqlite_update_purchase_order($id, $fields) {
    $db = sqlite_init();
    $sets = [];
    foreach ($fields as $k => $v) $sets[] = "$k = :$k";
    if (empty($sets)) return false;
    $sql = 'UPDATE purchase_orders SET ' . implode(', ', $sets) . ', synced = 0 WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($fields as $k => $v) $stmt->bindValue(':'.$k, $v, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_delete_purchase_order($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('DELETE FROM purchase_orders WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_update_purchase_invoice($id, $fields) {
    $db = sqlite_init();
    $sets = [];
    foreach ($fields as $k => $v) $sets[] = "$k = :$k";
    if (empty($sets)) return false;
    $sql = 'UPDATE purchase_invoices SET ' . implode(', ', $sets) . ', synced = 0 WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($fields as $k => $v) $stmt->bindValue(':'.$k, $v, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_delete_purchase_invoice($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('DELETE FROM purchase_invoices WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_update_grn($id, $fields) {
    $db = sqlite_init();
    $sets = [];
    foreach ($fields as $k => $v) $sets[] = "$k = :$k";
    if (empty($sets)) return false;
    $sql = 'UPDATE goods_receipt_notes SET ' . implode(', ', $sets) . ', synced = 0 WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($fields as $k => $v) $stmt->bindValue(':'.$k, $v, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

function sqlite_delete_grn($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('DELETE FROM goods_receipt_notes WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

// Customers & Suppliers update/delete
function sqlite_update_customer($id, $fields) {
    $db = sqlite_init();
    $sets = [];
    foreach ($fields as $k => $v) $sets[] = "$k = :$k";
    if (empty($sets)) return false;
    $sql = 'UPDATE customers SET ' . implode(', ', $sets) . ', synced = 0 WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($fields as $k => $v) $stmt->bindValue(':'.$k, $v, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_delete_customer($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('DELETE FROM customers WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_update_supplier($id, $fields) {
    $db = sqlite_init();
    $sets = [];
    foreach ($fields as $k => $v) $sets[] = "$k = :$k";
    if (empty($sets)) return false;
    $sql = 'UPDATE suppliers SET ' . implode(', ', $sets) . ', synced = 0 WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($fields as $k => $v) $stmt->bindValue(':'.$k, $v, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

function sqlite_delete_supplier($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('DELETE FROM suppliers WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    return $stmt->execute() !== false;
}

// Profiles delete
function sqlite_delete_profile($id) {
    $db = sqlite_init();
    $stmt = $db->prepare('DELETE FROM profiles WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_TEXT);
    return $stmt->execute() !== false;
}

?>
