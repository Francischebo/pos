<?php
// htdocs/api/mpesa_callback.php
header("Content-Type: application/json; charset=UTF-8");
$body = file_get_contents('php://input');
$payload = json_decode($body, true);

// Log payload to file for debugging
file_put_contents(__DIR__.'/mpesa_callback.log', date('c')." - ". $body . PHP_EOL, FILE_APPEND);

// Parse result - Daraja posts the JSON structure
// Get CheckoutRequestID and result code/details
$result = $payload['Body']['stkCallback'] ?? null;
if ($result) {
    $checkoutRequestID = $result['CheckoutRequestID'] ?? null;
    $merchantRequestID = $result['MerchantRequestID'] ?? null;
    $resultCode = $result['ResultCode'] ?? null;
    $resultDesc = $result['ResultDesc'] ?? '';
    // If ResultCode == 0, success; else failure
    // You may want to parse CallbackMetadata for Amount, MpesaReceiptNumber, PhoneNumber etc.
    $callbackMetadata = $result['CallbackMetadata']['Item'] ?? [];
    $meta = [];
    foreach ($callbackMetadata as $item) {
        $meta[$item['Name']] = $item['Value'] ?? null;
    }

    // Update your DB transaction status here (mark as COMPLETED/FAILED)
    // Example: write to file (for testing)
    $log = [
        'checkoutRequestID'=>$checkoutRequestID,
        'merchantRequestID'=>$merchantRequestID,
        'resultCode'=>$resultCode,
        'resultDesc'=>$resultDesc,
        'meta'=>$meta
    ];
    file_put_contents(__DIR__.'/mpesa_complete.log', json_encode($log).PHP_EOL, FILE_APPEND);

    // Notify WebSocket broadcaster (Node server)
    // Allow override via environment variable; default to port 3010 (websocket-server default)
    $notifyUrl = getenv('WEBSOCKET_NOTIFY_URL') ?: 'http://localhost:3010/notify';
    $notifyPayload = [
        'checkoutRequestID'=>$checkoutRequestID,
        'merchantRequestID'=>$merchantRequestID,
        'resultCode'=>$resultCode,
        'resultDesc'=>$resultDesc,
        'meta'=>$meta
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $notifyUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($notifyPayload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $notifyResp = curl_exec($ch);
    curl_close($ch);

    // Respond HTTP 200 to Safaricom
    echo json_encode(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    exit;
}

// If not an stk callback, just return OK
echo json_encode(['ResultCode' => 0, 'ResultDesc' => 'No stkCallback data']);