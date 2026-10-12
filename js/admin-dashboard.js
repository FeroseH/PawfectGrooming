
document.addEventListener("DOMContentLoaded", async function () {
    const todayCount = document.getElementById("todayCount");
    const pendingCount = document.getElementById("pendingCount");
    const customerCount = document.getElementById("customerCount");
    const petCount = document.getElementById("petCount");

    const appointmentsPanel = document.querySelector(".appointments-panel");
    const appointmentsContainer = appointmentsPanel.querySelector(".empty-state");

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function getTodayString() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(`${value}T00:00:00`);

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric"
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

    function showError(message) {
        appointmentsContainer.innerHTML = `
            <strong>Unable to load dashboard data</strong>
            <p>${escapeHTML(message)}</p>
        `;
    }

    try {
        // 1. Verify the logged-in user.
        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError) throw userError;

        if (!userData.user) {
            window.location.href = "../login.html";
            return;
        }

        // 2. Verify that the user is an administrator.
        const { data: isAdmin, error: roleError } =
            await supabaseClient.rpc("is_admin");

        if (roleError) throw roleError;

        if (isAdmin !== true) {
            showError("This dashboard is available to administrators only.");
            return;
        }

        appointmentsContainer.innerHTML = `
            <strong>Loading appointments...</strong>
            <p>Please wait while we retrieve your booking records.</p>
        `;

        // 3. Fetch the required records from Supabase.
        const results = await Promise.all([
            supabaseClient.from("appointments").select("*"),
            supabaseClient.from("profiles").select("*"),
            supabaseClient.from("pets").select("*")
        ]);

        const [
            { data: appointmentRows, error: appointmentError },
            { data: profileRows, error: profileError },
            { data: petRows, error: petError }
        ] = results;

        if (appointmentError) throw appointmentError;
        if (profileError) throw profileError;
        if (petError) throw petError;

        const appointments = appointmentRows || [];
        const profiles = profileRows || [];
        const pets = petRows || [];

        // 4. Calculate dashboard statistics.
        const today = getTodayString();

        const todaysAppointments = appointments.filter(appointment =>
            appointment.appointment_date === today &&
            !["cancelled", "completed"].includes(
                String(appointment.status || "").toLowerCase()
            )
        );

        const pendingAppointments = appointments.filter(appointment =>
            String(appointment.status || "").toLowerCase() === "pending"
        );

        const customers = profiles.filter(profile =>
            String(profile.role || "").toLowerCase() === "customer"
        );

        todayCount.textContent = todaysAppointments.length;
        pendingCount.textContent = pendingAppointments.length;
        customerCount.textContent = customers.length;
        petCount.textContent = pets.length;

        // 5. Match each appointment to its pet and customer.
        const petsById = new Map(
            pets.map(pet => [String(pet.id), pet])
        );

        const profilesById = new Map(
            profiles.map(profile => [String(profile.id), profile])
        );

        const recentAppointments = appointments
            .map(appointment => {
                const pet = petsById.get(String(appointment.pet_id));
                const customer = profilesById.get(
                    String(appointment.customer_id)
                );

                return {
                    ...appointment,
                    petName: pet?.name || "Unknown pet",
                    customerName:
                        customer?.full_name ||
                        customer?.name ||
                        customer?.email ||
                        "Customer"
                };
            })
            .sort((a, b) => {
                const dateCompare = String(b.appointment_date || "")
                    .localeCompare(String(a.appointment_date || ""));

                if (dateCompare !== 0) return dateCompare;

                return String(b.appointment_time || "")
                    .localeCompare(String(a.appointment_time || ""));
            })
            .slice(0, 5);

        // 6. Display the five most recent appointment dates.
        if (recentAppointments.length === 0) {
            appointmentsContainer.innerHTML = `
                <strong>No appointments yet</strong>
                <p>New customer bookings will appear here.</p>
            `;
            return;
        }

        appointmentsContainer.outerHTML = `
            <div class="dashboard-recent-list">
                ${recentAppointments.map(appointment => {
                    const status = String(
                        appointment.status || "unknown"
                    ).toLowerCase();

                    return `
                        <div class="dashboard-recent-item">
                            <div class="dashboard-recent-details">
                                <strong>
                                    ${escapeHTML(appointment.petName)}
                                </strong>
                                <span>
                                    ${escapeHTML(appointment.customerName)}
                                </span>
                                <small>
                                    ${escapeHTML(formatDate(
                                        appointment.appointment_date
                                    ))}
                                    ·
                                    ${escapeHTML(formatTime(
                                        appointment.appointment_time
                                    ))}
                                </small>
                            </div>

                            <span class="status-badge ${getStatusClass(status)}">
                                ${escapeHTML(status)}
                            </span>
                        </div>
                    `;
                }).join("")}
            </div>
        `;

    } catch (error) {
        console.error("ADMIN DASHBOARD ERROR:", error);

        showError(
            error.message ||
            "Please check your Supabase connection and RLS policies."
        );
    }
});
