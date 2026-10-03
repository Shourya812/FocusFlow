from functools import wraps
from flask import session, jsonify
from db import get_db_connection


def login_required(route_function):

    @wraps(route_function)
    def wrapper(*args, **kwargs):

        user_id = session.get("user_id")

        if not user_id:
            return jsonify({
                "error": "Not logged in"
            }), 401

        return route_function(*args, **kwargs)

    return wrapper


def admin_required(route_function):

    @wraps(route_function)
    def wrapper(*args, **kwargs):

        user_id = session.get("user_id")

        if not user_id:
            return jsonify({
                "error": "Not logged in"
            }), 401


        connection = get_db_connection()

        user = connection.execute("""
            SELECT role
            FROM users
            WHERE id = ?
        """, (user_id,)).fetchone()

        connection.close()


        if not user or user["role"] != "admin":

            return jsonify({
                "error": "Admin access required"
            }), 403


        return route_function(*args, **kwargs)

    return wrapper