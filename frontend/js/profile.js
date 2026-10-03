const API_BASE = "http://127.0.0.1:5000/api";

// Admin button
const adminButton =
document.getElementById("admin-btn");

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


    // Show Admin Dashboard button only for admins
    if (data.role === "admin") {

        adminButton.style.display =
            "inline-block";
    }

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

/*
 * Create the last 7 days.
 * Every day starts with 0 completed tasks.
 */
const days = [];

for (let i = 6; i >= 0; i--) {

    const date = new Date();

    date.setDate(
        date.getDate() - i
    );

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    const dateKey =
        `${year}-${month}-${day}`;

    days.push({
        date: dateKey,
        completed: 0
    });
}


/*
 * Put the backend activity counts
 * into the matching day.
 */
if (activity) {

    activity.forEach(item => {

        const matchingDay =
            days.find(
                day => day.date === item.date
            );

        if (matchingDay) {

            matchingDay.completed =
                item.completed;
        }
    });
}


/*
 * Find the highest number of completed
 * tasks so we can calculate bar heights.
 */
const maxCompleted =
    Math.max(
        ...days.map(
            day => day.completed
        ),
        1
    );


/*
 * Create the graph container.
 */
const chart =
    document.createElement("div");

chart.className =
    "activity-chart";


/*
 * Create one bar for each day.
 */
days.forEach(day => {

    const column =
        document.createElement("div");

    column.className =
        "activity-column";


    const value =
        document.createElement("span");

    value.className =
        "activity-value";

    value.textContent =
        day.completed;


    const barTrack =
        document.createElement("div");

    barTrack.className =
        "activity-bar-track";


    const bar =
        document.createElement("div");

    bar.className =
        "activity-bar";


    const barHeight =
        (day.completed / maxCompleted) * 100;

    bar.style.height =
        `${barHeight}%`;


    const dateObject =
        new Date(
            day.date + "T00:00:00"
        );


    const label =
        document.createElement("span");

    label.className =
        "activity-label";

    label.textContent =
        dateObject.toLocaleDateString(
            "en-US",
            {
                weekday: "short"
            }
        );


    barTrack.appendChild(bar);

    column.append(
        value,
        barTrack,
        label
    );

    chart.appendChild(column);
});


container.appendChild(chart);


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


// Open Admin Dashboard
adminButton.addEventListener("click", () => {


window.location.href = "admin.html";


});

async function initializeProfile() {


await loadProfile();

await loadAnalytics();


}

initializeProfile();
