const statusMap = {
  available: "在售",
  reserved: "已预定",
  sold: "已卖出"
};

function getShopInfo() {
  return window.SHOP_INFO || {
    title: "校园二手闲置",
    description: "个人闲置物品展示",
    address: "西华大学德馨苑2号楼下",
    qq: "1474349048",
    phone: "请填写你的电话号码"
  };
}

function getItems() {
  // 管理页保存到浏览器后，首页本机预览会优先使用本地版本。
  // 真正给别人看时，请用管理页导出 data/items.js 并重新上传。
  try {
    const local = localStorage.getItem("secondHandItemsPreview");
    const localShop = localStorage.getItem("secondHandShopPreview");
    if (local) {
      window.SHOP_INFO = localShop ? JSON.parse(localShop) : getShopInfo();
      return JSON.parse(local);
    }
  } catch (error) {
    console.warn("本地预览数据读取失败，已使用 data/items.js", error);
  }
  return Array.isArray(window.ITEMS) ? window.ITEMS : [];
}

let allItems = getItems();

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function firstImage(item) {
  return item.images && item.images.length ? item.images[0] : "images/placeholder.svg";
}

function sortedItems(items) {
  return [...items].sort((a, b) => {
    if (a.status === "sold" && b.status !== "sold") return 1;
    if (a.status !== "sold" && b.status === "sold") return -1;
    if ((b.views || 0) !== (a.views || 0)) return (b.views || 0) - (a.views || 0);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function renderShopInfo() {
  const shop = getShopInfo();
  document.title = shop.title || "校园二手闲置";
  document.getElementById("siteTitle").textContent = shop.title || "校园二手闲置";
  document.getElementById("siteDesc").textContent = shop.description || "";
  document.getElementById("addressText").textContent = `自提地点：${shop.address || ""}`;
  document.getElementById("qqText").textContent = shop.qq || "";
  document.getElementById("phoneText").textContent = shop.phone || "";
  document.getElementById("footerAddress").textContent = shop.address || "";
  document.getElementById("copyQQ").onclick = () => copyText(shop.qq || "");
  document.getElementById("copyPhone").onclick = () => copyText(shop.phone || "");
}

function renderCategoryOptions() {
  const select = document.getElementById("categoryFilter");
  const categories = [...new Set(allItems.map(item => item.category).filter(Boolean))];
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  }
}

function renderItems() {
  const grid = document.getElementById("itemsGrid");
  const empty = document.getElementById("emptyText");
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const status = document.getElementById("statusFilter").value;

  const filtered = sortedItems(allItems).filter(item => {
    const text = [item.title, item.category, item.condition, item.description].join(" ").toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    const matchCategory = category === "all" || item.category === category;
    const matchStatus = status === "all" || item.status === status;
    return matchKeyword && matchCategory && matchStatus;
  });

  grid.innerHTML = "";
  empty.classList.toggle("hidden", filtered.length !== 0);

  for (const item of filtered) {
    const card = document.createElement("article");
    card.className = `card ${item.status === "sold" ? "sold" : ""}`;
    card.innerHTML = `
      <img class="cover" src="${safeText(firstImage(item))}" alt="${safeText(item.title)}">
      <div class="card-body">
        <span class="badge ${safeText(item.status)}">${statusMap[item.status] || "在售"}</span>
        <h3>${safeText(item.title)}</h3>
        <div class="price-row">
          <span class="price">￥${safeText(item.price)}</span>
          ${item.originalPrice ? `<span class="old-price">原价 ￥${safeText(item.originalPrice)}</span>` : ""}
        </div>
        <p class="desc">${safeText(item.description || "").slice(0, 62)}${(item.description || "").length > 62 ? "..." : ""}</p>
        <div class="meta">
          <span>${safeText(item.category || "其他")}</span>
          <span>${safeText(item.condition || "成色未填")}</span>
          <span>浏览 ${Number(item.views || 0)} 次</span>
        </div>
        <div class="card-actions">
          <button class="primary-btn" data-id="${safeText(item.id)}">查看详情</button>
        </div>
      </div>
    `;
    card.querySelector("button").onclick = () => openDetail(item.id);
    grid.appendChild(card);
  }
}

function openDetail(id) {
  const item = allItems.find(x => x.id === id);
  if (!item) return;

  // 纯静态不能给所有人真实累加浏览次数，只在本机预览加 1。
  item.views = Number(item.views || 0) + 1;
  try {
    localStorage.setItem("secondHandItemsPreview", JSON.stringify(allItems));
  } catch {}

  const shop = getShopInfo();
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");
  const images = (item.images && item.images.length ? item.images : ["images/placeholder.svg"])
    .map(src => `<img src="${safeText(src)}" alt="${safeText(item.title)}">`)
    .join("");

  body.innerHTML = `
    <div class="detail-images">${images}</div>
    <h2>${safeText(item.title)}</h2>
    <span class="badge ${safeText(item.status)}">${statusMap[item.status] || "在售"}</span>
    ${item.status === "sold" ? `<div class="sold-alert">该物品已经卖出，请勿重复咨询。</div>` : ""}
    <div class="price-row">
      <span class="price">￥${safeText(item.price)}</span>
      ${item.originalPrice ? `<span class="old-price">原价 ￥${safeText(item.originalPrice)}</span>` : ""}
    </div>
    <p><strong>分类：</strong>${safeText(item.category || "其他")}</p>
    <p><strong>成色：</strong>${safeText(item.condition || "未填写")}</p>
    <p><strong>浏览次数：</strong>${Number(item.views || 0)} 次</p>
    <p><strong>发布时间：</strong>${safeText(item.createdAt || "")}</p>
    <p class="desc">${safeText(item.description || "")}</p>
    <hr>
    <p><strong>自提地点：</strong>${safeText(shop.address || "")}</p>
    <p><strong>QQ：</strong>${safeText(shop.qq || "")}</p>
    <p><strong>电话：</strong>${safeText(shop.phone || "")}</p>
    <div class="actions">
      <button class="primary-btn" onclick="copyText('${safeText(shop.qq || "")}')">复制 QQ</button>
      <button class="soft-btn" onclick="copyText('${safeText(shop.phone || "")}')">复制电话</button>
    </div>
  `;
  modal.classList.remove("hidden");
  renderItems();
}

function copyText(text) {
  if (!text || text.includes("请填写")) {
    alert("还没有填写电话或 QQ。");
    return;
  }
  navigator.clipboard?.writeText(text).then(() => {
    alert("已复制：" + text);
  }).catch(() => {
    prompt("请手动复制：", text);
  });
}

function init() {
  renderShopInfo();
  renderCategoryOptions();
  renderItems();
  document.getElementById("searchInput").addEventListener("input", renderItems);
  document.getElementById("categoryFilter").addEventListener("change", renderItems);
  document.getElementById("statusFilter").addEventListener("change", renderItems);
  document.getElementById("closeModal").addEventListener("click", () => document.getElementById("modal").classList.add("hidden"));
  document.getElementById("modal").addEventListener("click", event => {
    if (event.target.id === "modal") document.getElementById("modal").classList.add("hidden");
  });
}

init();
