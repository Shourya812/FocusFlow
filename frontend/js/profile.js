const API_BASE = "http://127.0.0.1:5000/api";


async function loadProfile() {

    try {

        const response = await fetch(
            `${API_BASE}/me`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || "Failed to load profile");
        }

        document.getElementById("profile-name").textContent =
            data.name || "User";

        document.getElementById("profile-email").textContent =
            data.email || "";

        const firstLetter = (data.name || "U")
            .trim()
            .charAt(0)
            .toUpperCase();

        document.getElementById("user-avatar").textContent =
            firstLetter;

    } catch (error) {

        console.error("Profile loading error:", error);

        showError("Unable to load profile information.");
    }
}


async function loadAnalytics() {

    try {

        const response = await fetch(
            `${API_BASE}/analytics`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || "Failed to load analytics");
        }

        document.getElementById("total-tasks").textContent =
            data.total_tasks;

        document.getElementById("completed-tasks").textContent =
            data.completed_tasks;

        document.getElementById("pending-tasks").textContent =
            data.pending_tasks;

        document.getElementById("overdue-tasks").textContent =
            data.overdue_tasks;

        document.getElementById("completion-rate").textContent =
            `${data.completion_rate}%`;

        displayActivity(data.daily_activity);

    } catch (error) {

        console.error("Analytics loading error:", error);

        showError("Unable to load analytics.");
    }
}


function displayActivity(activity) {

    const container =
        document.getElementById("activity-container");

    container.innerHTML = "";

    if (!activity || activity.length === 0) {

        container.innerHTML =
            `<p class="loading-text">
                No completed tasks in the last 7 days.
            </p>`;

        return;
    }

    activity.forEach(day => {

        const row = document.createElement("div");

        row.className = "activity-row";

        row.innerHTML = `
            <span>${day.date}</span>
            <strong>${day.completed}</strong>
        `;

        container.appendChild(row);
    });
}


function showError(message) {

    const errorElement =
        document.getElementById("error-message");

    errorElement.textContent = message;
}


document
    .getElementById("dashboard-btn")
    .addEventListener("click", () => {

        window.location.href = "index.html";

    });


async function initializeProfile() {

    await loadProfile();

    await loadAnalytics();

}


initializeProfile();