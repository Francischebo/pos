
<?php
// check_status.php

header('Content-Type: application/json');

// Database connection (attempt MySQL, fall back to SQLite)
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "daraja_mpesa";

$conn = @new mysqli($servername, $username, $password, $dbname);
if ($conn && $conn->connect_error) {
    // Use SQLite fallback
    $conn = null;
}

if (isset($_GET['checkout_request_id'])) {
    $checkout_request_id = $_GET['checkout_request_id'];
    
    require_once __DIR__ . '/log.php';
    require_once __DIR__ . '/sqlite_helper.php';

    // Log the status check request at DEBUG level (no audit row to avoid poll noise)
    $clientIp = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    app_log('DEBUG', 'Status check', ['checkout_request_id' => $checkout_request_id, 'ip' => $clientIp]);

    if ($conn) {
        $sql = "SELECT status, mpesa_receipt, amount FROM payments WHERE checkout_request_id = ?";
        $stmt = $conn->prepare($sql);
        if ($stmt === false) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
            $conn->close();
            exit;
        }
        $stmt->bind_param("s", $checkout_request_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
    } else {
        // SQLite lookup
        $row = sqlite_get_payment_by_checkout($checkout_request_id);
    }

    if ($row) {
        if ($row['status'] == 'COMPLETED') {
            echo json_encode([
                'success' => true,
                'status' => 'COMPLETED',
                'message' => 'Payment completed successfully',
                'mpesa_receipt' => $row['mpesa_receipt'],
                'amount' => $row['amount']
            ]);
        } elseif ($row['status'] == 'FAILED') {
            echo json_encode([
                'success' => false,
                'status' => 'FAILED',
                'message' => 'Payment failed'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'status' => 'PENDING',
                'message' => 'Payment is still pending'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Transaction not found'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Missing checkout_request_id parameter'
    ]);
}

$conn->close();