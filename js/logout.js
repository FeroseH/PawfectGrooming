
/* PAWFECT GROOMING — LOGOUT CONFIRMATION */

document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) return;

    // Prevent duplicate event listeners.
    if (logoutButton.dataset.logoutInitialized === "true") return;
    logoutButton.dataset.logoutInitialized = "true";

    // Create the confirmation modal.
    const overlay = document.createElement("div");
    overlay.className = "logout-modal-overlay";
    overlay.innerHTML = `
        <div class="logout-modal" role="dialog"
             aria-modal="true" aria-labelledby="logoutTitle">
            <div class="logout-modal-icon" aria-hidden="true">↪</div>
            <h2 id="logoutTitle">Log Out</h2>
            <p>Are you sure you want to log out of your account?</p>

            <div class="logout-modal-actions">
                <button type="button" class="logout-cancel">Cancel</button>
                <button type="button" class="logout-confirm">Yes, Log Out</button>
            </div>
        </div>
    `;

    // Add modal styling.
    const style = document.createElement("style");
    style.textContent = `
        .logout-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(35, 48, 37, 0.42);
            backdrop-filter: blur(3px);
        }

        .logout-modal-overlay.is-visible {
            display: flex;
        }

        .logout-modal {
            box-sizing: border-box;
            width: 100%;
            max-width: 390px;
            padding: 30px 25px 24px;
            border-radius: 20px;
            background: #fff;
            box-shadow: 0 18px 55px rgba(35, 48, 37, 0.18);
            text-align: center;
            font-family: 'Nunito', sans-serif;
        }

        .logout-modal-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 54px;
            height: 54px;
            margin: 0 auto 17px;
            border-radius: 50%;
            background: #e7f2e8;
            color: #54815d;
            font-size: 25px;
        }

        .logout-modal h2 {
            margin: 0 0 10px;
            color: #2f4032;
            font-family: 'Poppins', sans-serif;
            font-size: 21px;
        }

        .logout-modal p {
            margin: 0;
            color: #737b74;
            font-size: 14px;
            line-height: 1.7;
        }

        .logout-modal-actions {
            display: flex;
            gap: 12px;
            margin-top: 25px;
        }

        .logout-modal-actions button {
            flex: 1;
            min-height: 44px;
            padding: 10px 12px;
            border: none;
            border-radius: 10px;
            font: 800 14px 'Nunito', sans-serif;
            cursor: pointer;
        }

        .logout-cancel {
            background: #f0f2ef;
            color: #4c554d;
        }

        .logout-confirm {
            background: #54815d;
            color: white;
        }

        .logout-confirm:disabled,
        .logout-cancel:disabled {
            opacity: 0.65;
            cursor: not-allowed;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    const cancelButton = overlay.querySelector(".logout-cancel");
    const confirmButton = overlay.querySelector(".logout-confirm");

    // Clicking Log Out opens the modal; it does not sign out yet.
    logoutButton.addEventListener("click", function (event) {
        event.preventDefault();
        overlay.classList.add("is-visible");
        cancelButton.focus();
    });

    // Cancel closes the modal without signing out.
    cancelButton.addEventListener("click", function () {
        overlay.classList.remove("is-visible");
        logoutButton.focus();
    });

    // Clicking outside the modal also closes it.
    overlay.addEventListener("click", function (event) {
        if (event.target === overlay && !confirmButton.disabled) {
            overlay.classList.remove("is-visible");
            logoutButton.focus();
        }
    });

    // Sign out only after confirmation.
    confirmButton.addEventListener("click", async function () {
        confirmButton.disabled = true;
        cancelButton.disabled = true;
        confirmButton.textContent = "Logging Out...";

        try {
            const { error } = await supabaseClient.auth.signOut();

            if (error) throw error;

            sessionStorage.setItem(
                "pawfect-toast",
                JSON.stringify({
                    message: "You have safely logged out of your account.",
                    type: "success",
                    title: "Logged Out Successfully"
                })
            );

            window.location.href = "../login.html";

        } catch (error) {
            console.error("LOGOUT ERROR:", error);

            if (typeof window.showToast === "function") {
                window.showToast(
                    "We couldn't log you out. Please try again.",
                    "error",
                    "Logout Failed"
                );
            } else {
                alert("Unable to log out. Please try again.");
            }

            confirmButton.disabled = false;
            cancelButton.disabled = false;
            confirmButton.textContent = "Yes, Log Out";
        }
    });
});
