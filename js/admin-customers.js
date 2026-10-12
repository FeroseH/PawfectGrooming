
document.addEventListener("DOMContentLoaded", () => {
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
    

    let allUsers = [];
    let currentAdminId = null;
    let busy = false;

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

    function showMessage(message, isError = false) {
        usersMessage.textContent = message;
        usersMessage.classList.toggle("is-error", isError);
        usersMessage.hidden = false;
    }

    function hideMessage() {
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
                        <option value="Other">
                            Other
                        </option>
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

        document.getElementById("cancelAccountAction").addEventListener(
            "click",
            closeModal
        );

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

    userSearch.addEventListener("input", renderUsers);
    roleFilter.addEventListener("change", renderUsers);
    refreshButton.addEventListener("click", loadUsers);

    

    ensureModal();
    loadUsers();
});
