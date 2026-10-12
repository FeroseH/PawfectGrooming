
/* ========================================
   PAWFECT GROOMING - APPOINTMENT HISTORY
======================================== */

document.addEventListener("DOMContentLoaded", async () => {
    const sidebar = document.getElementById("adminSidebar");
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");
    
    const refreshButton = document.getElementById("refreshHistory");
    const searchInput = document.getElementById("historySearch");
    const statusFilter = document.getElementById("historyStatusFilter");

    const tableBody = document.getElementById("historyTableBody");
    const historyCount = document.getElementById("historyCount");
    const historyMessage = document.getElementById("historyMessage");
    const historyEmpty = document.getElementById("historyEmpty");

    const totalElement = document.getElementById("historyTotal");
    const completedElement = document.getElementById("historyCompleted");
    const cancelledElement = document.getElementById("historyCancelled");

    let appointments = [];

    function notify(message, isError = false) {
    if (typeof window.showAdminToast === "function") {
        window.showAdminToast(message, isError);
    } else {
        console.error(message);
    }
}

    function showMessage(message, isError = false) {
        historyMessage.textContent = message;
        historyMessage.classList.toggle("error", isError);
        historyMessage.hidden = false;
    }

    function hideMessage() {
        historyMessage.hidden = true;
        historyMessage.textContent = "";
        historyMessage.classList.remove("error");
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function formatDate(dateValue) {
        if (!dateValue) return "Date unavailable";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "Date unavailable";

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatTime(timeValue) {
        if (!timeValue) return "Time unavailable";

        const match = String(timeValue).match(/^(\d{1,2}):(\d{2})/);

        if (!match) return String(timeValue);

        const date = new Date();
        date.setHours(Number(match[1]), Number(match[2]), 0, 0);

        return date.toLocaleTimeString("en-PH", {
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function getRelationName(relation, fallbackFields = []) {
        if (!relation) return "";

        const record = Array.isArray(relation) ? relation[0] : relation;

        if (!record) return "";

        for (const field of fallbackFields) {
            if (record[field]) return record[field];
        }

        return "";
    }

    function getCustomerName(appointment) {
        return (
            getRelationName(appointment.profiles, ["full_name", "name"]) ||
            appointment.customer_name ||
            "Customer"
        );
    }

    function getPetName(appointment) {
        return (
            getRelationName(appointment.pets, ["name", "pet_name"]) ||
            appointment.pet_name ||
            "Pet"
        );
    }

    function getServiceName(appointment) {
        return (
            getRelationName(appointment.services, ["name", "service_name"]) ||
            appointment.service_name ||
            "Grooming service"
        );
    }

    function getStatus(appointment) {
        return String(appointment.status || "").toLowerCase();
    }

    function updateStatistics() {
        totalElement.textContent = appointments.length;

        completedElement.textContent = appointments.filter(
            appointment => getStatus(appointment) === "completed"
        ).length;

        cancelledElement.textContent = appointments.filter(
            appointment => getStatus(appointment) === "cancelled"
        ).length;
    }

    function renderHistory() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;

        const filtered = appointments.filter(appointment => {
            const status = getStatus(appointment);

            const searchableText = [
                appointment.id,
                getCustomerName(appointment),
                getPetName(appointment),
                getServiceName(appointment),
                status,
                appointment.appointment_date
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(searchTerm);
            const matchesStatus =
                selectedStatus === "all" || status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        historyCount.textContent =
            `${filtered.length} ${filtered.length === 1 ? "record" : "records"} found`;

        if (filtered.length === 0) {
            tableBody.innerHTML = "";
            historyEmpty.hidden = false;
            return;
        }

        historyEmpty.hidden = true;

        tableBody.innerHTML = filtered.map(appointment => {
            const status = getStatus(appointment);
            const statusLabel = status
                ? status.charAt(0).toUpperCase() + status.slice(1)
                : "Unknown";

            const appointmentDate = formatDate(appointment.appointment_date);
            const appointmentTime = formatTime(appointment.appointment_time);

            return `
                <tr>
                    <td>
                        <span class="history-primary-text">
                            #${escapeHTML(appointment.id)}
                        </span>
                    </td>

                    <td>
                        <span class="history-primary-text">
                            ${escapeHTML(getCustomerName(appointment))}
                        </span>
                    </td>

                    <td>${escapeHTML(getPetName(appointment))}</td>

                    <td>${escapeHTML(getServiceName(appointment))}</td>

                    <td>
                        <span class="history-primary-text">
                            ${escapeHTML(appointmentDate)}
                        </span>
                        <span class="history-secondary-text">
                            ${escapeHTML(appointmentTime)}
                        </span>
                    </td>

                    <td>
                        <span class="history-status ${status === "cancelled" ? "cancelled" : ""}">
                            ${escapeHTML(statusLabel)}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    async function loadHistory() {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
        hideMessage();
        historyEmpty.hidden = true;

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="history-table-state">
                    Loading appointment records...
                </td>
            </tr>
        `;

        try {
            const { data, error } = await supabaseClient
                .from("appointments")
                .select(`
                    id,
                    status,
                    appointment_date,
                    appointment_time,
                    profiles:customer_id (full_name),
                    pets:pet_id (name),
                    services:service_id (name)
                `)
                .in("status", ["completed", "cancelled"])
                .order("appointment_date", { ascending: false });

            if (error) throw error;

            appointments = data || [];

            updateStatistics();
            renderHistory();
        } catch (error) {
            console.error("Failed to load appointment history:", error);

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="history-table-state">
                        Unable to load appointment history.
                    </td>
                </tr>
            `;

            historyCount.textContent = "Unable to load records";

            notify(
                error.message ||
                    "An error occurred while loading appointment history.",
                true
            );
        } finally {
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh Records";
        }
    }

    /* Mobile navigation */

    function closeSidebar() {
        sidebar.classList.remove("open");
        overlay.classList.remove("visible");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation");
    }

    menuToggle.addEventListener("click", () => {
        const isOpen = sidebar.classList.toggle("open");

        overlay.classList.toggle("visible", isOpen);
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation" : "Open navigation"
        );
    });

    overlay.addEventListener("click", closeSidebar);

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", closeSidebar);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeSidebar();
    });

    /* Logout */

    

    /* Verify administrator */

    try {
        const { data: authData, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError || !authData.user) {
            window.location.href = "../login.html";
            return;
        }

        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", authData.user.id)
            .single();

        if (profileError || profile?.role !== "admin") {
            window.location.href = "../login.html";
            return;
        }
    } catch (error) {
        console.error("Administrator check failed:", error);
        notify("Unable to verify administrator access.", true);
        return;
    }

    searchInput.addEventListener("input", renderHistory);
    statusFilter.addEventListener("change", renderHistory);
    refreshButton.addEventListener("click", loadHistory);

    await loadHistory();
});
