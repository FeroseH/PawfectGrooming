
/* ========================================
   PAWFECT GROOMING - ADMIN PETS
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("adminSidebar");
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");
    const logoutButton = document.getElementById("adminLogout");

    const petSearch = document.getElementById("petSearch");
    const speciesFilter = document.getElementById("speciesFilter");
    const refreshButton = document.getElementById("refreshPets");

    const tableBody = document.getElementById("petsTableBody");
    const petsCount = document.getElementById("petsCount");
    const petsMessage = document.getElementById("petsMessage");
    const petsEmpty = document.getElementById("petsEmpty");

    const totalPets = document.getElementById("totalPets");
    const totalDogs = document.getElementById("totalDogs");
    const totalCats = document.getElementById("totalCats");

    const activePetsTab = document.getElementById("activePetsTab");
    const archivedPetsTab = document.getElementById("archivedPetsTab");

    let pets = [];
    let owners = {};
    let currentView = "active";

    /* ========================================
       MOBILE SIDEBAR
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
        if (event.key === "Escape") closeSidebar();
    });

    /* ========================================
       LOGOUT
    ======================================== */

    

    /* ========================================
       HELPERS
    ======================================== */

function ensureArchiveReasonModal() {
    if (document.getElementById("archiveReasonModal")) return;

    document.body.insertAdjacentHTML("beforeend", `
        <div class="pet-reason-backdrop" id="archiveReasonModal" hidden>
            <section
                class="pet-reason-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="archiveReasonTitle"
            >
                <div class="pet-reason-heading">
                    <span class="pet-reason-eyebrow">PET MANAGEMENT</span>
                    <h2 id="archiveReasonTitle">Archive pet</h2>
                    <p id="archiveReasonDescription">
                        Please provide a reason for archiving this pet.
                    </p>
                </div>

                <label for="archiveReasonInput">Reason for archiving</label>
                <textarea
                    id="archiveReasonInput"
                    rows="4"
                    maxlength="500"
                    placeholder="Enter the reason here..."
                ></textarea>

                <p class="pet-reason-error" id="archiveReasonError" hidden>
                    Please enter a reason before continuing.
                </p>

                <div class="pet-reason-actions">
                    <button type="button" id="cancelArchiveReason">
                        Cancel
                    </button>
                    <button type="button" id="continueArchiveReason">
                        Continue
                    </button>
                </div>
            </section>
        </div>
    `);
}

function closeArchiveReasonModal() {
    const modal = document.getElementById("archiveReasonModal");
    if (modal) modal.hidden = true;
}

function askArchiveReason(petName) {
    ensureArchiveReasonModal();

    const modal = document.getElementById("archiveReasonModal");
    const input = document.getElementById("archiveReasonInput");
    const error = document.getElementById("archiveReasonError");
    const description = document.getElementById("archiveReasonDescription");
    const continueButton = document.getElementById("continueArchiveReason");

    description.textContent =
        `Please provide a reason for archiving ${petName}.`;

    input.value = "";
    error.hidden = true;
    modal.hidden = false;
    input.focus();

    return new Promise(resolve => {
        function cleanup() {
            continueButton.removeEventListener("click", handleContinue);
            document.getElementById("cancelArchiveReason")
                .removeEventListener("click", handleCancel);
            modal.removeEventListener("click", handleBackdrop);
            document.removeEventListener("keydown", handleEscape);
        }

        function handleCancel() {
            cleanup();
            closeArchiveReasonModal();
            resolve(null);
        }

        function handleBackdrop(event) {
            if (event.target === modal) handleCancel();
        }

        function handleEscape(event) {
            if (event.key === "Escape" && !modal.hidden) handleCancel();
        }

        function handleContinue() {
            const reason = input.value.trim();

            if (!reason) {
                error.hidden = false;
                input.focus();
                return;
            }

            cleanup();
            closeArchiveReasonModal();
            resolve(reason);
        }

        continueButton.addEventListener("click", handleContinue);
        document.getElementById("cancelArchiveReason")
            .addEventListener("click", handleCancel);
        modal.addEventListener("click", handleBackdrop);
        document.addEventListener("keydown", handleEscape);
    });
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

    function getPetName(pet) {
        return pet.name || "Unnamed pet";
    }

    function getSpecies(pet) {
        return String(pet.species || "Other").trim();
    }

    function getBreed(pet) {
        return pet.breed || "Not specified";
    }

    function getOwnerId(pet) {
        return pet.owner_id || null;
    }

    function getOwnerName(pet) {
        const ownerId = getOwnerId(pet);

        if (ownerId && owners[ownerId]) {
            return owners[ownerId];
        }

        return "Owner unavailable";
    }

    function getAge(pet) {
        if (pet.age === null || pet.age === undefined || pet.age === "") {
            return "Not specified";
        }

        const age = Number(pet.age);

        if (!Number.isNaN(age)) {
            return `${age} ${age === 1 ? "year" : "years"}`;
        }

        return String(pet.age);
    }

    function getRegisteredDate(pet) {
        if (!pet.created_at) return "—";

        const date = new Date(pet.created_at);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function isDog(pet) {
        return getSpecies(pet).toLowerCase() === "dog";
    }

    function isCat(pet) {
        return getSpecies(pet).toLowerCase() === "cat";
    }

    function showMessage(message, isError = false) {
        petsMessage.textContent = message;
        petsMessage.classList.toggle("error", isError);
        petsMessage.hidden = false;
    }

    function hideMessage() {
        petsMessage.hidden = true;
        petsMessage.textContent = "";
        petsMessage.classList.remove("error");
    }

    function notify(message, isError = false) {
    if (typeof window.showAdminToast === "function") {
        window.showAdminToast(message, isError);
    } else {
        console.error(message);
    }
}
    /* ========================================
       VIEW TABS
    ======================================== */

    function setView(view) {
        currentView = view;

        activePetsTab.classList.toggle("active", view === "active");
        archivedPetsTab.classList.toggle("active", view === "archived");

        activePetsTab.setAttribute(
            "aria-pressed",
            String(view === "active")
        );

        archivedPetsTab.setAttribute(
            "aria-pressed",
            String(view === "archived")
        );

        petSearch.value = "";
        speciesFilter.value = "all";

        petsEmpty.querySelector("h3").textContent =
            view === "active" ? "No active pets found" : "No archived pets found";

        petsEmpty.querySelector("p").textContent =
            view === "active"
                ? "Try another search term or change the pet type filter."
                : "Archived pet records will appear here.";

        hideMessage();
        renderPets();
    }

    activePetsTab.addEventListener("click", () => setView("active"));
    archivedPetsTab.addEventListener("click", () => setView("archived"));

    /* ========================================
       LOAD OWNER NAMES
    ======================================== */

    async function loadOwners(petRecords) {
        owners = {};

        const ownerIds = [
            ...new Set(petRecords.map(getOwnerId).filter(Boolean))
        ];

        if (ownerIds.length === 0) return;

        const { data, error } = await supabaseClient
            .from("profiles")
            .select("id, full_name")
            .in("id", ownerIds);

        if (error) {
            console.warn("Could not load owner names:", error.message);
            return;
        }

        (data || []).forEach(profile => {
            owners[profile.id] = profile.full_name || "Unnamed owner";
        });
    }

    /* ========================================
       LOAD PET RECORDS
    ======================================== */

    async function loadPets() {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="pets-table-state">
                    Loading pet records...
                </td>
            </tr>
        `;

        petsEmpty.hidden = true;
        hideMessage();

        try {
            const { data, error } = await supabaseClient
                .from("pets")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            pets = data || [];
            await loadOwners(pets);

            updateStatistics();
            renderPets();
        } catch (error) {
            console.error("Failed to load pets:", error);

            pets = [];
            owners = {};

            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="pets-table-state">
                        Unable to load pet records.
                        Check your Supabase table and access policies.
                    </td>
                </tr>
            `;

            petsCount.textContent = "Unable to load records";
            totalPets.textContent = "—";
            totalDogs.textContent = "—";
            totalCats.textContent = "—";

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
       STATISTICS
       Counts all pets, including archived records.
    ======================================== */

    function updateStatistics() {
        totalPets.textContent = pets.length;
        totalDogs.textContent = pets.filter(isDog).length;
        totalCats.textContent = pets.filter(isCat).length;
    }

    /* ========================================
       RENDER PET RECORDS
    ======================================== */

    function renderPets() {
        const searchTerm = petSearch.value.trim().toLowerCase();
        const selectedSpecies = speciesFilter.value;

        const filteredPets = pets.filter(pet => {
            const isArchived = pet.is_archived === true;

            if (currentView === "active" && isArchived) return false;
            if (currentView === "archived" && !isArchived) return false;

            const name = getPetName(pet).toLowerCase();
            const breed = getBreed(pet).toLowerCase();
            const owner = getOwnerName(pet).toLowerCase();
            const species = getSpecies(pet).toLowerCase();

            const matchesSearch =
                name.includes(searchTerm) ||
                breed.includes(searchTerm) ||
                owner.includes(searchTerm) ||
                species.includes(searchTerm);

            let matchesSpecies = true;

            if (selectedSpecies === "dog") {
                matchesSpecies = isDog(pet);
            } else if (selectedSpecies === "cat") {
                matchesSpecies = isCat(pet);
            } else if (selectedSpecies === "other") {
                matchesSpecies = !isDog(pet) && !isCat(pet);
            }

            return matchesSearch && matchesSpecies;
        });

        const countLabel =
            `${filteredPets.length} ${filteredPets.length === 1 ? "pet" : "pets"} found`;

        petsCount.textContent = currentView === "active"
            ? `${countLabel} · Active`
            : `${countLabel} · Archived`;

        if (filteredPets.length === 0) {
            tableBody.innerHTML = "";
            petsEmpty.hidden = false;
            return;
        }

        petsEmpty.hidden = true;

        tableBody.innerHTML = filteredPets.map(pet => {
            const name = escapeHTML(getPetName(pet));
            const species = escapeHTML(getSpecies(pet));
            const breed = escapeHTML(getBreed(pet));
            const age = escapeHTML(getAge(pet));
            const owner = escapeHTML(getOwnerName(pet));
            const date = escapeHTML(getRegisteredDate(pet));

            const actionButton = pet.is_archived
                ? `<button type="button"
                        class="pet-action-button pet-restore-button"
                        data-action="restore"
                        data-pet-id="${pet.id}">
                        Restore
                   </button>`
                : `<button type="button"
                        class="pet-action-button pet-archive-button"
                        data-action="archive"
                        data-pet-id="${pet.id}">
                        Archive
                   </button>`;

            return `
                <tr>
                    <td><span class="pet-name">${name}</span></td>
                    <td><span class="pet-type">${species}</span></td>
                    <td>${breed}</td>
                    <td>${age}</td>
                    <td><span class="pet-owner">${owner}</span></td>
                    <td>${date}</td>
                    <td>${actionButton}</td>
                </tr>
            `;
        }).join("");
    }

    /* ========================================
       ARCHIVE / RESTORE PET
    ======================================== */

    
tableBody.addEventListener("click", async event => {
    const button = event.target.closest("[data-action][data-pet-id]");

    if (!button || button.disabled) return;

    const petId = Number(button.dataset.petId);
    const action = button.dataset.action;
    const pet = pets.find(item => item.id === petId);

    if (!pet || !Number.isSafeInteger(petId)) {
        notify("Could not find that pet record. Refresh and try again.", true);
        return;
    }

    if (action === "archive") {
        const reason = await askArchiveReason(getPetName(pet));

if (reason === null) return;

        const confirmed = await window.showAdminConfirmToast(
            `Are you sure you want to archive ${getPetName(pet)}? The record will be moved to Archived Pets, not deleted.`
        );

        if (!confirmed) return;

        await changePetArchiveStatus(
            petId, true, reason.trim(), button
        );
    }

    if (action === "restore") {
        const confirmed = await window.showAdminConfirmToast(
            `Are you sure you want to restore ${getPetName(pet)}? The record will return to Active Pets.`
        );

        if (!confirmed) return;

        await changePetArchiveStatus(
            petId, false, null, button
        );
    }
});


    async function changePetArchiveStatus(petId, shouldArchive, reason, button) {
        button.disabled = true;
        button.textContent = shouldArchive ? "Archiving..." : "Restoring...";
        hideMessage();

        try {
            const { error } = await supabaseClient.rpc(
                "set_pet_archive_status",
                {
                    p_pet_id: petId,
                    p_archive: shouldArchive,
                    p_reason: reason
                }
            );

            if (error) throw error;

            notify(
    shouldArchive
        ? "Pet archived successfully."
        : "Pet restored successfully."
);

            await loadPets();
        } catch (error) {
            console.error("Could not update pet status:", error);

            notify(
    error.message || "Unable to update this pet. Please try again.",
    true
);

            button.disabled = false;
            button.textContent = shouldArchive ? "Archive" : "Restore";
        }
    }

    /* ========================================
       SEARCH, FILTER, REFRESH
    ======================================== */

    petSearch.addEventListener("input", renderPets);
    speciesFilter.addEventListener("change", renderPets);
    refreshButton.addEventListener("click", loadPets);

    /* ========================================
       INITIALIZE
    ======================================== */

    loadPets();
});
