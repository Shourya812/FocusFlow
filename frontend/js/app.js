/* =========================================================
   FOCUSFLOW - DASHBOARD JAVASCRIPT
   ========================================================= */

/*
 * All backend API requests use this base URL.
 * If your Flask server runs on another address or port,
 * update this constant instead of editing every request.
 */
const API_BASE = "http://127.0.0.1:5000/api";


/* =========================================================
   1. INITIAL ELEMENTS AND HERO TEXT
   ========================================================= */

const heroTitle = document.getElementById("hero-title");
const heroSubtitle = document.getElementById("hero-subtitle");

const userNameElement = document.getElementById("user-name");
const taskList = document.getElementById("task-list");

const taskModal = document.getElementById("task-modal");
const addTaskButton = document.getElementById("add-task-btn");
const closeTaskModalButton =
    document.getElementById("close-task-modal");

const taskForm = document.getElementById("task-form");
const taskSubmitButton =
    document.getElementById("task-submit-btn");

const logoutButton = document.getElementById("logout-btn");

/*
 * This variable stores the ID of the task currently
 * being edited.
 *
 * null = creating a new task
 * number = editing an existing task
 */
let editingTaskId = null;

/*
 * Store the currently loaded tasks in memory.
 *
 * This allows the edit button to find the complete
 * task object without making another GET request.
 */
let currentTasks = [];


/* =========================================================
   2. HERO TEXT
   ========================================================= */

if (heroTitle) {
    heroTitle.textContent = "Stay focused. Get things done.";
}

if (heroSubtitle) {
    heroSubtitle.textContent =
        "📝 Organize your work and keep track of your progress.";
}


/* =========================================================
   3. HELPER: READ JSON RESPONSE
   ========================================================= */

/*
 * Some server errors may not return JSON.
 * This helper prevents response parsing from hiding
 * the original HTTP status.
 */
async function readResponse(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}


/* =========================================================
   4. LOAD LOGGED-IN USER
   ========================================================= */

async function loadCurrentUser() {
    try {
        const response = await fetch(`${API_BASE}/me`, {
            method: "GET",
            credentials: "include"
        });

        const data = await readResponse(response);

        if (!response.ok) {
            console.error(
                "Could not load user:",
                response.status,
                data.error
            );

            if (response.status === 401) {
                window.location.href = "login.html";
            }

            return;
        }

        if (userNameElement) {
            userNameElement.textContent = data.name || "User";
        }

        console.log("Logged-in user loaded successfully.");

    } catch (error) {
        console.error("Failed to load current user:", error);
    }
}


/* =========================================================
   5. LOAD TASKS
   ========================================================= */

async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: "GET",
            credentials: "include"
        });

        const data = await readResponse(response);

        if (!response.ok) {
            console.error(
                "Failed to load tasks:",
                response.status,
                data.error
            );

            return;
        }

        if (!Array.isArray(data)) {
            console.error("The tasks API did not return an array.");
            return;
        }

        /*
         * Keep a copy of the tasks so that editTask()
         * can find the selected task.
         */
        currentTasks = data;

        displayTasks(data);

    } catch (error) {
        console.error("Task loading error:", error);
    }
}


/* =========================================================
   6. DATE HELPERS
   ========================================================= */

/*
 * Convert the database datetime string into a Date object.
 *
 * Your database stores values such as:
 * 2026-10-02T18:30
 *
 * Browser Date can understand this format.
 */
function parseTaskDate(dateString) {
    if (!dateString) {
        return null;
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}


/*
 * Return a date in YYYY-MM-DD format.
 *
 * We use local date parts instead of toISOString()
 * because toISOString() converts the date to UTC and
 * can shift the displayed calendar day.
 */
function getDateKey(date) {
    if (!date) {
        return null;
    }

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/*
 * Return today's date key.
 */
function getTodayKey() {
    return getDateKey(new Date());
}


/*
 * Return tomorrow's date key.
 */
function getTomorrowKey() {
    const tomorrow = new Date();

    tomorrow.setDate(
        tomorrow.getDate() + 1
    );

    return getDateKey(tomorrow);
}


/*
 * Format a date as:
 *
 * Monday, October 5
 */
function formatGroupDate(dateKey) {
    const parts = dateKey.split("-");

    const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    return date.toLocaleDateString(
        undefined,
        {
            weekday: "long",
            month: "long",
            day: "numeric"
        }
    );
}


/*
 * Format only the time:
 *
 * 6:00 PM
 */
function formatTime(date) {
    if (!date) {
        return "";
    }

    return date.toLocaleTimeString(
        undefined,
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


/*
 * Friendly deadline text.
 *
 * Examples:
 * Due today, 6:00 PM
 * Due tomorrow, 9:30 AM
 * Due Monday, October 5, 4:00 PM
 * Overdue, Monday, September 28, 6:00 PM
 */
function getDeadlineText(task) {
    if (!task.due_at) {
        return "";
    }

    const dueDate = parseTaskDate(task.due_at);

    if (!dueDate) {
        return "";
    }

    const now = new Date();

    const todayKey = getDateKey(now);
    const tomorrowKey = getTomorrowKey();
    const dueKey = getDateKey(dueDate);

    const timeText = formatTime(dueDate);

    if (
        task.status !== "completed" &&
        dueDate.getTime() < now.getTime()
    ) {
        return `Overdue, ${formatGroupDate(dueKey)}, ${timeText}`;
    }

    if (dueKey === todayKey) {
        return `Due today, ${timeText}`;
    }

    if (dueKey === tomorrowKey) {
        return `Due tomorrow, ${timeText}`;
    }

    return `Due ${formatGroupDate(dueKey)}, ${timeText}`;
}


/*
 * Check whether a task is overdue.
 */
function isTaskOverdue(task) {
    if (
        !task.due_at ||
        task.status === "completed"
    ) {
        return false;
    }

    const dueDate = parseTaskDate(task.due_at);

    if (!dueDate) {
        return false;
    }

    return dueDate.getTime() < new Date().getTime();
}


/* =========================================================
   7. TASK GROUPING
   ========================================================= */

/*
 * Group tasks by their due date.
 *
 * Tasks without a deadline go into:
 * "no-deadline"
 */
function groupTasksByDate(tasks) {
    const groups = {};

    tasks.forEach(task => {
        const dueDate = parseTaskDate(task.due_at);

        let key = "no-deadline";

        if (dueDate) {
            key = getDateKey(dueDate);
        }

        if (!groups[key]) {
            groups[key] = [];
        }

        groups[key].push(task);
    });

    return groups;
}


/*
 * Sort date group keys.
 *
 * Date groups appear chronologically.
 *
 * "no-deadline" is always placed at the bottom.
 */
function sortGroupKeys(keys) {
    return keys.sort((a, b) => {
        if (a === "no-deadline") {
            return 1;
        }

        if (b === "no-deadline") {
            return -1;
        }

        return a.localeCompare(b);
    });
}


/*
 * Create a heading for each date group.
 */
function createDateGroupHeading(dateKey, taskCount) {
    const wrapper = document.createElement("div");

    wrapper.className = "task-date-group";

    const title = document.createElement("h4");

    title.className = "task-date-title";

    if (dateKey === "no-deadline") {
        title.textContent = "No deadline";
    } else if (dateKey === getTodayKey()) {
        title.textContent = "Today";
    } else if (dateKey === getTomorrowKey()) {
        title.textContent = "Tomorrow";
    } else {
        title.textContent = formatGroupDate(dateKey);
    }

    const count = document.createElement("span");

    count.className = "task-date-count";

    count.textContent =
        `${taskCount} ${taskCount === 1 ? "task" : "tasks"}`;

    wrapper.append(title, count);

    return wrapper;
}


/* =========================================================
   8. DISPLAY TASKS AND STATISTICS
   ========================================================= */

function displayTasks(tasks) {
    if (!taskList) {
        console.error("The element #task-list was not found.");
        return;
    }

    const completedCount = tasks.filter(
        task => task.status === "completed"
    ).length;

    const pendingCount = tasks.length - completedCount;

    const totalElement = document.getElementById("total-tasks");
    const completedElement = document.getElementById("completed-tasks");
    const pendingElement = document.getElementById("pending-tasks");

    if (totalElement) {
        totalElement.textContent = tasks.length;
    }

    if (completedElement) {
        completedElement.textContent = completedCount;
    }

    if (pendingElement) {
        pendingElement.textContent = pendingCount;
    }

    taskList.replaceChildren();

    // Show empty state
    if (tasks.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = "✓";

        const eyebrow = document.createElement("p");
        eyebrow.className = "empty-eyebrow";
        eyebrow.textContent = "READY WHEN YOU ARE";

        const heading = document.createElement("h4");
        heading.textContent = "No tasks yet";

        const message = document.createElement("p");
        message.textContent =
            "Add your first task and start making progress.";

        const button = document.createElement("button");
        button.className = "empty-action";
        button.type = "button";
        button.textContent = "Create your first task →";

        button.addEventListener(
            "click",
            openCreateTaskModal
        );

        emptyState.append(
            icon,
            eyebrow,
            heading,
            message,
            button
        );

        taskList.appendChild(emptyState);

        return;
    }

    // Separate tasks by STATUS, not deadline
    const pendingTasks = tasks.filter(
        task => task.status !== "completed"
    );

    const completedTasks = tasks.filter(
        task => task.status === "completed"
    );

    // Sort pending tasks by deadline
    // Tasks without deadlines go to the bottom
    pendingTasks.sort((a, b) => {
        const dateA = parseTaskDate(a.due_at);
        const dateB = parseTaskDate(b.due_at);

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        return dateA - dateB;
    });

    // Sort completed tasks by completion time
    // Most recently completed appears first
    completedTasks.sort((a, b) => {
        const dateA = parseTaskDate(a.completed_at);
        const dateB = parseTaskDate(b.completed_at);

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        return dateB - dateA;
    });

    // Pending section
    if (pendingTasks.length > 0) {
        const pendingHeading = document.createElement("div");
        pendingHeading.className = "task-date-group";

        const pendingTitle = document.createElement("h4");
        pendingTitle.className = "task-date-title";
        pendingTitle.textContent = "Pending";

        const pendingCountText = document.createElement("span");
        pendingCountText.className = "task-date-count";
        pendingCountText.textContent =
            `${pendingTasks.length} ${
                pendingTasks.length === 1 ? "task" : "tasks"
            }`;

        pendingHeading.append(
            pendingTitle,
            pendingCountText
        );

        taskList.appendChild(pendingHeading);

        pendingTasks.forEach(task => {
            taskList.appendChild(
                createTaskCard(task)
            );
        });
    }

    // Completed section
    if (completedTasks.length > 0) {
        const completedHeading = document.createElement("div");
        completedHeading.className = "task-date-group";

        const completedTitle = document.createElement("h4");
        completedTitle.className = "task-date-title";
        completedTitle.textContent = "Completed";

        const completedCountText = document.createElement("span");
        completedCountText.className = "task-date-count";
        completedCountText.textContent =
            `${completedTasks.length} ${
                completedTasks.length === 1 ? "task" : "tasks"
            }`;

        completedHeading.append(
            completedTitle,
            completedCountText
        );

        taskList.appendChild(completedHeading);

        completedTasks.forEach(task => {
            taskList.appendChild(
                createTaskCard(task)
            );
        });
    }
}


/* =========================================================
   9. CREATE TASK CARD
   ========================================================= */

function createTaskCard(task) {
    const isCompleted =
        task.status === "completed";

    const overdue =
        isTaskOverdue(task);

    const card =
        document.createElement("article");

    card.className =
        `task-card ${isCompleted ? "completed-task" : ""} ${overdue ? "overdue-task" : ""}`;


    /*
     * LEFT SIDE
     */
    const left =
        document.createElement("div");

    left.className =
        "task-card-left";


    /*
     * Checkbox.
     */
    const checkbox =
        document.createElement("button");

    checkbox.className =
        `task-checkbox ${isCompleted ? "completed" : ""}`;

    checkbox.dataset.taskId =
        task.id;

    checkbox.type = "button";

    checkbox.setAttribute(
        "aria-label",
        "Toggle task completion"
    );

    checkbox.title =
        isCompleted
            ? "Mark as pending"
            : "Mark as completed";

    checkbox.textContent = "✓";


    /*
     * Task information.
     */
    const info =
        document.createElement("div");

    info.className =
        "task-info";


    /*
     * Title.
     */
    const title =
        document.createElement("h4");

    title.textContent =
        task.title || "Untitled task";


    /*
     * Description.
     */
    const description =
        document.createElement("p");

    description.className =
        "task-description";

    description.textContent =
        task.description || "No description";


    /*
     * Deadline.
     */
    if (task.due_at) {
        const deadline =
            document.createElement("p");

        deadline.className =
            `task-deadline ${overdue ? "deadline-overdue" : ""} ${isCompleted ? "deadline-completed" : ""}`;

        deadline.textContent =
            `◷ ${getDeadlineText(task)}`;

        info.append(
            title,
            description,
            deadline
        );
    } else {
        info.append(
            title,
            description
        );
    }

    // Show when the task was completed
    if (isCompleted && task.completed_at) {
        const completedTime =
            parseTaskDate(task.completed_at);

        if (completedTime) {
            const completedText =
                document.createElement("p");

            completedText.className =
                "task-completed-time";

            completedText.textContent =
                `✓ Completed on ${formatGroupDate(
                    getDateKey(completedTime)
                )}, ${formatTime(completedTime)}`;

            info.appendChild(
                completedText
            );
        }
    }

    left.append(
        checkbox,
        info
    );


    /*
     * RIGHT SIDE
     */
    const right =
        document.createElement("div");

    right.className =
        "task-card-right";


    /*
     * Priority.
     */
    const priority =
        document.createElement("span");

    const allowedPriorities =
        ["low", "medium", "high"];

    const priorityValue =
        allowedPriorities.includes(task.priority)
            ? task.priority
            : "medium";

    priority.className =
        `priority-badge priority-${priorityValue}`;

    priority.textContent =
        priorityValue;


    /*
     * Edit button.
     */
    const editButton =
        document.createElement("button");

    editButton.className =
        "edit-task-btn";

    editButton.dataset.taskId =
        task.id;

    editButton.type =
        "button";

    editButton.setAttribute(
        "aria-label",
        "Edit task"
    );

    editButton.title =
        "Edit task";

    editButton.textContent =
        "✎";


    /*
     * Delete button.
     */
    const deleteButton =
        document.createElement("button");

    deleteButton.className =
        "delete-task-btn";

    deleteButton.dataset.taskId =
        task.id;

    deleteButton.type =
        "button";

    deleteButton.setAttribute(
        "aria-label",
        "Delete task"
    );

    deleteButton.title =
        "Delete task";

    deleteButton.textContent =
        "🗑";


    right.append(
        priority,
        editButton,
        deleteButton
    );


    card.append(
        left,
        right
    );

    return card;
}


/* =========================================================
   10. MODAL OPEN / CLOSE
   ========================================================= */

function openTaskModal() {
    if (!taskModal) {
        console.error(
            "The element #task-modal was not found."
        );

        return;
    }

    taskModal.classList.add("show");

    document.body.style.overflow =
        "hidden";

    const titleInput =
        document.getElementById("task-title");

    if (titleInput) {
        titleInput.focus();
    }
}


/*
 * Open modal specifically for creating a task.
 */
function openCreateTaskModal() {
    editingTaskId = null;

    resetTaskForm();

    updateModalForCreate();

    openTaskModal();
}


/*
 * Close task modal.
 */
function closeTaskModal() {
    if (!taskModal) {
        return;
    }

    taskModal.classList.remove("show");

    document.body.style.overflow = "";

    editingTaskId = null;

    resetTaskForm();
}


/*
 * Reset the form.
 */
function resetTaskForm() {
    if (taskForm) {
        taskForm.reset();
    }

    const dueInput =
        document.getElementById("task-due-date");

    if (dueInput) {
        dueInput.value = "";
    }

    resetCustomDatePicker();
}


/*
 * Update modal text for creating.
 */
function updateModalForCreate() {
    const modalEyebrow =
        document.getElementById("task-modal-eyebrow");

    const modalTitle =
        document.getElementById("task-modal-title");

    const modalSubtitle =
        document.getElementById("task-modal-subtitle");

    if (modalEyebrow) {
        modalEyebrow.textContent =
            "NEW TASK";
    }

    if (modalTitle) {
        modalTitle.textContent =
            "Create a task";
    }

    if (modalSubtitle) {
        modalSubtitle.textContent =
            "Add something you want to get done.";
    }

    if (taskSubmitButton) {
        taskSubmitButton.textContent =
            "Create Task";
    }
}


/*
 * Update modal text for editing.
 */
function updateModalForEdit() {
    const modalEyebrow =
        document.getElementById("task-modal-eyebrow");

    const modalTitle =
        document.getElementById("task-modal-title");

    const modalSubtitle =
        document.getElementById("task-modal-subtitle");

    if (modalEyebrow) {
        modalEyebrow.textContent =
            "EDIT TASK";
    }

    if (modalTitle) {
        modalTitle.textContent =
            "Edit your task";
    }

    if (modalSubtitle) {
        modalSubtitle.textContent =
            "Update the details and keep your plan current.";
    }

    if (taskSubmitButton) {
        taskSubmitButton.textContent =
            "Save Changes";
    }
}


/*
 * Add button.
 */
if (addTaskButton) {
    addTaskButton.addEventListener(
        "click",
        openCreateTaskModal
    );
}


/*
 * Close button.
 */
if (closeTaskModalButton) {
    closeTaskModalButton.addEventListener(
        "click",
        closeTaskModal
    );
}


/*
 * Clicking the dark background closes the modal.
 */
if (taskModal) {
    taskModal.addEventListener(
        "click",
        event => {
            if (event.target === taskModal) {
                closeTaskModal();
            }
        }
    );
}


/*
 * Escape closes the modal.
 */
document.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Escape" &&
            taskModal &&
            taskModal.classList.contains("show")
        ) {
            closeTaskModal();
        }
    }
);


/* =========================================================
   11. CREATE / EDIT TASK
   ========================================================= */

if (taskForm) {
    taskForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const titleInput =
                document.getElementById("task-title");

            const descriptionInput =
                document.getElementById("task-description");

            const priorityInput =
                document.getElementById("task-priority");

            const dueDateInput =
                document.getElementById("task-due-date");


            if (
                !titleInput ||
                !descriptionInput ||
                !priorityInput ||
                !dueDateInput
            ) {
                console.error(
                    "One or more task form fields are missing."
                );

                return;
            }


            const title =
                titleInput.value.trim();

            const description =
                descriptionInput.value.trim();

            const priority =
                priorityInput.value;

            const dueAt =
                dueDateInput.value;


            if (!title) {
                titleInput.focus();
                return;
            }


            if (taskSubmitButton) {
                taskSubmitButton.disabled =
                    true;

                taskSubmitButton.textContent =
                    editingTaskId
                        ? "Saving..."
                        : "Creating...";
            }


            try {
                /*
                 * CREATE
                 */
                if (editingTaskId === null) {
                    const response =
                        await fetch(
                            `${API_BASE}/tasks`,
                            {
                                method: "POST",
                                credentials: "include",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    title,
                                    description,
                                    priority,
                                    due_at:
                                        dueAt || null
                                })
                            }
                        );


                    const data =
                        await readResponse(response);


                    if (!response.ok) {
                        console.error(
                            "Failed to create task:",
                            response.status,
                            data.error
                        );

                        alert(
                            data.error ||
                            "Failed to create task."
                        );

                        return;
                    }
                }


                /*
                 * EDIT
                 */
                else {
                    const response =
                        await fetch(
                            `${API_BASE}/tasks/${editingTaskId}`,
                            {
                                method: "PUT",
                                credentials: "include",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    title,
                                    description,
                                    priority,
                                    due_at:
                                        dueAt || null
                                })
                            }
                        );


                    const data =
                        await readResponse(response);


                    if (!response.ok) {
                        console.error(
                            "Failed to edit task:",
                            response.status,
                            data.error
                        );

                        alert(
                            data.error ||
                            "Failed to update task."
                        );

                        return;
                    }
                }


                /*
                 * Success.
                 */
                closeTaskModal();

                await loadTasks();


            } catch (error) {
                console.error(
                    "Task save error:",
                    error
                );

                alert(
                    "Unable to save the task. Check that the server is running."
                );


            } finally {
                if (taskSubmitButton) {
                    taskSubmitButton.disabled =
                        false;

                    taskSubmitButton.textContent =
                        editingTaskId
                            ? "Save Changes"
                            : "Create Task";
                }
            }
        }
    );
}


/* =========================================================
   12. EDIT TASK
   ========================================================= */

function editTask(taskId) {
    /*
     * Find the selected task from the tasks
     * loaded from the backend.
     */
    const task =
        currentTasks.find(
            item => String(item.id) === String(taskId)
        );


    if (!task) {
        console.error(
            "Could not find task:",
            taskId
        );

        return;
    }


    /*
     * Store the ID.
     */
    editingTaskId =
        task.id;


    /*
     * Change modal into edit mode.
     */
    updateModalForEdit();


    /*
     * Get form fields.
     */
    const titleInput =
        document.getElementById("task-title");

    const descriptionInput =
        document.getElementById("task-description");

    const priorityInput =
        document.getElementById("task-priority");


    /*
     * Fill existing values.
     */
    if (titleInput) {
        titleInput.value =
            task.title || "";
    }

    if (descriptionInput) {
        descriptionInput.value =
            task.description || "";
    }

    if (priorityInput) {
        priorityInput.value =
            task.priority || "medium";
    }


    /*
     * Fill the custom date picker.
     */
    setCustomDatePickerValue(
        task.due_at || ""
    );


    /*
     * Open modal.
     */
    openTaskModal();
}


/* =========================================================
   13. TOGGLE TASK COMPLETION
   ========================================================= */

async function toggleTaskCompletion(
    taskId,
    taskButton
) {
    const wasCompleted =
        taskButton.classList.contains(
            "completed"
        );

    const newStatus =
        wasCompleted
            ? "pending"
            : "completed";


    taskButton.disabled =
        true;


    try {
        const response =
            await fetch(
                `${API_BASE}/tasks/${taskId}`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );


        const data =
            await readResponse(response);


        if (!response.ok) {
            console.error(
                "Failed to update task:",
                response.status,
                data.error
            );

            alert(
                data.error ||
                "Failed to update task."
            );

            return;
        }


        await loadTasks();


    } catch (error) {
        console.error(
            "Task completion error:",
            error
        );

        alert(
            "Unable to update the task."
        );


    } finally {
        taskButton.disabled =
            false;
    }
}


/* =========================================================
   14. DELETE TASK
   ========================================================= */

async function deleteTask(taskId) {
    const confirmed =
        window.confirm(
            "Are you sure you want to delete this task?"
        );


    if (!confirmed) {
        return;
    }


    try {
        const response =
            await fetch(
                `${API_BASE}/tasks/${taskId}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );


        const data =
            await readResponse(response);


        if (!response.ok) {
            console.error(
                "Failed to delete task:",
                response.status,
                data.error
            );

            alert(
                data.error ||
                "Failed to delete task."
            );

            return;
        }


        await loadTasks();


    } catch (error) {
        console.error(
            "Task deletion error:",
            error
        );

        alert(
            "Unable to delete the task."
        );
    }
}


/* =========================================================
   15. TASK BUTTONS - EVENT DELEGATION
   ========================================================= */

/*
 * Task cards are created dynamically.
 *
 * Therefore we use one document-level listener
 * instead of adding separate listeners to every card.
 */
document.addEventListener(
    "click",
    event => {

        /*
         * COMPLETE / UNCOMPLETE
         */
        const checkbox =
            event.target.closest(
                ".task-checkbox"
            );


        if (checkbox) {
            toggleTaskCompletion(
                checkbox.dataset.taskId,
                checkbox
            );

            return;
        }


        /*
         * EDIT
         */
        const editButton =
            event.target.closest(
                ".edit-task-btn"
            );


        if (editButton) {
            editTask(
                editButton.dataset.taskId
            );

            return;
        }


        /*
         * DELETE
         */
        const deleteButton =
            event.target.closest(
                ".delete-task-btn"
            );


        if (deleteButton) {
            deleteTask(
                deleteButton.dataset.taskId
            );
        }
    }
);


/* =========================================================
   16. LOG OUT
   ========================================================= */

if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        async () => {

            logoutButton.disabled =
                true;


            try {
                const response =
                    await fetch(
                        `${API_BASE}/logout`,
                        {
                            method: "POST",
                            credentials: "include"
                        }
                    );


                if (!response.ok) {
                    alert(
                        "Logout failed. Please try again."
                    );

                    return;
                }


                window.location.href =
                    "login.html";


            } catch (error) {
                console.error(
                    "Logout error:",
                    error
                );

                alert(
                    "Unable to contact the server."
                );


            } finally {
                logoutButton.disabled =
                    false;
            }
        }
    );
}


/* =========================================================
   17. CUSTOM DATE PICKER
   ========================================================= */

const dueDateInput =
    document.getElementById("task-due-date");

const datePickerButton =
    document.getElementById("date-picker-button");

const datePickerPanel =
    document.getElementById("date-picker-panel");

const datePickerLabel =
    document.getElementById("date-picker-label");

const calendarMonthLabel =
    document.getElementById("calendar-month-label");

const calendarGrid =
    document.getElementById("calendar-grid");

const previousMonthButton =
    document.getElementById("previous-month");

const nextMonthButton =
    document.getElementById("next-month");

const clearDateButton =
    document.getElementById("clear-date-button");

const saveDateButton =
    document.getElementById("save-date-button");

const selectedTimeInput =
    document.getElementById("task-time-input");


/*
 * The calendar's currently displayed month.
 */
let calendarDisplayDate =
    new Date();


/*
 * The date selected by the user.
 */
let selectedCalendarDate =
    null;


/*
 * Temporary selected hour/minute.
 */
let selectedCalendarTime =
    "12:00";


/*
 * Format selected date for the visible button.
 */
function formatPickerLabel(date, time) {
    if (!date) {
        return "Choose date & time";
    }

    const dateText =
        date.toLocaleDateString(
            undefined,
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );

    if (!time) {
        return dateText;
    }

    const [hours, minutes] =
        time.split(":");

    const temp =
        new Date();

    temp.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
    );

    const timeText =
        temp.toLocaleTimeString(
            undefined,
            {
                hour: "numeric",
                minute: "2-digit"
            }
        );

    return `${dateText} • ${timeText}`;
}


/*
 * Update the visible picker button.
 */
function updateDatePickerLabel() {
    if (!datePickerLabel) {
        return;
    }

    datePickerLabel.textContent =
        formatPickerLabel(
            selectedCalendarDate,
            selectedCalendarTime
        );
}


/*
 * Open custom picker.
 */
function openDatePicker() {
    if (!datePickerPanel) {
        return;
    }

    datePickerPanel.classList.add(
        "open"
    );

    renderCalendar();
}


/*
 * Close custom picker.
 */
function closeDatePicker() {
    if (!datePickerPanel) {
        return;
    }

    datePickerPanel.classList.remove(
        "open"
    );
}


/*
 * Toggle picker.
 */
if (datePickerButton) {
    datePickerButton.addEventListener(
        "click",
        event => {
            event.stopPropagation();

            if (
                datePickerPanel.classList.contains(
                    "open"
                )
            ) {
                closeDatePicker();
            } else {
                openDatePicker();
            }
        }
    );
}


/*
 * Previous month.
 */
if (previousMonthButton) {
    previousMonthButton.addEventListener(
        "click",
        event => {
            event.preventDefault();

            calendarDisplayDate.setMonth(
                calendarDisplayDate.getMonth() - 1
            );

            renderCalendar();
        }
    );
}


/*
 * Next month.
 */
if (nextMonthButton) {
    nextMonthButton.addEventListener(
        "click",
        event => {
            event.preventDefault();

            calendarDisplayDate.setMonth(
                calendarDisplayDate.getMonth() + 1
            );

            renderCalendar();
        }
    );
}


/*
 * Create calendar.
 */
function renderCalendar() {
    if (
        !calendarGrid ||
        !calendarMonthLabel
    ) {
        return;
    }


    const year =
        calendarDisplayDate.getFullYear();

    const month =
        calendarDisplayDate.getMonth();


    calendarMonthLabel.textContent =
        calendarDisplayDate.toLocaleDateString(
            undefined,
            {
                month: "long",
                year: "numeric"
            }
        );


    calendarGrid.replaceChildren();


    /*
     * Day names.
     */
    const dayNames =
        [
            "S",
            "M",
            "T",
            "W",
            "T",
            "F",
            "S"
        ];


    dayNames.forEach(day => {
        const element =
            document.createElement("span");

        element.className =
            "calendar-day-name";

        element.textContent =
            day;

        calendarGrid.appendChild(
            element
        );
    });


    /*
     * First day of month.
     */
    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    /*
     * Number of days.
     */
    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    /*
     * Empty cells before first day.
     */
    for (
        let i = 0;
        i < firstDay;
        i++
    ) {
        const empty =
            document.createElement("span");

        empty.className =
            "calendar-empty";

        calendarGrid.appendChild(
            empty
        );
    }


    /*
     * Actual days.
     */
    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {
        const button =
            document.createElement("button");

        button.type =
            "button";

        button.className =
            "calendar-day";

        button.textContent =
            day;


        const thisDate =
            new Date(
                year,
                month,
                day
            );


        /*
         * Today marker.
         */
        if (
            getDateKey(thisDate) ===
            getTodayKey()
        ) {
            button.classList.add(
                "today"
            );
        }


        /*
         * Selected marker.
         */
        if (
            selectedCalendarDate &&
            getDateKey(thisDate) ===
            getDateKey(selectedCalendarDate)
        ) {
            button.classList.add(
                "selected"
            );
        }


        button.addEventListener(
            "click",
            () => {
                selectedCalendarDate =
                    thisDate;

                renderCalendar();

                updateDatePickerLabel();
            }
        );


        calendarGrid.appendChild(
            button
        );
    }


    if (selectedTimeInput) {
        selectedTimeInput.value =
            selectedCalendarTime;
    }
}


/*
 * Save custom date/time.
 */
if (saveDateButton) {
    saveDateButton.addEventListener(
        "click",
        event => {
            event.preventDefault();


            if (!selectedCalendarDate) {
                alert(
                    "Please choose a date first."
                );

                return;
            }


            if (selectedTimeInput) {
                selectedCalendarTime =
                    selectedTimeInput.value ||
                    "12:00";
            }


            const year =
                selectedCalendarDate.getFullYear();

            const month =
                String(
                    selectedCalendarDate.getMonth() + 1
                ).padStart(2, "0");

            const day =
                String(
                    selectedCalendarDate.getDate()
                ).padStart(2, "0");


            const dateTimeValue =
                `${year}-${month}-${day}T${selectedCalendarTime}`;


            if (dueDateInput) {
                dueDateInput.value =
                    dateTimeValue;
            }


            updateDatePickerLabel();

            closeDatePicker();
        }
    );
}


/*
 * Clear date.
 */
if (clearDateButton) {
    clearDateButton.addEventListener(
        "click",
        event => {
            event.preventDefault();

            selectedCalendarDate =
                null;

            selectedCalendarTime =
                "12:00";

            if (dueDateInput) {
                dueDateInput.value =
                    "";
            }

            if (selectedTimeInput) {
                selectedTimeInput.value =
                    "12:00";
            }

            updateDatePickerLabel();

            renderCalendar();
        }
    );
}


/*
 * Clicking outside the picker closes it.
 */
document.addEventListener(
    "click",
    event => {
        if (
            datePickerPanel &&
            datePickerButton &&
            !datePickerPanel.contains(event.target) &&
            !datePickerButton.contains(event.target)
        ) {
            closeDatePicker();
        }
    }
);


/*
 * Convert existing task datetime
 * into picker values.
 */
function setCustomDatePickerValue(
    dateTimeValue
) {
    if (!dateTimeValue) {
        resetCustomDatePicker();
        return;
    }


    const date =
        parseTaskDate(dateTimeValue);


    if (!date) {
        resetCustomDatePicker();
        return;
    }


    selectedCalendarDate =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );


    selectedCalendarTime =
        `${String(
            date.getHours()
        ).padStart(2, "0")}:${String(
            date.getMinutes()
        ).padStart(2, "0")}`;


    calendarDisplayDate =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            1
        );


    if (selectedTimeInput) {
        selectedTimeInput.value =
            selectedCalendarTime;
    }


    updateDatePickerLabel();

    renderCalendar();
}


/*
 * Reset picker.
 */
function resetCustomDatePicker() {
    selectedCalendarDate =
        null;

    selectedCalendarTime =
        "12:00";

    calendarDisplayDate =
        new Date();

    if (selectedTimeInput) {
        selectedTimeInput.value =
            "12:00";
    }

    updateDatePickerLabel();

    renderCalendar();

    closeDatePicker();
}


/* =========================================================
   18. INITIAL PAGE LOAD
   ========================================================= */

/*
 * Load the user first, then the tasks.
 * Both requests use the browser's session cookie.
 */
async function initializeDashboard() {
    resetCustomDatePicker();

    await loadCurrentUser();

    await loadTasks();
}


initializeDashboard();