<?php
// Allow requests from any origin during development. In production, specify your domain.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// --- Error Reporting Configuration ---
// Turn off all error reporting to prevent PHP warnings/errors from breaking JSON output.
// In a production environment, you would log errors to a file instead of suppressing them.
error_reporting(0);
ini_set('display_errors', 0);
// -----------------------------------

// Database credentials
$host = 'localhost';
$db_name = 'project_pilot'; // Make sure this matches your database name
$username = 'root'; // Your MySQL username (e.g., 'root' for XAMPP/WAMP)
$password = ''; // Your MySQL password (often empty for XAMPP/WAMP root)

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // For debugging: echo json_encode(array("message" => "Database connected successfully."));
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Database connection failed: " . $e->getMessage()));
    exit(); // Stop script execution if connection fails
}
?>
