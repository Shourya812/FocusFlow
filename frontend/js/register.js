const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("register-message");
const registerButton = document.getElementById("register-btn");

registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
        registerMessage.textContent = "Passwords do not match.";
        registerMessage.className = "auth-message error";
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Creating account...";

    try {
        const response = await fetch("http://127.0.0.1:5000/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            registerMessage.textContent =
                "Account created! Redirecting to dashboard...";

            registerMessage.className = "auth-message success";

            setTimeout(function () {
                window.location.href = "index.html";
            }, 1000);

        } else {
            registerMessage.textContent =
                data.error || "Registration failed.";

            registerMessage.className = "auth-message error";
        }

    } catch (error) {
        console.error("Registration error:", error);

        registerMessage.textContent =
            "Unable to connect to the server.";

        registerMessage.className = "auth-message error";

    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Create Account";
    }
});