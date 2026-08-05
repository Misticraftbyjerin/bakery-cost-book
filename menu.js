const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const telLink = "tel:" + BUSINESS_PHONE;
document.getElementById("call-fab").href = telLink;
document.getElementById("hero-title").textContent = (typeof BUSINESS_NAME !== "undefined" ? BUSINESS_NAME : "Our Cake Menu");
document.getElementById("page-title").textContent = (typeof BUSINESS_NAME !== "undefined" ? BUSINESS_NAME + " — Cake Menu" : "Cake Menu");

async function loadMenu() {
  const grid = document.getElementById("menu-grid");
  const { data, error } = await sb.from("public_menu").select("*");

  if (error) {
    grid.innerHTML = `<p class="loading">Couldn't load the menu right now. Please call to order.</p>`;
    console.error(error);
    return;
  }

  if (!data || !data.length) {
    grid.innerHTML = `<div class="empty"><div class="display">Menu coming soon</div>Call us to ask what's available today.</div>`;
    return;
  }

  grid.innerHTML = data
    .map(
      (cake) => `
    <div class="cake-card">
      <div class="cake-photo">${cake.image_url ? `<img src="${cake.image_url}" alt="${cake.name}">` : "🎂"}</div>
      <div class="cake-body">
        <div class="cake-name display">${cake.name}</div>
        ${cake.description ? `<div class="cake-desc">${cake.description}</div>` : ""}
        <div class="cake-meta">
          <span class="cake-price">${cake.selling_price ? Math.round(cake.selling_price) + " tk" : "Ask price"}</span>
          ${cake.delivery_time ? `<span class="cake-delivery">${cake.delivery_time}</span>` : ""}
        </div>
        <a href="${telLink}" class="call-btn">Call to order</a>
      </div>
    </div>`
    )
    .join("");
}

loadMenu();
