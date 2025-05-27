<?php
// Include database connection
include_once '../config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get ID from URL if available
$id = isset($_GET['id']) ? $_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : null; // Get action parameter

// Handle requests
switch ($method) {
    case 'GET':
        if ($action === 'download' && $id) {
            // Handle file download
            $query = "SELECT file_name FROM submissions WHERE submission_id = :id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $submission = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($submission && $submission['file_name']) {
                $filePath = '../uploads/' . $submission['file_name'];

                if (file_exists($filePath)) {
                    header('Content-Description: File Transfer');
                    header('Content-Type: application/octet-stream');
                    header('Content-Disposition: attachment; filename="' . basename($filePath) . '"');
                    header('Expires: 0');
                    header('Cache-Control: must-revalidate');
                    header('Pragma: public');
                    header('Content-Length: ' . filesize($filePath));
                    readfile($filePath);
                    exit;
                } else {
                    http_response_code(404);
                    echo json_encode(array("message" => "File not found on server."));
                }
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Submission or file name not found."));
            }
        } elseif ($id) {
            // Fetch single submission by ID (existing logic)
            $query = "SELECT * FROM submissions WHERE submission_id = :id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $submission = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($submission) {
                echo json_encode($submission);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Submission not found."));
            }
        } else {
            // Fetch all submissions (existing logic)
            $query = "SELECT * FROM submissions ORDER BY submission_date DESC";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($submissions);
        }
        break;

    case 'POST':
        // Create new submission (file upload) (existing logic)
        // Ensure the uploads directory exists
        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $project_id = $_POST['project_id'];
        $student_id = $_POST['student_id'];
        $file = $_FILES['file'];

        $fileName = basename($file['name']);
        $targetFilePath = $uploadDir . $fileName;
        $fileType = pathinfo($targetFilePath, PATHINFO_EXTENSION);

        // Generate a unique submission_id
        $submission_id = uniqid('sub_');
        $submission_date = date('Y-m-d'); // Current date
        $status = 'Submitted'; // Default status

        // Move uploaded file to target directory
        if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
            $query = "INSERT INTO submissions (submission_id, project_id, student_id, file_name, submission_date, status, feedback)
                      VALUES (:submission_id, :project_id, :student_id, :file_name, :submission_date, :status, NULL)";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':submission_id', $submission_id);
            $stmt->bindParam(':project_id', $project_id);
            $stmt->bindParam(':student_id', $student_id);
            $stmt->bindParam(':file_name', $fileName);
            $stmt->bindParam(':submission_date', $submission_date);
            $stmt->bindParam(':status', $status);

            try {
                $stmt->execute();
                http_response_code(201); // Created
                echo json_encode(array("success" => true, "message" => "File uploaded and submission recorded successfully.", "submission_id" => $submission_id));
            } catch (PDOException $e) {
                // If database insert fails, delete the uploaded file
                unlink($targetFilePath);
                http_response_code(500);
                echo json_encode(array("success" => false, "message" => "Error recording submission: " . $e->getMessage()));
            }
        } else {
            http_response_code(500);
            echo json_encode(array("success" => false, "message" => "Error uploading file."));
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));

        if (!$id) {
            http_response_code(400);
            echo json_encode(array("message" => "Submission ID is required for update."));
            break;
        }

        $setClauses = [];
        $params = [':id' => $id];

        if (isset($data->status)) {
            $setClauses[] = "status = :status";
            $params[':status'] = $data->status;
        }
        if (isset($data->feedback)) {
            $setClauses[] = "feedback = :feedback";
            $params[':feedback'] = $data->feedback;
        }

        if (empty($setClauses)) {
            http_response_code(400);
            echo json_encode(array("message" => "No fields to update."));
            break;
        }

        $query = "UPDATE submissions SET " . implode(", ", $setClauses) . " WHERE submission_id = :id";
        $stmt = $conn->prepare($query);

        try {
            $stmt->execute($params);
            if ($stmt->rowCount() > 0) {
                echo json_encode(array("message" => "Submission updated successfully."));
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Submission not found or no changes made."));
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array("message" => "Error updating submission: " . $e->getMessage()));
        }
        break;

    case 'DELETE':
        if (!$id) {
            http_response_code(400);
            echo json_encode(array("message" => "Submission ID is required for deletion."));
            break;
        }

        // First, get the file name to delete it from the server
        $query = "SELECT file_name FROM submissions WHERE submission_id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $submission = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($submission) {
            $fileName = $submission['file_name'];
            $filePath = '../uploads/' . $fileName;

            // Delete record from database
            $deleteQuery = "DELETE FROM submissions WHERE submission_id = :id";
            $deleteStmt = $conn->prepare($deleteQuery);
            $deleteStmt->bindParam(':id', $id);

            try {
                $deleteStmt->execute();
                if ($deleteStmt->rowCount() > 0) {
                    // If database record deleted, try to delete the file
                    if (file_exists($filePath)) {
                        unlink($filePath); // Delete the actual file
                    }
                    echo json_encode(array("message" => "Submission and file deleted successfully."));
                } else {
                    http_response_code(404);
                    echo json_encode(array("message" => "Submission not found."));
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(array("message" => "Error deleting submission: " . $e->getMessage()));
            }
        } else {
            http_response_code(404);
            echo json_encode(array("message" => "Submission not found."));
        }
        break;

    case 'OPTIONS':
        // Respond to preflight requests
        http_response_code(200);
        break;

    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(array("message" => "Method not allowed."));
        break;
}
?>
