<?php
// Include database connection
// Corrected path: Go up one directory to find config.php
include_once '../config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get ID from URL if available
$id = isset($_GET['id']) ? $_GET['id'] : null;

// Handle requests
switch ($method) {
    case 'GET':
        if ($id) {
            // Fetch single user by ID, including project_id for students
            // Use LEFT JOIN to get project_id from project_members for students
            $query = "SELECT u.user_id, u.name, u.email, u.role, u.roll_number, u.semester, pm.project_id
                      FROM users u
                      LEFT JOIN project_members pm ON u.user_id = pm.student_id
                      WHERE u.user_id = :id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                // Ensure project_id is explicitly null if the user is not a student or not in a project
                if ($user['role'] !== 'student' || $user['project_id'] === null) {
                    $user['project_id'] = null;
                }
                echo json_encode($user);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "User not found."));
            }
        } else {
            // Fetch all users, or filter by role
            $roleFilter = isset($_GET['role']) ? $_GET['role'] : null;

            // Use LEFT JOIN to get project_id from project_members for students when fetching all users
            $query = "SELECT u.user_id, u.name, u.email, u.role, u.roll_number, u.semester, pm.project_id
                      FROM users u
                      LEFT JOIN project_members pm ON u.user_id = pm.student_id";
            $params = [];

            if ($roleFilter) {
                $query .= " WHERE u.role = :role";
                $params[':role'] = $roleFilter;
            }

            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Process results to ensure project_id is null for non-students or students without projects
            foreach ($users as &$user) {
                if ($user['role'] !== 'student' || $user['project_id'] === null) {
                    $user['project_id'] = null;
                }
            }
            unset($user); // Break the reference with the last element

            echo json_encode($users);
        }
        break;

    case 'POST':
        // Check if it's a login request
        if (isset($_GET['action']) && $_GET['action'] === 'login') {
            $data = json_decode(file_get_contents("php://input"));
            $email = $data->email;
            $password = $data->password;

            // Fetch user by email, including project_id for students using LEFT JOIN
            $query = "SELECT u.user_id, u.name, u.email, u.password, u.role, u.roll_number, u.semester, pm.project_id
                      FROM users u
                      LEFT JOIN project_members pm ON u.user_id = pm.student_id
                      WHERE u.email = :email";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':email', $email);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($password, $user['password'])) {
                // Remove password hash before sending to frontend
                unset($user['password']);
                // Ensure project_id is explicitly null if the user is not a student or not in a project
                if ($user['role'] !== 'student' || $user['project_id'] === null) {
                    $user['project_id'] = null;
                }
                echo json_encode(array("success" => true, "message" => "Login successful.", "user" => $user));
            } else {
                http_response_code(401); // Unauthorized
                echo json_encode(array("success" => false, "message" => "Invalid email or password."));
            }
        } else {
            // Create new user
            $data = json_decode(file_get_contents("php://input"));

            // Generate a unique user_id
            $user_id = uniqid('user_');

            $name = $data->name;
            $email = $data->email;
            $password = password_hash($data->password, PASSWORD_BCRYPT); // Hash the password
            $role = $data->role;
            $roll_number = isset($data->roll_number) && $data->roll_number !== '' ? $data->roll_number : NULL;
            $semester = isset($data->semester) && $data->semester !== '' ? $data->semester : NULL;

            $query = "INSERT INTO users (user_id, name, email, password, role, roll_number, semester) VALUES (:user_id, :name, :email, :password, :role, :roll_number, :semester)";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':password', $password);
            $stmt->bindParam(':role', $role);
            $stmt->bindParam(':roll_number', $roll_number);
            $stmt->bindParam(':semester', $semester);

            try {
                $stmt->execute();
                echo json_encode(array("success" => true, "message" => "User created successfully.", "user_id" => $user_id));
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(array("success" => false, "message" => "Error creating user: " . $e->getMessage()));
            }
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));

        if (!$id) {
            http_response_code(400);
            echo json_encode(array("message" => "User ID is required for update."));
            break;
        }

        $setClauses = [];
        $params = [':id' => $id];

        if (isset($data->name)) {
            $setClauses[] = "name = :name";
            $params[':name'] = $data->name;
        }
        if (isset($data->email)) {
            $setClauses[] = "email = :email";
            $params[':email'] = $data->email;
        }
        if (isset($data->password) && $data->password !== '') {
            $setClauses[] = "password = :password";
            $params[':password'] = password_hash($data->password, PASSWORD_BCRYPT);
        }
        if (isset($data->role)) {
            $setClauses[] = "role = :role";
            $params[':role'] = $data->role;
        }
        // Handle roll_number and semester for students
        if (isset($data->roll_number)) {
            $setClauses[] = "roll_number = :roll_number";
            $params[':roll_number'] = $data->roll_number !== '' ? $data->roll_number : NULL;
        }
        if (isset($data->semester)) {
            $setClauses[] = "semester = :semester";
            $params[':semester'] = $data->semester !== '' ? $data->semester : NULL;
        }

        if (empty($setClauses)) {
            http_response_code(400);
            echo json_encode(array("message" => "No fields to update."));
            break;
        }

        $query = "UPDATE users SET " . implode(", ", $setClauses) . " WHERE user_id = :id";
        $stmt = $conn->prepare($query);

        try {
            $stmt->execute($params);
            if ($stmt->rowCount() > 0) {
                echo json_encode(array("message" => "User updated successfully."));
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "User not found or no changes made."));
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array("message" => "Error updating user: " . $e->getMessage()));
        }
        break;

    case 'DELETE':
        if (!$id) {
            http_response_code(400);
            echo json_encode(array("message" => "User ID is required for deletion."));
            break;
        }

        // Before deleting user, disassociate from project_members
        $stmt = $conn->prepare("DELETE FROM project_members WHERE student_id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        // Also delete any submissions by this student
        $stmt = $conn->prepare("DELETE FROM submissions WHERE student_id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        // If a supervisor is deleted, set their projects to null supervisor or reassign
        // For simplicity, we'll just delete projects they supervise if no other supervisor is assigned
        // In a real app, you'd have more robust handling (e.g., reassign, prevent deletion)
        $stmt = $conn->prepare("UPDATE projects SET supervisor_id = NULL WHERE supervisor_id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        // Delete notices authored by this user
        $stmt = $conn->prepare("DELETE FROM notices WHERE author_id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        $query = "DELETE FROM users WHERE user_id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);

        try {
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                echo json_encode(array("message" => "User deleted successfully."));
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "User not found."));
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array("message" => "Error deleting user: " . $e->getMessage()));
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
