const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const loginButton = document.getElementById("login-btn");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        const response = await fetch("http://127.0.0.1:5000/api/login", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            loginMessage.textContent = "Login successful!";
            loginMessage.className = "auth-message success";

            window.location.href = "index.html";
        } else {
            loginMessage.textContent = data.error || "Login failed.";
            loginMessage.className = "auth-message error";
        }

    } catch (error) {
        console.error("Login error:", error);

        loginMessage.textContent = "Unable to connect to the server.";
        loginMessage.className = "auth-message error";

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
});