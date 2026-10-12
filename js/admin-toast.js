
/* ========================================
   ADMIN TOAST NOTIFICATIONS
======================================== */

(function () {
    function createToastContainer() {
        let container = document.querySelector(".admin-toast-container");

        if (!container) {
            container = document.createElement("div");
            container.className = "admin-toast-container";
            container.setAttribute("aria-live", "polite");
            container.setAttribute("aria-atomic", "false");
            document.body.appendChild(container);
        }

        return container;
    }

    window.showAdminToast = function (message, isError = false) {
        const container = createToastContainer();
        const toast = document.createElement("div");

        toast.className = "admin-toast" + (isError ? " error" : "");
        toast.setAttribute("role", isError ? "alert" : "status");

        const icon = document.createElement("span");
        icon.className = "admin-toast-icon";
        icon.textContent = isError ? "!" : "✓";

        const text = document.createElement("div");
        text.className = "admin-toast-message";
        text.textContent = message;

        const close = document.createElement("button");
        close.className = "admin-toast-close";
        close.type = "button";
        close.textContent = "×";
        close.setAttribute("aria-label", "Close notification");

        toast.append(icon, text, close);
        container.appendChild(toast);

        let timeout;

        function removeToast() {
            clearTimeout(timeout);
            toast.classList.remove("show");

            setTimeout(() => toast.remove(), 250);
        }

        close.addEventListener("click", removeToast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        timeout = setTimeout(removeToast, 2500);
    };

    
    window.showAdminConfirmToast = function (message) {
        const container = createToastContainer();
        const toast = document.createElement("div");

        toast.className = "admin-toast admin-toast-confirm";
        toast.setAttribute("role", "alertdialog");
        toast.setAttribute("aria-label", "Confirm account action");

        const text = document.createElement("div");
        text.className = "admin-toast-message";
        text.textContent = message;

        const actions = document.createElement("div");
        actions.className = "admin-toast-actions";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "admin-toast-cancel";
        cancelButton.textContent = "Cancel";

        const confirmButton = document.createElement("button");
        confirmButton.type = "button";
        confirmButton.className = "admin-toast-confirm-button";
        confirmButton.textContent = "Confirm";

        actions.append(cancelButton, confirmButton);
        toast.append(text, actions);
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("show"));

        return new Promise(resolve => {
            function finish(confirmed) {
                cancelButton.disabled = true;
                confirmButton.disabled = true;
                toast.classList.remove("show");

                setTimeout(() => toast.remove(), 250);
                resolve(confirmed);
            }

            cancelButton.addEventListener("click", () => finish(false));
            confirmButton.addEventListener("click", () => finish(true));
        });
    };

})();
