/* ═══════════════════════════════════════════════════════════
   MemoryBox — Redesigned script.js
   Features: toasts, modals, drag-drop, preview, dark mode,
             lightbox, search, loading states, animations
   API: unchanged — all existing endpoints preserved
   ═══════════════════════════════════════════════════════════ */

const API_BASE_URL = "https://memorybox-api-arpit123.azurewebsites.net/api";

/* ── DOM References ──────────────────────────────────────── */
const uploadForm = document.getElementById("uploadForm");
const gallery = document.getElementById("gallery");
const galleryLoading = document.getElementById("galleryLoading");
const galleryEmpty = document.getElementById("galleryEmpty");
const galleryNoRes = document.getElementById("galleryNoResults");
const refreshButton = document.getElementById("refreshButton");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const memoryCount = document.getElementById("memoryCount");
const submitBtn = document.getElementById("submitBtn");
const dropZone = document.getElementById("dropZone");
const dropIdle = document.getElementById("dropIdle");
const dropPreview = document.getElementById("dropPreview");
const previewImg = document.getElementById("previewImg");
const previewName = document.getElementById("previewName");
const previewRemove = document.getElementById("previewRemove");
const imageFileInput = document.getElementById("imageFile");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector(".theme-icon");

// Nav
const navBtns = document.querySelectorAll(".nav-btn[data-view], .btn[data-view]");
const uploadPanel = document.getElementById("uploadPanel");
const galleryPanel = document.getElementById("galleryPanel");

// Edit modal
const editModal = document.getElementById("editModal");
const editModalClose = document.getElementById("editModalClose");
const editCancelBtn = document.getElementById("editCancelBtn");
const editSaveBtn = document.getElementById("editSaveBtn");
const editMemoryId = document.getElementById("editMemoryId");
const editTitle = document.getElementById("editTitle");
const editDescription = document.getElementById("editDescription");
const editTags = document.getElementById("editTags");

// Delete modal
const deleteModal = document.getElementById("deleteModal");
const deleteCancelBtn = document.getElementById("deleteCancelBtn");
const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");

// Lightbox
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

/* ── State ───────────────────────────────────────────────── */
let allMemories = [];
let pendingDeleteId = null;
let selectedFile = null;

/* ════════════════════════════════════════════════════════════
   THEME
   ════════════════════════════════════════════════════════════ */
function initTheme() {
  const saved = localStorage.getItem("mb-theme") || "dark";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeIcon.textContent = theme === "dark" ? "☽" : "☀";
  localStorage.setItem("mb-theme", theme);
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

/* ════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ════════════════════════════════════════════════════════════ */
const toastContainer = document.getElementById("toastContainer");

function showToast(message, type = "info", duration = 3500) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  const hide = () => {
    toast.classList.add("hiding");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  };

  const timer = setTimeout(hide, duration);
  toast.addEventListener("click", () => { clearTimeout(timer); hide(); });
}

/* ════════════════════════════════════════════════════════════
   NAV / VIEWS
   ════════════════════════════════════════════════════════════ */
function switchView(view) {
  const isGallery = view === "gallery";
  uploadPanel.hidden = isGallery;
  galleryPanel.hidden = !isGallery;

  document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  if (isGallery && allMemories.length === 0) loadMemories();
}

navBtns.forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

/* ════════════════════════════════════════════════════════════
   DRAG & DROP + FILE PREVIEW
   ════════════════════════════════════════════════════════════ */
function setFile(file) {
  if (!file) return;
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    previewName.textContent = file.name;
    dropIdle.hidden = true;
    dropPreview.hidden = false;
  };
  reader.readAsDataURL(file);
}

function clearFile() {
  selectedFile = null;
  imageFileInput.value = "";
  previewImg.src = "";
  previewName.textContent = "";
  dropIdle.hidden = false;
  dropPreview.hidden = true;
}

imageFileInput.addEventListener("change", e => {
  if (e.target.files[0]) setFile(e.target.files[0]);
});

previewRemove.addEventListener("click", e => {
  e.stopPropagation();
  clearFile();
});

["dragenter", "dragover"].forEach(evt => {
  dropZone.addEventListener(evt, e => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach(evt => {
  dropZone.addEventListener(evt, e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
  });
});

dropZone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    setFile(file);
    // Sync the file input (best effort for form submission flow)
    const dt = new DataTransfer();
    dt.items.add(file);
    imageFileInput.files = dt.files;
  } else if (file) {
    showToast("Please drop an image file.", "error");
  }
});

dropZone.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") imageFileInput.click();
});

/* ════════════════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════════════════ */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function setSubmitLoading(isLoading) {
  const text = submitBtn.querySelector(".btn-text");
  const loader = submitBtn.querySelector(".btn-loader");
  text.hidden = isLoading;
  loader.hidden = !isLoading;
  submitBtn.disabled = isLoading;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ════════════════════════════════════════════════════════════
   UPLOAD
   ════════════════════════════════════════════════════════════ */
async function uploadMemory(event) {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const tagsInput = document.getElementById("tags").value;
  const imageFile = selectedFile || imageFileInput.files[0];

  if (!imageFile) {
    showToast("Please select or drop an image.", "error");
    return;
  }
  if (!title) { showToast("Please enter a title.", "error"); return; }
  if (!description) { showToast("Please enter a description.", "error"); return; }

  setSubmitLoading(true);

  try {
    const fileBase64 = await fileToBase64(imageFile);

    const payload = {
      title,
      description,
      tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
      fileName: imageFile.name,
      contentType: imageFile.type,
      fileBase64
    };

    const response = await fetch(`${API_BASE_URL}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Upload failed.");

    uploadForm.reset();
    clearFile();
    showToast("Memory saved successfully! ✦", "success");

    // Switch to gallery and refresh
    switchView("gallery");
    await loadMemories();

  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setSubmitLoading(false);
  }
}

/* ════════════════════════════════════════════════════════════
   LOAD & RENDER MEMORIES
   ════════════════════════════════════════════════════════════ */
async function loadMemories() {
  galleryLoading.hidden = false;
  galleryEmpty.hidden = true;
  galleryNoRes.hidden = true;
  gallery.hidden = true;
  gallery.innerHTML = "";

  try {
    const response = await fetch(`${API_BASE_URL}/memories`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to load memories.");

    allMemories = data;
    galleryLoading.hidden = true;
    gallery.hidden = false;

    renderMemories(filterBySearch(allMemories));

  } catch (error) {
    galleryLoading.hidden = true;
    gallery.hidden = false;
    showToast(error.message, "error");
    gallery.innerHTML = `<p style="color:var(--text-muted);padding:20px 0">${escapeHtml(error.message)}</p>`;
  }
}

function filterBySearch(memories) {
  const term = searchInput.value.toLowerCase().trim();
  if (!term) return memories;
  return memories.filter(m => {
    const t = (m.title || "").toLowerCase();
    const d = (m.description || "").toLowerCase();
    const g = (m.tags || []).join(" ").toLowerCase();
    return t.includes(term) || d.includes(term) || g.includes(term);
  });
}

function renderMemories(memories) {
  // Update count
  const total = allMemories.length;
  memoryCount.textContent = total === 1 ? "1 memory" : `${total} memories`;
  memoryCount.hidden = total === 0;

  if (allMemories.length === 0) {
    galleryEmpty.hidden = false;
    galleryNoRes.hidden = true;
    gallery.innerHTML = "";
    return;
  }

  if (memories.length === 0) {
    galleryNoRes.hidden = false;
    galleryEmpty.hidden = true;
    gallery.innerHTML = "";
    return;
  }

  galleryEmpty.hidden = true;
  galleryNoRes.hidden = true;

  gallery.innerHTML = memories.map(m => {
    const tags = (m.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
    const date = formatDate(m.uploadedAt);

    return `
      <article class="memory-card" role="listitem" data-id="${escapeHtml(m.memoryId)}">
        <div class="card-img-wrap" data-src="${escapeHtml(m.blobUrl)}" data-alt="${escapeHtml(m.title)}">
          <img src="${escapeHtml(m.blobUrl)}" alt="${escapeHtml(m.title)}" loading="lazy" />
          <div class="card-img-overlay">
            <span class="card-date-overlay">${date}</span>
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-title" title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</h3>
          <p class="card-desc">${escapeHtml(m.description)}</p>
          ${tags ? `<div class="card-tags">${tags}</div>` : ""}
          <div class="card-actions">
            <button class="btn btn-ghost" data-action="edit" data-id="${escapeHtml(m.memoryId)}">
              Edit
            </button>
            <button class="btn btn-danger" data-action="delete" data-id="${escapeHtml(m.memoryId)}">
              Delete
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/* ── Gallery click delegation ────────────────────────────── */
gallery.addEventListener("click", e => {
  // Image lightbox
  const imgWrap = e.target.closest(".card-img-wrap");
  if (imgWrap && !e.target.closest("button")) {
    openLightbox(imgWrap.dataset.src, imgWrap.dataset.alt);
    return;
  }

  // Action buttons
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  if (btn.dataset.action === "edit") openEditModal(id);
  if (btn.dataset.action === "delete") openDeleteModal(id);
});

/* ════════════════════════════════════════════════════════════
   SEARCH
   ════════════════════════════════════════════════════════════ */
searchInput.addEventListener("input", () => {
  const hasTerm = searchInput.value.trim().length > 0;
  searchClear.hidden = !hasTerm;
  renderMemories(filterBySearch(allMemories));
});

searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchClear.hidden = true;
  renderMemories(allMemories);
  searchInput.focus();
});

/* ════════════════════════════════════════════════════════════
   EDIT MODAL
   ════════════════════════════════════════════════════════════ */
function openEditModal(memoryId) {
  const memory = allMemories.find(m => m.memoryId === memoryId);
  if (!memory) return;

  editMemoryId.value = memoryId;
  editTitle.value = memory.title || "";
  editDescription.value = memory.description || "";
  editTags.value = (memory.tags || []).join(", ");

  editModal.classList.add("open");
  editTitle.focus();
}

function closeEditModal() {
  editModal.classList.remove("open");
}

editModalClose.addEventListener("click", closeEditModal);
editCancelBtn.addEventListener("click", closeEditModal);
editModal.addEventListener("click", e => { if (e.target === editModal) closeEditModal(); });

editSaveBtn.addEventListener("click", async () => {
  const memoryId = editMemoryId.value;
  const title = editTitle.value.trim();
  const description = editDescription.value.trim();
  const tagsRaw = editTags.value;

  if (!title) { showToast("Title cannot be empty.", "error"); return; }
  if (!description) { showToast("Description cannot be empty.", "error"); return; }

  editSaveBtn.disabled = true;
  editSaveBtn.textContent = "Saving…";

  try {
    const response = await fetch(`${API_BASE_URL}/memories/${memoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        tags: tagsRaw.split(",").map(t => t.trim()).filter(Boolean)
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to update memory.");

    closeEditModal();
    showToast("Memory updated. ✦", "success");
    await loadMemories();

  } catch (error) {
    showToast(error.message, "error");
  } finally {
    editSaveBtn.disabled = false;
    editSaveBtn.textContent = "Save Changes";
  }
});

// Keyboard shortcut: Enter to save in edit modal
editModal.addEventListener("keydown", e => {
  if (e.key === "Escape") closeEditModal();
});

/* ════════════════════════════════════════════════════════════
   DELETE MODAL
   ════════════════════════════════════════════════════════════ */
function openDeleteModal(memoryId) {
  pendingDeleteId = memoryId;
  deleteModal.classList.add("open");
  deleteConfirmBtn.focus();
}

function closeDeleteModal() {
  deleteModal.classList.remove("open");
  pendingDeleteId = null;
}

deleteCancelBtn.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", e => { if (e.target === deleteModal) closeDeleteModal(); });
deleteModal.addEventListener("keydown", e => { if (e.key === "Escape") closeDeleteModal(); });

deleteConfirmBtn.addEventListener("click", async () => {
  if (!pendingDeleteId) return;

  deleteConfirmBtn.disabled = true;
  deleteConfirmBtn.textContent = "Deleting…";

  try {
    const response = await fetch(`${API_BASE_URL}/memories/${pendingDeleteId}`, {
      method: "DELETE"
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to delete memory.");

    closeDeleteModal();
    showToast("Memory deleted.", "info");
    await loadMemories();

  } catch (error) {
    showToast(error.message, "error");
  } finally {
    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = "Delete";
  }
});

/* ════════════════════════════════════════════════════════════
   LIGHTBOX
   ════════════════════════════════════════════════════════════ */
function openLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt || "";
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", e => { if (e.target !== lightboxImg) closeLightbox(); });

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeLightbox();
    closeEditModal();
    closeDeleteModal();
  }
});

/* ════════════════════════════════════════════════════════════
   REFRESH BUTTON (with spin animation)
   ════════════════════════════════════════════════════════════ */
refreshButton.addEventListener("click", async () => {
  const svg = refreshButton.querySelector("svg");
  svg.style.transition = "transform 0.6s ease";
  svg.style.transform = "rotate(360deg)";
  await loadMemories();
  setTimeout(() => {
    svg.style.transition = "none";
    svg.style.transform = "rotate(0deg)";
  }, 650);
});

/* ════════════════════════════════════════════════════════════
   FORM SUBMIT
   ════════════════════════════════════════════════════════════ */
uploadForm.addEventListener("submit", uploadMemory);

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */
initTheme();
switchView("gallery");