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
  await loadCashLogs();
  renderInventory();
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
  renderInventory();
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
        <div class="cat">${ing.categories?.name || "Uncategorized"}${ing.packaging_label ? ` · ${ing.packaging_label}` : ""}</div>
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
    $("ing-packaging-label").value = ing.packaging_label || "";
    $("ing-package-qty").value = ing.package_qty;
    $("ing-base-unit").value = ing.base_unit;
    $("ing-package-price").value = ing.package_price;
    $("ing-reorder-threshold").value = ing.reorder_threshold ?? "";
    $("ing-reorder-qty").value = ing.reorder_qty ?? "";
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

// Shared save logic: used by the Ingredients tab form AND by the Expense tab
// when logging an ingredient restock. Creates or updates an ingredient,
// and logs price history whenever the unit price actually changes.
async function saveIngredient({ id, name, item_code, category_id, packaging_label, package_qty, base_unit, package_price, image_url, reorder_threshold, reorder_qty }) {
  const unit_price = package_price / package_qty;
  const payload = {
    name,
    item_code: item_code || null,
    category_id: category_id || null,
    packaging_label: packaging_label || null,
    base_unit,
    package_qty,
    package_price,
    unit_price,
    updated_at: new Date().toISOString(),
  };
  if (reorder_threshold !== undefined) payload.reorder_threshold = reorder_threshold || null;
  if (reorder_qty !== undefined) payload.reorder_qty = reorder_qty || null;
  if (image_url) payload.image_url = image_url;

  let ingredientId = id;
  let priceChanged = true;

  if (id) {
    const existing = ingredients.find((i) => i.id === id);
    priceChanged = !existing || existing.unit_price !== unit_price;
    const { error } = await sb.from("ingredients").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    // brand-new ingredient: what you're entering IS what you currently have in hand
    payload.current_stock = package_qty;
    const { data, error } = await sb.from("ingredients").insert(payload).select().single();
    if (error) throw error;
    ingredientId = data.id;
  }

  if (priceChanged) {
    await sb.from("ingredient_price_history").insert({ ingredient_id: ingredientId, unit_price });
  }
  return { id: ingredientId, unit_price };
}

// Adjusts one ingredient's stock by `delta` (positive to add, negative to consume).
// Updates the database AND the in-memory `ingredients` array immediately, so that
// several adjustments to the same ingredient within one action (e.g. reversing an
// old sale then applying an edited one) compound correctly instead of overwriting.
async function adjustStock(ingredientId, delta) {
  const ing = ingredients.find((i) => i.id === ingredientId);
  if (!ing) return;
  const newStock = (ing.current_stock || 0) + delta;
  const { error } = await sb.from("ingredients").update({ current_stock: newStock }).eq("id", ingredientId);
  if (!error) ing.current_stock = newStock;
}

// Applies (sign = -1) or reverses (sign = +1) the ingredient consumption for one sale.
// recipe_ingredients.quantity is the amount used for the WHOLE batch (yield_count units),
// so per-unit-sold usage is quantity / yield_count.
async function applySaleStockConsumption(recipeId, quantitySold, sign) {
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe || !quantitySold) return;
  const deltas = {};
  recipe.recipe_ingredients.forEach((li) => {
    if (!li.ingredient_id) return;
    const perUnitQty = li.quantity / (recipe.yield_count || 1);
    deltas[li.ingredient_id] = (deltas[li.ingredient_id] || 0) + sign * perUnitQty * quantitySold;
  });
  for (const [ingId, delta] of Object.entries(deltas)) {
    await adjustStock(ingId, delta);
  }
}

$("ingredient-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("ing-id").value;
  const imageFile = $("ing-image").files[0];
  let image_url = null;
  if (imageFile) {
    image_url = await uploadImage(imageFile, "ingredients");
  }

  try {
    await saveIngredient({
      id: id || null,
      name: $("ing-name").value.trim(),
      item_code: $("ing-code").value.trim(),
      category_id: $("ing-category").value,
      packaging_label: $("ing-packaging-label").value.trim(),
      package_qty: parseFloat($("ing-package-qty").value),
      base_unit: $("ing-base-unit").value,
      package_price: parseFloat($("ing-package-price").value),
      image_url,
      reorder_threshold: parseFloat($("ing-reorder-threshold").value) || null,
      reorder_qty: parseFloat($("ing-reorder-qty").value) || null,
    });
  } catch (err) {
    return toast(err.message, true);
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
  renderTargetProgress();
  renderInventory();
}

function recipeCost(recipe) {
  const ingCost = recipe.recipe_ingredients.reduce((sum, li) => sum + li.line_cost, 0);
  const total = ingCost + (recipe.packaging_cost || 0) + (recipe.delivery_cost || 0);
  const perUnit = total / (recipe.yield_count || 1);
  return { ingCost, total, perUnit };
}

function renderRecipes(filterText = "") {
  const grid = $("recipes-grid");
  const term = filterText.trim().toLowerCase();
  const filtered = term
    ? recipes.filter((r) => r.name.toLowerCase().includes(term) || (r.size_label && r.size_label.toLowerCase().includes(term)))
    : recipes;

  if (!recipes.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="display">No recipes yet</div>Build your first cake recipe to see its cost calculated automatically.</div>`;
    return;
  }
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="display">No matches</div>Try a different search term.</div>`;
    return;
  }
  grid.innerHTML = filtered
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
          <div class="name">${r.name}${r.size_label ? `<span class="code-tag">${r.size_label}</span>` : ""}</div>
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

$("recipe-search").addEventListener("input", (e) => renderRecipes(e.target.value));

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
    $("rec-target").value = recipe.daily_target_qty || "";
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
    daily_target_qty: parseFloat($("rec-target").value) || null,
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
// DATE-RANGE FILTER HELPERS (shared by Sales & Expenses tabs)
// ============================================================
function getMonthRange(offsetMonths) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offsetMonths;
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

function inDateRange(dateStr, from, to) {
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function setupDateFilter(prefix, onChange) {
  const presetsEl = $(prefix + "-date-presets");
  const customRangeEl = $(prefix + "-custom-range");
  const fromEl = $(prefix + "-date-from");
  const toEl = $(prefix + "-date-to");

  presetsEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      presetsEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const preset = btn.dataset.preset;
      customRangeEl.classList.toggle("visible", preset === "custom");
      onChange(preset);
    });
  });
  fromEl.addEventListener("input", () => onChange("custom"));
  toEl.addEventListener("input", () => onChange("custom"));
}

function resolveDateRange(prefix, preset) {
  if (preset === "this-month") return getMonthRange(0);
  if (preset === "last-month") return getMonthRange(-1);
  if (preset === "custom") return { from: $(prefix + "-date-from").value || null, to: $(prefix + "-date-to").value || null };
  return { from: null, to: null }; // 'all'
}

// ============================================================
// SALES
// ============================================================
let sales = [];
const salesFilterState = { search: "", preset: "this-month" };

setupDateFilter("sales", (preset) => {
  salesFilterState.preset = preset;
  renderSales();
});
$("sales-search").addEventListener("input", (e) => {
  salesFilterState.search = e.target.value.trim().toLowerCase();
  renderSales();
});

function getFilteredSales() {
  const { from, to } = resolveDateRange("sales", salesFilterState.preset);
  const term = salesFilterState.search;
  return sales.filter((s) => {
    if (!inDateRange(s.sale_date, from, to)) return false;
    if (term && !(s.recipe_name_snapshot.toLowerCase().includes(term) || (s.notes || "").toLowerCase().includes(term))) return false;
    return true;
  });
}

async function loadSales() {
  const { data, error } = await sb.from("sales").select("*").order("sale_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) return toast(error.message, true);
  sales = data;
  renderSales();
  renderTargetProgress();
  renderInventory();
}

function renderSales() {
  const filtered = getFilteredSales();
  const totalRevenue = filtered.reduce((s, x) => s + x.total_revenue, 0);
  const totalCost = filtered.reduce((s, x) => s + x.total_cost, 0);
  const totalProfit = totalRevenue - totalCost;

  $("sales-summary").innerHTML = `
    <div class="summary-card revenue"><div class="label">Revenue</div><div class="value">${fmt(totalRevenue)} tk</div></div>
    <div class="summary-card cost"><div class="label">Cost</div><div class="value">${fmt(totalCost)} tk</div></div>
    <div class="summary-card profit"><div class="label">Profit</div><div class="value">${fmt(totalProfit)} tk</div></div>
    <div class="summary-card"><div class="label">Sales logged</div><div class="value">${filtered.length}</div></div>
  `;

  const tbody = $("sales-tbody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No sales match this filter</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered
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
  const sale = sales.find((s) => s.id === id);
  if (sale) await applySaleStockConsumption(sale.recipe_id, sale.quantity, 1); // give the stock back
  const { error } = await sb.from("sales").delete().eq("id", id);
  if (error) return toast(error.message, true);
  toast("Sale deleted");
  loadSales();
  loadIngredients();
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

  // keep stock accurate: if editing, undo the old sale's consumption first, then apply the new one
  if (id) {
    const oldSale = sales.find((s) => s.id === id);
    if (oldSale) await applySaleStockConsumption(oldSale.recipe_id, oldSale.quantity, 1);
  }
  await applySaleStockConsumption(recipe.id, payload.quantity, -1);

  toast("Sale saved");
  $("sale-modal").classList.remove("visible");
  loadSales();
  loadIngredients();
  renderDashboard();
});
// ============================================================
// EXPENSES
// ============================================================
let expenses = [];
const expensesFilterState = { search: "", category: "", preset: "this-month" };

setupDateFilter("expenses", (preset) => {
  expensesFilterState.preset = preset;
  renderExpenses();
});
$("expenses-search").addEventListener("input", (e) => {
  expensesFilterState.search = e.target.value.trim().toLowerCase();
  renderExpenses();
});
$("expenses-category-filter").addEventListener("change", (e) => {
  expensesFilterState.category = e.target.value;
  renderExpenses();
});

function getFilteredExpenses() {
  const { from, to } = resolveDateRange("expenses", expensesFilterState.preset);
  const term = expensesFilterState.search;
  return expenses.filter((x) => {
    if (!inDateRange(x.expense_date, from, to)) return false;
    if (expensesFilterState.category && x.category !== expensesFilterState.category) return false;
    if (term && !(x.item_name.toLowerCase().includes(term) || (x.notes || "").toLowerCase().includes(term))) return false;
    return true;
  });
}

async function loadExpenses() {
  const { data, error } = await sb.from("expenses").select("*").order("expense_date", { ascending: false });
  if (error) return toast(error.message, true);
  expenses = data;
  renderExpenses();
  renderInventory();
  renderPurchasesSummary();
}

function renderExpenses() {
  const filtered = getFilteredExpenses();
  const total = filtered.reduce((s, x) => s + x.amount, 0);
  $("expenses-summary").innerHTML = `
    <div class="summary-card cost"><div class="label">Total spent</div><div class="value">${fmt(total)} tk</div></div>
    <div class="summary-card"><div class="label">Items logged</div><div class="value">${filtered.length}</div></div>
  `;

  const tbody = $("expenses-tbody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No expenses match this filter</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered
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
  $("exp-ingredient-id").value = "";
  $("expense-modal-title").textContent = exp ? "Edit expense" : "Log expense";
  $("exp-date").value = exp ? exp.expense_date : todayStr();
  $("exp-category").value = exp ? exp.category : "Packaging";
  $("exp-amount").value = exp ? exp.amount : "";
  $("exp-notes").value = exp ? exp.notes || "" : "";
  $("exp-item").value = "";
  $("exp-qty").value = "";
  $("exp-new-code").value = "";
  $("exp-new-name").value = "";
  $("exp-ing-search").value = "";
  $("exp-ing-packaging-label").value = "";
  $("exp-ing-qty").value = "";
  $("exp-ing-unit").value = "g";
  populateExpNewIngCategory();
  setExpIngMode("existing");
  expSelectedIngredient = null;

  if (exp && exp.category === "Ingredients" && exp.ingredient_id) {
    const ing = ingredients.find((i) => i.id === exp.ingredient_id);
    if (ing) {
      expSelectedIngredient = ing;
      $("exp-ing-search").value = ing.name;
      $("exp-ing-packaging-label").value = ing.packaging_label || "";
      $("exp-ing-qty").value = ing.package_qty;
      $("exp-ing-unit").value = ing.base_unit;
    }
  } else if (exp) {
    $("exp-item").value = exp.item_name;
    $("exp-qty").value = exp.quantity || "";
  }

  updateExpenseFormMode();
  updateExpIngPreview();
  $("expense-modal").classList.add("visible");
}

function populateExpNewIngCategory() {
  $("exp-new-ing-category").innerHTML = categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
}

function updateExpenseFormMode() {
  const isIngredient = $("exp-category").value === "Ingredients";
  $("exp-simple-section").style.display = isIngredient ? "none" : "";
  $("exp-simple-qty-wrap").style.display = isIngredient ? "none" : "";
  $("exp-ingredient-section").style.display = isIngredient ? "" : "none";
}
$("exp-category").addEventListener("change", updateExpenseFormMode);

function setExpIngMode(mode) {
  $("exp-ing-mode")
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  $("exp-ing-existing-fields").style.display = mode === "existing" ? "" : "none";
  $("exp-ing-new-fields").style.display = mode === "new" ? "" : "none";
  if (mode === "new") {
    expSelectedIngredient = null;
    $("exp-ing-search").value = "";
    $("exp-ing-packaging-label").value = "";
    $("exp-ing-qty").value = "";
    $("exp-ing-unit").value = "g";
  }
}
$("exp-ing-mode")
  .querySelectorAll("button")
  .forEach((btn) => btn.addEventListener("click", () => setExpIngMode(btn.dataset.mode)));

// searchable ingredient picker for the "Existing Ingredient" sub-mode
let expSelectedIngredient = null;
const expIngSearch = $("exp-ing-search");
const expIngDropdown = $("exp-ing-dropdown");

function renderExpIngDropdown(term) {
  const t = term.trim().toLowerCase();
  const matches = ingredients
    .filter((ing) => !t || ing.name.toLowerCase().includes(t) || (ing.item_code && ing.item_code.toLowerCase().includes(t)))
    .slice(0, 8);

  expIngDropdown.innerHTML = matches.length
    ? matches
        .map(
          (ing) => `
      <div class="ing-option" data-id="${ing.id}">
        <span class="opt-name">${ing.name}${ing.item_code ? `<span class="code-tag">${ing.item_code}</span>` : ""}</span>
        <span class="opt-meta">${ing.packaging_label || ing.package_qty + ing.base_unit}</span>
      </div>`
        )
        .join("")
    : `<div class="ing-option no-match">No ingredients match — switch to "New Ingredient" above</div>`;
  expIngDropdown.classList.add("open");

  expIngDropdown.querySelectorAll(".ing-option[data-id]").forEach((opt) => {
    opt.addEventListener("click", () => {
      const ing = ingredients.find((i) => i.id === opt.dataset.id);
      expSelectedIngredient = ing;
      expIngSearch.value = ing.name;
      $("exp-ing-packaging-label").value = ing.packaging_label || "";
      $("exp-ing-qty").value = ing.package_qty;
      $("exp-ing-unit").value = ing.base_unit;
      expIngDropdown.classList.remove("open");
      updateExpIngPreview();
    });
  });
}
expIngSearch.addEventListener("focus", () => renderExpIngDropdown(""));
expIngSearch.addEventListener("input", () => renderExpIngDropdown(expIngSearch.value));
expIngSearch.addEventListener("blur", () => {
  setTimeout(() => {
    expIngSearch.value = expSelectedIngredient ? expSelectedIngredient.name : "";
    expIngDropdown.classList.remove("open");
  }, 150);
});

function updateExpIngPreview() {
  const qty = parseFloat($("exp-ing-qty").value);
  const amount = parseFloat($("exp-amount").value);
  const unit = $("exp-ing-unit").value;
  $("exp-ing-unit-price-preview").innerHTML = qty > 0 && amount >= 0 ? `Works out to <b>${fmt(amount / qty)} tk / ${unit}</b>` : "";
}
["exp-ing-qty", "exp-amount", "exp-ing-unit"].forEach((id) => $(id).addEventListener("input", updateExpIngPreview));

$("expense-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("exp-id").value;
  const category = $("exp-category").value;
  const amount = parseFloat($("exp-amount").value);
  let payload;

  if (category === "Ingredients") {
    const isNew = $("exp-ing-mode").querySelector("button.active").dataset.mode === "new";
    const qty = parseFloat($("exp-ing-qty").value);
    const unit = $("exp-ing-unit").value;
    const packaging_label = $("exp-ing-packaging-label").value.trim();

    if (!qty || qty <= 0) return toast("Enter the quantity in this package", true);

    let ingredientId, ingredientName;
    try {
      if (isNew) {
        const name = $("exp-new-name").value.trim();
        if (!name) return toast("Enter the ingredient name", true);
        const result = await saveIngredient({
          id: null,
          name,
          item_code: $("exp-new-code").value.trim(),
          category_id: $("exp-new-ing-category").value,
          packaging_label,
          package_qty: qty,
          base_unit: unit,
          package_price: amount,
        });
        ingredientId = result.id;
        ingredientName = name;
      } else {
        if (!expSelectedIngredient) return toast("Pick an existing ingredient, or switch to New Ingredient", true);
        const result = await saveIngredient({
          id: expSelectedIngredient.id,
          name: expSelectedIngredient.name,
          item_code: expSelectedIngredient.item_code,
          category_id: expSelectedIngredient.category_id,
          packaging_label,
          package_qty: qty,
          base_unit: unit,
          package_price: amount,
        });
        ingredientId = result.id;
        ingredientName = expSelectedIngredient.name;
        // this is a restock of something you already have — add to what's left, don't replace it
        await adjustStock(ingredientId, qty);
      }
    } catch (err) {
      return toast(err.message, true);
    }

    payload = {
      item_name: ingredientName,
      ingredient_id: ingredientId,
      category: "Ingredients",
      amount,
      quantity: packaging_label || `${qty}${unit}`,
      units_purchased: qty,
      notes: $("exp-notes").value.trim() || null,
      expense_date: $("exp-date").value,
    };
  } else {
    const itemName = $("exp-item").value.trim();
    if (!itemName) return toast("Enter an item name", true);
    payload = {
      item_name: itemName,
      ingredient_id: null,
      category,
      amount,
      quantity: $("exp-qty").value.trim() || null,
      notes: $("exp-notes").value.trim() || null,
      expense_date: $("exp-date").value,
    };
  }

  const { error } = id ? await sb.from("expenses").update(payload).eq("id", id) : await sb.from("expenses").insert(payload);
  if (error) return toast(error.message, true);

  toast(category === "Ingredients" ? "Expense saved & ingredient updated" : "Expense saved");
  $("expense-modal").classList.remove("visible");
  loadExpenses();
  loadIngredients();
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

// ============================================================
// TODAY'S TARGET PROGRESS (on the Sales tab)
// ============================================================
function renderTargetProgress() {
  const targeted = recipes.filter((r) => r.daily_target_qty && r.daily_target_qty > 0);
  const section = $("targets-section");
  if (!targeted.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";

  const today = todayStr();
  const soldToday = {};
  sales
    .filter((s) => s.sale_date === today)
    .forEach((s) => {
      soldToday[s.recipe_id] = (soldToday[s.recipe_id] || 0) + Number(s.quantity);
    });

  $("targets-progress").innerHTML = targeted
    .map((r) => {
      const sold = soldToday[r.id] || 0;
      const pct = Math.min(100, (sold / r.daily_target_qty) * 100);
      const met = sold >= r.daily_target_qty;
      return `
      <div class="bar-row target-row">
        <span class="bar-label">${r.name}${r.size_label ? ` (${r.size_label})` : ""}</span>
        <div class="bar-track"><div class="bar-fill ${met ? "target-met" : ""}" style="width:${pct.toFixed(0)}%"></div></div>
        <span class="bar-value">${sold} / ${r.daily_target_qty}${met ? " 🎉" : ""}</span>
      </div>`;
    })
    .join("");
}

// ============================================================
// DAY-END CASH CHECK
// ============================================================
let cashLogs = [];

async function loadCashLogs() {
  const { data, error } = await sb.from("cash_log").select("*").order("log_date", { ascending: false });
  if (error) return toast(error.message, true);
  cashLogs = data;
  renderCashLogs();
}

function renderCashLogs() {
  const tbody = $("cashlog-tbody");
  if (!cashLogs.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No day-end checks logged yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = cashLogs
    .map((c) => {
      const gap = c.actual_cash - c.expected_revenue;
      return `
      <tr>
        <td>${c.log_date}</td>
        <td class="num">${fmt(c.expected_revenue)}</td>
        <td class="num">${fmt(c.actual_cash)}</td>
        <td class="num ${gap >= 0 ? "profit-pos" : "profit-neg"}">${gap >= 0 ? "+" : ""}${fmt(gap)}</td>
        <td class="hint">${c.notes || ""}</td>
        <td class="row-actions">
          <button onclick="editCashLog('${c.id}')" title="Edit">✎</button>
          <button onclick="deleteCashLog('${c.id}')" title="Delete">✕</button>
        </td>
      </tr>`;
    })
    .join("");
}

window.deleteCashLog = async (id) => {
  if (!confirm("Delete this day-end check?")) return;
  const { error } = await sb.from("cash_log").delete().eq("id", id);
  if (error) return toast(error.message, true);
  toast("Deleted");
  loadCashLogs();
};

function expectedForDate(dateStr) {
  const daySales = sales.filter((s) => s.sale_date === dateStr);
  const revenue = daySales.reduce((s, x) => s + x.total_revenue, 0);
  const cost = daySales.reduce((s, x) => s + x.total_cost, 0);
  return { revenue, profit: revenue - cost, count: daySales.length };
}

function updateCashPreview() {
  const date = $("cash-date").value;
  const actual = parseFloat($("cash-actual").value);
  if (!date) return;
  const { revenue, profit, count } = expectedForDate(date);
  $("cash-expected-preview").innerHTML = `Logged that day: <b>${count} sale${count === 1 ? "" : "s"}</b> · Expected revenue: <b>${fmt(revenue)} tk</b> · Expected profit: <b>${fmt(profit)} tk</b>`;

  if (!isNaN(actual)) {
    const gap = actual - revenue;
    $("cash-gap-summary").innerHTML = `
      <div class="line"><span>Expected revenue</span><span>${fmt(revenue)} tk</span></div>
      <div class="line"><span>Actual cash counted</span><span>${fmt(actual)} tk</span></div>
      <div class="line total"><span>Gap</span><span class="${gap >= 0 ? "profit-pos" : "profit-neg"}">${gap >= 0 ? "+" : ""}${fmt(gap)} tk</span></div>
    `;
  } else {
    $("cash-gap-summary").innerHTML = "";
  }
}

$("cash-date").addEventListener("input", updateCashPreview);
$("cash-actual").addEventListener("input", updateCashPreview);

$("add-cashlog-btn").addEventListener("click", () => openCashLogModal());
window.editCashLog = (id) => openCashLogModal(cashLogs.find((c) => c.id === id));

function openCashLogModal(entry = null) {
  $("cashlog-form").reset();
  $("cash-date").value = entry ? entry.log_date : todayStr();
  $("cash-actual").value = entry ? entry.actual_cash : "";
  $("cash-notes").value = entry ? entry.notes || "" : "";
  updateCashPreview();
  $("cashlog-modal").classList.add("visible");
}

$("cashlog-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = $("cash-date").value;
  const actual = parseFloat($("cash-actual").value);
  const { revenue, profit } = expectedForDate(date);

  const payload = {
    log_date: date,
    expected_revenue: revenue,
    expected_profit: profit,
    actual_cash: actual,
    notes: $("cash-notes").value.trim() || null,
    updated_at: new Date().toISOString(),
  };

  // one entry per date — upsert on the unique log_date constraint
  const { error } = await sb.from("cash_log").upsert(payload, { onConflict: "log_date" });
  if (error) return toast(error.message, true);

  toast("Saved");
  $("cashlog-modal").classList.remove("visible");
  loadCashLogs();
});

// ============================================================
// EXPORT BACKUP — downloads everything as an .xlsx spreadsheet
// (opens directly in Google Sheets or Excel)
// ============================================================
$("export-backup-btn").addEventListener("click", async () => {
  const btn = $("export-backup-btn");
  const originalText = btn.textContent;
  btn.textContent = "Preparing…";
  btn.disabled = true;

  try {
    // fetch price history fresh — it isn't kept loaded in memory elsewhere
    const { data: priceHistory, error: phError } = await sb
      .from("ingredient_price_history")
      .select("*, ingredients(name)")
      .order("changed_at", { ascending: false });
    if (phError) throw phError;

    const categoryName = (id) => categories.find((c) => c.id === id)?.name || "";

    const ingredientsSheet = ingredients.map((i) => ({
      Name: i.name,
      "Item Code": i.item_code || "",
      Category: categoryName(i.category_id),
      "Package Size": i.package_qty,
      Unit: i.base_unit,
      "Package Price (tk)": i.package_price,
      "Price per Unit (tk)": i.unit_price,
      "Last Updated": i.updated_at,
    }));

    const recipesSheet = recipes.map((r) => {
      const { perUnit } = recipeCost(r);
      return {
        Name: r.name,
        Size: r.size_label || "",
        "Yields (units)": r.yield_count,
        "Packaging Cost (tk)": r.packaging_cost,
        "Delivery Cost (tk)": r.delivery_cost,
        "Cost per Unit (tk)": fmt(perUnit),
        "Selling Price (tk)": r.selling_price || "",
        "Daily Target": r.daily_target_qty || "",
        "Created": r.created_at,
      };
    });

    const recipeIngredientsSheet = [];
    recipes.forEach((r) => {
      r.recipe_ingredients.forEach((li) => {
        recipeIngredientsSheet.push({
          Recipe: r.name,
          Ingredient: li.ingredient_name_snapshot,
          Quantity: li.quantity,
          "Unit Price at the time (tk)": li.unit_price_snapshot,
          "Line Cost (tk)": li.line_cost,
        });
      });
    });

    const salesSheet = sales.map((s) => ({
      Date: s.sale_date,
      Cake: s.recipe_name_snapshot,
      Quantity: s.quantity,
      "Price per Unit (tk)": s.price_per_unit,
      "Revenue (tk)": s.total_revenue,
      "Cost per Unit at sale time (tk)": s.cost_per_unit_snapshot,
      "Cost (tk)": s.total_cost,
      "Profit (tk)": fmt(s.total_revenue - s.total_cost),
      Notes: s.notes || "",
    }));

    const expensesSheet = expenses.map((e) => ({
      Date: e.expense_date,
      Item: e.item_name,
      Category: e.category,
      "Amount (tk)": e.amount,
      Quantity: e.quantity || "",
      Notes: e.notes || "",
    }));

    const cashLogSheet = cashLogs.map((c) => ({
      Date: c.log_date,
      "Expected Revenue (tk)": c.expected_revenue,
      "Expected Profit (tk)": c.expected_profit,
      "Actual Cash Counted (tk)": c.actual_cash,
      "Gap (tk)": fmt(c.actual_cash - c.expected_revenue),
      Notes: c.notes || "",
    }));

    const priceHistorySheet = (priceHistory || []).map((p) => ({
      Ingredient: p.ingredients?.name || "(deleted ingredient)",
      "Price per Unit (tk)": p.unit_price,
      "Changed On": p.changed_at,
    }));

    const wb = XLSX.utils.book_new();
    const addSheet = (data, name) => {
      const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ " ": "No data yet" }]);
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    addSheet(ingredientsSheet, "Ingredients");
    addSheet(recipesSheet, "Recipes");
    addSheet(recipeIngredientsSheet, "Recipe Ingredients");
    addSheet(salesSheet, "Sales");
    addSheet(expensesSheet, "Expenses");
    addSheet(cashLogSheet, "Day-End Cash Check");
    addSheet(priceHistorySheet, "Ingredient Price History");

    const filename = `bakery-backup-${todayStr()}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast("Backup downloaded");
  } catch (err) {
    toast("Backup failed: " + err.message, true);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// ============================================================
// INVENTORY
// ============================================================
let inventorySearchTerm = "";
$("inventory-search").addEventListener("input", (e) => {
  inventorySearchTerm = e.target.value.trim().toLowerCase();
  renderInventory();
});

// Avg weekly usage per ingredient, based on the last 30 days of sales
function computeAvgWeeklyUsage() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recentSales = sales.filter((s) => s.sale_date >= cutoffStr);

  const totalUsage = {};
  recentSales.forEach((s) => {
    const recipe = recipes.find((r) => r.id === s.recipe_id);
    if (!recipe) return;
    recipe.recipe_ingredients.forEach((li) => {
      if (!li.ingredient_id) return;
      const perUnitQty = li.quantity / (recipe.yield_count || 1);
      totalUsage[li.ingredient_id] = (totalUsage[li.ingredient_id] || 0) + perUnitQty * s.quantity;
    });
  });

  const weeks = 30 / 7;
  const weekly = {};
  Object.entries(totalUsage).forEach(([id, total]) => (weekly[id] = total / weeks));
  return weekly;
}

function renderInventory() {
  const weeklyUsage = computeAvgWeeklyUsage();
  const term = inventorySearchTerm;
  const filtered = term ? ingredients.filter((i) => i.name.toLowerCase().includes(term) || (i.item_code || "").toLowerCase().includes(term)) : ingredients;

  // low stock alerts
  const lowStock = ingredients.filter((i) => i.reorder_threshold != null && (i.current_stock || 0) <= i.reorder_threshold);
  const lowSection = $("low-stock-section");
  if (lowStock.length) {
    lowSection.style.display = "";
    $("low-stock-list").innerHTML = lowStock
      .map((i) => {
        const stock = i.current_stock || 0;
        const pct = i.reorder_threshold > 0 ? Math.min(100, (stock / i.reorder_threshold) * 100) : 0;
        const suggestion = i.reorder_qty ? ` · usually buy ${fmt(i.reorder_qty)} ${i.base_unit}` : "";
        return `
        <div class="bar-row">
          <span class="bar-label">${i.name}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(0)}%; background: var(--danger);"></div></div>
          <span class="bar-value">${fmt(stock)} / ${fmt(i.reorder_threshold)} ${i.base_unit}${suggestion}</span>
        </div>`;
      })
      .join("");
  } else {
    lowSection.style.display = "none";
  }

  // main table — low-stock items first, then by usage rate (busiest ingredients near the top)
  const tbody = $("inventory-tbody");
  if (!ingredients.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No ingredients yet</div></td></tr>`;
    return;
  }
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No matches</div></td></tr>`;
    return;
  }
  const sorted = filtered.slice().sort((a, b) => {
    const aLow = a.reorder_threshold != null && (a.current_stock || 0) <= a.reorder_threshold;
    const bLow = b.reorder_threshold != null && (b.current_stock || 0) <= b.reorder_threshold;
    if (aLow !== bLow) return aLow ? -1 : 1;
    return (weeklyUsage[b.id] || 0) - (weeklyUsage[a.id] || 0);
  });

  tbody.innerHTML = sorted
    .map((i) => {
      const stock = i.current_stock || 0;
      const isLow = i.reorder_threshold != null && stock <= i.reorder_threshold;
      const weekly = weeklyUsage[i.id] || 0;
      return `
      <tr>
        <td>${i.name}${i.item_code ? `<span class="code-tag">${i.item_code}</span>` : ""}</td>
        <td class="num">${fmt(stock)} ${i.base_unit}</td>
        <td class="num">${i.reorder_threshold != null ? fmt(i.reorder_threshold) + " " + i.base_unit : "—"}</td>
        <td class="num">${i.reorder_qty != null ? fmt(i.reorder_qty) + " " + i.base_unit : "—"}</td>
        <td class="num">${weekly > 0 ? fmt(weekly) + " " + i.base_unit + "/wk" : "—"}</td>
        <td>${isLow ? '<span class="margin-badge margin-low">Buy soon</span>' : '<span class="margin-badge margin-good">OK</span>'}</td>
        <td class="row-actions"><button onclick="adjustStockPrompt('${i.id}')" title="Correct stock count">✎</button></td>
      </tr>`;
    })
    .join("");
}

window.adjustStockPrompt = async (id) => {
  const ing = ingredients.find((i) => i.id === id);
  if (!ing) return;
  const val = prompt(`Correct the current stock for ${ing.name} (in ${ing.base_unit}):`, fmt(ing.current_stock || 0));
  if (val === null) return;
  const num = parseFloat(val);
  if (isNaN(num) || num < 0) return toast("Enter a valid number", true);
  const { error } = await sb.from("ingredients").update({ current_stock: num }).eq("id", id);
  if (error) return toast(error.message, true);
  toast("Stock updated");
  loadIngredients();
};

// ---- Purchases Summary (date-filtered) ----
const purchasesFilterState = { preset: "this-month" };
setupDateFilter("purchases", (preset) => {
  purchasesFilterState.preset = preset;
  renderPurchasesSummary();
});

function renderPurchasesSummary() {
  const { from, to } = resolveDateRange("purchases", purchasesFilterState.preset);
  const ingExpenses = expenses.filter((e) => e.category === "Ingredients" && inDateRange(e.expense_date, from, to));

  const grouped = {};
  ingExpenses.forEach((e) => {
    const key = e.item_name;
    if (!grouped[key]) grouped[key] = { name: key, count: 0, totalUnits: 0, totalSpent: 0, unit: "" };
    grouped[key].count += 1;
    grouped[key].totalSpent += e.amount;
    if (e.units_purchased) grouped[key].totalUnits += Number(e.units_purchased);
    const ing = ingredients.find((i) => i.id === e.ingredient_id);
    if (ing) grouped[key].unit = ing.base_unit;
  });

  const rows = Object.values(grouped).sort((a, b) => b.totalSpent - a.totalSpent);
  const tbody = $("purchases-summary-tbody");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">No ingredient purchases logged in this period</div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.name}</td>
      <td class="num">${r.count}</td>
      <td class="num">${r.totalUnits ? fmt(r.totalUnits) + (r.unit ? " " + r.unit : "") : "—"}</td>
      <td class="num">${fmt(r.totalSpent)} tk</td>
    </tr>`
    )
    .join("");
}
