// ============================================================
// Setup
// ============================================================
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let categories = [];
let ingredients = [];
let recipes = [];
let currentUser = null;
let recipeLineCount = 0;

const $ = (id) => document.getElementById(id);
const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2);

function toast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => (t.className = "toast"), 2600);
}

// ============================================================
// AUTH
// ============================================================
let isSignupMode = false;

$("toggle-mode").addEventListener("click", () => {
  isSignupMode = !isSignupMode;
  $("toggle-text").textContent = isSignupMode ? "Already have an account?" : "First time here?";
  $("toggle-mode").textContent = isSignupMode ? "Log in instead" : "Create your account";
  $("login-error").style.display = "none";
  $("login-note").style.display = "none";
});

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;
  $("login-error").style.display = "none";
  $("login-note").style.display = "none";

  if (isSignupMode) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
      $("login-error").textContent = error.message;
      $("login-error").style.display = "block";
      return;
    }
    if (data.session) {
      await onLoggedIn(data.session.user);
    } else {
      $("login-note").textContent = "Account created. Check your email to confirm, then log in.";
      $("login-note").style.display = "block";
    }
  } else {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      $("login-error").textContent = error.message;
      $("login-error").style.display = "block";
      return;
    }
    await onLoggedIn(data.user);
  }
});

$("signout-btn").addEventListener("click", async () => {
  await sb.auth.signOut();
  location.reload();
});

async function onLoggedIn(user) {
  currentUser = user;
  $("login-screen").style.display = "none";
  $("app").className = "visible";
  await loadCategories();
  await loadIngredients();
  await loadRecipes();
  await loadSales();
  await loadExpenses();
  renderDashboard();
}

// check existing session on page load
(async () => {
  const { data } = await sb.auth.getSession();
  if (data.session) await onLoggedIn(data.session.user);
})();

// ============================================================
// TAB NAV
// ============================================================
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    $("view-" + btn.dataset.view).classList.add("active");
  });
});

document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => $(btn.dataset.close).classList.remove("visible"));
});

// ============================================================
// CATEGORIES
// ============================================================
async function loadCategories() {
  const { data, error } = await sb.from("categories").select("*").order("name");
  if (error) return toast(error.message, true);
  categories = data;
  const sel = $("ing-category");
  sel.innerHTML = categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
}

// ============================================================
// INGREDIENTS
// ============================================================
async function loadIngredients() {
  const { data, error } = await sb.from("ingredients").select("*, categories(name)").order("created_at", { ascending: false });
  if (error) return toast(error.message, true);
  ingredients = data;
  renderIngredients();
}

function renderIngredients(filterText = "") {
  const grid = $("ingredients-grid");
  const term = filterText.trim().toLowerCase();
  const filtered = term
    ? ingredients.filter(
        (ing) =>
          ing.name.toLowerCase().includes(term) ||
          (ing.item_code && ing.item_code.toLowerCase().includes(term))
      )
    : ingredients;

  if (!ingredients.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="display">No ingredients yet</div>Add your first one to start building recipes.</div>`;
    return;
  }
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="display">No matches</div>Try a different search term.</div>`;
    return;
  }
  grid.innerHTML = filtered
    .map(
      (ing) => `
    <div class="ing-card">
      <div class="thumb">${ing.image_url ? `<img src="${ing.image_url}">` : "🧂"}</div>
      <div class="body">
        <div class="name">${ing.name}${ing.item_code ? `<span class="code-tag">${ing.item_code}</span>` : ""}</div>
        <div class="cat">${ing.categories?.name || "Uncategorized"}</div>
        <div class="price-row">
          <span class="price-tag">${fmt(ing.unit_price)} tk/${ing.base_unit}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-outline btn-sm" onclick="editIngredient('${ing.id}')">Edit</button>
          <button class="btn-text btn-sm" onclick="deleteIngredient('${ing.id}')">Delete</button>
        </div>
      </div>
    </div>`
    )
    .join("");
}

$("ingredient-search").addEventListener("input", (e) => renderIngredients(e.target.value));

function computeUnitPricePreview() {
  const qty = parseFloat($("ing-package-qty").value);
  const price = parseFloat($("ing-package-price").value);
  const unit = $("ing-base-unit").value;
  if (qty > 0 && price >= 0) {
    $("unit-price-value").textContent = `${fmt(price / qty)} tk / ${unit}`;
  } else {
    $("unit-price-value").textContent = "—";
  }
}
["ing-package-qty", "ing-package-price", "ing-base-unit"].forEach((id) =>
  $(id).addEventListener("input", computeUnitPricePreview)
);

$("add-ingredient-btn").addEventListener("click", () => openIngredientModal());

function openIngredientModal(ing = null) {
  $("ingredient-form").reset();
  $("ing-id").value = ing ? ing.id : "";
  $("ingredient-modal-title").textContent = ing ? "Edit ingredient" : "Add ingredient";
  if (ing) {
    $("ing-name").value = ing.name;
    $("ing-code").value = ing.item_code || "";
    $("ing-category").value = ing.category_id || "";
    $("ing-package-qty").value = ing.package_qty;
    $("ing-base-unit").value = ing.base_unit;
    $("ing-package-price").value = ing.package_price;
  }
  computeUnitPricePreview();
  $("ingredient-modal").classList.add("visible");
}

window.editIngredient = (id) => openIngredientModal(ingredients.find((i) => i.id === id));

window.deleteIngredient = async (id) => {
  if (!confirm("Delete this ingredient? Existing recipes keep their saved cost either way.")) return;
  const { error } = await sb.from("ingredients").delete().eq("id", id);
  if (error) return toast(error.message, true);
  toast("Ingredient deleted");
  loadIngredients();
};

async function uploadImage(file, folder) {
  if (!file) return null;
  const path = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const { error } = await sb.storage.from("bakery-images").upload(path, file);
  if (error) {
    toast("Image upload failed: " + error.message, true);
    return null;
  }
  return sb.storage.from("bakery-images").getPublicUrl(path).data.publicUrl;
}

$("ingredient-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("ing-id").value;
  const package_qty = parseFloat($("ing-package-qty").value);
  const package_price = parseFloat($("ing-package-price").value);
  const unit_price = package_price / package_qty;
  const imageFile = $("ing-image").files[0];

  const payload = {
    name: $("ing-name").value.trim(),
    item_code: $("ing-code").value.trim() || null,
    category_id: $("ing-category").value || null,
    base_unit: $("ing-base-unit").value,
    package_qty,
    package_price,
    unit_price,
    updated_at: new Date().toISOString(),
  };

  if (imageFile) {
    const url = await uploadImage(imageFile, "ingredients");
    if (url) payload.image_url = url;
  }

  let ingredientId = id;
  let priceChanged = true;

  if (id) {
    const existing = ingredients.find((i) => i.id === id);
    priceChanged = existing.unit_price !== unit_price;
    const { error } = await sb.from("ingredients").update(payload).eq("id", id);
    if (error) return toast(error.message, true);
  } else {
    const { data, error } = await sb.from("ingredients").insert(payload).select().single();
    if (error) return toast(error.message, true);
    ingredientId = data.id;
  }

  // log price history whenever price changes (or on first creation)
  if (priceChanged) {
    await sb.from("ingredient_price_history").insert({ ingredient_id: ingredientId, unit_price });
  }

  toast("Ingredient saved");
  $("ingredient-modal").classList.remove("visible");
  loadIngredients();
});

// ============================================================
// RECIPES
// ============================================================
async function loadRecipes() {
  const { data, error } = await sb
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .order("created_at", { ascending: false });
  if (error) return toast(error.message, true);
  recipes = data;
  renderRecipes();
}

function recipeCost(recipe) {
  const ingCost = recipe.recipe_ingredients.reduce((sum, li) => sum + li.line_cost, 0);
  const total = ingCost + (recipe.packaging_cost || 0) + (recipe.delivery_cost || 0);
  const perUnit = total / (recipe.yield_count || 1);
  return { ingCost, total, perUnit };
}

function renderRecipes() {
  const grid = $("recipes-grid");
  if (!recipes.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="display">No recipes yet</div>Build your first cake recipe to see its cost calculated automatically.</div>`;
    return;
  }
  grid.innerHTML = recipes
    .map((r) => {
      const { perUnit } = recipeCost(r);
      let marginBadge = "";
      if (r.selling_price) {
        const margin = ((r.selling_price - perUnit) / r.selling_price) * 100;
        marginBadge = `<span class="margin-badge ${margin >= 25 ? "margin-good" : "margin-low"}">${fmt(margin)}% margin</span>`;
      }
      return `
      <div class="recipe-card">
        <div class="thumb">${r.image_url ? `<img src="${r.image_url}">` : "🎂"}</div>
        <div class="body">
          <div class="name">${r.name}</div>
          <div class="cost-tag">Cost/unit: ${fmt(perUnit)} tk ${r.yield_count > 1 ? `· makes ${r.yield_count}` : ""}</div>
          <div style="margin-top:6px;">
            ${r.selling_price ? `<span class="price-tag big">${fmt(r.selling_price)} tk</span> ${marginBadge}` : `<span class="hint">No selling price set</span>`}
          </div>
          <div class="card-actions">
            <button class="btn btn-outline btn-sm" onclick="editRecipe('${r.id}')">Edit</button>
            <button class="btn-text btn-sm" onclick="deleteRecipe('${r.id}')">Delete</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

window.deleteRecipe = async (id) => {
  if (!confirm("Delete this recipe?")) return;
  const { error } = await sb.from("recipes").delete().eq("id", id);
  if (error) return toast(error.message, true);
  toast("Recipe deleted");
  loadRecipes();
};

// ---- Recipe builder modal ----
$("add-recipe-btn").addEventListener("click", () => openRecipeModal());
window.editRecipe = (id) => openRecipeModal(recipes.find((r) => r.id === id));

function openRecipeModal(recipe = null) {
  $("recipe-form").reset();
  $("rlines").innerHTML = "";
  recipeLineCount = 0;
  $("rec-id").value = recipe ? recipe.id : "";
  $("recipe-modal-title").textContent = recipe ? "Edit recipe" : "New recipe";

  if (recipe) {
    $("rec-name").value = recipe.name;
    $("rec-size").value = recipe.size_label || "";
    $("rec-yield").value = recipe.yield_count;
    $("rec-packaging").value = recipe.packaging_cost;
    $("rec-delivery").value = recipe.delivery_cost;
    $("rec-selling").value = recipe.selling_price || "";
    recipe.recipe_ingredients.forEach((li) => addRecipeLine(li));
  } else {
    addRecipeLine();
  }
  updateCostSummary();
  $("recipe-modal").classList.add("visible");
}

function addRecipeLine(existing = null) {
  recipeLineCount++;
  const div = document.createElement("div");
  div.className = "rline";
  div.id = "rline-" + recipeLineCount;

  const initialIng = existing ? ingredients.find((i) => i.id === existing.ingredient_id) : null;

  // "committed" selection — what actually gets saved/calculated.
  // For an existing line, price starts as the ORIGINAL snapshot, not today's price —
  // it only changes to today's price if the baker actively re-picks the ingredient.
  div._ingId = existing ? existing.ingredient_id : null;
  div._ingName = existing ? (initialIng ? initialIng.name : existing.ingredient_name_snapshot + " (deleted)") : "";
  div._ingUnit = initialIng ? initialIng.base_unit : "";
  div._ingPrice = existing ? existing.unit_price_snapshot : 0;

  div.innerHTML = `
    <div class="ing-picker">
      <input type="text" class="ing-search" placeholder="Search ingredient or code…" autocomplete="off" value="${div._ingName}" />
      <div class="ing-dropdown"></div>
    </div>
    <input type="number" class="qty-input rline-qty" placeholder="qty" min="0" step="any" value="${existing ? existing.quantity : ""}" />
    <span class="rline-unit hint">${div._ingUnit}</span>
    <span class="line-cost">0.00 tk</span>
    <button type="button" class="remove">✕</button>
  `;
  $("rlines").appendChild(div);

  const searchInput = div.querySelector(".ing-search");
  const dropdown = div.querySelector(".ing-dropdown");
  const qtyInput = div.querySelector(".rline-qty");
  const unitLabel = div.querySelector(".rline-unit");

  function renderDropdown(term) {
    const t = term.trim().toLowerCase();
    const matches = ingredients
      .filter((ing) => !t || ing.name.toLowerCase().includes(t) || (ing.item_code && ing.item_code.toLowerCase().includes(t)))
      .slice(0, 8);

    dropdown.innerHTML = matches.length
      ? matches
          .map(
            (ing) => `
        <div class="ing-option" data-id="${ing.id}">
          <span class="opt-name">${ing.name}${ing.item_code ? `<span class="code-tag">${ing.item_code}</span>` : ""}</span>
          <span class="opt-meta">${fmt(ing.unit_price)} tk/${ing.base_unit}</span>
        </div>`
          )
          .join("")
      : `<div class="ing-option no-match">No ingredients match</div>`;
    dropdown.classList.add("open");

    dropdown.querySelectorAll(".ing-option[data-id]").forEach((opt) => {
      opt.addEventListener("click", () => {
        const ing = ingredients.find((i) => i.id === opt.dataset.id);
        div._ingId = ing.id;
        div._ingName = ing.name;
        div._ingUnit = ing.base_unit;
        // re-picking the SAME ingredient keeps its original price; picking a DIFFERENT one uses today's price
        div._ingPrice = existing && ing.id === existing.ingredient_id ? existing.unit_price_snapshot : ing.unit_price;
        searchInput.value = ing.name;
        unitLabel.textContent = ing.base_unit;
        dropdown.classList.remove("open");
        updateCostSummary();
      });
    });
  }

  searchInput.addEventListener("focus", () => renderDropdown(""));
  searchInput.addEventListener("input", () => renderDropdown(searchInput.value));
  searchInput.addEventListener("blur", () => {
    // small delay so a click on a dropdown option registers before we close/revert
    setTimeout(() => {
      searchInput.value = div._ingName || "";
      dropdown.classList.remove("open");
    }, 150);
  });

  qtyInput.addEventListener("input", updateCostSummary);
  div.querySelector(".remove").addEventListener("click", () => {
    div.remove();
    updateCostSummary();
  });
}

$("add-rline").addEventListener("click", () => {
  addRecipeLine();
  updateCostSummary();
});

function getRecipeLinesData() {
  return Array.from($("rlines").children).map((div) => {
    const qty = parseFloat(div.querySelector(".rline-qty").value) || 0;
    const unit_price = div._ingPrice || 0;
    const lineCost = qty * unit_price;
    div.querySelector(".line-cost").textContent = fmt(lineCost) + " tk";
    return {
      ingredient_id: div._ingId,
      ingredient_name_snapshot: div._ingName,
      quantity: qty,
      unit_price_snapshot: unit_price,
      line_cost: lineCost,
    };
  });
}

function updateCostSummary() {
  const lines = getRecipeLinesData();
  const ingCost = lines.reduce((s, l) => s + l.line_cost, 0);
  const packaging = parseFloat($("rec-packaging").value) || 0;
  const delivery = parseFloat($("rec-delivery").value) || 0;
  const yieldCount = parseFloat($("rec-yield").value) || 1;
  const total = ingCost + packaging + delivery;
  const perUnit = total / yieldCount;
  const selling = parseFloat($("rec-selling").value) || 0;

  let marginLine = "";
  if (selling > 0) {
    const profit = selling - perUnit;
    const margin = (profit / selling) * 100;
    marginLine = `
      <div class="line"><span>Profit per unit</span><span>${fmt(profit)} tk</span></div>
      <div class="line"><span>Margin</span><span>${fmt(margin)}%</span></div>`;
  }

  $("recipe-cost-summary").innerHTML = `
    <div class="line"><span>Ingredient cost</span><span>${fmt(ingCost)} tk</span></div>
    <div class="line"><span>Packaging + delivery</span><span>${fmt(packaging + delivery)} tk</span></div>
    <div class="line total"><span>Total cost (${yieldCount} unit${yieldCount > 1 ? "s" : ""})</span><span>${fmt(total)} tk</span></div>
    <div class="line total"><span>Cost per unit</span><span>${fmt(perUnit)} tk</span></div>
    ${marginLine}
  `;
}

["rec-packaging", "rec-delivery", "rec-yield", "rec-selling"].forEach((id) =>
  $(id).addEventListener("input", updateCostSummary)
);

$("recipe-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("rec-id").value;
  const imageFile = $("rec-image").files[0];
  const lines = getRecipeLinesData().filter((l) => l.ingredient_id && l.quantity > 0);

  if (!lines.length) {
    toast("Add at least one ingredient line", true);
    return;
  }

  const payload = {
    name: $("rec-name").value.trim(),
    size_label: $("rec-size").value.trim() || null,
    yield_count: parseInt($("rec-yield").value) || 1,
    packaging_cost: parseFloat($("rec-packaging").value) || 0,
    delivery_cost: parseFloat($("rec-delivery").value) || 0,
    selling_price: parseFloat($("rec-selling").value) || null,
    updated_at: new Date().toISOString(),
  };

  if (imageFile) {
    const url = await uploadImage(imageFile, "recipes");
    if (url) payload.image_url = url;
  }

  let recipeId = id;
  if (id) {
    const { error } = await sb.from("recipes").update(payload).eq("id", id);
    if (error) return toast(error.message, true);
    // wipe old lines and re-insert fresh snapshot lines
    await sb.from("recipe_ingredients").delete().eq("recipe_id", id);
  } else {
    const { data, error } = await sb.from("recipes").insert(payload).select().single();
    if (error) return toast(error.message, true);
    recipeId = data.id;
  }

  const linesPayload = lines.map((l) => ({ ...l, recipe_id: recipeId, line_cost: undefined }));
  linesPayload.forEach((l) => delete l.line_cost); // generated column — don't send it
  const { error: liError } = await sb.from("recipe_ingredients").insert(linesPayload);
  if (liError) return toast(liError.message, true);

  toast("Recipe saved");
  $("recipe-modal").classList.remove("visible");
  loadRecipes();
});

// ============================================================
// SALES
// ============================================================
let sales = [];

async function loadSales() {
  const { data, error } = await sb.from("sales").select("*").order("sale_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) return toast(error.message, true);
  sales = data;
  renderSales();
}

function renderSales() {
  const totalRevenue = sales.reduce((s, x) => s + x.total_revenue, 0);
  const totalCost = sales.reduce((s, x) => s + x.total_cost, 0);
  const totalProfit = totalRevenue - totalCost;

  $("sales-summary").innerHTML = `
    <div class="summary-card revenue"><div class="label">Total revenue</div><div class="value">${fmt(totalRevenue)} tk</div></div>
    <div class="summary-card cost"><div class="label">Total cost</div><div class="value">${fmt(totalCost)} tk</div></div>
    <div class="summary-card profit"><div class="label">Total profit</div><div class="value">${fmt(totalProfit)} tk</div></div>
    <div class="summary-card"><div class="label">Sales logged</div><div class="value">${sales.length}</div></div>
  `;

  const tbody = $("sales-tbody");
  if (!sales.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No sales logged yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = sales
    .map((s) => {
      const profit = s.total_revenue - s.total_cost;
      return `
      <tr>
        <td>${s.sale_date}</td>
        <td>${s.recipe_name_snapshot}</td>
        <td class="num">${s.quantity}</td>
        <td class="num">${fmt(s.total_revenue)}</td>
        <td class="num">${fmt(s.total_cost)}</td>
        <td class="num ${profit >= 0 ? "profit-pos" : "profit-neg"}">${fmt(profit)}</td>
        <td class="row-actions">
          <button onclick="editSale('${s.id}')" title="Edit">✎</button>
          <button onclick="deleteSale('${s.id}')" title="Delete">✕</button>
        </td>
      </tr>`;
    })
    .join("");
}

$("add-sale-btn").addEventListener("click", () => openSaleModal());
window.editSale = (id) => openSaleModal(sales.find((s) => s.id === id));

window.deleteSale = async (id) => {
  if (!confirm("Delete this sale record?")) return;
  const { error } = await sb.from("sales").delete().eq("id", id);
  if (error) return toast(error.message, true);
  toast("Sale deleted");
  loadSales();
  renderDashboard();
};

function populateSaleRecipeSelect(selectedId = null) {
  const sel = $("sale-recipe");
  sel.innerHTML =
    `<option value="">— choose a cake —</option>` +
    recipes.map((r) => `<option value="${r.id}" ${r.id === selectedId ? "selected" : ""}>${r.name}${r.size_label ? " (" + r.size_label + ")" : ""}</option>`).join("");
}

function openSaleModal(sale = null) {
  $("sale-form").reset();
  populateSaleRecipeSelect(sale ? sale.recipe_id : null);
  $("sale-id").value = sale ? sale.id : "";
  $("sale-modal-title").textContent = sale ? "Edit sale" : "Log a sale";
  $("sale-date").value = sale ? sale.sale_date : new Date().toISOString().slice(0, 10);

  if (sale) {
    $("sale-qty").value = sale.quantity;
    $("sale-price").value = sale.price_per_unit;
    $("sale-notes").value = sale.notes || "";
  } else {
    const r = recipes[0];
    if (r && r.selling_price) $("sale-price").value = r.selling_price;
  }
  updateSalePreview();
  $("sale-modal").classList.add("visible");
}

function updateSalePreview() {
  const recipeId = $("sale-recipe").value;
  const recipe = recipes.find((r) => r.id === recipeId);
  const qty = parseFloat($("sale-qty").value) || 0;
  const price = parseFloat($("sale-price").value) || 0;

  if (!recipe) {
    $("sale-preview").textContent = "Pick a cake to see cost & profit.";
    return;
  }
  const { perUnit } = recipeCost(recipe);
  const revenue = qty * price;
  const cost = qty * perUnit;
  const profit = revenue - cost;
  $("sale-preview").innerHTML = `Cost/unit right now: <b>${fmt(perUnit)} tk</b> · Revenue: <b>${fmt(revenue)} tk</b> · Cost: <b>${fmt(cost)} tk</b> · Profit: <b>${fmt(profit)} tk</b>`;
}

$("sale-recipe").addEventListener("change", (e) => {
  const recipe = recipes.find((r) => r.id === e.target.value);
  if (recipe && recipe.selling_price && !$("sale-id").value) {
    $("sale-price").value = recipe.selling_price;
  }
  updateSalePreview();
});
["sale-qty", "sale-price"].forEach((id) => $(id).addEventListener("input", updateSalePreview));

$("sale-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("sale-id").value;
  const recipeId = $("sale-recipe").value;
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) return toast("Pick a cake", true);

  const { perUnit } = recipeCost(recipe);

  const payload = {
    recipe_id: recipe.id,
    recipe_name_snapshot: recipe.name,
    quantity: parseFloat($("sale-qty").value),
    price_per_unit: parseFloat($("sale-price").value),
    cost_per_unit_snapshot: perUnit,
    sale_date: $("sale-date").value,
    notes: $("sale-notes").value.trim() || null,
  };

  const { error } = id ? await sb.from("sales").update(payload).eq("id", id) : await sb.from("sales").insert(payload);
  if (error) return toast(error.message, true);

  toast("Sale saved");
  $("sale-modal").classList.remove("visible");
  loadSales();
  renderDashboard();
});
// ============================================================
// EXPENSES
// ============================================================
let expenses = [];

async function loadExpenses() {
  const { data, error } = await sb.from("expenses").select("*").order("expense_date", { ascending: false });
  if (error) return toast(error.message, true);
  expenses = data;
  renderExpenses();
}

function renderExpenses() {
  const total = expenses.reduce((s, x) => s + x.amount, 0);
  $("expenses-summary").innerHTML = `
    <div class="summary-card cost"><div class="label">Total spent</div><div class="value">${fmt(total)} tk</div></div>
    <div class="summary-card"><div class="label">Items logged</div><div class="value">${expenses.length}</div></div>
  `;

  const tbody = $("expenses-tbody");
  if (!expenses.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No expenses logged yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = expenses
    .map(
      (e) => `
    <tr>
      <td>${e.expense_date}</td>
      <td>${e.item_name}${e.quantity ? ` <span class="hint">(${e.quantity})</span>` : ""}</td>
      <td>${e.category}</td>
      <td class="num">${fmt(e.amount)} tk</td>
      <td class="hint">${e.notes || ""}</td>
      <td class="row-actions">
        <button onclick="editExpense('${e.id}')" title="Edit">✎</button>
        <button onclick="deleteExpense('${e.id}')" title="Delete">✕</button>
      </td>
    </tr>`
    )
    .join("");
}

$("add-expense-btn").addEventListener("click", () => openExpenseModal());
window.editExpense = (id) => openExpenseModal(expenses.find((e) => e.id === id));

window.deleteExpense = async (id) => {
  if (!confirm("Delete this expense record?")) return;
  const { error } = await sb.from("expenses").delete().eq("id", id);
  if (error) return toast(error.message, true);
  toast("Expense deleted");
  loadExpenses();
  renderDashboard();
};

function openExpenseModal(exp = null) {
  $("expense-form").reset();
  $("exp-id").value = exp ? exp.id : "";
  $("expense-modal-title").textContent = exp ? "Edit expense" : "Log expense";
  $("exp-date").value = exp ? exp.expense_date : new Date().toISOString().slice(0, 10);
  if (exp) {
    $("exp-item").value = exp.item_name;
    $("exp-category").value = exp.category;
    $("exp-amount").value = exp.amount;
    $("exp-qty").value = exp.quantity || "";
    $("exp-notes").value = exp.notes || "";
  }
  $("expense-modal").classList.add("visible");
}

$("expense-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("exp-id").value;
  const payload = {
    item_name: $("exp-item").value.trim(),
    category: $("exp-category").value,
    amount: parseFloat($("exp-amount").value),
    quantity: $("exp-qty").value.trim() || null,
    notes: $("exp-notes").value.trim() || null,
    expense_date: $("exp-date").value,
  };
  const { error } = id ? await sb.from("expenses").update(payload).eq("id", id) : await sb.from("expenses").insert(payload);
  if (error) return toast(error.message, true);

  toast("Expense saved");
  $("expense-modal").classList.remove("visible");
  loadExpenses();
  renderDashboard();
});

// ============================================================
// DASHBOARD
// ============================================================
let dashboardPeriod = "30d";

function periodStartDate(period) {
  const now = new Date();
  if (period === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }
  if (period === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  }
  if (period === "year") return `${now.getFullYear()}-01-01`;
  return null; // all time
}

function filterByPeriod(list, dateField, period) {
  const start = periodStartDate(period);
  if (!start) return list;
  return list.filter((x) => x[dateField] >= start);
}

document.querySelectorAll("#dash-period button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#dash-period button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    dashboardPeriod = btn.dataset.period;
    renderDashboard();
  });
});

function renderDashboard() {
  const periodSales = filterByPeriod(sales, "sale_date", dashboardPeriod);
  const periodExpenses = filterByPeriod(expenses, "expense_date", dashboardPeriod);

  const revenue = periodSales.reduce((s, x) => s + x.total_revenue, 0);
  const ingredientCost = periodSales.reduce((s, x) => s + x.total_cost, 0);
  const otherCost = periodExpenses.reduce((s, x) => s + x.amount, 0);
  const totalCost = ingredientCost + otherCost;
  const profit = revenue - totalCost;

  $("dash-summary").innerHTML = `
    <div class="summary-card revenue"><div class="label">Revenue</div><div class="value">${fmt(revenue)} tk</div></div>
    <div class="summary-card cost"><div class="label">Total cost</div><div class="value">${fmt(totalCost)} tk</div></div>
    <div class="summary-card profit"><div class="label">Profit</div><div class="value">${fmt(profit)} tk</div></div>
    <div class="summary-card"><div class="label">Cakes sold</div><div class="value">${periodSales.reduce((s, x) => s + Number(x.quantity), 0)}</div></div>
  `;

  // ---- top cakes by sales/profit ----
  const byRecipe = {};
  periodSales.forEach((s) => {
    if (!byRecipe[s.recipe_name_snapshot]) byRecipe[s.recipe_name_snapshot] = { name: s.recipe_name_snapshot, qty: 0, revenue: 0, cost: 0 };
    byRecipe[s.recipe_name_snapshot].qty += Number(s.quantity);
    byRecipe[s.recipe_name_snapshot].revenue += s.total_revenue;
    byRecipe[s.recipe_name_snapshot].cost += s.total_cost;
  });
  const cakeRows = Object.values(byRecipe).map((r) => ({ ...r, profit: r.revenue - r.cost }));
  const bestSeller = cakeRows.slice().sort((a, b) => b.qty - a.qty)[0];
  const mostProfitable = cakeRows.slice().sort((a, b) => b.profit - a.profit)[0];
  cakeRows.sort((a, b) => b.profit - a.profit);

  $("dash-cakes").innerHTML = cakeRows.length
    ? cakeRows
        .map(
          (r) => `
    <tr>
      <td>${r.name}
        ${bestSeller && r.name === bestSeller.name ? '<span class="mini-badge seller">Best seller</span>' : ""}
        ${mostProfitable && r.name === mostProfitable.name ? '<span class="mini-badge profit">Most profitable</span>' : ""}
      </td>
      <td class="num">${r.qty}</td>
      <td class="num">${fmt(r.revenue)}</td>
      <td class="num">${fmt(r.cost)}</td>
      <td class="num ${r.profit >= 0 ? "profit-pos" : "profit-neg"}">${fmt(r.profit)}</td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="5"><div class="empty-state">No sales in this period</div></td></tr>`;

  // ---- top ingredients by cost contribution (based on what was actually sold) ----
  const byIngredient = {};
  periodSales.forEach((s) => {
    const recipe = recipes.find((r) => r.id === s.recipe_id);
    if (!recipe) return;
    recipe.recipe_ingredients.forEach((li) => {
      const cost = li.unit_price_snapshot * li.quantity * Number(s.quantity);
      byIngredient[li.ingredient_name_snapshot] = (byIngredient[li.ingredient_name_snapshot] || 0) + cost;
    });
  });
  const ingRows = Object.entries(byIngredient).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxIngCost = ingRows[0]?.[1] || 1;
  $("dash-ingredients").innerHTML = ingRows.length
    ? ingRows
        .map(
          ([name, cost]) => `
      <div class="bar-row">
        <span class="bar-label">${name}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${((cost / maxIngCost) * 100).toFixed(0)}%"></div></div>
        <span class="bar-value">${fmt(cost)} tk</span>
      </div>`
        )
        .join("")
    : `<div class="empty-state">No sales logged yet</div>`;

  // ---- spending by category ----
  const catTotals = { Ingredients: ingredientCost };
  periodExpenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const catEntries = Object.entries(catTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries[0]?.[1] || 1;
  $("dash-categories").innerHTML = catEntries.length
    ? catEntries
        .map(
          ([cat, val]) => `
      <div class="bar-row">
        <span class="bar-label">${cat}</span>
        <div class="bar-track"><div class="bar-fill cat" style="width:${((val / maxCat) * 100).toFixed(0)}%"></div></div>
        <span class="bar-value">${fmt(val)} tk</span>
      </div>`
        )
        .join("")
    : `<div class="empty-state">No data yet</div>`;
}
