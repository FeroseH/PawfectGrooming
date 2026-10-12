
document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.getElementById("appointmentsTableBody");
    const tableCount = document.getElementById("tableCount");
    const searchInput = document.getElementById("appointmentSearch");
    const statusFilter = document.getElementById("statusFilter");
    const dateFilter = document.getElementById("dateFilter");

    let appointments = [];
    let updatingIds = new Set();

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function showMessage(title, message) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="appointments-empty">
                        <strong>${escapeHTML(title)}</strong>
                        <p>${escapeHTML(message)}</p>
                    </div>
                </td>
            </tr>`;
    }

    
function notify(message, type = "success") {
    if (typeof window.showAdminToast === "function") {
        window.showAdminToast(
            message,
            type === "error"
        );
    } else {
        console.error(message);
    }
}


function confirmToast(message, confirmLabel = "Confirm") {
    return new Promise(resolve => {
        document.querySelector(".toast-confirmation")?.remove();

        const toast = document.createElement("div");
        toast.className = "toast-confirmation";
        toast.setAttribute("role", "alertdialog");
        toast.setAttribute("aria-label", "Confirm action");

        toast.innerHTML = `
            <p class="toast-confirmation-message"></p>
            <div class="toast-confirmation-actions">
                <button type="button" class="toast-confirm-cancel">
                    Go back
                </button>
                <button type="button" class="toast-confirm-accept">
                    ${confirmLabel}
                </button>
            </div>
        `;

        toast.querySelector(".toast-confirmation-message")
            .textContent = message;

        const finish = result => {
            toast.remove();
            resolve(result);
        };

        toast.querySelector(".toast-confirm-cancel")
            .addEventListener("click", () => finish(false));

        toast.querySelector(".toast-confirm-accept")
            .addEventListener("click", () => finish(true));

        document.body.appendChild(toast);
        toast.querySelector(".toast-confirm-accept").focus();
    });
}

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatTime(value) {
        if (!value) return "—";

        const parts = String(value).split(":");
        if (parts.length < 2) return value;

        let hours = Number(parts[0]);
        const minutes = parts[1];

        if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
            return value;
        }

        const period = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;

        return `${hours}:${minutes} ${period}`;
    }

    function getStatusClass(status) {
        switch (String(status || "").toLowerCase()) {
            case "pending":
                return "status-pending";
            case "confirmed":
                return "status-confirmed";
            case "completed":
                return "status-completed";
            case "cancelled":
                return "status-cancelled";
            default:
                return "";
        }
    }

    function getTodayString() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function updateSummary() {
        document.getElementById("allCount").textContent =
            appointments.length;

        document.getElementById("pendingCount").textContent =
            appointments.filter(item =>
                String(item.status).toLowerCase() === "pending"
            ).length;

        document.getElementById("confirmedCount").textContent =
            appointments.filter(item =>
                String(item.status).toLowerCase() === "confirmed"
            ).length;
    }

    function renderActions(item) {
        const status = String(item.status || "").toLowerCase();
        const isUpdating = updatingIds.has(String(item.id));

        if (status === "pending") {
            return `
                <div class="appointment-actions">
                    <button
                        type="button"
                        class="admin-button-primary"
                        data-action="confirmed"
                        data-id="${escapeHTML(item.id)}"
                        ${isUpdating ? "disabled" : ""}
                    >Confirm</button>

                    <button
                        type="button"
                        class="admin-button-danger"
                        data-action="cancelled"
                        data-id="${escapeHTML(item.id)}"
                        ${isUpdating ? "disabled" : ""}
                    >Cancel</button>
                </div>`;
        }

        if (status === "confirmed") {
            return `
                <div class="appointment-actions">
                    <button
                        type="button"
                        class="admin-button-primary"
                        data-action="completed"
                        data-id="${escapeHTML(item.id)}"
                        ${isUpdating ? "disabled" : ""}
                    >Complete</button>

                    <button
                        type="button"
                        class="admin-button-danger"
                        data-action="cancelled"
                        data-id="${escapeHTML(item.id)}"
                        ${isUpdating ? "disabled" : ""}
                    >Cancel</button>
                </div>`;
        }

        return `<span class="action-unavailable">No actions</span>`;
    }

    function renderAppointments() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedDate = dateFilter.value;
        const today = getTodayString();

        const filtered = appointments.filter(item => {
            const searchableText = [
                item.petName,
                item.customerName,
                item.customerEmail,
                item.serviceName,
                item.appointment_date,
                item.appointment_time,
                item.status
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" ||
                String(item.status).toLowerCase() === selectedStatus;

            let matchesDate = true;

            if (selectedDate === "today") {
                matchesDate = item.appointment_date === today;
            } else if (selectedDate === "upcoming") {
                matchesDate =
                    item.appointment_date >= today &&
                    !["cancelled", "completed"].includes(
                        String(item.status).toLowerCase()
                    );
            } else if (selectedDate === "past") {
                matchesDate = item.appointment_date < today;
            }

            return matchesSearch && matchesStatus && matchesDate;
        });

        tableCount.textContent =
            `${filtered.length} appointment${filtered.length === 1 ? "" : "s"}`;

        if (filtered.length === 0) {
            showMessage(
                appointments.length === 0
                    ? "No appointments yet"
                    : "No matching appointments",
                appointments.length === 0
                    ? "New customer bookings will appear here."
                    : "Try changing your search or filters."
            );
            return;
        }

        tableBody.innerHTML = filtered.map(item => {
            const status = String(item.status || "unknown").toLowerCase();

            return `
                <tr>
                    <td>
                        <span class="pet-name">
                            ${escapeHTML(item.petName || "Unknown pet")}
                        </span>
                    </td>

                    <td>
                        <span class="customer-name">
                            ${escapeHTML(item.customerName || "Unknown customer")}
                        </span>
                    </td>

                    <td>${escapeHTML(item.serviceName || "Unknown service")}</td>
                    <td>${escapeHTML(formatDate(item.appointment_date))}</td>
                    <td>${escapeHTML(formatTime(item.appointment_time))}</td>

                    <td>
                        <span class="status-badge ${getStatusClass(status)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>${renderActions(item)}</td>
                </tr>`;
        }).join("");
    }

    async function updateAppointmentStatus(id, newStatus) {
        const appointment = appointments.find(
            item => String(item.id) === String(id)
        );

        if (!appointment) {
            notify("Could not find this appointment.", "error", "Update failed");
            return;
        }

        const currentStatus = String(appointment.status || "").toLowerCase();

        const allowedTransitions = {
            pending: ["confirmed", "cancelled"],
            confirmed: ["completed", "cancelled"]
        };

        if (!(allowedTransitions[currentStatus] || []).includes(newStatus)) {
            notify("This status change is not allowed.", "error", "Update failed");
            return;
        }

        const actionLabels = {
            confirmed: "confirm this booking",
            cancelled: "cancel this booking",
            completed: "mark this booking as completed"
        };

        
if (newStatus === "cancelled") {
    const confirmed = await confirmToast(
        "Are you sure you want to cancel this booking?",
        "Cancel booking"
    );

    if (!confirmed) return;
}

if (newStatus === "completed") {
    const confirmed = await confirmToast(
        "Mark this grooming appointment as completed?",
        "Complete"
    );

    if (!confirmed) return;
}


        updatingIds.add(String(id));
        renderAppointments();

        try {
            const { error } = await supabaseClient
                .from("appointments")
                .update({ status: newStatus })
                .eq("id", id);

            if (error) throw error;

            // Change the local record only after Supabase succeeds.
            appointment.status = newStatus;

            updateSummary();
            renderAppointments();

            const message = {
                confirmed: "Booking confirmed successfully.",
                cancelled: "Booking cancelled successfully.",
                completed: "Appointment marked as completed."
            };

            notify(message[newStatus], "success", "Status updated");
        } catch (error) {
            console.error("APPOINTMENT UPDATE ERROR:", error);

            notify(
                error.message ||
                `Unable to ${actionLabels[newStatus]}.`,
                "error",
                "Update failed"
            );
        } finally {
            updatingIds.delete(String(id));
            renderAppointments();
        }
    }

    // Handle action-button clicks from the appointments table.
    tableBody.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action][data-id]");

        if (!button || button.disabled) return;

        await updateAppointmentStatus(
            button.dataset.id,
            button.dataset.action
        );
    });

    try {
        if (typeof supabaseClient === "undefined") {
            throw new Error("Supabase client was not initialized.");
        }

        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError) throw userError;

        if (!userData.user) {
            window.location.href = "../login.html";
            return;
        }

        const { data: isAdmin, error: roleError } =
            await supabaseClient.rpc("is_admin");

        if (roleError) throw roleError;

        if (isAdmin !== true) {
            showMessage(
                "Access denied",
                "This page is available to administrators only."
            );
            return;
        }

        tableCount.textContent = "Loading appointments...";

        const results = await Promise.all([
            supabaseClient.from("appointments").select("*"),
            supabaseClient.from("pets").select("*"),
            supabaseClient.from("services").select("*"),
            supabaseClient.from("profiles").select("*")
        ]);

        const [
            { data: appointmentRows, error: appointmentError },
            { data: petRows, error: petError },
            { data: serviceRows, error: serviceError },
            { data: profileRows, error: profileError }
        ] = results;

        if (appointmentError) throw appointmentError;
        if (petError) throw petError;
        if (serviceError) throw serviceError;
        if (profileError) throw profileError;

        const petsById = new Map(
            (petRows || []).map(pet => [String(pet.id), pet])
        );

        const servicesById = new Map(
            (serviceRows || []).map(service => [String(service.id), service])
        );

        const profilesById = new Map(
            (profileRows || []).map(profile => [String(profile.id), profile])
        );

        appointments = (appointmentRows || []).map(appointment => {
            const pet = petsById.get(String(appointment.pet_id));
            const service = servicesById.get(String(appointment.service_id));
            const customer = profilesById.get(String(appointment.customer_id));

            return {
                ...appointment,
                petName: pet?.name || "Unknown pet",
                serviceName: service?.name || "Unknown service",
                customerName:
                    customer?.full_name ||
                    customer?.name ||
                    customer?.email ||
                    "Customer",
                customerEmail: customer?.email || ""
            };
        }).sort((a, b) => {
            const dateCompare = String(b.appointment_date || "")
                .localeCompare(String(a.appointment_date || ""));

            if (dateCompare !== 0) return dateCompare;

            return String(a.appointment_time || "")
                .localeCompare(String(b.appointment_time || ""));
        });

        updateSummary();
        renderAppointments();

        searchInput.addEventListener("input", renderAppointments);
        statusFilter.addEventListener("change", renderAppointments);
        dateFilter.addEventListener("change", renderAppointments);

    } catch (error) {
        console.error("Failed to load admin appointments:", error);

        showMessage(
            "Unable to load appointments",
            error.message ||
            "Please check your connection and Supabase permissions."
        );

        tableCount.textContent = "Could not load appointments";
    }
});
