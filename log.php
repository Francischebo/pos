<?php
// Simple logging and audit helper used by payment and callback endpoints.

function app_log($level, $message, $context = []) {
    $logfile = __DIR__ . '/app.log';
    $entry = date('c') . " [$level] " . $message;
    if (!empty($context)) {
        $entry .= ' ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    $entry .= PHP_EOL;
    // Attempt to append to logfile, but don't throw on failure
    @file_put_contents($logfile, $entry, FILE_APPEND);
    // Also send to PHP error log
    error_log($entry);
}

function audit_transaction($checkout_request_id, $event, $details = null) {
    // Persist a lightweight audit row; do not fail hard if DB is unreachable.
    $servername = "localhost";
    $username = "root";
    $password = "";
    $dbname = "daraja_mpesa";

    $conn = @new mysqli($servername, $username, $password, $dbname);
    if ($conn && !$conn->connect_error) {
        // Ensure table exists
        $createSql = "CREATE TABLE IF NOT EXISTS audits (
            id INT AUTO_INCREMENT PRIMARY KEY,
            checkout_request_id VARCHAR(255) DEFAULT NULL,
            event VARCHAR(100) NOT NULL,
            details LONGTEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        @ $conn->query($createSql);

        $sql = "INSERT INTO audits (checkout_request_id, event, details) VALUES (?, ?, ?)";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param('sss', $checkout_request_id, $event, $details);
            $stmt->execute();
            $stmt->close();
        }
        $conn->close();
    } else {
        // Fallback to SQLite if available, otherwise regular log
        try {
            require_once __DIR__ . '/sqlite_helper.php';
            if (function_exists('sqlite_insert_audit')) {
                sqlite_insert_audit($checkout_request_id, $event, $details);
                return true;
            }
        } catch (Exception $e) {
            // ignore and fall back to logging
        }
        app_log('WARN', 'Could not open DB to write audit; saved to log', ['checkout_request_id' => $checkout_request_id, 'event' => $event]);
    }
}

?>
