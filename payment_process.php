<?php

// --- CORS: respond to preflight early and allow frontend origins ---
$allowed_origins = [
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
    'http://10.2.0.2:3001',
    'https://mobetposkenya-one-in-rongai.netlify.app'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
// For preflight requests, return early with 200 so the browser continues
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// include sqlite helper for offline operations
require_once __DIR__ . '/sqlite_helper.php';

// Database connection (attempt MySQL, fall back to SQLite for offline)
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "daraja_mpesa";

$conn = null;
try {
    // suppress warnings and catch exceptions if mysqli is configured to throw
    mysqli_report(MYSQLI_REPORT_OFF);
    $tmp = @new mysqli($servername, $username, $password, $dbname);
    if ($tmp && !$tmp->connect_error) {
        $conn = $tmp;
    } else {
        // Use sqlite fallback; log will be recorded later when log.php is included
        $conn = null;
    }
} catch (\Throwable $e) {
    // ignore and use sqlite fallback
    $conn = null;
}

// Log all errors to a file instead of displaying them
ini_set('display_errors', 0);
ini_set('log_errors', 1); // Turn logging ON
// Log to a local file in the project so it's easy to inspect during development
ini_set('error_log', __DIR__ . '/error.log');
error_reporting(E_ALL);


ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);


// ... rest of your PHP script code ...
// Daraja API configuration - prefer environment variables for secrets
$consumer_key = getenv('MPESA_CONSUMER_KEY') ?: 'sxQ7kfGLXEweGaQG5S8OHBFeF3SZfV8VQlH9vkFl3noYQ15O';
$consumer_secret = getenv('MPESA_CONSUMER_SECRET') ?: 'bogcMuDayraXD9KeH6mfHd8zDfvJeNueGE8iLTx5xda40PnyGPslwncFqJfdCUx6';
$business_short_code = getenv('MPESA_SHORTCODE') ?: '174379';
$passkey = getenv('MPESA_PASSKEY') ?: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

require_once __DIR__ . '/log.php';

// Read callback URL from environment variable if provided (useful for ngrok/local testing)
// Default to local `api/mpesa_callback.php` if running in XAMPP (adjust if needed)
$callback_url = getenv('MPESA_CALLBACK_URL') ?: (isset($_SERVER['HTTP_HOST']) ? sprintf('http://%s/api/mpesa_callback.php', $_SERVER['HTTP_HOST']) : 'http://localhost/api/mpesa_callback.php');
app_log('INFO', 'Using callback URL', ['callback_url' => $callback_url]);

// Prefer the shortcode configured in company settings (admin panel) if available.
// The frontend stores this as `mpesaTillNumber` (camelCase) which is saved server-side
// as snake_case `mpesa_till_number` in company_settings when syncing to the backend.
try {
    if (function_exists('sqlite_init')) {
        $db = sqlite_init();
        $candidates = ['mpesa_till_number', 'mpesaTillNumber', 'mpesa_till', 'mpesaTill'];
        foreach ($candidates as $k) {
            $stmt = $db->prepare('SELECT value FROM company_settings WHERE key = :k LIMIT 1');
            if ($stmt) {
                $stmt->bindValue(':k', $k, SQLITE3_TEXT);
                $res = $stmt->execute();
                if ($res) {
                    $row = $res->fetchArray(SQLITE3_ASSOC);
                    if ($row && !empty($row['value'])) {
                        // prefer company setting over env/default
                        $business_short_code = trim($row['value']);
                        app_log('INFO', 'Using M-Pesa shortcode from company_settings', ['key' => $k, 'shortcode' => $business_short_code]);
                        break;
                    }
                }
            }
        }
    }
} catch (\Throwable $e) {
    // ignore and continue using env/default
}

// Function to generate access token
function getAccessToken($consumer_key, $consumer_secret) {
    $url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    $credentials = base64_encode($consumer_key . ':' . $consumer_secret);
    curl_setopt($curl, CURLOPT_HTTPHEADER, array('Authorization: Basic ' . $credentials));
    curl_setopt($curl, CURLOPT_HEADER, false);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
    $result = curl_exec($curl);
    if ($result === false) {
        // curl error
        curl_close($curl);
        return null;
    }
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if ($status < 200 || $status >= 300) {
        return null;
    }
    $result = json_decode($result);
    if (!isset($result->access_token)) {
        return null;
    }
    return $result->access_token;
}

// Function to initiate STK Push
function initiateSTKPush($access_token, $business_short_code, $passkey, $amount, $phone_number, $callback_url) {
    $url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    $timestamp = date('YmdHis');
    $password = base64_encode($business_short_code . $passkey . $timestamp);
    
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_HTTPHEADER, array('Content-Type:application/json', 'Authorization:Bearer ' . $access_token));
    
    $curl_post_data = array(
        'BusinessShortCode' => $business_short_code,
        'Password' => $password,
        'Timestamp' => $timestamp,
        'TransactionType' => 'CustomerPayBillOnline',
        'Amount' => $amount,
        'PartyA' => $phone_number,
        'PartyB' => $business_short_code,
        'PhoneNumber' => $phone_number,
        'CallBackURL' => $callback_url,
        'AccountReference' => 'CompanyXLTD',
        'TransactionDesc' => 'Payment of X' 
    );
    
    $data_string = json_encode($curl_post_data);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_POST, true);
    curl_setopt($curl, CURLOPT_POSTFIELDS, $data_string);
    curl_setopt($curl, CURLOPT_HEADER, false);
    $curl_response = curl_exec($curl);
    if ($curl_response === false) {
        $err = curl_error($curl);
        curl_close($curl);
        return (object)['error' => $err];
    }
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    $decoded = json_decode($curl_response);
    if ($decoded === null) {
        return (object)['error' => 'Invalid JSON response from STK Push', 'http_status' => $status];
    }
    return $decoded;
}

// Helper: normalize phone numbers to 2547XXXXXXXX format
function normalizePhone($phone) {
    $p = preg_replace('/\D/', '', (string)$phone);
    if (substr($p, 0, 1) === '0') {
        // 07XXXXXXXX -> 2547XXXXXXXX
        return '254' . substr($p, 1);
    }
    if (substr($p, 0, 2) === '07') {
        return '254' . substr($p, 1);
    }
    if (substr($p, 0, 3) === '254') {
        return $p;
    }
    if (substr($p, 0, 1) === '+') {
        return preg_replace('/\D/', '', $p);
    }
    // fallback - just return digits
    return $p;
}

// Process the payment
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Accept either form-encoded POST (legacy) or JSON body from frontend
    $raw = file_get_contents('php://input');
    $json = @json_decode($raw, true);
    if (is_array($json)) {
        $phone_number = $json['phoneNumber'] ?? $json['phone'] ?? $json['PartyA'] ?? '';
        $amount = $json['amount'] ?? $json['Amount'] ?? 0;
        $customerName = $json['customerName'] ?? $json['name'] ?? '';
    } else {
        $phone_number = $_POST['phoneNumber'] ?? $_POST['phone'] ?? '';
        $amount = $_POST['amount'] ?? 0;
        $customerName = $_POST['customerName'] ?? $_POST['name'] ?? '';
    }
    $phone_number = normalizePhone($phone_number);
    $amount = (float)$amount;
    
    // Get access token
        $access_token = getAccessToken($consumer_key, $consumer_secret);
        if (!$access_token) {
            app_log('ERROR', 'Failed to obtain access token');
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Unable to get access token']);
            exit;
        } else {
            app_log('INFO', 'Obtained access token (masked): ' . substr($access_token, 0, 6) . '...');
        }
    
    // Initiate STK Push
    $stk_push_response = initiateSTKPush($access_token, $business_short_code, $passkey, $amount, $phone_number, $callback_url);
    app_log('INFO', 'STK push response', ['response' => $stk_push_response]);

    if (isset($stk_push_response->ResponseCode) && $stk_push_response->ResponseCode == "0") {
        // Payment request successful, save to database (MySQL preferred, SQLite fallback)
        $checkout_request_id = $stk_push_response->CheckoutRequestID;
        if ($conn) {
            $sql = "INSERT INTO payments (phone_number, amount, checkout_request_id, status) VALUES (?, ?, ?, 'PENDING')";
            $stmt = $conn->prepare($sql);
            if ($stmt) {
                $stmt->bind_param("sds", $phone_number, $amount, $checkout_request_id);
                if ($stmt->execute()) {
                    audit_transaction($checkout_request_id, 'STK_PUSH_REQUESTED', json_encode(['phone' => $phone_number, 'amount' => $amount]));
                    header('Content-Type: application/json');
                    echo json_encode(['success' => true, 'message' => 'Payment request sent. Please check your phone to complete the transaction.', 'checkout_request_id' => $checkout_request_id]);
                } else {
                    app_log('ERROR', 'MySQL insert failed, falling back to SQLite', ['error' => $stmt->error]);
                    sqlite_insert_payment($phone_number, $amount, $checkout_request_id, 'PENDING');
                    header('Content-Type: application/json');
                    echo json_encode(['success' => true, 'message' => 'Payment request sent (offline). Will sync when online.', 'checkout_request_id' => $checkout_request_id]);
                }
                $stmt->close();
            } else {
                app_log('WARN', 'MySQL prepare failed, using SQLite', ['error' => $conn->error]);
                sqlite_insert_payment($phone_number, $amount, $checkout_request_id, 'PENDING');
                header('Content-Type: application/json');
                echo json_encode(['success' => true, 'message' => 'Payment request sent (offline). Will sync when online.', 'checkout_request_id' => $checkout_request_id]);
            }
        } else {
            // MySQL not available — store locally
            sqlite_insert_payment($phone_number, $amount, $checkout_request_id, 'PENDING');
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'message' => 'Payment request sent (offline). Will sync when online.', 'checkout_request_id' => $checkout_request_id]);
        }
    } else {
        // Provide any error details returned by the STK push
        $msg = 'Failed to initiate payment. Please try again.';
        if (isset($stk_push_response->error)) {
            $msg .= ' Details: ' . $stk_push_response->error;
        } elseif (isset($stk_push_response->errorMessage)) {
            $msg .= ' Details: ' . $stk_push_response->errorMessage;
        }
        app_log('ERROR', 'STK push failed', ['message' => $msg, 'response' => $stk_push_response]);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => $msg]);
    }
} else {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
}

if ($conn) {
    $conn->close();
}
?>