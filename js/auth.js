// ============================================
// PAWFECT GROOMING - AUTHENTICATION
// ============================================
console.log("AUTH.JS IS LOADING");

const registerForm = document.getElementById("registerForm");

if (registerForm !== null) {

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        // Check if passwords match
        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        // Check password length
        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        // Register the user with Supabase
        const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password,
    options: {
        data: {
            full_name: fullName
        }
    }
});

console.log("SIGN UP DATA:", data);
console.log("SIGN UP ERROR:", error);

        // Handle Supabase error
        if (error) {
            console.error(error);
            alert(error.message);
            return;
        }

        // Registration successful
        console.log("Registration successful:", data);

        alert(
            "Registration successful! " +
            "Please check your email to verify your account."
        );

        window.location.href = "login.html";
    });
}

// ============================================
// LOGIN
// ============================================

const loginForm = document.getElementById("loginForm");

if (loginForm !== null) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;


        // Log in using Supabase Authentication
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


        // Handle login error
        if (error) {

            console.error(error);

            alert(error.message);

            return;
        }


        // Get the logged-in user's ID
        const userId = data.user.id;


        // Get the user's profile and role
        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .single();


        // Handle profile error
        if (profileError) {

            console.error(profileError);

            alert("Login successful, but we couldn't retrieve your account information.");

            return;
        }


        // Send user to the correct dashboard
        if (profile.role === "admin") {

            window.location.href = "admin/dashboard.html";

        } else {

            window.location.href = "customer/dashboard.html";

        }

    });

}