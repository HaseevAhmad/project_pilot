<?php
// Include database connection
include_once '../config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get ID from URL if available
$id = isset($_GET['id']) ? $_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : null;

// Handle requests
switch ($method) {
    case 'GET':
        if ($id) {
            // Fetch single project by ID, including associated students
            $query = "SELECT p.project_id, p.title, p.description, p.supervisor_id, p.status, p.semester, pm.student_id, pm.is_leader
                      FROM projects p
                      LEFT JOIN project_members pm ON p.project_id = pm.project_id
                      WHERE p.project_id = :id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($rows) {
                $project = [
                    'project_id' => $rows[0]['project_id'],
                    'title' => $rows[0]['title'],
                    'description' => $rows[0]['description'],
                    'supervisor_id' => $rows[0]['supervisor_id'],
                    'status' => $rows[0]['status'],
                    'semester' => $rows[0]['semester'],
                    'students' => [],
                    'leader_id' => null
                ];

                foreach ($rows as $row) {
                    if ($row['student_id']) {
                        $project['students'][] = $row['student_id'];
                        if ($row['is_leader']) {
                            $project['leader_id'] = $row['student_id'];
                        }
                    }
                }
                echo json_encode($project);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Project not found."));
            }
        } else {
            // Fetch all projects, including associated students and leader
            $query = "SELECT p.project_id, p.title, p.description, p.supervisor_id, p.status, p.semester, pm.student_id, pm.is_leader
                      FROM projects p
                      LEFT JOIN project_members pm ON p.project_id = pm.project_id
                      ORDER BY p.title";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $projects = [];
            foreach ($rows as $row) {
                $projectId = $row['project_id'];
                if (!isset($projects[$projectId])) {
                    $projects[$projectId] = [
                        'project_id' => $row['project_id'],
                        'title' => $row['title'],
                        'description' => $row['description'],
                        'supervisor_id' => $row['supervisor_id'],
                        'status' => $row['status'],
                        'semester' => $row['semester'],
                        'students' => [],
                        'leader_id' => null
                    ];
                }
                if ($row['student_id']) {
                    $projects[$projectId]['students'][] = $row['student_id'];
                    if ($row['is_leader']) {
                        $projects[$projectId]['leader_id'] = $row['student_id'];
                    }
                }
            }
            echo json_encode(array_values($projects)); // Return as a simple array
        }
        break;

    case 'POST':
        // Create new project
        $data = json_decode(file_get_contents("php://input"));

        // Generate a unique project_id
        $project_id = uniqid('proj_');

        $title = $data->title;
        $description = $data->description;
        $supervisor_id = $data->supervisor_id;
        $status = $data->status; // Should be 'Planning' for new projects
        $semester = $data->semester;

        $query = "INSERT INTO projects (project_id, title, description, supervisor_id, status, semester) VALUES (:project_id, :title, :description, :supervisor_id, :status, :semester)";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':project_id', $project_id);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':supervisor_id', $supervisor_id);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':semester', $semester);

        try {
            $stmt->execute();
            http_response_code(201); // Created
            echo json_encode(array("success" => true, "message" => "Project created successfully.", "project_id" => $project_id));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array("success" => false, "message" => "Error creating project: " . $e->getMessage()));
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));

        if (!$id) {
            http_response_code(400);
            echo json_encode(array("message" => "Project ID is required for update."));
            break;
        }

        if ($action === 'add_member') {
            $student_id = $data->student_id;
            // Check if student is already in a project
            $check_student_query = "SELECT project_id FROM project_members WHERE student_id = :student_id";
            $check_stmt = $conn->prepare($check_student_query);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->execute();
            if ($check_stmt->fetch(PDO::FETCH_ASSOC)) {
                http_response_code(409); // Conflict
                echo json_encode(array("message" => "Student is already assigned to a project."));
                break;
            }

            // Add student to project_members
            $add_member_query = "INSERT INTO project_members (project_id, student_id, is_leader) VALUES (:project_id, :student_id, FALSE)";
            $add_stmt = $conn->prepare($add_member_query);
            $add_stmt->bindParam(':project_id', $id);
            $add_stmt->bindParam(':student_id', $student_id);
            try {
                $add_stmt->execute();
                // Update the student's project_id in the users table
                $update_user_query = "UPDATE users SET project_id = :project_id WHERE user_id = :student_id";
                $update_user_stmt = $conn->prepare($update_user_query);
                $update_user_stmt->bindParam(':project_id', $id);
                $update_user_stmt->bindParam(':student_id', $student_id);
                $update_user_stmt->execute();

                echo json_encode(array("message" => "Student added to project successfully."));
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(array("message" => "Error adding student to project: " . $e->getMessage()));
            }
            break;
        } elseif ($action === 'remove_member') {
            $student_id = $data->student_id;
            // Remove student from project_members
            $remove_member_query = "DELETE FROM project_members WHERE project_id = :project_id AND student_id = :student_id";
            $remove_stmt = $conn->prepare($remove_member_query);
            $remove_stmt->bindParam(':project_id', $id);
            $remove_stmt->bindParam(':student_id', $student_id);
            try {
                $remove_stmt->execute();
                // Clear the student's project_id in the users table
                $update_user_query = "UPDATE users SET project_id = NULL WHERE user_id = :student_id";
                $update_user_stmt = $conn->prepare($update_user_query);
                $update_user_stmt->bindParam(':student_id', $student_id);
                $update_user_stmt->execute();

                // If the removed student was the leader, set leader_id to NULL
                $update_leader_query = "UPDATE project_members SET is_leader = FALSE WHERE project_id = :project_id AND student_id = :student_id_leader_check";
                $update_leader_stmt = $conn->prepare($update_leader_query);
                $update_leader_stmt->bindParam(':project_id', $id);
                $update_leader_stmt->bindParam(':student_id_leader_check', $student_id);
                $update_leader_stmt->execute();

                echo json_encode(array("message" => "Student removed from project successfully."));
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(array("message" => "Error removing student from project: " . $e->getMessage()));
            }
            break;
        } else {
            // Update project details
            $setClauses = [];
            $params = [':id' => $id];

            if (isset($data->title)) {
                $setClauses[] = "title = :title";
                $params[':title'] = $data->title;
            }
            if (isset($data->description)) {
                $setClauses[] = "description = :description";
                $params[':description'] = $data->description;
            }
            if (isset($data->supervisor_id)) {
                $setClauses[] = "supervisor_id = :supervisor_id";
                $params[':supervisor_id'] = $data->supervisor_id;
            }
            if (isset($data->status)) {
                $setClauses[] = "status = :status";
                $params[':status'] = $data->status;
            }
            if (isset($data->semester)) {
                $setClauses[] = "semester = :semester";
                $params[':semester'] = $data->semester;
            }
            if (isset($data->leader_id)) {
                // First, set all existing leaders for this project to FALSE
                $clear_leader_query = "UPDATE project_members SET is_leader = FALSE WHERE project_id = :project_id";
                $clear_leader_stmt = $conn->prepare($clear_leader_query);
                $clear_leader_stmt->bindParam(':project_id', $id);
                $clear_leader_stmt->execute();

                // Then, set the new leader to TRUE
                if ($data->leader_id !== null) {
                    // Ensure the new leader is actually a member of the project
                    $check_member_query = "SELECT COUNT(*) FROM project_members WHERE project_id = :project_id AND student_id = :student_id";
                    $check_member_stmt = $conn->prepare($check_member_query);
                    $check_member_stmt->bindParam(':project_id', $id);
                    $check_member_stmt->bindParam(':student_id', $data->leader_id);
                    $check_member_stmt->execute();
                    if ($check_member_stmt->fetchColumn() > 0) {
                        $set_leader_query = "UPDATE project_members SET is_leader = TRUE WHERE project_id = :project_id AND student_id = :student_id";
                        $set_leader_stmt = $conn->prepare($set_leader_query);
                        $set_leader_stmt->bindParam(':project_id', $id);
                        $set_leader_stmt->bindParam(':student_id', $data->leader_id);
                        $set_leader_stmt->execute();
                    } else {
                        http_response_code(400);
                        echo json_encode(array("message" => "Cannot set leader: student is not a member of this project."));
                        break;
                    }
                }
            }


            if (empty($setClauses) && !isset($data->leader_id)) {
                http_response_code(400);
                echo json_encode(array("message" => "No fields to update."));
                break;
            }

            $query = "UPDATE projects SET " . implode(", ", $setClauses) . " WHERE project_id = :id";
            $stmt = $conn->prepare($query);

            try {
                $stmt->execute($params);
                if ($stmt->rowCount() > 0 || isset($data->leader_id)) { // Check rowCount or if leader was updated
                    echo json_encode(array("message" => "Project updated successfully."));
                } else {
                    http_response_code(404);
                    echo json_encode(array("message" => "Project not found or no changes made."));
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(array("message" => "Error updating project: " . $e->getMessage()));
            }
        }
        break;

    case 'DELETE':
        if (!$id) {
            http_response_code(400);
            echo json_encode(array("message" => "Project ID is required for deletion."));
            break;
        }

        try {
            // Start a transaction for atomicity
            $conn->beginTransaction();

            // 1. Remove all project members associated with this project
            $stmt = $conn->prepare("DELETE FROM project_members WHERE project_id = :id");
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // 2. Update students who were part of this project to have NULL project_id
            $stmt = $conn->prepare("UPDATE users SET project_id = NULL WHERE user_id IN (SELECT student_id FROM project_members WHERE project_id = :id_for_users_update)");
            $stmt->bindParam(':id_for_users_update', $id);
            $stmt->execute();

            // 3. Delete all submissions related to this project
            $stmt = $conn->prepare("DELETE FROM submissions WHERE project_id = :id");
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // 4. Delete any notices specifically targeting this project
            $stmt = $conn->prepare("DELETE FROM notices WHERE audience_type = 'specific_project' AND target_id = :id");
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // 5. Finally, delete the project itself
            $query = "DELETE FROM projects WHERE project_id = :id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $conn->commit(); // Commit the transaction
                echo json_encode(array("message" => "Project and associated data deleted successfully."));
            } else {
                $conn->rollBack(); // Rollback if project not found
                http_response_code(404);
                echo json_encode(array("message" => "Project not found."));
            }
        } catch (PDOException $e) {
            $conn->rollBack(); // Rollback on error
            http_response_code(500);
            echo json_encode(array("message" => "Error deleting project: " . $e->getMessage()));
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
