from functools import wraps
from flask import session, jsonify


def login_required(route_function):
    @wraps(route_function)
    def wrapper(*args, **kwargs):

        user_id = session.get("user_id")

        if not user_id:
            return jsonify({"error": "Not logged in"}), 401

        return route_function(*args, **kwargs)

    return wrapper