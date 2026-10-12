
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

        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const submitButton = registerForm.querySelector('button[type="submit"]');

        if (password !== confirmPassword) {
            showToast("Please make sure both passwords match.", "error", "Passwords don't match");
            return;
        }

        if (password.length < 6) {
            showToast("Your password must contain at least 6 characters.", "error", "Password too short");
            return;
        }

        if (submitButton) submitButton.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            // Store only the details needed to display and verify the code.
            // Never store the user's password in browser storage.
            sessionStorage.setItem("pawfect-pending-email", email);
            sessionStorage.setItem("pawfect-pending-name", fullName);

            // If Supabase returned an active session, email confirmation
            // may be disabled in the project settings.
            if (data.session && data.user?.email_confirmed_at) {
                saveToastForRedirect(
                    "Your account is ready. You can now log in.",
                    "success",
                    "Registration successful"
                );
                window.location.href = "login.html";
                return;
            }

            // Open the verification-code screen.
            window.location.href = "verify-email.html";

        } catch (error) {
            console.error("REGISTRATION ERROR:", error);
            showToast(
                error.message || "Something went wrong while creating your account.",
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
   EMAIL VERIFICATION
   Used by verify-email.html
============================================ */

const verifyEmailForm = document.getElementById("verifyEmailForm");

if (verifyEmailForm) {
    const emailInput = document.getElementById("verificationEmail");
    const codeInput = document.getElementById("verificationCode");
    const verifyButton = verifyEmailForm.querySelector('button[type="submit"]');
    const pendingEmail = sessionStorage.getItem("pawfect-pending-email");

    if (emailInput && pendingEmail) {
        emailInput.value = pendingEmail;
    }

    verifyEmailForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailInput?.value.trim();
        const token = codeInput?.value.trim();

        if (!email || !token) {
            showToast("Enter your email and verification code.", "error", "Missing information");
            return;
        }

        if (verifyButton) verifyButton.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.verifyOtp({
                email,
                token,
                type: "signup"
            });

            if (error) throw error;

            if (!data.user?.email_confirmed_at) {
                throw new Error("Your email has not been verified. Please try again.");
            }

            sessionStorage.removeItem("pawfect-pending-email");
            sessionStorage.removeItem("pawfect-pending-name");

            // Verification may sign the user in automatically.
            // Sign out so they can use the normal login flow.
            if (data.session) {
                const { error: signOutError } =
                    await supabaseClient.auth.signOut();

                if (signOutError) throw signOutError;
            }

            saveToastForRedirect(
                "Your email has been verified. You can now log in.",
                "success",
                "Email verified"
            );

            window.location.href = "login.html";

        } catch (error) {
            console.error("EMAIL VERIFICATION ERROR:", error);
            showToast(
                error.message || "The code is invalid or has expired.",
                "error",
                "Verification failed"
            );
        } finally {
            if (verifyButton) verifyButton.disabled = false;
        }
    });

    /* RESEND VERIFICATION CODE */

    const resendButton = document.getElementById("resendCodeButton");

    if (resendButton) {
        resendButton.addEventListener("click", async function () {
            const email = emailInput?.value.trim();

            if (!email) {
                showToast("Enter your email address first.", "error", "Email required");
                return;
            }

            resendButton.disabled = true;

            try {
                const { error } = await supabaseClient.auth.resend({
                    type: "signup",
                    email
                });

                if (error) throw error;

                showToast(
                    "A new verification code has been requested. Check your inbox.",
                    "success",
                    "Code requested"
                );
            } catch (error) {
                console.error("RESEND CODE ERROR:", error);
                showToast(
                    error.message || "Unable to resend the code. Please try again later.",
                    "error",
                    "Could not resend code"
                );
            } finally {
                resendButton.disabled = false;
            }
        });
    }
}


/* ============================================
   LOGIN
============================================ */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    async function redirectToDashboard(userId, showWelcome = false) {
        try {
            const { data: profile, error } = await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .single();

            if (error || !profile) {
                console.error("PROFILE ERROR:", error);
                await supabaseClient.auth.signOut();

                showToast(
                    "We couldn't verify your account role. Please contact support.",
                    "error",
                    "Account verification failed"
                );
                return;
            }

            if (profile.role !== "admin" && profile.role !== "customer") {
                await supabaseClient.auth.signOut();

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
                sessionStorage.setItem("adminWelcomeToast", "true");
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

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        const rememberCheckbox = document.getElementById("rememberMe");
        const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        localStorage.setItem(
            "pawfect-remember-session",
            rememberMe ? "local" : "session"
        );

        if (submitButton) submitButton.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error("LOGIN ERROR:", error);

                const message = /email not confirmed/i.test(error.message)
                    ? "Please verify your email address before logging in."
                    : "Please check your email and password, then try again.";

                showToast(message, "error", "Login failed");
                return;
            }

            if (!data.user?.email_confirmed_at) {
                await supabaseClient.auth.signOut();

                showToast(
                    "Please verify your email address before logging in.",
                    "error",
                    "Email not verified"
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
