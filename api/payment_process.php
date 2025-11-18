<?php
// htdocs/api/payment_process.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(["error" => "invalid json"]);
    exit;
}
$name = $input['name'] ?? '';
$phone = $input['phoneNumber'] ?? '';
$amount = $input['amount'] ?? 0;

// If phone is not provided treat this as a cashier-recorded M-Pesa payment
if (!$amount) {
    http_response_code(400);
    echo json_encode(["error" => "amount required"]);
    exit;
}

if (empty($phone)) {
    // Log the quick-record for audit
    $logEntry = [
        'timestamp' => date('c'),
        'type' => 'mpesa_cashier_record',
        'name' => $name,
        'amount' => $amount
    ];
    @file_put_contents(__DIR__ . '/mpesa_quick_records.log', json_encode($logEntry) . PHP_EOL, FILE_APPEND | LOCK_EX);

    // Respond immediately as success - frontend records this as a M-Pesa payment
    echo json_encode([
        "ok" => true,
        "recorded" => true,
        "method" => "M-Pesa",
        "amount" => $amount,
        "message" => "Recorded as M-Pesa by cashier (no STK sent)."
    ]);
    exit;
}

// Daraja credentials - prefer environment variables for deployment
$consumer_key = getenv('MPESA_CONSUMER_KEY') ?: 'sxQ7kfGLXEweGaQG5S8OHBFeF3SZfV8VQlH9vkFl3noYQ15O';
$consumer_secret = getenv('MPESA_CONSUMER_SECRET') ?: 'bogcMuDayraXD9KeH6mfHd8zDfvJeNueGE8iLTx5xda40PnyGPslwncFqJfdCUx6';
$business_short_code = getenv('MPESA_SHORTCODE') ?: '174379';
$passkey = getenv('MPESA_PASSKEY') ?: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
$callbackUrl = getenv('MPESA_CALLBACK_URL') ?: 'https://mobetposkenya-one-in-rongai.netlify.app/api/mpesa_callback.php'; // M-Pesa will POST here
// For local testing with sandbox you can use ngrok to route to local php callback

// 1) Get access token
$tokenUrl = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $tokenUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
// Use the consumer key/secret variables defined above
curl_setopt($ch, CURLOPT_USERPWD, $consumer_key . ":" . $consumer_secret);
$result = curl_exec($ch);
curl_close($ch);
$tokenData = json_decode($result, true);
$accessToken = $tokenData['access_token'] ?? null;
if (!$accessToken) {
    http_response_code(500);
    echo json_encode(["error" => "failed to get access token", "details" => $tokenData]);
    exit;
}

// 2) Prepare STK push request
$timestamp = date("YmdHis");
// Ensure we use the configured business shortcode (from env or company settings)
$businessShortCode = $business_short_code;
$pass = base64_encode($businessShortCode . $passkey . $timestamp);
$partyA = preg_replace('/\D/','', $phone); // 2547XXXXXXXX
if (substr($partyA,0,1) == '0') {
    $partyA = '254' . substr($partyA,1);
} elseif (substr($partyA,0,1) == '+') {
    $partyA = preg_replace('/\D/','', $partyA);
}
$stkUrl = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
$payload = [
    "BusinessShortCode" => $businessShortCode,
    "Password" => $pass,
    "Timestamp" => $timestamp,
    "TransactionType" => "CustomerPayBillOnline",
    "Amount" => $amount,
    "PartyA" => $partyA,
    "PartyB" => $businessShortCode,
    "PhoneNumber" => $partyA,
    "CallBackURL" => $callbackUrl,
    "AccountReference" => $name,
    "TransactionDesc" => "Payment from POS"
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $stkUrl);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $accessToken","Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
$resp = json_decode($response, true);

// Save the relevant IDs to your DB here (example shows returning to client)
echo json_encode([
    "ok" => true,
    "response" => $resp
]);