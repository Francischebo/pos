<?php
// callback.php

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "daraja_mpesa";


// Attempt MySQL then fall back to SQLite
$conn = @new mysqli($servername, $username, $password, $dbname);
if ($conn && $conn->connect_error) {
    app_log('WARN', 'MySQL connection failed for callback handler, switching to SQLite', ['error' => $conn->connect_error]);
    $conn = null;
}

require_once __DIR__ . '/log.php';
require_once __DIR__ . '/sqlite_helper.php';

// Get the response from M-Pesa
$mpesa_response = file_get_contents('php://input');
$callbackContent = json_decode($mpesa_response);

app_log('INFO', 'Received callback', ['raw' => $mpesa_response]);

// Validate JSON
if ($mpesa_response === false || $mpesa_response === '') {
    app_log('WARN', 'Empty request body received');
    $response = array(
        'ResultCode' => 1,
        'ResultDesc' => 'Empty request body'
    );
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}

if (json_last_error() !== JSON_ERROR_NONE) {
    app_log('WARN', 'JSON decode error', ['error' => json_last_error_msg()]);
    $response = array(
        'ResultCode' => 1,
        'ResultDesc' => 'Invalid JSON'
    );
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}

// Ensure callbacks table exists so we can persist raw callbacks for reprocessing if needed
$createCallbacksTableSql = "CREATE TABLE IF NOT EXISTS callbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checkout_request_id VARCHAR(255) DEFAULT NULL,
    payload LONGTEXT NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed TINYINT(1) DEFAULT 0,
    processing_error TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

if ($conn) {
    if ($conn->query($createCallbacksTableSql) === false) {
        app_log('WARN', 'Could not create callbacks table', ['error' => $conn->error]);
    }
} else {
    // SQLite will create callbacks table in sqlite_helper
}

// Persist raw callback
$callback_id = null;
$cb_checkout = null;
if (isset($callbackContent->Body->stkCallback->CheckoutRequestID)) {
    $cb_checkout = $callbackContent->Body->stkCallback->CheckoutRequestID;
}

// Persist raw callback (MySQL preferred, SQLite fallback)
if ($conn) {
    $insertCallbackSql = "INSERT INTO callbacks (checkout_request_id, payload) VALUES (?, ?)";
    $cb_stmt = $conn->prepare($insertCallbackSql);
    if ($cb_stmt === false) {
        app_log('ERROR', 'Failed to prepare insert callback', ['error' => $conn->error]);
    } else {
        $cb_stmt->bind_param('ss', $cb_checkout, $mpesa_response);
        if ($cb_stmt->execute()) {
            $callback_id = $conn->insert_id;
            app_log('INFO', 'Persisted raw callback (MySQL)', ['callback_id' => $callback_id, 'checkout_request_id' => $cb_checkout]);
        } else {
            app_log('ERROR', 'Failed to persist raw callback to MySQL, falling back to SQLite', ['error' => $cb_stmt->error]);
            sqlite_insert_callback($cb_checkout, $mpesa_response);
        }
        $cb_stmt->close();
    }
} else {
    // MySQL not available -> write to local SQLite for later sync
    sqlite_insert_callback($cb_checkout, $mpesa_response);
}

// Check if the callback content is valid
if (isset($callbackContent->Body->stkCallback->ResultCode)) {
    $result_code = $callbackContent->Body->stkCallback->ResultCode;
    $checkout_request_id = $callbackContent->Body->stkCallback->CheckoutRequestID;

    if ($result_code == 0) {
        // Payment successful
        $status = 'COMPLETED';
        // Extract MpesaReceiptNumber by name (don't rely on array index)
        $mpesa_receipt_number = null;
        if (isset($callbackContent->Body->stkCallback->CallbackMetadata->Item) && is_array($callbackContent->Body->stkCallback->CallbackMetadata->Item)) {
            foreach ($callbackContent->Body->stkCallback->CallbackMetadata->Item as $item) {
                if (isset($item->Name) && $item->Name === 'MpesaReceiptNumber') {
                    $mpesa_receipt_number = isset($item->Value) ? $item->Value : null;
                    break;
                }
            }
        }
        app_log('INFO', 'Payment successful', ['checkout_request_id' => $checkout_request_id, 'mpesa_receipt' => $mpesa_receipt_number]);
    } else {
        // Payment failed
        $status = 'FAILED';
        $mpesa_receipt_number = null;
        app_log('INFO', 'Payment failed', ['checkout_request_id' => $checkout_request_id, 'result_code' => $result_code]);
    }

    // Update the payment status in the database (MySQL preferred, SQLite fallback)
    $mpesa_receipt_param = $mpesa_receipt_number === null ? '' : $mpesa_receipt_number;
    if ($conn) {
        $sql = "UPDATE payments SET status = ?, mpesa_receipt = ? WHERE checkout_request_id = ?";
        $stmt = $conn->prepare($sql);
        if ($stmt === false) {
            app_log('ERROR', 'Prepare failed for updating payment status', ['error' => $conn->error]);
        } else {
            $stmt->bind_param("sss", $status, $mpesa_receipt_param, $checkout_request_id);
            if ($stmt->execute()) {
                app_log('INFO', 'Payment status updated in database (MySQL)', ['checkout_request_id' => $checkout_request_id, 'status' => $status]);
                audit_transaction($checkout_request_id, 'STATUS_UPDATED', $status . ($mpesa_receipt_number ? ", receipt:" . $mpesa_receipt_number : ''));
                if ($callback_id) {
                    $u_sql = "UPDATE callbacks SET processed = 1, processing_error = NULL WHERE id = ?";
                    $u_stmt = $conn->prepare($u_sql);
                    if ($u_stmt) {
                        $u_stmt->bind_param('i', $callback_id);
                        $u_stmt->execute();
                        $u_stmt->close();
                    }
                }
            } else {
                app_log('ERROR', 'Error updating payment status in MySQL, falling back to SQLite', ['error' => $stmt->error]);
                sqlite_update_payment_status($checkout_request_id, $status, $mpesa_receipt_param);
            }
            $stmt->close();
        }
    } else {
        sqlite_update_payment_status($checkout_request_id, $status, $mpesa_receipt_param);
    }
} else {
    app_log('WARN', 'Invalid callback content received');
}

if ($conn) {
    $conn->close();
}

// Respond to M-Pesa
$response = array(
    'ResultCode' => 0,
    'ResultDesc' => 'Confirmation received successfully'
);
header('Content-Type: application/json');
echo json_encode($response);
?>