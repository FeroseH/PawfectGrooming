
/* ========================================
   PAWFECT GROOMING - ADMIN SERVICES
======================================== */

document.addEventListener("DOMContentLoaded", async () => {
    const sidebar = document.getElementById("adminSidebar");
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");
    const logoutButton = document.getElementById("adminLogout");

    const addButton = document.getElementById("addServiceButton");
    const closeButton = document.getElementById("closeServiceForm");
    const cancelButton = document.getElementById("cancelServiceForm");
    const formPanel = document.getElementById("serviceFormPanel");
    const form = document.getElementById("serviceForm");
    const formTitle = document.getElementById("serviceFormTitle");
    const saveButton = document.getElementById("saveServiceButton");

    const serviceId = document.getElementById("serviceId");
    const serviceName = document.getElementById("serviceName");
    const serviceDescription = document.getElementById("serviceDescription");
    const servicePrice = document.getElementById("servicePrice");
    const serviceDuration = document.getElementById("serviceDuration");
    const serviceIsActive = document.getElementById("serviceIsActive");

    const serviceSearch = document.getElementById("serviceSearch");
    const statusFilter = document.getElementById("serviceStatusFilter");
    const refreshButton = document.getElementById("refreshServices");

    const tableBody = document.getElementById("servicesTableBody");
    const servicesCount = document.getElementById("servicesCount");
    const servicesMessage = document.getElementById("servicesMessage");
    const servicesEmpty = document.getElementById("servicesEmpty");

    const totalServices = document.getElementById("totalServices");
    const activeServices = document.getElementById("activeServices");
    const inactiveServices = document.getElementById("inactiveServices");

    let services = [];
    let saving = false;

    /* ========================================
       MESSAGES
    ======================================== */

    function showMessage(message, isError = false) {
        servicesMessage.textContent = message;
        servicesMessage.classList.toggle("error", isError);
        servicesMessage.hidden = false;
    }

    function hideMessage() {
        servicesMessage.hidden = true;
        servicesMessage.textContent = "";
        servicesMessage.classList.remove("error");
    }

function notify(message, isError = false) {
    if (typeof window.showAdminToast === "function") {
        window.showAdminToast(message, isError);
    } else {
        console.error(message);
    }
}

    /* ========================================
       MOBILE NAVIGATION
    ======================================== */

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
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    /* ========================================
       LOGOUT
    ======================================== */

    

    /* ========================================
       ADMIN ACCESS CHECK
    ======================================== */

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
        console.error("Admin access check failed:", error);
        notify("Unable to verify administrator access.", true);
        return;
    }

    /* ========================================
       HELPERS
    ======================================== */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function formatPrice(value) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return "—";
        }

        return amount.toLocaleString("en-PH", {
            style: "currency",
            currency: "PHP"
        });
    }

    function getServiceStatus(service) {
        return service.is_active === true ? "Active" : "Inactive";
    }

    /* ========================================
       STATISTICS
    ======================================== */

    function updateStatistics() {
        const active = services.filter(service => service.is_active === true).length;

        totalServices.textContent = services.length;
        activeServices.textContent = active;
        inactiveServices.textContent = services.length - active;
    }

    /* ========================================
       LOAD SERVICES
    ======================================== */

    async function loadServices() {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
        hideMessage();

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="services-table-state">
                    Loading services...
                </td>
            </tr>
        `;

        servicesEmpty.hidden = true;

        try {
            const { data, error } = await supabaseClient
                .from("services")
                .select("id, name, description, price, duration, is_active")
                .order("id", { ascending: true });

            if (error) throw error;

            services = data || [];

            updateStatistics();
            renderServices();
        } catch (error) {
            console.error("Failed to load services:", error);

            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="services-table-state">
                        Unable to load services.
                    </td>
                </tr>
            `;

            servicesCount.textContent = "Unable to load services";

            notify(
    error.message || "An error occurred while loading services.",
    true
);
        } finally {
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh";
        }
    }

    /* ========================================
       RENDER SERVICES
    ======================================== */

    function renderServices() {
        const searchTerm = serviceSearch.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;

        const filtered = services.filter(service => {
            const name = String(service.name || "").toLowerCase();
            const description = String(service.description || "").toLowerCase();

            const matchesSearch =
                name.includes(searchTerm) ||
                description.includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" ||
                (selectedStatus === "active" && service.is_active === true) ||
                (selectedStatus === "inactive" && service.is_active !== true);

            return matchesSearch && matchesStatus;
        });

        servicesCount.textContent =
            `${filtered.length} ${filtered.length === 1 ? "service" : "services"} found`;

        if (filtered.length === 0) {
            tableBody.innerHTML = "";
            servicesEmpty.hidden = false;
            return;
        }

        servicesEmpty.hidden = true;

        tableBody.innerHTML = filtered.map(service => {
            const status = getServiceStatus(service);
            const isActive = service.is_active === true;

            return `
                <tr>
                    <td>
                        <span class="service-name">
                            ${escapeHTML(service.name || "Unnamed service")}
                        </span>
                        <span class="service-description">
                            ${escapeHTML(service.description || "No description provided")}
                        </span>
                    </td>

                    <td>${escapeHTML(formatPrice(service.price))}</td>

                    <td>${escapeHTML(service.duration ?? "—")} min</td>

                    <td>
                        <span class="service-status ${isActive ? "" : "inactive"}">
                            ${status}
                        </span>
                    </td>

                    <td>
                        <div class="service-actions">
                            <button
                                type="button"
                                class="service-action-button"
                                data-action="edit"
                                data-id="${escapeHTML(service.id)}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="service-action-button ${isActive ? "toggle-active" : "toggle-inactive"}"
                                data-action="toggle"
                                data-id="${escapeHTML(service.id)}"
                            >
                                ${isActive ? "Deactivate" : "Activate"}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    /* ========================================
       OPEN AND CLOSE FORM
    ======================================== */

    function openForm(service = null) {
        form.reset();
        hideMessage();

        serviceId.value = service?.id ?? "";
        serviceName.value = service?.name ?? "";
        serviceDescription.value = service?.description ?? "";
        servicePrice.value = service?.price ?? "";
        serviceDuration.value = service?.duration ?? "";
        serviceIsActive.checked = service ? service.is_active === true : true;

        formTitle.textContent = service ? "Edit Service" : "Add a Service";
        saveButton.textContent = service ? "Save Changes" : "Save Service";

        formPanel.hidden = false;
        formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        serviceName.focus();
    }

    function closeForm() {
        if (saving) return;

        form.reset();
        formPanel.hidden = true;
        serviceId.value = "";
        hideMessage();
    }

    addButton.addEventListener("click", () => openForm());
    closeButton.addEventListener("click", closeForm);
    cancelButton.addEventListener("click", closeForm);

    /* ========================================
       SAVE SERVICE
    ======================================== */

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (saving) return;

        const name = serviceName.value.trim();
        const description = serviceDescription.value.trim();
        const price = Number(servicePrice.value);
        const duration = Number(serviceDuration.value);

        if (!name) {
            notify("Please enter a service name.", true);
            serviceName.focus();
            return;
        }

        if (!Number.isFinite(price) || price < 0) {
            notify("Enter a valid price.", true);
            servicePrice.focus();
            return;
        }

        if (!Number.isInteger(duration) || duration < 1) {
            notify("Duration must be at least one minute.", true);
            serviceDuration.focus();
            return;
        }

        const serviceData = {
            name,
            description,
            price,
            duration,
            is_active: serviceIsActive.checked
        };

        saving = true;
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            let result;

            if (serviceId.value) {
                result = await supabaseClient
                    .from("services")
                    .update(serviceData)
                    .eq("id", serviceId.value);
            } else {
                result = await supabaseClient
                    .from("services")
                    .insert(serviceData);
            }

            if (result.error) throw result.error;

            formPanel.hidden = true;
            form.reset();
            serviceId.value = "";

            await loadServices();

            notify("Service saved successfully.");
        } catch (error) {
            console.error("Failed to save service:", error);

            notify(
    error.message || "Unable to save this service.",
    true
);
        } finally {
            saving = false;
            saveButton.disabled = false;
            saveButton.textContent = serviceId.value
                ? "Save Changes"
                : "Save Service";
        }
    });

    /* ========================================
       EDIT / ACTIVATE / DEACTIVATE
    ======================================== */

    tableBody.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const service = services.find(
            item => String(item.id) === button.dataset.id
        );

        if (!service) return;

        if (button.dataset.action === "edit") {
            openForm(service);
            return;
        }

        if (button.dataset.action === "toggle") {
            const willActivate = service.is_active !== true;

            
const confirmation = await window.showAdminConfirmToast(
    willActivate
        ? `Activate "${service.name}" so customers can book it?`
        : `Deactivate "${service.name}" so it is no longer available for booking?`
);

if (!confirmation) return;


            button.disabled = true;
            hideMessage();

            try {
                const { error } = await supabaseClient
                    .from("services")
                    .update({ is_active: willActivate })
                    .eq("id", service.id);

                if (error) throw error;

                await loadServices();

                notify(
    willActivate
        ? "Service activated successfully."
        : "Service deactivated successfully."
);
            } catch (error) {
                console.error("Failed to update service status:", error);

                notify(
    error.message || "Unable to update service status.",
    true
);
            } finally {
                button.disabled = false;
            }
        }
    });

    /* ========================================
       SEARCH, FILTER, REFRESH
    ======================================== */

    serviceSearch.addEventListener("input", renderServices);
    statusFilter.addEventListener("change", renderServices);
    refreshButton.addEventListener("click", loadServices);

    /* INITIAL LOAD */
    await loadServices();
});
