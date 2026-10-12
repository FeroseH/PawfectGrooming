
/* ============================================
   PAWFECT GROOMING - AUTHENTICATION
============================================ */


/* SAVE A TOAST FOR THE NEXT PAGE */

function saveToastForRedirect(message, type = "success", title = "") {
    sessionStorage.setItem(
        "pawfect-toast",
        JSON.stringify({ message, type, title })
    );
}


/* ============================================
   REGISTRATION
============================================ */

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const fullName =
            document.getElementById("fullName").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const submitButton = registerForm.querySelector(
            'button[type="submit"]'
        );

        if (password !== confirmPassword) {
            showToast(
                "Please make sure both passwords match.",
                "error",
                "Passwords don't match"
            );
            return;
        }

        if (password.length < 6) {
            showToast(
                "Your password must contain at least 6 characters.",
                "error",
                "Password too short"
            );
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const { data, error } =
                await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });

            console.log("SIGN UP DATA:", data);

            if (error) {
                console.error("REGISTRATION ERROR:", error);

                showToast(
                    error.message,
                    "error",
                    "Registration failed"
                );
                return;
            }

            console.log("Registration successful:", data);

            saveToastForRedirect(
                "Please check your email for the account verification link.",
                "success",
                "Registration successful"
            );

            window.location.href = "login.html";

        } catch (error) {
            console.error("REGISTRATION ERROR:", error);

            showToast(
                "Something went wrong while creating your account. Please try again.",
                "error",
                "Registration failed"
            );

        } finally {
            if (submitButton && submitButton.isConnected) {
                submitButton.disabled = false;
            }
        }
    });
}


/* ============================================
   LOGIN
============================================ */

/* ============================================
   LOGIN
============================================ */

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    /* REDIRECT BASED ON ACCOUNT ROLE */

    async function redirectToDashboard(userId, showWelcome = false) {
        try {
            const { data: profile, error } = await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .single();

            if (error || !profile) {
                console.error("PROFILE ERROR:", error);

                showToast(
                    "We couldn't verify your account role. Please contact support.",
                    "error",
                    "Account verification failed"
                );

                return;
            }

            // Allow only the roles that we recognize.
            if (profile.role !== "admin" && profile.role !== "customer") {
                showToast(
                    "Your account has an invalid role. Please contact support.",
                    "error",
                    "Account verification failed"
                );

                return;
            }

            if (showWelcome) {
                saveToastForRedirect(
                    "You have successfully logged in to your account.",
                    "success",
                    "Welcome back!"
                );
            }

            if (profile.role === "admin") {
                window.location.href = "admin/dashboard.html";
            } else {
                window.location.href = "customer/dashboard.html";
            }

        } catch (error) {
            console.error("DASHBOARD REDIRECT ERROR:", error);

            showToast(
                "Something went wrong while opening your dashboard.",
                "error",
                "Unable to continue"
            );
        }
    }


    /* HANDLE LOGIN */

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        const rememberCheckbox =
            document.getElementById("rememberMe");

        const rememberMe = rememberCheckbox
            ? rememberCheckbox.checked
            : false;

        const submitButton = loginForm.querySelector(
            'button[type="submit"]'
        );

        localStorage.setItem(
            "pawfect-remember-session",
            rememberMe ? "local" : "session"
        );

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                console.error("LOGIN ERROR:", error);

                showToast(
                    "Please check your email and password, then try again.",
                    "error",
                    "Login failed"
                );

                return;
            }

            await redirectToDashboard(data.user.id, true);

        } catch (error) {
            console.error("LOGIN ERROR:", error);

            showToast(
                "Something went wrong while logging in. Please try again.",
                "error",
                "Login failed"
            );

        } finally {
            if (submitButton && submitButton.isConnected) {
                submitButton.disabled = false;
            }
        }
    });
}