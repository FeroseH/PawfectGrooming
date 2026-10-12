
/* PAWFECT GROOMING — SHARED TOAST NOTIFICATIONS */

(function () {
    function getToastContainer() {
        let container = document.getElementById("toastContainer");

        if (!container) {
            container = document.createElement("div");
            container.id = "toastContainer";
            container.className = "toast-container";
container.style.position = "fixed";

if (window.matchMedia("(max-width: 768px)").matches) {
    container.style.setProperty("top", "50%", "important");
    container.style.setProperty("left", "50%", "important");
    container.style.setProperty("right", "auto", "important");
    container.style.setProperty("bottom", "auto", "important");
    container.style.setProperty("transform", "translate(-50%, -50%)", "important");
    container.style.setProperty("width", "calc(100vw - 40px)", "important");
    container.style.setProperty("max-width", "340px", "important");
}
            container.setAttribute("aria-live", "polite");
            container.setAttribute("aria-atomic", "false");
            document.body.appendChild(container);
        }

        return container;
    }

    window.showToast = function (
        message,
        type = "success",
        title = ""
    ) {
        const settings = {
            success: { title: "Success", icon: "✓" },
            error: { title: "Something went wrong", icon: "!" },
            info: { title: "Notice", icon: "i" }
        };

        const config = settings[type] || settings.info;
        const container = getToastContainer();
        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;
        toast.setAttribute(
            "role",
            type === "error" ? "alert" : "status"
        );

        const icon = document.createElement("div");
        icon.className = "toast-icon";
        icon.textContent = config.icon;
        icon.setAttribute("aria-hidden", "true");

        const content = document.createElement("div");
        content.className = "toast-content";

        const heading = document.createElement("p");
        heading.className = "toast-title";
        heading.textContent = title || config.title;

        const description = document.createElement("p");
        description.className = "toast-message";
        description.textContent = message;

        const close = document.createElement("button");
        close.className = "toast-close";
        close.type = "button";
        close.textContent = "×";
        close.setAttribute("aria-label", "Dismiss notification");

        const progress = document.createElement("div");
        progress.className = "toast-progress";

        content.append(heading, description);
        toast.append(icon, content, close, progress);
        container.appendChild(toast);

        let dismissed = false;

        function dismissToast() {
            if (dismissed) return;
            dismissed = true;

            toast.classList.add("toast-exit");

            toast.addEventListener(
                "animationend",
                () => toast.remove(),
                { once: true }
            );

            setTimeout(() => toast.remove(), 300);
        }

        close.addEventListener("click", dismissToast);
        setTimeout(dismissToast, 2000);
    };

    // Display a notification saved before a page redirect.
    document.addEventListener("DOMContentLoaded", function () {
        const savedToast = sessionStorage.getItem("pawfect-toast");

        if (!savedToast) return;

        sessionStorage.removeItem("pawfect-toast");

        try {
            const notification = JSON.parse(savedToast);

            window.showToast(
                notification.message,
                notification.type || "success",
                notification.title || ""
            );
        } catch (error) {
            console.error("Unable to display saved notification:", error);
        }
    });
})();
