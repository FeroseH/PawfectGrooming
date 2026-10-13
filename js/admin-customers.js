
document.addEventListener("DOMContentLoaded", () => {
    // Registered users elements
    const tableBody = document.getElementById("usersTableBody");
    const totalUsers = document.getElementById("totalUsers");
    const totalCustomers = document.getElementById("totalCustomers");
    const totalAdmins = document.getElementById("totalAdmins");
    const usersCount = document.getElementById("usersCount");
    const usersMessage = document.getElementById("usersMessage");
    const usersEmpty = document.getElementById("usersEmpty");
    const userSearch = document.getElementById("userSearch");
    const roleFilter = document.getElementById("roleFilter");
    const refreshButton = document.getElementById("refreshUsers");

    // Deactivation requests elements
    const requestsBody = document.getElementById("deactivationRequestsBody");
    const requestsCount = document.getElementById("deactivationRequestsCount");
    const requestsMessage = document.getElementById("deactivationRequestsMessage");
    const refreshRequestsButton = document.getElementById("refreshDeactivationRequests");

    let allUsers = [];
    let currentAdminId = null;
    let busy = false;
    let requestsBusy = false;
    let allRequests = [];

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatDateTime(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function showMessage(message, isError = false) {
        if (!usersMessage) return;

        usersMessage.textContent = message;
        usersMessage.classList.toggle("is-error", isError);
        usersMessage.hidden = false;
    }

    function hideMessage() {
        if (!usersMessage) return;

        usersMessage.hidden = true;
        usersMessage.textContent = "";
        usersMessage.classList.remove("is-error");
    }

    function notify(message, isError = false) {
        if (typeof window.showAdminToast === "function") {
            window.showAdminToast(message, isError);
        } else {
            console.error(message);
        }
    }

    function updateStats(users) {
        totalUsers.textContent = users.length;
        totalCustomers.textContent =
            users.filter(user => user.role === "customer").length;
        totalAdmins.textContent =
            users.filter(user => user.role === "admin").length;
    }

    // --------------------------------------------------
    // MANUAL DEACTIVATION MODAL
    // --------------------------------------------------

    function ensureModal() {
        if (document.getElementById("accountStatusModal")) return;

        document.body.insertAdjacentHTML("beforeend", `
            <div id="accountStatusModal" class="account-status-backdrop" hidden>
                <section
                    class="account-status-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="accountModalTitle"
                >
                    <h2 id="accountModalTitle">Deactivate customer?</h2>

                    <p id="accountModalDescription">
                        The customer account will be marked as deactivated.
                    </p>

                    <label for="deactivationReason">
                        Reason for deactivation
                    </label>

                    <select id="deactivationReason">
                        <option value="">Choose a reason</option>
                        <option value="Customer requested account closure">
                            Customer requested account closure
                        </option>
                        <option value="Duplicate account">
                            Duplicate account
                        </option>
                        <option value="Fraudulent or suspicious activity">
                            Fraudulent or suspicious activity
                        </option>
                        <option value="Abusive or inappropriate behavior">
                            Abusive or inappropriate behavior
                        </option>
                        <option value="Security concern">
                            Security concern
                        </option>
                        <option value="Other">Other</option>
                    </select>

                    <label for="otherDeactivationReason" id="otherReasonLabel" hidden>
                        Please specify
                    </label>

                    <textarea
                        id="otherDeactivationReason"
                        rows="3"
                        maxlength="500"
                        placeholder="Explain the reason..."
                        hidden
                    ></textarea>

                    <p id="accountModalError" role="alert" hidden></p>

                    <div class="account-status-modal-actions">
                        <button type="button" id="cancelAccountAction">
                            Cancel
                        </button>
                        <button type="button" id="confirmAccountAction">
                            Deactivate Account
                        </button>
                    </div>
                </section>
            </div>
        `);

        const modal = document.getElementById("accountStatusModal");
        const reason = document.getElementById("deactivationReason");
        const otherReason = document.getElementById("otherDeactivationReason");
        const otherLabel = document.getElementById("otherReasonLabel");

        reason.addEventListener("change", () => {
            const showOther = reason.value === "Other";
            otherReason.hidden = !showOther;
            otherLabel.hidden = !showOther;
        });

        document.getElementById("cancelAccountAction")
            .addEventListener("click", closeModal);

        modal.addEventListener("click", event => {
            if (event.target === modal) closeModal();
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !modal.hidden) closeModal();
        });
    }

    function closeModal() {
        const modal = document.getElementById("accountStatusModal");
        if (modal) modal.hidden = true;
    }

    // --------------------------------------------------
    // REGISTERED USERS TABLE
    // --------------------------------------------------

    function renderUsers() {
        const searchTerm = userSearch.value.trim().toLowerCase();
        const selectedRole = roleFilter.value;

        const filteredUsers = allUsers.filter(user => {
            const searchableText = [
                user.full_name,
                user.email,
                user.phone
            ].join(" ").toLowerCase();

            return searchableText.includes(searchTerm) &&
                (selectedRole === "all" || user.role === selectedRole);
        });

        usersCount.textContent =
            `${filteredUsers.length} of ${allUsers.length} user${allUsers.length === 1 ? "" : "s"}`;

        usersEmpty.hidden = filteredUsers.length !== 0;
        tableBody.innerHTML = "";

        if (filteredUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="users-table-state">
                        No matching accounts.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredUsers.map(user => {
            const name = user.full_name?.trim() || "Unnamed user";
            const initial = name.charAt(0).toUpperCase() || "U";
            const role = user.role || "unknown";
            const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
            const isCustomer = role === "customer";
            const isActive = user.is_active !== false;

            let actionMarkup = "—";

            if (isCustomer) {
                actionMarkup = isActive
                    ? `<button type="button" class="account-action-button deactivate-button" data-action="deactivate" data-user-id="${escapeHTML(user.id)}">Deactivate</button>`
                    : `<button type="button" class="account-action-button reactivate-button" data-action="reactivate" data-user-id="${escapeHTML(user.id)}">Reactivate</button>`;
            }

            return `
                <tr>
                    <td>
                        <div class="users-identity">
                            <span class="users-avatar">${escapeHTML(initial)}</span>
                            <div class="users-identity-details">
                                <strong>${escapeHTML(name)}</strong>
                                <span>${escapeHTML(user.email || "No email available")}</span>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHTML(user.phone || "—")}</td>
                    <td>
                        <span class="users-role users-role-${escapeHTML(role)}">
                            ${escapeHTML(roleLabel)}
                        </span>
                    </td>
                    <td>${escapeHTML(formatDate(user.created_at))}</td>
                    <td>
                        <span class="account-status ${isActive ? "account-status-active" : "account-status-inactive"}">
                            ${isActive ? "Active" : "Deactivated"}
                        </span>
                        ${!isActive && user.deactivation_reason
                            ? `<small class="account-status-reason">Reason: ${escapeHTML(user.deactivation_reason)}</small>`
                            : ""}
                    </td>
                    <td>${actionMarkup}</td>
                </tr>
            `;
        }).join("");
    }

    async function changeAccountStatus(userId, shouldBeActive, reason = null) {
        const { error } = await supabaseClient.rpc(
            "set_customer_account_status",
            {
                target_user_id: userId,
                should_be_active: shouldBeActive,
                action_reason: reason
            }
        );

        if (error) throw error;

        notify(
            shouldBeActive
                ? "Customer account reactivated successfully."
                : "Customer account deactivated successfully."
        );

        await loadUsers();
    }

    async function openDeactivationModal(user) {
        ensureModal();

        const modal = document.getElementById("accountStatusModal");
        const reason = document.getElementById("deactivationReason");
        const otherReason = document.getElementById("otherDeactivationReason");
        const otherLabel = document.getElementById("otherReasonLabel");
        const errorBox = document.getElementById("accountModalError");
        const confirmButton = document.getElementById("confirmAccountAction");

        reason.value = "";
        otherReason.value = "";
        otherReason.hidden = true;
        otherLabel.hidden = true;
        errorBox.hidden = true;

        document.getElementById("accountModalTitle").textContent =
            "Deactivate customer?";

        document.getElementById("accountModalDescription").textContent =
            `You are about to deactivate ${user.full_name || user.email || "this customer"}.`;

        confirmButton.textContent = "Deactivate Account";
        confirmButton.disabled = false;
        modal.hidden = false;

        confirmButton.onclick = async () => {
            let selectedReason = reason.value;

            if (!selectedReason) {
                errorBox.textContent = "Please select a reason.";
                errorBox.hidden = false;
                return;
            }

            if (selectedReason === "Other") {
                selectedReason = otherReason.value.trim();

                if (!selectedReason) {
                    errorBox.textContent = "Please specify the reason.";
                    errorBox.hidden = false;
                    return;
                }
            }

            const confirmed = await window.showAdminConfirmToast(
                `Are you sure you want to deactivate ${
                    user.full_name || user.email || "this customer"
                }?`
            );

            if (!confirmed) return;

            confirmButton.disabled = true;
            confirmButton.textContent = "Processing...";
            errorBox.hidden = true;

            try {
                await changeAccountStatus(user.id, false, selectedReason);
                closeModal();
            } catch (error) {
                console.error("Deactivation failed:", error);
                errorBox.textContent =
                    error.message || "Unable to deactivate this account.";
                errorBox.hidden = false;
            } finally {
                confirmButton.disabled = false;
                confirmButton.textContent = "Deactivate Account";
            }
        };
    }

    async function reactivateCustomer(user) {
        const name = user.full_name || user.email || "this customer";

        const confirmed = await window.showAdminConfirmToast(
            `Are you sure you want to restore ${name}'s account?`
        );

        if (!confirmed) return;

        try {
            await changeAccountStatus(user.id, true);
        } catch (error) {
            console.error("Reactivation failed:", error);
            notify(
                error.message || "Unable to reactivate this account.",
                true
            );
        }
    }

    async function loadUsers() {
        if (busy) return;

        busy = true;
        hideMessage();
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="users-table-state">
                    Loading user accounts...
                </td>
            </tr>
        `;

        try {
            const {
                data: { user },
                error: authError
            } = await supabaseClient.auth.getUser();

            if (authError || !user) {
                window.location.href = "../login.html";
                return;
            }

            const { data: profile, error: profileError } =
                await supabaseClient
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

            if (profileError || profile?.role !== "admin") {
                window.location.href =
                    profile?.role === "customer"
                        ? "../customer/dashboard.html"
                        : "../login.html";
                return;
            }

            currentAdminId = user.id;

            const { data, error } = await supabaseClient
                .from("profiles")
                .select("id, full_name, email, phone, role, created_at, is_active, deactivation_reason, deactivated_at, deactivated_by")
                .order("created_at", { ascending: false });

            if (error) throw error;

            allUsers = data || [];
            updateStats(allUsers);
            renderUsers();

        } catch (error) {
            console.error("Unable to load users:", error);

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="users-table-state">
                        Unable to load user accounts.
                    </td>
                </tr>
            `;

            usersCount.textContent = "User list unavailable";
            notify(
                error.message || "Something went wrong while loading users.",
                true
            );
        } finally {
            busy = false;
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh";
        }
    }

    // --------------------------------------------------
    // CUSTOMER DEACTIVATION REQUESTS
    // --------------------------------------------------

    function showRequestsMessage(message, isError = false) {
        if (!requestsMessage) return;

        requestsMessage.textContent = message;
        requestsMessage.classList.toggle("is-error", isError);
        requestsMessage.hidden = false;
    }

    function renderRequests() {
        if (!requestsBody || !requestsCount) return;

        if (allRequests.length === 0) {
            requestsCount.textContent = "No deactivation requests found.";
            requestsBody.innerHTML = `
                <tr>
                    <td colspan="6" class="users-table-state">
                        No deactivation requests yet.
                    </td>
                </tr>
            `;
            return;
        }

        const pendingCount = allRequests.filter(
            request => request.status === "pending"
        ).length;

        requestsCount.textContent =
            `${allRequests.length} request${allRequests.length === 1 ? "" : "s"} total · ${pendingCount} pending`;

        // Pending requests appear first, followed by the most recent.
        const sortedRequests = [...allRequests].sort((a, b) => {
            if (a.status === "pending" && b.status !== "pending") return -1;
            if (a.status !== "pending" && b.status === "pending") return 1;

            return new Date(b.requested_at) - new Date(a.requested_at);
        });

        requestsBody.innerHTML = sortedRequests.map(request => {
            const customer = request.customer;
            const customerName =
                customer?.full_name?.trim() || "Unnamed customer";
            const customerEmail = customer?.email || "No email available";

            const statusClass = request.status === "approved"
                ? "account-status-inactive"
                : request.status === "rejected"
                    ? "account-status-inactive"
                    : "account-status-active";

            let actionMarkup = "Reviewed";

            if (request.status === "pending") {
                actionMarkup = `
                    <div class="deactivation-request-actions">
                        <button
                            type="button"
                            class="account-action-button deactivate-button"
                            data-request-action="approve"
                            data-request-id="${escapeHTML(request.id)}"
                            ${requestsBusy ? "disabled" : ""}
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            class="account-action-button reactivate-button"
                            data-request-action="reject"
                            data-request-id="${escapeHTML(request.id)}"
                            ${requestsBusy ? "disabled" : ""}
                        >
                            Reject
                        </button>
                    </div>
                `;
            }

            return `
                <tr>
                    <td>
                        <div class="users-identity">
                            <span class="users-avatar">
                                ${escapeHTML(customerName.charAt(0).toUpperCase() || "U")}
                            </span>
                            <div class="users-identity-details">
                                <strong>${escapeHTML(customerName)}</strong>
                                <span>${escapeHTML(customerEmail)}</span>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHTML(request.reason || "—")}</td>
                    <td class="deactivation-request-details">
                        ${escapeHTML(request.details || "No additional details provided.")}
                    </td>
                    <td>${escapeHTML(formatDateTime(request.requested_at))}</td>
                    <td>
                        <span class="account-status ${statusClass}">
                            ${escapeHTML(
                                request.status.charAt(0).toUpperCase() +
                                request.status.slice(1)
                            )}
                        </span>
                        ${request.reviewed_at
                            ? `<small class="account-status-reason">Reviewed: ${escapeHTML(formatDateTime(request.reviewed_at))}</small>`
                            : ""}
                    </td>
                    <td>${actionMarkup}</td>
                </tr>
            `;
        }).join("");
    }

    async function loadDeactivationRequests() {
        if (!requestsBody || !requestsCount) return;
        if (requestsBusy) return;

        requestsBusy = true;

        if (refreshRequestsButton) {
            refreshRequestsButton.disabled = true;
            refreshRequestsButton.textContent = "Loading...";
        }

        requestsCount.textContent = "Loading requests...";
        requestsBody.innerHTML = `
            <tr>
                <td colspan="6" class="users-table-state">
                    Loading deactivation requests...
                </td>
            </tr>
        `;

        if (requestsMessage) {
            requestsMessage.hidden = true;
            requestsMessage.textContent = "";
            requestsMessage.classList.remove("is-error");
        }

        try {
            // Ensure the current session belongs to an administrator.
            const {
                data: { user },
                error: authError
            } = await supabaseClient.auth.getUser();

            if (authError || !user) {
                throw new Error("Your session has expired. Please sign in again.");
            }

            const { data: profile, error: profileError } =
                await supabaseClient
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

            if (profileError || profile?.role !== "admin") {
                throw new Error("Only administrators can view these requests.");
            }

            currentAdminId = user.id;

            const { data: requests, error: requestsError } =
                await supabaseClient
                    .from("account_deactivation_requests")
                    .select("id, customer_id, reason, details, status, requested_at, reviewed_at, reviewed_by")
                    .order("requested_at", { ascending: false });

            if (requestsError) throw requestsError;

            const customerIds = [
                ...new Set((requests || []).map(request => request.customer_id))
            ];

            let profilesById = {};

            if (customerIds.length > 0) {
                const { data: customerProfiles, error: customerProfilesError } =
                    await supabaseClient
                        .from("profiles")
                        .select("id, full_name, email")
                        .in("id", customerIds);

                if (customerProfilesError) throw customerProfilesError;

                profilesById = Object.fromEntries(
                    (customerProfiles || []).map(profile => [
                        profile.id,
                        profile
                    ])
                );
            }

            allRequests = (requests || []).map(request => ({
                ...request,
                customer: profilesById[request.customer_id] || null
            }));

            renderRequests();

        } catch (error) {
            console.error("Unable to load deactivation requests:", error);

            requestsCount.textContent = "Requests unavailable.";
            requestsBody.innerHTML = `
                <tr>
                    <td colspan="6" class="users-table-state">
                        Unable to load deactivation requests.
                    </td>
                </tr>
            `;

            showRequestsMessage(
                error.message || "Unable to load deactivation requests.",
                true
            );
        } finally {
            requestsBusy = false;

            if (refreshRequestsButton) {
                refreshRequestsButton.disabled = false;
                refreshRequestsButton.textContent = "Refresh Requests";
            }

            // Re-render to re-enable pending request actions.
            if (allRequests.length > 0) renderRequests();
        }
    }

    async function reviewDeactivationRequest(requestId, approve) {
        const request = allRequests.find(item => item.id === requestId);

        if (!request || request.status !== "pending") {
            notify("This request has already been reviewed or is unavailable.", true);
            await loadDeactivationRequests();
            return;
        }

        const customerName =
            request.customer?.full_name?.trim() ||
            request.customer?.email ||
            "this customer";

        const message = approve
            ? `Approve the deactivation request for ${customerName}? Their account will be deactivated.`
            : `Reject the deactivation request for ${customerName}? Their account will remain active.`;

        const confirmed = await window.showAdminConfirmToast(message);

        if (!confirmed) return;

        try {
            const { error } = await supabaseClient.rpc(
                "review_customer_deactivation_request",
                {
                    p_request_id: requestId,
                    p_approve: approve
                }
            );

            if (error) throw error;

            notify(
                approve
                    ? "Request approved. The customer account has been deactivated."
                    : "Request rejected. The customer account remains active."
            );

            // Refresh both the requests and registered users tables.
            await Promise.all([
                loadUsers(),
                loadDeactivationRequests()
            ]);

        } catch (error) {
            console.error("Unable to review deactivation request:", error);

            notify(
                error.message || "Unable to review this request.",
                true
            );

            await loadDeactivationRequests();
        }
    }

    // --------------------------------------------------
    // EVENT LISTENERS
    // --------------------------------------------------

    tableBody.addEventListener("click", async event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const user = allUsers.find(
            item => item.id === button.dataset.userId
        );

        if (!user || user.role !== "customer") return;

        if (button.dataset.action === "deactivate") {
            await openDeactivationModal(user);
        } else if (button.dataset.action === "reactivate") {
            await reactivateCustomer(user);
        }
    });

    if (requestsBody) {
        requestsBody.addEventListener("click", async event => {
            const button = event.target.closest("[data-request-action]");
            if (!button || requestsBusy) return;

            const action = button.dataset.requestAction;

            if (action !== "approve" && action !== "reject") return;

            await reviewDeactivationRequest(
                button.dataset.requestId,
                action === "approve"
            );
        });
    }

    userSearch.addEventListener("input", renderUsers);
    roleFilter.addEventListener("change", renderUsers);
    refreshButton.addEventListener("click", loadUsers);

    if (refreshRequestsButton) {
        refreshRequestsButton.addEventListener(
            "click",
            loadDeactivationRequests
        );
    }

    ensureModal();

    // Load both tables when the admin page opens.
    loadUsers().then(() => {
        if (currentAdminId) loadDeactivationRequests();
    });
});
