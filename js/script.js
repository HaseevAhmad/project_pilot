// --- Preset Data ---
const presetSemesters = [
    "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
    "5th Semester", "6th Semester", "7th Semester", "8th Semester"
];

// --- Current User State (Initially null, will be set on login) ---
var currentUser = null;

// --- API Base URL ---
const API_BASE_URL = 'http://localhost/project_pilot/api'; // Your XAMPP project's API base URL

// --- Utility Functions for API Calls ---
async function fetchData(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);

        // Check if response is OK but potentially empty
        if (response.ok) {
            const text = await response.text(); // Get raw text
            if (text) {
                try {
                    return JSON.parse(text); // Try parsing as JSON
                } catch (e) {
                    console.error(`JSON parsing error for ${url}:`, text, e);
                    throw new Error(`Invalid JSON response from ${endpoint}`);
                }
            } else {
                // If response is OK but empty, return an empty array/object based on expectation
                if (method === 'GET') return [];
                return {};
            }
        } else {
            // Handle non-OK responses (e.g., 404, 500)
            const errorText = await response.text();
            let errorData = {};
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                // If error response is not JSON, use raw text
                errorData.message = errorText || `HTTP error! Status: ${response.status}`;
            }
            throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// --- UI Rendering Functions ---
function renderSidebar() {
    const sidebarNav = document.getElementById('sidebarNav');
    sidebarNav.innerHTML = '';
    // Only render sidebar if currentUser is set (i.e., logged in)
    if (!currentUser) {
        // Hide main content area if not logged in
        document.getElementById('dashboard-content-area').style.display = 'none';
        document.getElementById('left-panel').style.display = 'none'; // Ensure sidebar is hidden
        document.getElementById('mainContent').classList.remove('ml-64'); // Remove margin
        return;
    }

    // Show sidebar and add margin to main content
    document.getElementById('left-panel').style.display = 'flex';
    document.getElementById('mainContent').classList.add('ml-64');


    const items = navItems[currentUser.role] || [];
    const currentHash = window.location.hash.substring(1); // Get current page from URL hash

    items.forEach(item => {
        const link = document.createElement('a');
        link.href = `#${item.page}`; // Set href for proper URL
        link.className = 'flex items-center p-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors duration-150';
        link.innerHTML = `${item.icon} ${item.name}`;
        link.onclick = (e) => {
            e.preventDefault();
            navigateTo(item.page); // Call navigateTo to handle history.pushState
        };

        // Set active class based on current hash
        if (item.page === currentHash) {
            link.classList.add('bg-blue-100', 'text-blue-600', 'font-semibold');
        }
        sidebarNav.appendChild(link);
    });

    // If no hash, or hash doesn't match a sidebar item, default to the first item
    if (!currentHash || !items.some(item => item.page === currentHash)) {
        if (sidebarNav.firstChild) {
            // Use replaceState to avoid adding an extra history entry for the default page
            navigateTo(items[0].page, false);
        }
    }
}

async function navigateTo(pageId, pushState = true) {
    console.log(`Navigating to ${pageId}`);
    const mainContent = document.getElementById('mainContent');

    // Update URL hash if pushState is true
    if (pushState) {
        history.pushState(null, '', `#${pageId}`);
    }

    // Hide all content sections first
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show the specific content section based on pageId
    let targetContentDiv = document.getElementById(pageId);
    if (!targetContentDiv) {
        // If a specific div for the pageId doesn't exist, create a generic one
        targetContentDiv = document.createElement('div');
        targetContentDiv.id = pageId;
        targetContentDiv.className = 'content-section';
        document.getElementById('content-sections-container').appendChild(targetContentDiv); // Append to the new container
    }
    targetContentDiv.style.display = 'block';

    // Update active sidebar link
    document.querySelectorAll('#sidebarNav a').forEach(a => a.classList.remove('bg-blue-100', 'text-blue-600', 'font-semibold'));
    const newActiveLink = Array.from(document.querySelectorAll('#sidebarNav a')).find(a => a.getAttribute('href') === `#${pageId}`);
    if(newActiveLink) {
        newActiveLink.classList.add('bg-blue-100', 'text-blue-600', 'font-semibold');
    }


    // Fetch latest data before rendering pages that display dynamic data
    await fetchAllData(); // Fetch all data from backend before rendering any page

    if (pageId === 'adminDashboard') targetContentDiv.innerHTML = renderAdminDashboard();
    else if (pageId === 'manageAdmins') targetContentDiv.innerHTML = renderUserManagementPage('Admins', 'admin');
    else if (pageId === 'manageSupervisors') targetContentDiv.innerHTML = renderUserManagementPage('Supervisors', 'supervisor');
    else if (pageId === 'manageStudents') targetContentDiv.innerHTML = renderUserManagementPage('Students', 'student');
    else if (pageId === 'manageProjects') targetContentDiv.innerHTML = renderProjectManagementPage();
    else if (pageId === 'manageSemesters') targetContentDiv.innerHTML = renderManageSemestersPage();
    else if (pageId === 'viewNotices') targetContentDiv.innerHTML = renderNoticesPage();
    else if (pageId === 'profile') targetContentDiv.innerHTML = renderProfilePage();
    else if (pageId === 'supervisorDashboard') targetContentDiv.innerHTML = renderSupervisorDashboard();
    else if (pageId === 'supervisorProjects') targetContentDiv.innerHTML = renderSupervisorProjectsPage();
    else if (pageId === 'supervisorStudents') targetContentDiv.innerHTML = renderSupervisorStudentsPage();
    else if (pageId === 'supervisorSubmissions') targetContentDiv.innerHTML = renderSupervisorSubmissionsPage();
    else if (pageId === 'studentDashboard') targetContentDiv.innerHTML = renderStudentDashboard();
    else if (pageId === 'studentProject') targetContentDiv.innerHTML = renderStudentProjectPage();
    else if (pageId === 'studentSubmissions') targetContentDiv.innerHTML = renderStudentSubmissionsPage();
    else targetContentDiv.innerHTML = `<h1 class="text-2xl font-semibold">Page Not Found</h1><p>Content for ${pageId} is not yet implemented.</p>`;

    // Specific event listener attachments for forms that are dynamically loaded
    if (pageId === 'studentProject') {
         const submissionForm = document.getElementById('submissionForm');
         if(submissionForm) submissionForm.addEventListener('submit', handleStudentSubmission);
    }
    if (pageId === 'viewNotices') { // Attach filter listener if notice page is loaded
        const noticeAudienceTypeSelect = document.getElementById('noticeAudienceType');
        if (noticeAudienceTypeSelect) {
            noticeAudienceTypeSelect.addEventListener('change', () => updateNoticeTargetOptions());
        }
        const studentFilterInput = document.getElementById('noticeStudentFilter');
        if (studentFilterInput) {
            studentFilterInput.addEventListener('input', () => updateNoticeTargetOptions('specific_student', true));
        }
    }
}

function createBentoBox(title, content, className = 'md:col-span-1') {
    return `
        <div class="bento-box ${className}">
            <h3 class="text-lg font-semibold mb-3 text-gray-700">${title}</h3>
            ${content}
        </div>
    `;
}

function renderAdminDashboard() {
    const totalUsers = allUsers.length;
    const totalProjects = allProjects.length;
    const recentActivity = allNotices.filter(n => ['all', 'all_students', 'all_supervisors'].includes(n.audience_type)).slice(0,2).map(n => `<p class="text-sm text-gray-600 mb-1 truncate" title="${n.content}">${n.title} <span class="text-xs text-gray-400">- ${new Date(n.notice_date).toLocaleDateString()}</span></p>`).join('');

    return `
        <h1 class="text-3xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${createBentoBox('Quick Stats', `
                <p class="text-gray-600"><span class="font-bold text-2xl text-blue-600">${totalUsers}</span> Total Users</p>
                <p class="text-gray-600"><span class="font-bold text-2xl text-blue-600">${totalProjects}</span> Total Projects</p>
            `)}
            ${createBentoBox('Quick Actions', `
                <button onclick="openUserModal()" class="btn btn-primary w-full mb-2">Create New User</button>
                <button onclick="openProjectModal()" class="btn btn-primary w-full mb-2">Create New Project</button>
                <button onclick="openNoticeModal()" class="btn btn-primary w-full">Post Notice</button>
            `)}
             ${createBentoBox('Recent General Notices', recentActivity || '<p class="text-sm text-gray-500">No recent general notices.</p>', 'md:col-span-1 lg:col-span-1')}
            ${createBentoBox('System Management', `
                <p class="text-gray-600 mb-2">Manage core components of the system.</p>
                <button onclick="navigateTo('manageAdmins')" class="text-sm text-blue-600 hover:underline">Manage Admins &rarr;</button><br>
                <button onclick="navigateTo('manageSupervisors')" class="text-sm text-blue-600 hover:underline">Manage Supervisors &rarr;</button><br>
                <button onclick="navigateTo('manageStudents')" class="text-sm text-blue-600 hover:underline">Manage Students &rarr;</button><br>
                <button onclick="navigateTo('manageSemesters')" class="text-sm text-blue-600 hover:underline">Manage Semesters &rarr;</button>
            `, 'md:col-span-2 lg:col-span-3')}
        </div>
    `;
}

function renderUserManagementPage(title, roleFilter) {
    const users = allUsers.filter(user => user.role === roleFilter);
    let tableRows = users.map(user => `
        <tr class="hover:bg-gray-50 border-b border-gray-200">
            <td class="py-3 px-4 text-sm text-gray-700">${user.name}</td>
            <td class="py-3 px-4 text-sm text-gray-700">${user.email}</td>
            <td class="py-3 px-4 text-sm text-gray-500">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
            ${roleFilter === 'student' ? `<td class="py-3 px-4 text-sm text-gray-500">${user.roll_number || 'N/A'}</td><td class="py-3 px-4 text-sm text-gray-500">${user.semester || 'N/A'}</td>` : ''}
            <td class="py-3 px-4 text-sm">
                <button onclick="openUserModal('${user.user_id}')" class="text-blue-600 hover:text-blue-800 font-medium mr-2">Edit</button>
                <button onclick="deleteUser('${user.user_id}')" class="text-red-600 hover:text-red-800 font-medium">Delete</button>
            </td>
        </tr>
    `).join('');

    if (users.length === 0) {
        tableRows = `<tr><td colspan="${roleFilter === 'student' ? 6 : 4}" class="text-center py-4 text-gray-500">No ${title.toLowerCase()} found.</td></tr>`;
    }

    const studentHeaders = roleFilter === 'student' ?
        `<th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll</th>
         <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>` : '';

    return `
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-gray-800">Manage ${title}</h1>
            <button onclick="openUserModal(null, '${roleFilter}')" class="btn btn-primary">Add New ${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}</button>
        </div>
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <table class="min-w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        ${studentHeaders}
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

function renderProjectManagementPage() { // Admin view of projects
    let projectCards = allProjects.map(project => {
        const supervisor = allUsers.find(u => u.user_id === project.supervisor_id);
        const leader = allUsers.find(u => u.user_id === project.leader_id);
        const studentNames = project.students.map(sid => {
            const student = allUsers.find(u => u.user_id === sid);
            return student ? `${student.name}${student.user_id === project.leader_id ? ' <span class="text-xs bg-green-100 text-green-700 px-1 rounded-full">Leader</span>' : ''}` : 'Unknown';
        }).join(', ') || 'No students assigned';

        return `
            <div class="bento-box">
                <h4 class="text-xl font-semibold text-blue-600">${project.title}</h4>
                <p class="text-sm text-gray-500 mb-1">Supervisor: ${supervisor ? supervisor.name : 'N/A'}</p>
                <p class="text-sm text-gray-500 mb-1">Semester: ${project.semester || 'N/A'}</p>
                <p class="text-sm text-gray-500 mb-1">Leader: ${leader ? leader.name : 'Not Set'}</p>
                <p class="text-sm text-gray-600 mb-2 h-12 overflow-y-auto">${project.description}</p>
                <p class="text-sm text-gray-500 mb-1">Status: <span class="font-medium ${project.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'}">${project.status}</span></p>
                <p class="text-xs text-gray-500 mb-3">Team: ${studentNames}</p>
                <div class="flex justify-end space-x-2 mt-2">
                    <button onclick="openAssignStudentsModal('${project.project_id}')" class="text-sm btn bg-green-500 hover:bg-green-600 text-white py-1 px-3">Manage Team</button>
                    <button onclick="openProjectModal('${project.project_id}')" class="text-sm btn btn-secondary py-1 px-3">Edit Project</button>
                    <button onclick="deleteProject('${project.project_id}')" class="text-sm btn btn-danger py-1 px-3">Delete</button>
                </div>
            </div>
        `;
    }).join('');

     if (allProjects.length === 0) {
        projectCards = `<p class="text-center py-4 text-gray-500 col-span-full">No projects found.</p>`;
    }

    return `
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-gray-800">Manage Projects</h1>
            <button onclick="openProjectModal()" class="btn btn-primary">Create New Project</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${projectCards}
        </div>
    `;
}

function renderManageSemestersPage() {
    let semesterSections = presetSemesters.map(semester => {
        const studentsInSemester = allUsers.filter(u => u.role === 'student' && u.semester === semester);
        const projectsInSemester = allProjects.filter(p => p.semester === semester);

        let studentListHtml = studentsInSemester.length > 0 ?
            studentsInSemester.map(s => `
                <li class="list-item">
                    <span>${s.name} (${s.roll_number || 'N/A'}) - Project: ${s.project_id ? (allProjects.find(p=>p.project_id === s.project_id)?.title || 'N/A') : 'None'}</span>
                    <button onclick="openUserModal('${s.user_id}')" class="text-xs btn btn-secondary py-1 px-2">Edit</button>
                </li>`).join('') :
            '<li class="text-sm text-gray-500">No students in this semester.</li>';

        let projectListHtml = projectsInSemester.length > 0 ?
            projectsInSemester.map(p => `
                <li class="list-item">
                    <span>${p.title} (Supervisor: ${allUsers.find(u=>u.user_id === p.supervisor_id)?.name || 'N/A'})</span>
                    <button onclick="navigateTo('manageProjects'); setTimeout(() => openProjectModal('${p.project_id}'), 100);" class="text-xs btn btn-secondary py-1 px-2">View/Edit</button>
                </li>`).join('') :
            '<li class="text-sm text-gray-500">No projects in this semester.</li>';


        return `
            <div class="bento-box mb-6">
                <h3 class="text-xl font-semibold text-blue-700 mb-3">${semester}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-md font-semibold text-gray-600 mb-2">Students:</h4>
                        <ul class="space-y-1">${studentListHtml}</ul>
                    </div>
                    <div>
                        <h4 class="text-md font-semibold text-gray-600 mb-2">Projects:</h4>
                        <ul class="space-y-1">${projectListHtml}</ul>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <h1 class="text-3xl font-bold mb-6 text-gray-800">Manage Semesters</h1>
        ${semesterSections}
    `;
}


function renderNoticesPage() {
    let relevantNotices = allNotices.filter(notice => {
        const aud = notice.audience_type;
        if (aud === 'all') return true;
        if (currentUser.role === 'admin') return true;

        if (aud === 'all_students' && currentUser.role === 'student') return true;
        if (aud === 'all_supervisors' && currentUser.role === 'supervisor') return true;

        if (aud === 'specific_student' && notice.target_id === currentUser.id) return true;
        if (aud === 'specific_supervisor' && notice.target_id === currentUser.id) return true;

        if (aud === 'specific_project') {
            if (currentUser.role === 'student') {
                const studentUser = allUsers.find(u => u.user_id === currentUser.id);
                return studentUser && studentUser.project_id === notice.target_id;
            }
            if (currentUser.role === 'supervisor') {
                const project = allProjects.find(p => p.project_id === notice.target_id);
                return project && project.supervisor_id === currentUser.id;
            }
        }
        if (aud === 'specific_semester_students' && currentUser.role === 'student') {
            const studentUser = allUsers.find(u => u.user_id === currentUser.id);
            return studentUser && studentUser.semester === notice.target_id;
        }
         if (aud === 'specific_semester_students' && currentUser.role === 'supervisor') { // Supervisors might want to see notices sent to semesters they teach in
            return allProjects.some(p => p.supervisor_id === currentUser.id && p.semester === notice.target_id);
         }


        if (currentUser.role === 'supervisor' && notice.author_id === currentUser.id) return true; // Check author_id, not authorName

        return false;
    }).sort((a,b) => new Date(b.notice_date) - new Date(a.notice_date));

    let noticeItems = relevantNotices.map(notice => {
        let audienceDisplay = `Audience: ${notice.audience_type.replace(/_/g, ' ')}`;
        if (notice.target_id) {
            let targetName = '';
            if (notice.audience_type === 'specific_student' || notice.audience_type === 'specific_supervisor') {
                targetName = allUsers.find(u => u.user_id === notice.target_id)?.name || 'Unknown';
            } else if (notice.audience_type === 'specific_project') {
                targetName = allProjects.find(p => p.project_id === notice.target_id)?.title || 'Unknown Project';
            } else if (notice.audience_type === 'specific_semester_students') {
                targetName = notice.target_id; // Semester name itself
            }
            audienceDisplay += ` (${targetName})`;
        }
        const authorName = allUsers.find(u => u.user_id === notice.author_id)?.name || 'Unknown';

        return `
        <div class="bento-box mb-4">
            <div class="flex justify-between items-start">
                <h4 class="text-lg font-semibold text-blue-700">${notice.title}</h4>
                ${currentUser.role === 'admin' || (currentUser.role === 'supervisor' && notice.author_id === currentUser.id) ? `
                <div>
                    <button onclick="openNoticeModal('${notice.notice_id}')" class="text-xs text-blue-600 hover:underline mr-2">Edit</button>
                    <button onclick="deleteNotice('${notice.notice_id}')" class="text-xs text-red-600 hover:underline">Delete</button>
                </div>` : ''}
            </div>
            <p class="text-sm text-gray-700 mt-1 mb-2 whitespace-pre-wrap">${notice.content}</p>
            <p class="text-xs text-gray-500">Posted by: ${authorName} on ${new Date(notice.notice_date).toLocaleDateString()} | ${audienceDisplay}</p>
        </div>
    `}).join('');

    if (relevantNotices.length === 0) {
        noticeItems = `<p class="text-center py-4 text-gray-500">No notices found for you.</p>`;
    }

    const canPostNotice = currentUser.role === 'admin' || currentUser.role === 'supervisor';

    return `
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-gray-800">Notices</h1>
            ${canPostNotice ? `<button onclick="openNoticeModal()" class="btn btn-primary">Post New Notice</button>` : ''}
        </div>
        <div>
            ${noticeItems}
        </div>
    `;
}

function renderProfilePage() {
    const user = allUsers.find(u => u.user_id === currentUser.id);
    if (!user) return `<p>Error: User profile not found.</p>`;
    let additionalInfo = '';
    if (user.role === 'student') {
        additionalInfo = `
            <p><strong class="text-gray-600">Roll Number:</strong> ${user.roll_number || 'N/A'}</p>
            <p><strong class="text-gray-600">Semester:</strong> ${user.semester || 'N/A'}</p>
        `;
    }
    return `
        <h1 class="text-3xl font-bold mb-6 text-gray-800">My Profile</h1>
        <div class="bento-box max-w-md mx-auto">
            <div class="space-y-3">
                <p><strong class="text-gray-600">Name:</strong> ${user.name}</p>
                <p><strong class="text-gray-600">Email:</strong> ${user.email}</p>
                <p><strong class="text-gray-600">Role:</strong> ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
                ${additionalInfo}
                <button onclick="openUserModal('${user.user_id}')" class="btn btn-primary mt-4">Edit Profile</button>
            </div>
        </div>
    `;
}

// --- Supervisor Specific Pages ---
function renderSupervisorDashboard() {
    const myProjects = allProjects.filter(p => p.supervisor_id === currentUser.id);
    const myStudentsCount = new Set(myProjects.flatMap(p => p.students)).size;
    const pendingSubmissions = allSubmissions.filter(s => myProjects.some(p=> p.project_id === s.project_id) && s.status === 'Submitted').length;

    return `
        <h1 class="text-3xl font-bold mb-6 text-gray-800">Supervisor Dashboard</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${createBentoBox('My Projects Overview', `
                <p class="text-gray-600"><span class="font-bold text-2xl text-blue-600">${myProjects.length}</span> Active Projects</p>
                <button onclick="navigateTo('supervisorProjects')" class="text-sm text-blue-600 hover:underline mt-2">View My Projects &rarr;</button>
            `)}
            ${createBentoBox('My Students', `
                <p class="text-gray-600"><span class="font-bold text-2xl text-blue-600">${myStudentsCount}</span> Students Supervised</p>
                <button onclick="navigateTo('supervisorStudents')" class="text-sm text-blue-600 hover:underline mt-2">Manage My Students &rarr;</button>
            `)}
            ${createBentoBox('Pending Submissions', `
                <p class="text-600"><span class="font-bold text-2xl text-orange-500">${pendingSubmissions}</span> Submissions to Review</p>
                <button onclick="navigateTo('supervisorSubmissions')" class="text-sm text-blue-600 hover:underline mt-2">Review Submissions &rarr;</button>
            `)}
             ${createBentoBox('Quick Actions', `
                <button onclick="openProjectModal(null, '${currentUser.id}')" class="btn btn-primary w-full mb-2">Create New Project</button>
                <button onclick="openNoticeModal()" class="btn btn-primary w-full">Post Notice</button>
            `)}
        </div>
    `;
}

function renderSupervisorProjectsPage() {
    const myProjects = allProjects.filter(p => p.supervisor_id === currentUser.id);
    let projectCards = myProjects.map(project => {
         const leader = allUsers.find(u => u.user_id === project.leader_id);
         const studentNames = project.students.map(sid => {
            const student = allUsers.find(u => u.user_id === sid);
            return student ? `${student.name}${student.user_id === project.leader_id ? ' <span class="text-xs bg-green-100 text-green-700 px-1 rounded-full">Leader</span>' : ''}` : 'Unknown';
        }).join(', ') || 'No students assigned';


        return `
            <div class="bento-box">
                <h4 class="text-xl font-semibold text-blue-600">${project.title}</h4>
                <p class="text-sm text-gray-500 mb-1">Semester: ${project.semester || 'N/A'}</p>
                <p class="text-sm text-gray-500 mb-1">Leader: ${leader ? leader.name : 'Not Set'}</p>
                <p class="text-sm text-gray-600 mb-2 h-12 overflow-y-auto">${project.description}</p>
                <p class="text-sm text-gray-500 mb-1">Status: <span class="font-medium ${project.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'}">${project.status}</span></p>
                <p class="text-xs text-gray-500 mb-3">Team: ${studentNames}</p>
                <div class="flex justify-between items-center mt-3">
                    <div>
                        <button onclick="openAssignStudentsModal('${project.project_id}')" class="text-sm btn bg-green-500 hover:bg-green-600 text-white py-1 px-3 mr-2">Manage Team</button>
                    </div>
                    <div class="space-x-2">
                        <button onclick="openProjectModal('${project.project_id}')" class="text-sm btn btn-secondary py-1 px-3">Edit Project</button>
                        <button onclick="deleteProject('${project.project_id}')" class="text-sm btn btn-danger py-1 px-3">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
     if (myProjects.length === 0) {
        projectCards = `<p class="text-center py-4 text-gray-500 col-span-full">You have not created or been assigned any projects.</p>`;
    }
    return `
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-gray-800">My Projects</h1>
            <button onclick="openProjectModal(null, '${currentUser.id}')" class="btn btn-primary">Create New Project</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${projectCards}
        </div>
    `;
}

function renderSupervisorStudentsPage() {
    // Students supervised by the current supervisor across all their projects
    const myProjectIds = allProjects.filter(p => p.supervisor_id === currentUser.id).map(p => p.project_id);
    const supervisedStudentIds = new Set();
    myProjectIds.forEach(pid => {
        const project = allProjects.find(p => p.project_id === pid);
        if (project) project.students.forEach(sid => supervisedStudentIds.add(sid));
    });
    const supervisedStudents = Array.from(supervisedStudentIds).map(id => allUsers.find(u => u.user_id === id)).filter(Boolean);


    let tableRows = supervisedStudents.map(student => {
        const project = allProjects.find(p => p.project_id === student.project_id);
        return `
        <tr class="hover:bg-gray-50 border-b border-gray-200">
            <td class="py-3 px-4 text-sm text-gray-700">${student.name}</td>
            <td class="py-3 px-4 text-sm text-gray-700">${student.email}</td>
            <td class="py-3 px-4 text-sm text-gray-700">${student.roll_number || 'N/A'}</td>
            <td class="py-3 px-4 text-sm text-gray-700">${student.semester || 'N/A'}</td>
            <td class="py-3 px-4 text-sm text-gray-700">${project ? project.title : 'N/A'}</td>
            <td class="py-3 px-4 text-sm">
                <button onclick="openUserModal('${student.user_id}')" class="text-blue-600 hover:text-blue-800 font-medium mr-2">Edit</button>
                <button onclick="deleteUser('${student.user_id}')" class="text-red-600 hover:text-red-800 font-medium">Delete</button>
            </td>
        </tr>
    `}).join('');

    if (supervisedStudents.length === 0) {
        tableRows = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No students are currently assigned to your projects.</td></tr>`;
    }

    return `
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-gray-800">My Students</h1>
            <button onclick="openUserModal(null, 'student')" class="btn btn-primary">Add New Student</button>
        </div>
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <table class="min-w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll</th>
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                        <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

function renderSupervisorSubmissionsPage() {
    const myProjectIds = allProjects.filter(p => p.supervisor_id === currentUser.id).map(p => p.project_id);
    const submissionsToReview = allSubmissions.filter(s => myProjectIds.includes(s.project_id));

    let submissionItems = submissionsToReview.map(sub => {
        const project = allProjects.find(p => p.project_id === sub.project_id);
        const student = allUsers.find(u => u.user_id === sub.student_id);
        return `
            <div class="bento-box mb-4">
                <h4 class="text-lg font-semibold">${sub.file_name}</h4>
                <p class="text-sm text-gray-600">Project: ${project?.title || 'N/A'} (Semester: ${project?.semester || 'N/A'})</p>
                <p class="text-sm text-gray-600">Student: ${student?.name || 'N/A'} (Roll: ${student?.roll_number || 'N/A'})</p>
                <p class="text-sm text-gray-500">Submitted: ${new Date(sub.submission_date).toLocaleDateString()}</p>
                <p class="text-sm">Status: <span class="font-medium ${sub.status === 'Reviewed' ? 'text-green-600' : 'text-orange-500'}">${sub.status}</span></p>
                ${sub.feedback ? `<p class="text-sm text-gray-700 mt-2 p-2 bg-gray-100 rounded whitespace-pre-wrap">Feedback: ${sub.feedback}</p>` : ''}
                <div class="mt-3 flex items-center justify-end space-x-2">
                     <a href="${API_BASE_URL}/submissions.php?action=download&id=${sub.submission_id}" class="btn btn-secondary text-sm py-1 px-3">Download</a>
                    ${sub.status === 'Submitted' ? `
                        <textarea id="feedback-${sub.submission_id}" class="input-field w-full flex-grow mr-2" rows="2" placeholder="Enter feedback..."></textarea>
                        <button onclick="submitFeedback('${sub.submission_id}')" class="btn btn-primary text-sm py-1 px-3">Submit Feedback</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    if (submissionsToReview.length === 0) {
        submissionItems = `<p class="text-center py-4 text-gray-500">No submissions to review at this time.</p>`;
    }

    return `
        <h1 class="text-3xl font-bold mb-6 text-gray-800">Review Submissions</h1>
        <div>${submissionItems}</div>
    `;
}

// --- Student Specific Pages ---
function renderStudentDashboard() {
    const myProject = allProjects.find(p => p.students.includes(currentUser.id));
    const mySubmissionsCount = allSubmissions.filter(s => s.student_id === currentUser.id).length;

    const studentUser = allUsers.find(u => u.user_id === currentUser.id);
    const relevantNoticesCount = allNotices.filter(n => {
        const aud = n.audience_type;
        if (aud === 'all') return true;
        if (aud === 'all_students') return true;
        if (aud === 'specific_student' && n.target_id === currentUser.id) return true;
        if (aud === 'specific_project' && studentUser && studentUser.project_id === n.target_id) return true;
        if (aud === 'specific_semester_students' && studentUser && studentUser.semester === n.target_id) return true;
        return false;
    }).length;


    return `
        <h1 class="text-3xl font-bold mb-6 text-gray-800">Student Dashboard</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${createBentoBox('My Project', myProject ? `
                <h4 class="font-semibold text-blue-600">${myProject.title}</h4>
                <p class="text-sm text-gray-500">Semester: ${myProject.semester || 'N/A'}</p>
                <p class="text-sm text-gray-600">${myProject.description.substring(0,80)}...</p>
                <p class="text-sm text-gray-500 mt-1">Status: ${myProject.status}</p>
                ${myProject.leader_id === currentUser.id ? '<p class="text-xs mt-1 font-semibold text-green-600">You are the Project Leader</p>' : ''}
                <button onclick="navigateTo('studentProject')" class="text-sm text-blue-600 hover:underline mt-2">View Project Details &rarr;</button>
            ` : '<p class="text-gray-600">You are not assigned to any project yet.</p>')}
            ${createBentoBox('My Submissions', `
                <p class="text-gray-600"><span class="font-bold text-2xl text-blue-600">${mySubmissionsCount}</span> Total Submissions</p>
                <button onclick="navigateTo('studentSubmissions')" class="text-sm text-blue-600 hover:underline mt-2">View My Submissions &rarr;</button>
            `)}
            ${createBentoBox('Relevant Notices', `
                <p class="text-gray-600"><span class="font-bold text-2xl text-blue-600">${relevantNoticesCount}</span> Notices for you</p>
                 <button onclick="navigateTo('viewNotices')" class="text-sm text-blue-600 hover:underline mt-2">View All Notices &rarr;</button>
            `)}
        </div>
    `;
}

function renderStudentProjectPage() {
    const myProject = allProjects.find(p => p.students.includes(currentUser.id));
    if (!myProject) return `<h1 class="text-2xl font-semibold">My Project</h1><p>You are not currently assigned to a project.</p>`;

    const supervisor = allUsers.find(u => u.user_id === myProject.supervisor_id);
    const leader = allUsers.find(u => u.user_id === myProject.leader_id);
    const teamMembers = myProject.students.map(sid => {
        const member = allUsers.find(u => u.user_id === sid);
        return member ? `${member.name}${myProject.leader_id === sid ? ' <span class="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded-full">Leader</span>' : ''}` : 'Unknown';
    }).join(', ');

    return `
        <h1 class="text-3xl font-bold mb-6 text-gray-800">My Project: ${myProject.title}</h1>
        <div class="bento-box">
            <h3 class="text-xl font-semibold mb-2 text-gray-700">Project Details</h3>
            <p class="text-gray-600 mb-1"><strong class="text-gray-600">Semester:</strong> ${myProject.semester || 'N/A'}</p>
            <p class="text-gray-600 mb-4 whitespace-pre-wrap">${myProject.description}</p>
            <p><strong class="text-gray-600">Supervisor:</strong> ${supervisor ? supervisor.name : 'N/A'}</p>
            <p><strong class="text-gray-600">Leader:</strong> ${leader ? leader.name : 'Not Set'}</p>
            <p><strong class="text-gray-600">Status:</strong> <span class="font-medium ${myProject.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'}">${myProject.status}</span></p>
            <p class="mt-2"><strong class="text-gray-600">Team Members:</strong> ${teamMembers}</p>
        </div>
        <div class="bento-box mt-6">
            <h3 class="text-xl font-semibold mb-3 text-gray-700">Submit Work</h3>
            <form id="submissionForm" class="space-y-3">
                <div>
                    <label for="submissionFile" class="block text-sm font-medium text-gray-700">Upload File</label>
                    <input type="file" id="submissionFile" name="submissionFile" class="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required>
                </div>
                <button type="submit" class="btn btn-primary">Submit</button>
            </form>
        </div>
    `;
}

function renderStudentSubmissionsPage() {
    const mySubmissions = allSubmissions.filter(s => s.student_id === currentUser.id);
    let submissionItems = mySubmissions.map(sub => {
        const project = allProjects.find(p => p.project_id === sub.project_id);
        return `
            <div class="bento-box mb-4">
                <h4 class="text-lg font-semibold">${sub.file_name}</h4>
                <p class="text-sm text-gray-600">Project: ${project?.title || 'N/A'}</p>
                <p class="text-sm text-gray-500">Submitted: ${new Date(sub.submission_date).toLocaleDateString()}</p>
                <p class="text-sm">Status: <span class="font-medium ${sub.status === 'Reviewed' ? 'text-green-600' : (sub.status === 'Submitted' ? 'text-orange-500' : 'text-gray-500')}">${sub.status}</span></p>
                ${sub.feedback ? `<div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <h5 class="font-semibold text-sm text-blue-700">Feedback:</h5>
                                    <p class="text-sm text-blue-600 whitespace-pre-wrap">${sub.feedback}</p>
                                 </div>`
                               : (sub.status === 'Reviewed' ? '<p class="text-sm text-gray-500 mt-2">No specific feedback provided.</p>' : '')}
            </div>
        `;
    }).join('');

    if (mySubmissions.length === 0) {
        submissionItems = `<p class="text-center py-4 text-gray-500">You have not made any submissions yet.</p>`;
    }
    return `
        <h1 class="text-3xl font-bold mb-6 text-gray-800">My Submissions</h1>
        <div>${submissionItems}</div>
    `;
}


// --- Modal Handling ---
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'noticeModal') {
         document.getElementById('noticeSpecificTargetContainer').style.display = 'none';
         document.getElementById('noticeStudentFilter').style.display = 'none';
         document.getElementById('noticeStudentFilter').value = '';
    }
}

function showMessageModal(title, message) {
    document.getElementById('messageModalTitle').textContent = title;
    document.getElementById('messageModalText').textContent = message;
    openModal('messageModal');
}

// Renamed from toggleStudentFields to toggleRegisterStudentFields to avoid conflict
function toggleRegisterStudentFields() {
    const role = document.getElementById('register-role').value;
    const studentFields = document.getElementById('register-student-fields');
    const rollNumberInput = document.getElementById('register-roll-number');
    const semesterSelect = document.getElementById('register-semester');

    if (role === 'student') {
        studentFields.style.display = 'block';
        rollNumberInput.setAttribute('required', 'true');
        semesterSelect.setAttribute('required', 'true');
    } else {
        studentFields.style.display = 'none';
        rollNumberInput.removeAttribute('required');
        semesterSelect.removeAttribute('required');
        // Clear values when hidden
        rollNumberInput.value = '';
        semesterSelect.value = '';
    }
}

// This is for the User Management Modal (userModal)
function toggleStudentFields() {
    const role = document.getElementById('userRole').value;
    const studentFields = document.getElementById('studentSpecificFields');
    const rollInput = document.getElementById('userRoll');
    const semesterSelect = document.getElementById('userSemester');

    if (role === 'student') {
        studentFields.style.display = 'grid';
        rollInput.setAttribute('required', 'true');
        semesterSelect.setAttribute('required', 'true');
    } else {
        studentFields.style.display = 'none';
        rollInput.removeAttribute('required');
        semesterSelect.removeAttribute('required');
        // Optionally clear values when hidden
        rollInput.value = '';
        semesterSelect.value = '';
    }
}


function populateSemesterDropdown(selectElementId, selectedSemester = null) {
    const selectEl = document.getElementById(selectElementId);
    selectEl.innerHTML = '<option value="">Select Semester</option>'; // Default empty option
    presetSemesters.forEach(sem => {
        const option = document.createElement('option');
        option.value = sem;
        option.textContent = sem;
        if (sem === selectedSemester) {
            option.selected = true;
        }
        selectEl.appendChild(option);
    });
}


async function openUserModal(userId = null, defaultRole = 'student') {
    const form = document.getElementById('userForm');
    form.reset();
    document.getElementById('userId').value = '';
    document.getElementById('userRole').value = defaultRole;
    document.getElementById('userPassword').placeholder = "Leave blank if not changing";
    populateSemesterDropdown('userSemester');


    if (userId) {
        // Fetch user data from API instead of allUsers
        try {
            const user = await fetchData(`users.php?id=${userId}`);
            if (user) {
                document.getElementById('userModalTitle').textContent = 'Edit User';
                document.getElementById('userId').value = user.user_id;
                document.getElementById('userName').value = user.name;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userRole').value = user.role;
                if (user.role === 'student') {
                    document.getElementById('userRoll').value = user.roll_number || '';
                    populateSemesterDropdown('userSemester', user.semester);
                }
            }
        } catch (error) {
            console.error('Error fetching user for edit:', error);
            showMessageModal('Error', 'Could not load user data for editing.');
            return;
        }
    } else {
        document.getElementById('userModalTitle').textContent = 'Create User';
        document.getElementById('userPassword').placeholder = "Required for new user";
    }
    toggleStudentFields();
    openModal('userModal');
}

async function openProjectModal(projectId = null, defaultSupervisorId = null) {
    const form = document.getElementById('projectForm');
    form.reset();
    document.getElementById('projectId').value = '';
    populateSemesterDropdown('projectSemester');


    const supervisorSelect = document.getElementById('projectSupervisor');
    supervisorSelect.innerHTML = '<option value="">Select Supervisor</option>';
    // Fetch supervisors from API
    try {
        const supervisors = allUsers.filter(u => u.role === 'supervisor');
        supervisors.forEach(sup => {
            const option = document.createElement('option');
            option.value = sup.user_id;
            option.textContent = sup.name;
            supervisorSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching supervisors:', error);
        showMessageModal('Error', 'Could not load supervisors.');
        return;
    }


    if (currentUser.role === 'supervisor' && !defaultSupervisorId) {
         supervisorSelect.value = currentUser.id;
    } else if (defaultSupervisorId) {
         supervisorSelect.value = defaultSupervisorId;
    }

    if (projectId) {
        // Fetch project data from API
        try {
            const project = await fetchData(`projects.php?id=${projectId}`);
            if (project) {
                document.getElementById('projectModalTitle').textContent = 'Edit Project';
                document.getElementById('projectId').value = project.project_id;
                document.getElementById('projectTitle').value = project.title;
                document.getElementById('projectDescription').value = project.description;
                populateSemesterDropdown('projectSemester', project.semester);
                if (project.supervisor_id) supervisorSelect.value = project.supervisor_id;
            }
        } catch (error) {
            console.error('Error fetching project for edit:', error);
            showMessageModal('Error', 'Could not load project data for editing.');
            return;
        }
    } else {
        document.getElementById('projectModalTitle').textContent = 'Create Project';
    }
    openModal('projectModal');
}

async function updateNoticeTargetOptions(audienceType = null, isFiltering = false) {
    if (!audienceType) { // If called by onchange event
        audienceType = document.getElementById('noticeAudienceType').value;
    }
    const targetContainer = document.getElementById('noticeSpecificTargetContainer');
    const targetSelect = document.getElementById('noticeSpecificTarget');
    const targetLabel = document.getElementById('noticeSpecificTargetLabel');
    const studentFilterInput = document.getElementById('noticeStudentFilter');

    if (!isFiltering) { // Only clear options if not just filtering
        targetSelect.innerHTML = '';
    }


    let options = [];
    let showTargetSelect = false;
    studentFilterInput.style.display = 'none'; // Hide filter by default

    try {
        switch (audienceType) {
            case 'specific_student':
                targetLabel.textContent = 'Select Student';
                studentFilterInput.style.display = 'block';
                const filterText = studentFilterInput.value.toLowerCase();
                const allStudents = allUsers.filter(u => u.role === 'student');
                options = allStudents.filter(u =>
                                            (u.name.toLowerCase().includes(filterText) || (u.roll_number && u.roll_number.toLowerCase().includes(filterText))))
                                     .map(s => ({ value: s.user_id, text: `${s.name} (${s.roll_number || 'N/A'}) - ${s.semester}` }));
                showTargetSelect = true;
                break;
            case 'specific_supervisor':
                targetLabel.textContent = 'Select Supervisor';
                const allSupervisors = allUsers.filter(u => u.role === 'supervisor');
                options = allSupervisors.map(s => ({ value: s.user_id, text: s.name }));
                showTargetSelect = true;
                break;
            case 'specific_project':
                targetLabel.textContent = 'Select Project/Team';
                options = allProjects.map(p => ({ value: p.project_id, text: `${p.title} (Sem: ${p.semester || 'N/A'})` }));
                showTargetSelect = true;
                break;
            case 'specific_semester_students':
                targetLabel.textContent = 'Select Semester';
                options = presetSemesters.map(sem => ({ value: sem, text: sem }));
                showTargetSelect = true;
                break;
            default:
                showTargetSelect = false;
                break;
        }
    } catch (error) {
        console.error('Error updating notice target options:', error);
        showMessageModal('Error', 'Could not load target options.');
        return;
    }

    // Repopulate select options only if not just filtering an existing list, or if it's the initial population
    if (!isFiltering || targetSelect.options.length === 0 || audienceType !== 'specific_student') {
        targetSelect.innerHTML = ''; // Clear for non-filtering updates or initial student list
         if (options.length > 0) {
            options.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt.value;
                optionEl.textContent = opt.text;
                targetSelect.appendChild(optionEl);
            });
        } else {
             const optionEl = document.createElement('option');
             optionEl.textContent = 'No targets available';
             optionEl.disabled = true;
             targetSelect.appendChild(optionEl);
        }
    } else if (audienceType === 'specific_student' && isFiltering) {
        // For student filtering, selectively update options
        const currentSelectedValue = targetSelect.value;
        targetSelect.innerHTML = ''; // Clear before re-filtering
         if (options.length > 0) {
            options.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt.value;
                optionEl.textContent = opt.text;
                if(opt.value === currentSelectedValue) optionEl.selected = true;
                targetSelect.appendChild(optionEl);
            });
        } else {
             const optionEl = document.createElement('option');
             optionEl.textContent = 'No students match filter';
             optionEl.disabled = true;
             targetSelect.appendChild(optionEl);
        }
    }


    if (showTargetSelect) {
        targetContainer.style.display = 'block';
    } else {
        targetContainer.style.display = 'none';
    }
}


async function openNoticeModal(noticeId = null) {
    const form = document.getElementById('noticeForm');
    form.reset();
    document.getElementById('noticeId').value = '';
    document.getElementById('noticeStudentFilter').value = ''; // Reset filter
    document.getElementById('noticeStudentFilter').style.display = 'none'; // Hide filter initially
    await updateNoticeTargetOptions(); // Ensure options are populated

    if (noticeId) {
        // Fetch notice data from API
        try {
            const notice = await fetchData(`notices.php?id=${noticeId}`);
            if (notice) {
                document.getElementById('noticeModalTitle').textContent = 'Edit Notice';
                document.getElementById('noticeId').value = notice.notice_id;
                document.getElementById('noticeTitle').value = notice.title;
                document.getElementById('noticeContent').value = notice.content;
                document.getElementById('noticeAudienceType').value = notice.audience_type;
                await updateNoticeTargetOptions(notice.audience_type); // Populate targets based on loaded type
                if (notice.target_id) {
                    document.getElementById('noticeSpecificTarget').value = notice.target_id;
                }
            }
        } catch (error) {
            console.error('Error fetching notice for edit:', error);
            showMessageModal('Error', 'Could not load notice data for editing.');
            return;
        }
    } else {
        document.getElementById('noticeModalTitle').textContent = 'Post New Notice';
    }
    openModal('noticeModal');
}

// --- CRUD Operations (API Calls) ---
document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value;
    const roll_number = document.getElementById('userRoll').value;
    const semester = document.getElementById('userSemester').value;

    const userData = { name, email, role };
    if (password) userData.password = password;
    if (role === 'student') {
        userData.roll_number = roll_number;
        userData.semester = semester;
    }

    try {
        if (id) {
            // Update existing user
            await fetchData(`users.php?id=${id}`, 'PUT', userData);
            showMessageModal('Success', 'User updated successfully!');
        } else {
            // Create new user
            if (!password) {
                showMessageModal('Error', 'Password is required for new users.');
                return;
            }
            await fetchData('users.php', 'POST', userData);
            showMessageModal('Success', 'User created successfully!');
        }
        closeModal('userModal');
        await fetchAllData(); // Refresh all data after successful operation
        refreshCurrentPage();
    } catch (error) {
        // Error handled by fetchData
    }
});

document.getElementById('projectForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('projectId').value;
    const title = document.getElementById('projectTitle').value;
    const description = document.getElementById('projectDescription').value;
    const supervisor_id = document.getElementById('projectSupervisor').value;
    const semester = document.getElementById('projectSemester').value;

    if (!supervisor_id) {
        showMessageModal('Error', 'Please assign a supervisor to the project.');
        return;
    }
    if (!semester) {
        showMessageModal('Error', 'Please select a semester for the project.');
        return;
    }

    const projectData = { title, description, supervisor_id, semester };

    try {
        if (id) {
            // Update existing project
            await fetchData(`projects.php?id=${id}`, 'PUT', projectData);
            showMessageModal('Success', 'Project updated successfully!');
        } else {
            // Create new project
            projectData.status = 'Planning'; // Default status for new projects
            await fetchData('projects.php', 'POST', projectData);
            showMessageModal('Success', 'Project created successfully!');
        }
        closeModal('projectModal');
        await fetchAllData();
        refreshCurrentPage();
    } catch (error) {
        // Error handled by fetchData
    }
});

document.getElementById('noticeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('noticeId').value;
    const title = document.getElementById('noticeTitle').value;
    const content = document.getElementById('noticeContent').value;
    const audience_type = document.getElementById('noticeAudienceType').value;
    const specificTargetEl = document.getElementById('noticeSpecificTarget');
    const target_id = specificTargetEl.value;

    let noticeData = { title, content, audience_type, notice_date: new Date().toISOString().split('T')[0], author_id: currentUser.id };

    if (['specific_student', 'specific_supervisor', 'specific_project', 'specific_semester_students'].includes(audience_type)) {
        if (!target_id && specificTargetEl.options.length > 0 && !specificTargetEl.options[0].disabled) {
            showMessageModal('Error', 'Please select a specific target for this audience type.');
            return;
        } else if (specificTargetEl.options.length === 0 || specificTargetEl.options[0].disabled) {
             showMessageModal('Error', 'No valid targets available for the selected audience type.');
            return;
        }
        noticeData.target_id = target_id;
    } else {
        noticeData.target_id = null; // Ensure target_id is null if not specific
    }

    try {
        if (id) {
            // Update existing notice
            await fetchData(`notices.php?id=${id}`, 'PUT', noticeData);
            showMessageModal('Success', 'Notice updated successfully!');
        } else {
            // Post new notice
            await fetchData('notices.php', 'POST', noticeData);
            showMessageModal('Success', 'Notice posted successfully!');
        }
        closeModal('noticeModal');
        await fetchAllData();
        refreshCurrentPage();
    } catch (error) {
        // Error handled by fetchData
    }
});

function handleStudentSubmission(e) {
    e.preventDefault();
    const fileInput = document.getElementById('submissionFile');
    const myProject = allProjects.find(p => p.students.includes(currentUser.id));

    if (fileInput.files.length > 0 && myProject) {
        const fileName = fileInput.files[0].name;
        const formData = new FormData();
        formData.append('project_id', myProject.project_id);
        formData.append('student_id', currentUser.id);
        formData.append('file', fileInput.files[0]);

        fetch(`${API_BASE_URL}/submissions.php`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => { throw new Error(errorData.message || `HTTP error! Status: ${response.status}`); });
            }
            return response.json();
        })
        .then(async data => {
            showMessageModal('Success', data.message || `File "${fileName}" submitted successfully!`);
            e.target.reset();
            await fetchAllData();
            refreshCurrentPage();
        })
        .catch(error => {
            console.error('Error submitting file:', error);
            showMessageModal('Error', error.message || 'Failed to submit file.');
        });
    } else if (!myProject) {
         showMessageModal('Error', 'You are not assigned to a project. Cannot submit.');
    } else {
         showMessageModal('Error', 'Please select a file to submit.');
    }
}


async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        await fetchData(`users.php?id=${userId}`, 'DELETE');
        showMessageModal('Success', 'User deleted successfully!');
        await fetchAllData();
        refreshCurrentPage();
    } catch (error) {
        // Error handled by fetchData
    }
}

async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? This will also remove associated students and submissions.')) return;

    try {
        await fetchData(`projects.php?id=${projectId}`, 'DELETE');
        showMessageModal('Success', 'Project deleted successfully!');
        await fetchAllData();
        refreshCurrentPage();
    } catch (error) {
        // Error handled by fetchData
    }
}

async function deleteNotice(noticeId) {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
        await fetchData(`notices.php?id=${noticeId}`, 'DELETE');
        showMessageModal('Success', 'Notice deleted successfully!');
        await fetchAllData();
        refreshCurrentPage();
    } catch (error) {
        // Error handled by fetchData
    }
}

async function submitFeedback(submissionId) {
    const feedbackText = document.getElementById(`feedback-${submissionId}`).value;
    if (feedbackText.trim() === "") {
        showMessageModal('Info', 'Please enter some feedback.');
        return;
    }

    try {
        await fetchData(`submissions.php?id=${submissionId}`, 'PUT', { feedback: feedbackText, status: 'Reviewed' });
        showMessageModal('Success', 'Feedback submitted successfully!');
        await fetchAllData();
        refreshCurrentPage();
    } catch (error) {
        // Error handled by fetchData
    }
}

// --- Team Management Logic ---
async function openAssignStudentsModal(projectId) {
    const project = allProjects.find(p => p.project_id === projectId);
    if (!project) {
        showMessageModal('Error', 'Project not found.');
        return;
    }
    document.getElementById('assignTeamProjectId').value = projectId;
    document.getElementById('assignTeamModalTitle').textContent = `Manage Team: ${project.title}`;

    const currentTeamList = document.getElementById('currentTeamMembersList');
    const availableStudentsList = document.getElementById('availableStudentsList');
    currentTeamList.innerHTML = '';
    availableStudentsList.innerHTML = '';

    // Fetch current team members and available students from API
    try {
        const projectDetails = await fetchData(`projects.php?id=${projectId}`);
        const allStudents = allUsers.filter(u => u.role === 'student');

        // Ensure projectDetails.students is an array, even if empty or null from backend
        const projectStudentsIds = Array.isArray(projectDetails.students) ? projectDetails.students : [];

        const currentTeamMembers = allStudents.filter(s => projectStudentsIds.includes(s.user_id));
        const availableStudents = allStudents.filter(s => s.semester === projectDetails.semester && !s.project_id);

        // Populate current team members
        if (currentTeamMembers.length > 0) {
            currentTeamMembers.forEach(student => {
                const li = document.createElement('li');
                li.className = 'list-item';
                li.innerHTML = `
                    <span>${student.name} (${student.roll_number || 'N/A'}) ${projectDetails.leader_id === student.user_id ? '<span class="text-xs bg-green-100 text-green-700 px-1 rounded-full ml-1">Leader</span>' : ''}</span>
                    <div class="list-item-action">
                        ${projectDetails.leader_id !== student.user_id ? `<button type="button" onclick="setProjectLeader('${projectId}', '${student.user_id}')" class="text-xs btn btn-primary py-1 px-2">Set Leader</button>` : ''}
                        <button type="button" onclick="removeStudentFromProject('${projectId}', '${student.user_id}')" class="text-xs btn btn-danger py-1 px-2">Remove</button>
                    </div>
                `;
                currentTeamList.appendChild(li);
            });
        } else {
            currentTeamList.innerHTML = '<p class="text-sm text-gray-500 p-2">No students currently in this team.</p>';
        }

        // Populate available students
        if (availableStudents.length > 0) {
            availableStudents.forEach(student => {
                 const li = document.createElement('li');
                 li.className = 'list-item';
                 li.innerHTML = `
                    <span>${student.name} (${student.roll_number || 'N/A'})</span>
                    <button type="button" onclick="addStudentToProject('${projectId}', '${student.user_id}')" class="text-xs btn btn-primary py-1 px-2">Add to Team</button>
                 `;
                 availableStudentsList.appendChild(li);
            });
        } else {
            availableStudentsList.innerHTML = '<p class="text-sm text-gray-500 p-2">No available students in this semester or all are assigned.</p>';
        }
        openModal('assignTeamModal');
    } catch (error) {
        console.error('Error fetching team data:', error);
        showMessageModal('Error', 'Could not load team management data.');
    }
}

async function setProjectLeader(projectId, studentId) {
    try {
        await fetchData(`projects.php?id=${projectId}`, 'PUT', { leader_id: studentId });
        showMessageModal('Success', `${allUsers.find(u=>u.user_id===studentId).name} is now the project leader.`);
        closeModal('assignTeamModal');
        await fetchAllData();
        openAssignStudentsModal(projectId); // Re-open to show updated state
        refreshCurrentPage();
    } catch (error) {
        // Error handled by fetchData
    }
}

async function addStudentToProject(projectId, studentId) {
    try {
        await fetchData(`projects.php?id=${projectId}&action=add_member`, 'PUT', { student_id: studentId });
        showMessageModal('Success', `${allUsers.find(u=>u.user_id===studentId).name} added to project.`);
        await fetchAllData();
        openAssignStudentsModal(projectId); // Refresh modal content
    } catch (error) {
        // Error handled by fetchData
    }
}

async function removeStudentFromProject(projectId, studentId) {
    try {
        await fetchData(`projects.php?id=${projectId}&action=remove_member`, 'PUT', { student_id: studentId });
        showMessageModal('Success', `${allUsers.find(u=>u.user_id===studentId).name} removed from project.`);
        await fetchAllData();
        openAssignStudentsModal(projectId); // Refresh modal content
    } catch (error) {
        // Error handled by fetchData
    }
}


async function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showMessageModal('Success', 'Logged out successfully!');
    showLoginRegisterView();
    // After logout, ensure the URL hash is cleared
    history.pushState(null, '', window.location.pathname);
}

async function refreshCurrentPage() {
    // Re-fetch all data before refreshing the current view
    await fetchAllData();

    // Get current page ID from URL hash
    const currentPageId = window.location.hash.substring(1);

    if (currentPageId) {
        // Call navigateTo with pushState=false to avoid adding duplicate history entry
        navigateTo(currentPageId, false);
    } else if (currentUser && navItems[currentUser.role] && navItems[currentUser.role].length > 0) {
         // If no hash, and user is logged in, default to the first page
         navigateTo(navItems[currentUser.role][0].page, false);
    }
}

// Function to show only login/register views and hide dashboard content
function showLoginRegisterView() {
    document.getElementById('auth-view-container').style.display = 'flex';
    document.getElementById('dashboard-content-area').style.display = 'none';
    document.getElementById('left-panel').style.display = 'none'; // Hide sidebar
    document.getElementById('appFooter').style.display = 'none'; // Hide footer for login/register
    document.getElementById('mainContent').classList.remove('ml-64'); // Remove left margin
    // The actual login/register forms are now loaded into auth-view-container, their visibility is handled there.
}

// Function to show only dashboard content and hide login/register views
function showDashboardView() {
    document.getElementById('auth-view-container').style.display = 'none';
    document.getElementById('dashboard-content-area').style.display = 'block';
    document.getElementById('left-panel').style.display = 'flex'; // Show sidebar
    document.getElementById('appFooter').style.display = 'block'; // Show footer
    document.getElementById('mainContent').classList.add('ml-64'); // Add left margin
}

// --- Fetch all data from backend and update data arrays ---
let allUsers = [];
let allProjects = [];
let allSubmissions = [];
let allNotices = [];

async function fetchAllData() {
    try {
        allUsers = await fetchData('users.php');
        console.log('Users fetched:', allUsers);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        // showMessageModal('Error', 'Failed to load user data.');
    }

    try {
        allProjects = await fetchData('projects.php');
        console.log('Projects fetched:', allProjects);
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        // showMessageModal('Error', 'Failed to load project data.');
    }

    try {
        allSubmissions = await fetchData('submissions.php');
        console.log('Submissions fetched:', allSubmissions);
    } catch (error) {
        console.error('Failed to fetch submissions:', error);
        // showMessageModal('Error', 'Failed to load submission data.');
    }

    try {
        allNotices = await fetchData('notices.php');
        console.log('Notices fetched:', allNotices);
    } catch (error) {
        console.error('Failed to fetch notices:', error);
        // showMessageModal('Error', 'Failed to load notice data.');
    }
}

// --- Navigation Items ---
const navItems = {
    admin: [
        { name: 'Dashboard', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>', page: 'adminDashboard' },
        { name: 'Manage Admins', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 016-6h6a6 6 0 016 6v1h-3M15 21h6m-6-3h6m-6-3h6M9 3V1m6 2V1m-6 4h.01M9 4h.01M15 4h.01M12 4h.01M15 9h.01M12 9h.01M9 9h.01M15 12h.01M12 12h.01M9 12h.01M15 15h.01M12 15h.01M9 15h.01"></path></svg>', page: 'manageAdmins' },
        { name: 'Manage Supervisors', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>', page: 'manageSupervisors' },
        { name: 'Manage Students', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 016-6h6a6 6 0 016 6v1h-3M15 21h6m-6-3h6m-6-3h6M9 3V1m6 2V1m-6 4h.01M9 4h.01M15 4h.01M12 4h.01M15 9h.01M12 9h.01M9 9h.01M15 12h.01M12 12h.01M9 12h.01M15 15h.01M12 15h.01M9 15h.01"></path></svg>', page: 'manageStudents' },
        { name: 'Manage Projects', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>', page: 'manageProjects' },
        { name: 'Manage Semesters', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>', page: 'manageSemesters' },
        { name: 'Notices', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>', page: 'viewNotices' },
    ],
    supervisor: [
        { name: 'Dashboard', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>', page: 'supervisorDashboard' },
        { name: 'My Projects', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>', page: 'supervisorProjects' },
        { name: 'My Students', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 016-6h6a6 6 0 016 6v1h-3M15 21h6m-6-3h6m-6-3h6M9 3V1m6 2V1m-6 4h.01M9 4h.01M15 4h.01M12 4h.01M15 9h.01M12 9h.01M9 9h.01M15 12h.01M12 12h.01M9 12h.01M15 15h.01M12 15h.01M9 15h.01"></path></svg>', page: 'supervisorStudents' },
        { name: 'Submissions', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>', page: 'supervisorSubmissions' },
        { name: 'Notices', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>', page: 'viewNotices' },
    ],
    student: [
        { name: 'Dashboard', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>', page: 'studentDashboard' },
        { name: 'My Project', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>', page: 'studentProject' },
        { name: 'My Submissions', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>', page: 'studentSubmissions' },
        { name: 'Notices', icon: '<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>', page: 'viewNotices' },
    ]
};

// Function to load HTML partials
async function loadHtmlPartial(containerId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        document.getElementById(containerId).innerHTML = html;
        console.log(`Loaded ${filePath} into ${containerId}`);
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
        // Optionally display a user-friendly error message
    }
}

// Initial check on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Load all HTML partials
    await loadHtmlPartial('sidebar-container', './partials/sidebar.html');
    await loadHtmlPartial('modals-container', './partials/modals.html');
    await loadHtmlPartial('auth-view-container', './partials/auth.html');
    await loadHtmlPartial('content-sections-container', './partials/content_sections.html');


    // Populate semester dropdown for registration form (now in auth.html)
    populateSemesterDropdown('register-semester');

    // Fetch initial data from backend
    await fetchAllData();

    // Check for stored user
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        // Re-fetch current user from backend to get latest data
        try {
            const fetchedUser = await fetchData(`users.php?id=${currentUser.id}`);
            if (fetchedUser) {
                currentUser = {
                    id: fetchedUser.user_id,
                    name: fetchedUser.name,
                    email: fetchedUser.email,
                    role: fetchedUser.role,
                    roll: fetchedUser.roll_number,
                    semester: fetchedUser.semester,
                    projectId: fetchedUser.project_id,
                    teamId: fetchedUser.project_id
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Update localStorage
                showDashboardView();
                renderSidebar(); // Render sidebar based on logged-in user

                // After rendering sidebar, navigate to the page specified in the URL hash, or default
                const initialPageId = window.location.hash.substring(1);
                if (initialPageId && navItems[currentUser.role].some(item => item.page === initialPageId)) {
                    navigateTo(initialPageId, false); // false to avoid adding to history on initial load
                } else if (navItems[currentUser.role] && navItems[currentUser.role].length > 0) {
                    navigateTo(navItems[currentUser.role][0].page, true); // Default to first page, push to history
                }

            } else {
                // User not found in backend, clear local storage and show login
                localStorage.removeItem('currentUser');
                currentUser = null;
                showLoginRegisterView();
                history.replaceState(null, '', window.location.pathname); // Clear hash on logout/failed re-auth
            }
        } catch (error) {
            console.error('Error re-fetching current user on load:', error);
            localStorage.removeItem('currentUser');
            currentUser = null;
            showMessageModal('Error', 'Failed to re-authenticate. Please log in again.');
            showLoginRegisterView();
            history.replaceState(null, '', window.location.pathname); // Clear hash on logout/failed re-auth
        }
    } else {
        showLoginRegisterView(); // Show login/register if no user
        history.replaceState(null, '', window.location.pathname); // Clear hash if not logged in
    }

    // Event listener for browser back/forward buttons
    window.onpopstate = async () => {
        if (currentUser) { // Only navigate if logged in
            const pageIdFromHash = window.location.hash.substring(1);
            if (pageIdFromHash && navItems[currentUser.role].some(item => item.page === pageIdFromHash)) {
                await navigateTo(pageIdFromHash, false); // false to avoid adding to history again
            } else if (navItems[currentUser.role] && navItems[currentUser.role].length > 0) {
                // If hash is invalid or empty, navigate to default page (replace current history entry)
                navigateTo(navItems[currentUser.role][0].page, false);
            }
        } else {
            // If not logged in and popstate occurs, ensure login view is shown
            showLoginRegisterView();
        }
    };

    // Event listeners for login/register view switching (now attached after auth.html is loaded)
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('register-view').style.display = 'flex';
        toggleRegisterStudentFields(); // Initialize student fields visibility
        history.pushState(null, '', '#register'); // Update URL for register view
    });

    document.getElementById('show-login-from-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-view').style.display = 'none';
        document.getElementById('login-view').style.display = 'flex';
        history.pushState(null, '', '#login'); // Update URL for login view
    });

    // Login Form Submission (now attached after auth.html is loaded)
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetchData('users.php?action=login', 'POST', { email, password });
            if (response.success) {
                currentUser = {
                    id: response.user.user_id,
                    name: response.user.name,
                    email: response.user.email,
                    role: response.user.role,
                    roll: response.user.roll_number,
                    semester: response.user.semester,
                    projectId: response.user.project_id,
                    teamId: response.user.project_id
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showMessageModal('Success', 'Logged in successfully!');
                showDashboardView();
                renderSidebar();
                // Navigate to the first page after successful login, add to history
                if (navItems[currentUser.role] && navItems[currentUser.role].length > 0) {
                    navigateTo(navItems[currentUser.role][0].page, true);
                }
            } else {
                showMessageModal('Login Failed', response.message || 'Invalid email or password.');
            }
        } catch (error) {
            // Error handled by fetchData, but can add specific login error message here if needed
        }
    });

    // Register Form Submission (now attached after auth.html is loaded)
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const role = document.getElementById('register-role').value;
        const roll_number = document.getElementById('register-roll-number').value;
        const semester = document.getElementById('register-semester').value;

        if (password !== confirmPassword) {
            showMessageModal('Registration Error', 'Passwords do not match.');
            return;
        }

        const newUser = {
            name,
            email,
            password,
            role,
            roll_number: role === 'student' ? roll_number : null,
            semester: role === 'student' ? semester : null,
        };

        try {
            const response = await fetchData('users.php', 'POST', newUser);
            if (response.success) {
                showMessageModal('Success', 'Registration successful! You can now log in.');
                document.getElementById('register-form').reset();
                showLoginRegisterView(); // Go back to login
                history.pushState(null, '', '#login'); // Update URL to login view
            } else {
                showMessageModal('Registration Error', response.message || 'Failed to register user.');
            }
        } catch (error) {
            // Error handled by fetchData
        }
    });

    // Attach form submission listeners for modals (userForm, projectForm, noticeForm)
    // These need to be re-attached because the modals are now loaded dynamically.
    // Ensure these elements exist before attaching listeners.
    const userForm = document.getElementById('userForm');
    if (userForm) userForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('userId').value;
        const name = document.getElementById('userName').value;
        const email = document.getElementById('userEmail').value;
        const role = document.getElementById('userRole').value;
        const password = document.getElementById('userPassword').value;
        const roll_number = document.getElementById('userRoll').value;
        const semester = document.getElementById('userSemester').value;

        const userData = { name, email, role };
        if (password) userData.password = password;
        if (role === 'student') {
            userData.roll_number = roll_number;
            userData.semester = semester;
        }

        try {
            if (id) {
                await fetchData(`users.php?id=${id}`, 'PUT', userData);
                showMessageModal('Success', 'User updated successfully!');
            } else {
                if (!password) {
                    showMessageModal('Error', 'Password is required for new users.');
                    return;
                }
                await fetchData('users.php', 'POST', userData);
                showMessageModal('Success', 'User created successfully!');
            }
            closeModal('userModal');
            await fetchAllData();
            refreshCurrentPage();
        } catch (error) {
            console.error('User form submission error:', error);
        }
    });

    const projectForm = document.getElementById('projectForm');
    if (projectForm) projectForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('projectId').value;
        const title = document.getElementById('projectTitle').value;
        const description = document.getElementById('projectDescription').value;
        const supervisor_id = document.getElementById('projectSupervisor').value;
        const semester = document.getElementById('projectSemester').value;

        if (!supervisor_id) {
            showMessageModal('Error', 'Please assign a supervisor to the project.');
            return;
        }
        if (!semester) {
            showMessageModal('Error', 'Please select a semester for the project.');
            return;
        }

        const projectData = { title, description, supervisor_id, semester };

        try {
            if (id) {
                await fetchData(`projects.php?id=${id}`, 'PUT', projectData);
                showMessageModal('Success', 'Project updated successfully!');
            } else {
                projectData.status = 'Planning';
                await fetchData('projects.php', 'POST', projectData);
                showMessageModal('Success', 'Project created successfully!');
            }
            closeModal('projectModal');
            await fetchAllData();
            refreshCurrentPage();
        } catch (error) {
            console.error('Project form submission error:', error);
        }
    });

    const noticeForm = document.getElementById('noticeForm');
    if (noticeForm) noticeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('noticeId').value;
        const title = document.getElementById('noticeTitle').value;
        const content = document.getElementById('noticeContent').value;
        const audience_type = document.getElementById('noticeAudienceType').value;
        const specificTargetEl = document.getElementById('noticeSpecificTarget');
        const target_id = specificTargetEl.value;

        let noticeData = { title, content, audience_type, notice_date: new Date().toISOString().split('T')[0], author_id: currentUser.id };

        if (['specific_student', 'specific_supervisor', 'specific_project', 'specific_semester_students'].includes(audience_type)) {
            if (!target_id && specificTargetEl.options.length > 0 && !specificTargetEl.options[0].disabled) {
                showMessageModal('Error', 'Please select a specific target for this audience type.');
                return;
            } else if (specificTargetEl.options.length === 0 || specificTargetEl.options[0].disabled) {
                 showMessageModal('Error', 'No valid targets available for the selected audience type.');
                return;
            }
            noticeData.target_id = target_id;
        } else {
            noticeData.target_id = null;
        }

        try {
            if (id) {
                await fetchData(`notices.php?id=${id}`, 'PUT', noticeData);
                showMessageModal('Success', 'Notice updated successfully!');
            } else {
                await fetchData('notices.php', 'POST', noticeData);
                showMessageModal('Success', 'Notice posted successfully!');
            }
            closeModal('noticeModal');
            await fetchAllData();
            refreshCurrentPage();
        } catch (error) {
            console.error('Notice form submission error:', error);
        }
    });
});
