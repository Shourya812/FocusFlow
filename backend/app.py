from flask import Flask, jsonify, request, session
from flask_cors import CORS
from dotenv import load_dotenv
from db import get_db_connection
from auth import login_required, admin_required
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os

load_dotenv()
app = Flask(__name__)

secret_key = os.getenv("FLASK_SECRET_KEY")

if not secret_key:
    raise RuntimeError("FLASK_SECRET_KEY is not set.")

app.secret_key = secret_key

frontend_url = os.getenv("FRONTEND_URL")

if frontend_url:
    CORS(
        app,
        origins=[frontend_url],
        supports_credentials=True
    )
else:
    CORS(app, supports_credentials=True)

is_production = os.getenv("FLASK_ENV") == "production"

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="None" if is_production else "Lax",
    SESSION_COOKIE_SECURE=is_production
)

@app.route("/")
def home():
    return "To-Do App Backend is Running!"


# GET /api/me
# Get the currently logged-in user
@app.route("/api/me", methods=["GET"])
@login_required
def get_current_user():

    user_id = session.get("user_id")

    connection = get_db_connection()

    try:
        user = connection.execute(
            "SELECT id, name, email, role FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": "Failed to fetch user"
        }), 500

    finally:
        connection.close()

    if user is None:
        return jsonify({
            "error": "User not found"
        }), 404

    return jsonify({
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    })


# POST /api/login
# Login an existing user
@app.route("/api/login", methods=["POST"])
def login_user():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "JSON data is required"
        }), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not email.strip():
        return jsonify({
            "error": "Email is required"
        }), 400

    if not password:
        return jsonify({
            "error": "Password is required"
        }), 400

    connection = get_db_connection()

    try:
        user = connection.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": "Failed to login user"
        }), 500

    finally:
        connection.close()

    if user is None:
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    if not check_password_hash(
        user["password_hash"],
        password
    ):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    session["user_id"] = user["id"]

    return jsonify({
        "message": "Login successful",
        "user_id": user["id"],
        "name": user["name"],
        "email": user["email"]
    }), 200


# POST /api/logout
# Log out the current user
@app.route("/api/logout", methods=["POST"])
def logout_user():

    session.clear()

    return jsonify({
        "message": "Logout successful"
    })


# POST /api/register
# Register a new user
@app.route("/api/register", methods=["POST"])
def register_user():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "JSON data is required"
        }), 400

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not isinstance(name, str) or not name.strip():
        return jsonify({
            "error": "Name is required"
        }), 400

    if not isinstance(email, str) or not email.strip():
        return jsonify({
            "error": "Email is required"
        }), 400

    if not isinstance(password, str) or not password:
        return jsonify({
            "error": "Password is required"
        }), 400

    name = name.strip()
    email = email.strip().lower()

    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({
            "error": "Invalid email format"
        }), 400

    if len(password) < 6:
        return jsonify({
            "error": "Password must be at least 6 characters"
        }), 400

    connection = get_db_connection()

    try:
        existing_user = connection.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,)
        ).fetchone()

        if existing_user:
            return jsonify({
                "error": "Email already registered"
            }), 409

        password_hash = generate_password_hash(password)

        cursor = connection.execute("""
            INSERT INTO users (
                name,
                email,
                password_hash,
                created_at
            )
            VALUES (?, ?, ?, ?)
        """, (
            name,
            email,
            password_hash,
            datetime.now().isoformat()
        ))

        connection.commit()

        user_id = cursor.lastrowid

        session["user_id"] = user_id

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": "Failed to register user"
        }), 500

    finally:
        connection.close()

    return jsonify({
        "message": "User registered successfully",
        "user_id": user_id
    }), 201


# GET /api/tasks
# Get tasks for the currently logged-in user
@app.route("/api/tasks", methods=["GET"])
@login_required
def get_tasks():

    user_id = session.get("user_id")

    connection = get_db_connection()

    try:
        tasks = connection.execute(
            "SELECT * FROM tasks WHERE user_id = ?",
            (user_id,)
        ).fetchall()

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": "Failed to fetch tasks"
        }), 500

    finally:
        connection.close()

    tasks_list = [dict(task) for task in tasks]

    return jsonify(tasks_list)


# POST /api/tasks
# Create a new task
@app.route("/api/tasks", methods=["POST"])
@login_required
def create_task():

    user_id = session.get("user_id")

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "JSON data is required"
        }), 400

    title = data.get("title")
    description = data.get("description")
    priority = data.get("priority", "medium")
    due_at = data.get("due_at")

    if not isinstance(title, str) or not title.strip():
        return jsonify({
            "error": "Title is required"
        }), 400

    title = title.strip()

    if description is not None and not isinstance(description, str):
        return jsonify({
            "error": "Description must be text"
        }), 400

    if priority not in ["low", "medium", "high"]:
        return jsonify({
            "error": "Priority must be low, medium, or high"
        }), 400

    connection = get_db_connection()

    try:
        cursor = connection.execute("""
            INSERT INTO tasks (
                user_id,
                title,
                description,
                priority,
                created_at,
                due_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            title,
            description,
            priority,
            datetime.now().isoformat(),
            due_at
        ))

        connection.commit()

        task_id = cursor.lastrowid

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": "Failed to create task"
        }), 500

    finally:
        connection.close()

    return jsonify({
        "message": "Task created successfully",
        "task_id": task_id
    }), 201


# PUT /api/tasks/<task_id>
# Update an existing task
@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
@login_required
def update_task(task_id):

    user_id = session.get("user_id")

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "JSON data is required"
        }), 400

    connection = get_db_connection()

    try:
        task = connection.execute(
            """
            SELECT * FROM tasks
            WHERE id = ?
            AND user_id = ?
            """,
            (task_id, user_id)
        ).fetchone()

        if task is None:
            return jsonify({
                "error": "Task not found"
            }), 404

        title = data.get("title", task["title"])
        description = data.get(
            "description",
            task["description"]
        )
        priority = data.get(
            "priority",
            task["priority"]
        )
        due_at = data.get(
            "due_at",
            task["due_at"]
        )
        status = data.get(
            "status",
            task["status"]
        )

        if not title or not title.strip():
            return jsonify({
                "error": "Title is required"
            }), 400

        allowed_priorities = [
            "low",
            "medium",
            "high"
        ]

        if priority not in allowed_priorities:
            return jsonify({
                "error": "Priority must be low, medium, or high"
            }), 400

        allowed_statuses = [
            "pending",
            "completed"
        ]

        if status not in allowed_statuses:
            return jsonify({
                "error": "Status must be pending or completed"
            }), 400

        if status == "completed":

            if task["status"] == "completed":
                completed_at = task["completed_at"]
            else:
                completed_at = datetime.now().isoformat()

        else:
            completed_at = None

        cursor = connection.execute(
            """
            UPDATE tasks
            SET title = ?,
                description = ?,
                priority = ?,
                due_at = ?,
                status = ?,
                completed_at = ?
            WHERE id = ?
            AND user_id = ?
            """,
            (
                title,
                description,
                priority,
                due_at,
                status,
                completed_at,
                task_id,
                user_id
            )
        )

        connection.commit()

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": "Failed to update task"
        }), 500

    finally:
        connection.close()

    if cursor.rowcount == 0:
        return jsonify({
            "error": "Task not found"
        }), 404

    return jsonify({
        "message": "Task updated successfully"
    })


# DELETE /api/tasks/<task_id>
# Delete an existing task
@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):

    user_id = session.get("user_id")

    connection = get_db_connection()

    try:
        cursor = connection.execute("""
            DELETE FROM tasks
            WHERE id = ?
            AND user_id = ?
        """, (
            task_id,
            user_id
        ))

        connection.commit()

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": "Failed to delete task"
        }), 500

    finally:
        connection.close()

    if cursor.rowcount == 0:
        return jsonify({
            "error": "Task not found"
        }), 404

    return jsonify({
        "message": "Task deleted successfully"
    })


# GET /api/analytics
# Get analytics for the currently logged-in user
@app.route("/api/analytics", methods=["GET"])
@login_required
def get_analytics():

    user_id = session.get("user_id")

    connection = get_db_connection()

    try:
        # Get basic task statistics
        statistics = connection.execute("""
            SELECT
                COUNT(*) AS total_tasks,
                SUM(
                    CASE
                        WHEN status = 'completed' THEN 1
                        ELSE 0
                    END
                ) AS completed_tasks
            FROM tasks
            WHERE user_id = ?
        """, (user_id,)).fetchone()

        # Get pending tasks
        pending_tasks = connection.execute("""
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE user_id = ?
            AND status = 'pending'
        """, (user_id,)).fetchone()

        # Get overdue tasks
        overdue_tasks = connection.execute("""
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE user_id = ?
            AND status = 'pending'
            AND due_at IS NOT NULL
            AND due_at < ?
        """, (
            user_id,
            datetime.now().isoformat()
        )).fetchone()

        # Get completed tasks for the last 7 days
        daily_activity = connection.execute("""
            SELECT
                DATE(completed_at) AS date,
                COUNT(*) AS completed
            FROM tasks
            WHERE user_id = ?
            AND status = 'completed'
            AND completed_at IS NOT NULL
            AND DATE(completed_at) >= DATE('now', '-6 days')
            GROUP BY DATE(completed_at)
            ORDER BY DATE(completed_at)
        """, (user_id,)).fetchall()

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": "Failed to fetch analytics"
        }), 500

    finally:
        connection.close()

    total_tasks = statistics["total_tasks"] or 0
    completed_tasks = statistics["completed_tasks"] or 0
    pending_count = pending_tasks["count"] or 0
    overdue_count = overdue_tasks["count"] or 0

    if total_tasks > 0:
        completion_rate = round(
            (completed_tasks / total_tasks) * 100,
            2
        )
    else:
        completion_rate = 0

    return jsonify({
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_count,
        "overdue_tasks": overdue_count,
        "completion_rate": completion_rate,
        "daily_activity": [
            {
                "date": activity["date"],
                "completed": activity["completed"]
            }
            for activity in daily_activity
        ]
    })

# Admin dashboard statistics
@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def get_admin_stats():

    connection = get_db_connection()

    try:
        # Total registered users
        total_users = connection.execute("""
            SELECT COUNT(*) AS count
            FROM users
        """).fetchone()

        # Total tasks
        total_tasks = connection.execute("""
            SELECT COUNT(*) AS count
            FROM tasks
        """).fetchone()

        # Completed tasks
        completed_tasks = connection.execute("""
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE status = 'completed'
        """).fetchone()

        # Pending tasks
        pending_tasks = connection.execute("""
            SELECT COUNT(*) AS count
            FROM tasks
            WHERE status = 'pending'
        """).fetchone()

        # Recent registered users
        recent_users = connection.execute("""
            SELECT id, name, email, created_at
            FROM users
            ORDER BY id DESC
            LIMIT 5
        """).fetchall()

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": "Failed to fetch admin statistics"
        }), 500

    finally:
        connection.close()

    return jsonify({
        "total_users": total_users["count"] or 0,
        "total_tasks": total_tasks["count"] or 0,
        "completed_tasks": completed_tasks["count"] or 0,
        "pending_tasks": pending_tasks["count"] or 0,
        "recent_users": [
            {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "created_at": user["created_at"]
            }
            for user in recent_users
        ]
    })

if __name__ == "__main__":
    app.run(debug=True)