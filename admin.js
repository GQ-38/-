const statusMap = {
  available: "在售",
  reserved: "已预定",
  sold: "已卖出"
};

const MAX_IMAGES_PER_ITEM = 30;

let fileShopInfo = structuredClone(window.SHOP_INFO || {
  title: "校园二手闲置",
  description: "个人闲置书籍、学习资料和桌面小配件，状态实时更新。",
  address: "西华大学德馨苑2号楼下",
  qq: "1474349048",
  phone: ""
});

let fileItems = structuredClone(Array.isArray(window.ITEMS) ? window.ITEMS : []);
let shopInfo = structuredClone(fileShopInfo);
let items = structuredClone(fileItems);
let editingId = null;
let selectedPhotoData = [];

const $ = id => document.getElementById(id);

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function slugify(text) {
  const base = String(text || "item")
    .trim()
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "item"}-${Date.now().toString(36)}`;
}

function firstImage(item) {
  return item.images && item.images.length ? item.images[0] : "images/placeholder.svg";
}

function fillShopForm() {
  $("shopTitle").value = shopInfo.title || "";
  $("shopDesc").value = shopInfo.description || "";
  $("shopAddress").value = shopInfo.address || "";
  $("shopQQ").value = shopInfo.qq || "";
  $("shopPhone").value = shopInfo.phone || "";
}

function readShopForm() {
  shopInfo = {
    title: $("shopTitle").value.trim() || "校园二手闲置",
    description: $("shopDesc").value.trim(),
    address: $("shopAddress").value.trim(),
    qq: $("shopQQ").value.trim(),
    phone: $("shopPhone").value.trim()
  };
}

function currentItemCountText() {
  return `当前编辑列表：${items.length} 件商品。数据来源：${window.__DATA_SOURCE_TIP || "data/items.js"}`;
}

function updateDataSourceTip() {
  $("dataSourceTip").textContent = currentItemCountText();
}

function renderPreviewList() {
  const list = $("previewList");
  list.innerHTML = "";
  updateDataSourceTip();

  if (!items.length) {
    list.innerHTML = `<p class="empty">还没有商品，请从左侧添加。</p>`;
    return;
  }

  const sorted = [...items].sort((a, b) => {
    if (a.status === "sold" && b.status !== "sold") return 1;
    if (a.status !== "sold" && b.status === "sold") return -1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  for (const item of sorted) {
    const row = document.createElement("div");
    row.className = "preview-item";
    row.innerHTML = `
      <img src="${escapeText(firstImage(item))}" alt="${escapeText(item.title)}">
      <div>
        <h4>${escapeText(item.title)} · ￥${escapeText(item.price)}</h4>
        <p>${escapeText(item.category || "其他")}｜${statusMap[item.status] || "在售"}｜浏览 ${Number(item.views || 0)} 次｜图片 ${(item.images || []).length} 张</p>
        <p>${escapeText((item.description || "").slice(0, 60))}${(item.description || "").length > 60 ? "..." : ""}</p>
        <div class="actions">
          <button class="soft-btn" data-edit="${escapeText(item.id)}">编辑</button>
          <button class="danger-btn" data-delete="${escapeText(item.id)}">删除</button>
        </div>
      </div>
    `;
    row.querySelector("[data-edit]").onclick = () => editItem(item.id);
    row.querySelector("[data-delete]").onclick = () => deleteItem(item.id);
    list.appendChild(row);
  }
}

function renderPhotoThumbs() {
  const box = $("photoThumbs");
  $("photoCount").textContent = selectedPhotoData.length;
  if (!selectedPhotoData.length) {
    box.innerHTML = `<p class="small">还没有选择图片。可以点击上方区域、拖拽图片，或直接 Ctrl+V 粘贴截图。</p>`;
    return;
  }

  box.innerHTML = selectedPhotoData.map((src, index) => `
    <div class="photo-thumb-card">
      <img src="${escapeText(src)}" alt="已选择照片 ${index + 1}">
      <button type="button" class="photo-remove-btn" data-remove-photo="${index}" title="删除这张图">×</button>
      <span class="photo-index">${index + 1}</span>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove-photo]").forEach(btn => {
    btn.onclick = () => {
      const index = Number(btn.dataset.removePhoto);
      selectedPhotoData.splice(index, 1);
      renderPhotoThumbs();
    };
  });
}

function resetForm() {
  editingId = null;
  selectedPhotoData = [];
  $("formTitle").textContent = "添加商品";
  $("itemTitle").value = "";
  $("itemCategory").value = "";
  $("itemStatus").value = "available";
  $("itemPrice").value = "";
  $("itemOriginalPrice").value = "";
  $("itemCondition").value = "";
  $("itemDescription").value = "";
  $("itemViews").value = "0";
  $("itemPhotos").value = "";
  $("itemImagePaths").value = "";
  renderPhotoThumbs();
}

function editItem(id) {
  const item = items.find(x => x.id === id);
  if (!item) return;
  editingId = id;
  selectedPhotoData = (item.images || []).filter(src => src.startsWith("data:image/"));
  $("formTitle").textContent = "编辑商品";
  $("itemTitle").value = item.title || "";
  $("itemCategory").value = item.category || "";
  $("itemStatus").value = item.status || "available";
  $("itemPrice").value = item.price ?? "";
  $("itemOriginalPrice").value = item.originalPrice ?? "";
  $("itemCondition").value = item.condition || "";
  $("itemDescription").value = item.description || "";
  $("itemViews").value = item.views ?? 0;
  $("itemPhotos").value = "";
  $("itemImagePaths").value = (item.images || []).filter(src => !src.startsWith("data:image/")).join("\n");
  renderPhotoThumbs();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteItem(id) {
  if (!confirm("确定删除这个商品吗？")) return;
  items = items.filter(item => item.id !== id);
  renderPreviewList();
  savePreview(false);
}

function readItemForm() {
  const title = $("itemTitle").value.trim();
  if (!title) {
    alert("请填写物品名称。");
    return null;
  }

  const pathImages = $("itemImagePaths").value
    .split(/\n|,/)
    .map(x => x.trim())
    .filter(Boolean);

  return {
    id: editingId || slugify(title),
    title,
    category: $("itemCategory").value.trim() || "其他",
    price: Number($("itemPrice").value || 0),
    originalPrice: $("itemOriginalPrice").value ? Number($("itemOriginalPrice").value) : "",
    condition: $("itemCondition").value.trim(),
    description: $("itemDescription").value.trim(),
    images: [...selectedPhotoData, ...pathImages],
    status: $("itemStatus").value,
    views: Number($("itemViews").value || 0),
    createdAt: editingId
      ? (items.find(x => x.id === editingId)?.createdAt || new Date().toISOString().slice(0, 10))
      : new Date().toISOString().slice(0, 10)
  };
}

function saveItem() {
  readShopForm();
  const item = readItemForm();
  if (!item) return;

  const index = items.findIndex(x => x.id === item.id);
  if (index >= 0) {
    items[index] = item;
  } else {
    items.unshift(item);
  }

  window.__DATA_SOURCE_TIP = "本机编辑列表，尚未导出";
  renderPreviewList();
  savePreview(false);
  resetForm();
  alert("已保存商品。打开 index.html?preview=1 可以本机预览；确认后请导出 data/items.js 并上传到 GitHub。");
}

function savePreview(showAlert = true) {
  readShopForm();
  try {
    localStorage.setItem("secondHandShopPreview", JSON.stringify(shopInfo));
    localStorage.setItem("secondHandItemsPreview", JSON.stringify(items));
    window.__DATA_SOURCE_TIP = "本机预览 localStorage";
    updateDataSourceTip();
    if (showAlert) alert("已保存到本机预览。现在打开 index.html?preview=1 可以看到本机预览效果。");
  } catch (error) {
    alert("保存失败：图片可能太多或太大。请删除几张图片，或降低图片数量后再试。");
  }
}

function clearPreview() {
  if (!confirm("确定清除本机预览吗？这不会删除 data/items.js，只会清空浏览器里的临时修改。")) return;
  localStorage.removeItem("secondHandShopPreview");
  localStorage.removeItem("secondHandItemsPreview");
  reloadFromFile(false);
  alert("已清除本机预览，并重新读取 data/items.js。");
}

function reloadFromFile(ask = true) {
  if (ask && !confirm("确定用当前 data/items.js 重新读取吗？这会覆盖本机预览里的未导出修改。")) return;
  shopInfo = structuredClone(fileShopInfo);
  items = structuredClone(fileItems);
  editingId = null;
  selectedPhotoData = [];
  window.__DATA_SOURCE_TIP = "data/items.js";
  fillShopForm();
  resetForm();
  renderPreviewList();
}

function exportDataFile() {
  readShopForm();
  const data = `window.SHOP_INFO = ${JSON.stringify(shopInfo, null, 2)};\n\nwindow.ITEMS = ${JSON.stringify(items, null, 2)};\n`;
  const blob = new Blob([data], { type: "application/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "items.js";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function compressImage(file, maxSize = 1200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      reject(new Error("不是图片文件"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("图片加载失败"));
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(1, maxSize / Math.max(width, height));
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function addImageFiles(fileList, sourceName = "本地") {
  const files = [...fileList].filter(file => file.type && file.type.startsWith("image/"));
  if (!files.length) {
    alert(`没有检测到图片。请${sourceName === "剪贴板" ? "复制图片或截图后再粘贴" : "选择图片文件"}。`);
    return;
  }

  const remaining = MAX_IMAGES_PER_ITEM - selectedPhotoData.length;
  if (remaining <= 0) {
    alert(`最多支持 ${MAX_IMAGES_PER_ITEM} 张图片。`);
    return;
  }

  const filesToAdd = files.slice(0, remaining);
  const zone = $("pasteUploadZone");
  zone.classList.add("uploading");

  let success = 0;
  for (const file of filesToAdd) {
    try {
      const compressed = await compressImage(file);
      selectedPhotoData.push(compressed);
      success++;
      renderPhotoThumbs();
    } catch (error) {
      console.warn(error);
    }
  }

  zone.classList.remove("uploading");

  if (files.length > remaining) {
    alert(`已添加 ${success} 张。最多支持 ${MAX_IMAGES_PER_ITEM} 张，超出的图片没有添加。`);
  } else if (success > 0) {
    showUploadHint(`已从${sourceName}添加 ${success} 张图片。`);
  } else {
    alert("图片处理失败，请换一张图片试试。");
  }
}

function showUploadHint(text) {
  const zone = $("pasteUploadZone");
  const old = zone.querySelector(".upload-flash");
  if (old) old.remove();

  const msg = document.createElement("div");
  msg.className = "upload-flash";
  msg.textContent = text;
  zone.appendChild(msg);

  setTimeout(() => msg.remove(), 1800);
}

function handlePhotos(event) {
  addImageFiles(event.target.files, "本地");
  event.target.value = "";
}

function handlePaste(event) {
  const clipboardData = event.clipboardData || window.clipboardData;
  if (!clipboardData) return;

  const files = [];
  for (const item of clipboardData.items || []) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file && file.type.startsWith("image/")) files.push(file);
    }
  }

  if (files.length) {
    event.preventDefault();
    addImageFiles(files, "剪贴板");
    return;
  }

  if (clipboardData.files && clipboardData.files.length) {
    event.preventDefault();
    addImageFiles(clipboardData.files, "剪贴板");
  }
}

function handleDrop(event) {
  event.preventDefault();
  $("pasteUploadZone").classList.remove("drag-over");
  if (event.dataTransfer?.files?.length) {
    addImageFiles(event.dataTransfer.files, "拖拽");
  }
}

function initUploadZone() {
  const zone = $("pasteUploadZone");
  const fileInput = $("itemPhotos");

  $("choosePhotosBtn").onclick = event => {
    event.stopPropagation();
    fileInput.click();
  };

  $("clearPhotosBtn").onclick = event => {
    event.stopPropagation();
    if (!selectedPhotoData.length) return;
    if (confirm("确定清空当前已选图片吗？")) {
      selectedPhotoData = [];
      renderPhotoThumbs();
    }
  };

  zone.addEventListener("click", event => {
    if (event.target.tagName !== "BUTTON") {
      fileInput.click();
    }
  });

  zone.addEventListener("paste", handlePaste);
  document.addEventListener("paste", event => {
    const active = document.activeElement;
    const isTyping = active && ["INPUT", "TEXTAREA"].includes(active.tagName);
    if (!isTyping) handlePaste(event);
  });

  zone.addEventListener("dragover", event => {
    event.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("drag-over");
  });

  zone.addEventListener("drop", handleDrop);
}

function init() {
  window.__DATA_SOURCE_TIP = "data/items.js";
  fillShopForm();
  renderPreviewList();
  renderPhotoThumbs();

  $("saveItem").onclick = saveItem;
  $("resetForm").onclick = resetForm;
  $("savePreview").onclick = () => savePreview(true);
  $("clearPreview").onclick = clearPreview;
  $("exportFile").onclick = exportDataFile;
  $("reloadFromFile").onclick = () => reloadFromFile(true);
  $("itemPhotos").onchange = handlePhotos;

  initUploadZone();
}

init();
