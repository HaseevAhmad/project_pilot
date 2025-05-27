<?php
// Include database connection
include_once '../config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get ID from URL if available
$id = isset($_GET['id']) ? $_GET['id'] : null;

// Handle requests
switch ($method) {
    case 'GET':
        if ($id) {
            // Fetch single notice by ID
            $query = "SELECT * FROM notices WHERE notice_id = :id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $notice = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($notice) {
                echo json_encode($notice);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Notice not found."));
            }
        } else {
            // Fetch all notices
            $query = "SELECT * FROM notices ORDER BY notice_date DESC";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            $notices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($notices);
        }
        break;

    case 'POST':
        // Create new notice
        $data = json_decode(file_get_contents("php://input"));

        // Generate a unique notice_id
        $notice_id = uniqid('notice_');

        $title = $data->title;
        $content = $data->content;
        $notice_date = $data->notice_date;
        $author_id = $data->author_id;
        $audience_type = $data->audience_type;
        $target_id = isset($data->target_id) && $data->target_id !== '' ? $data->target_id : NULL; // Can be NULL

        $query = "INSERT INTO notices (notice_id, title, content, notice_date, author_id, audience_type, target_id)
                  VALUES (:notice_id, :title, :content, :notice_date, :author_id, :audience_type, :target_id)";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':notice_id', $notice_id);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':content', $content);
        $stmt->bindParam(':notice_date', $notice_date);
        $stmt->bindParam(':author_id', $author_id);
        $stmt->bindParam(':audience_type', $audience_type);
        $stmt->bindParam(':target_id', $target_id);

        try {
            $stmt->execute();
            http_response_code(201); // Created
            echo json_encode(array("success" => true, "message" => "Notice posted successfully.", "notice_id" => $notice_id));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array("success" => false, "message" => "Error posting notice: " . $e->getMessage()));
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));

        if (!$id) {
            http_response_code(400);
            echo json_encode(array("message" => "Notice ID is required for update."));
            break;
        }

        $setClauses = [];
        $params = [':id' => $id];

        if (isset($data->title)) {
            $setClauses[] = "title = :title";
            $params[':title'] = $data->title;
        }
        if (isset($data->content)) {
            $setClauses[] = "content = :content";
            $params[':content'] = $data->content;
        }
        if (isset($data->notice_date)) {
            $setClauses[] = "notice_date = :notice_date";
            $params[':notice_date'] = $data->notice_date;
        }
        if (isset($data->author_id)) {
            $setClauses[] = "author_id = :author_id";
            $params[':author_id'] = $data->author_id;
        }
        if (isset($data->audience_type)) {
            $setClauses[] = "audience_type = :audience_type";
            $params[':audience_type'] = $data->audience_type;
        }
        // Handle target_id separately as it can be explicitly set to NULL
        if (property_exists($data, 'target_id')) {
            $setClauses[] = "target_id = :target_id";
            $params[':target_id'] = ($data->target_id === '' || $data->target_id === null) ? NULL : $data->target_id;
        }


        if (empty($setClauses)) {
            http_response_code(400);
            echo json_encode(array("message" => "No fields to update."));
            break;
        }

        $query = "UPDATE notices SET " . implode(", ", $setClauses) . " WHERE notice_id = :id";
        $stmt = $conn->prepare($query);

        try {
            $stmt->execute($params);
            if ($stmt->rowCount() > 0) {
                echo json_encode(array("message" => "Notice updated successfully."));
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Notice not found or no changes made."));
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array("message" => "Error updating notice: " . $e->getMessage()));
        }
        break;

    case 'DELETE':
        if (!$id) {
            http_response_code(400);
            echo json_encode(array("message" => "Notice ID is required for deletion."));
            break;
        }

        $query = "DELETE FROM notices WHERE notice_id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);

        try {
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                echo json_encode(array("message" => "Notice deleted successfully."));
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Notice not found."));
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array("message" => "Error deleting notice: " . $e->getMessage()));
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
