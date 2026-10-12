
/* ========================================
   PAWFECT GROOMING - SHARED ADMIN LOGOUT
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton =
        document.getElementById("logoutButton") ||
        document.getElementById("adminLogout");

    if (!logoutButton) {
        console.error("Admin logout button was not found.");
        return;
    }

    logoutButton.addEventListener("click", async () => {
        if (typeof window.showAdminConfirmToast !== "function") {
            console.error("showAdminConfirmToast is not loaded.");

            if (typeof window.showAdminToast === "function") {
                window.showAdminToast(
                    "Logout confirmation is unavailable. Please refresh the page.",
                    true
                );
            } else {
                alert("Logout confirmation is unavailable. Please refresh the page.");
            }

            return;
        }

        const confirmed = await window.showAdminConfirmToast(
            "Are you sure you want to log out?"
        );

        if (!confirmed) return;

        logoutButton.disabled = true;

        try {
            const { error } = await supabaseClient.auth.signOut();

            if (error) throw error;

            window.location.href = "../login.html";
        } catch (error) {
            console.error("Logout failed:", error);

            if (typeof window.showAdminToast === "function") {
                window.showAdminToast(
                    "Unable to log out. Please try again.",
                    true
                );
            }

            logoutButton.disabled = false;
        }
    });
});
