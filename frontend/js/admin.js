const totalUsersElement = document.getElementById("total-users");
const totalTasksElement = document.getElementById("total-tasks");
const completedTasksElement = document.getElementById("completed-tasks");
const pendingTasksElement = document.getElementById("pending-tasks");

const usersContainer = document.getElementById("users-container");
const errorMessage = document.getElementById("error-message");

const dashboardButton = document.getElementById("dashboard-btn");

async function loadAdminStats() {


try {

    const response = await fetch(
        "http://127.0.0.1:5000/api/admin/stats",
        {
            method: "GET",
            credentials: "include"
        }
    );


    const data = await response.json();


    if (!response.ok) {

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (response.status === 403) {
            errorMessage.textContent =
                "You do not have permission to access the admin dashboard.";

            return;
        }

        throw new Error(
            data.error || "Failed to load admin statistics."
        );
    }


    totalUsersElement.textContent = data.total_users;
    totalTasksElement.textContent = data.total_tasks;
    completedTasksElement.textContent = data.completed_tasks;
    pendingTasksElement.textContent = data.pending_tasks;


    displayRecentUsers(data.recent_users);

} catch (error) {

    console.error("Admin dashboard error:", error);

    errorMessage.textContent =
        "Unable to load admin dashboard data.";

}


}

function displayRecentUsers(users) {


usersContainer.innerHTML = "";


if (users.length === 0) {

    usersContainer.innerHTML = `
        <p class="loading-text">
            No users registered yet.
        </p>
    `;

    return;
}


users.forEach(function(user) {

    const userRow = document.createElement("div");

    userRow.className = "user-row";


    const userName = document.createElement("div");

    userName.className = "user-name";

    userName.textContent = user.name;


    const userEmail = document.createElement("div");

    userEmail.className = "user-email";

    userEmail.textContent = user.email;


    const userDate = document.createElement("div");

    userDate.className = "user-date";

    userDate.textContent = formatDate(user.created_at);


    userRow.appendChild(userName);

    userRow.appendChild(userEmail);

    userRow.appendChild(userDate);


    usersContainer.appendChild(userRow);

});


}

function formatDate(dateString) {


const date = new Date(dateString);


if (Number.isNaN(date.getTime())) {
    return "Unknown date";
}


return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
});


}

dashboardButton.addEventListener("click", function() {


window.location.href = "index.html";


});

loadAdminStats();
