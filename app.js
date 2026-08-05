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

function renderIngredients() {
  const grid = $("ingredients-grid");
  if (!ingredients.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="display">No ingredients yet</div>Add your first one to start building recipes.</div>`;
    return;
  }
  grid.innerHTML = ingredients
    .map(
      (ing) => `
    <div class="ing-card">
      <div class="thumb">${ing.image_url ? `<img src="${ing.image_url}">` : "🧂"}</div>
      <div class="body">
        <div class="name">${ing.name}</div>
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
          <div class="hint" style="margin-top:4px;">${r.show_on_menu ? "🟢 On public menu" : "⚪ Not on menu"}</div>
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
    $("rec-yield").value = recipe.yield_count;
    $("rec-packaging").value = recipe.packaging_cost;
    $("rec-delivery").value = recipe.delivery_cost;
    $("rec-selling").value = recipe.selling_price || "";
    $("rec-description").value = recipe.description || "";
    $("rec-delivery-time").value = recipe.delivery_time || "";
    $("rec-show-menu").checked = !!recipe.show_on_menu;
    recipe.recipe_ingredients.forEach((li) => addRecipeLine(li));
  } else {
    addRecipeLine();
  }
  updateCostSummary();
  $("recipe-modal").classList.add("visible");
}

function addRecipeLine(existing = null) {
  recipeLineCount++;
  const lineId = "rline-" + recipeLineCount;
  const div = document.createElement("div");
  div.className = "rline";
  div.id = lineId;

  const options = ingredients
    .map((ing) => {
      const selected = existing && existing.ingredient_id === ing.id ? "selected" : "";
      return `<option value="${ing.id}" data-price="${ing.unit_price}" data-unit="${ing.base_unit}" ${selected}>${ing.name}</option>`;
    })
    .join("");

  div.innerHTML = `
    <select class="rline-ing">${options}</select>
    <input type="number" class="qty-input rline-qty" placeholder="qty" min="0" step="any" value="${existing ? existing.quantity : ""}" />
    <span class="rline-unit hint">${existing ? "" : ""}</span>
    <span class="line-cost">0.00 tk</span>
    <button type="button" class="remove">✕</button>
  `;
  $("rlines").appendChild(div);

  const select = div.querySelector(".rline-ing");
  const qtyInput = div.querySelector(".rline-qty");
  const unitLabel = div.querySelector(".rline-unit");

  function refreshUnit() {
    const opt = select.options[select.selectedIndex];
    unitLabel.textContent = opt ? opt.dataset.unit : "";
  }
  refreshUnit();
  select.addEventListener("change", () => {
    refreshUnit();
    updateCostSummary();
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
    const select = div.querySelector(".rline-ing");
    const opt = select.options[select.selectedIndex];
    const qty = parseFloat(div.querySelector(".rline-qty").value) || 0;
    const unit_price = opt ? parseFloat(opt.dataset.price) : 0;
    const lineCost = qty * unit_price;
    div.querySelector(".line-cost").textContent = fmt(lineCost) + " tk";
    return {
      ingredient_id: opt ? opt.value : null,
      ingredient_name_snapshot: opt ? opt.textContent : "",
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
    yield_count: parseInt($("rec-yield").value) || 1,
    packaging_cost: parseFloat($("rec-packaging").value) || 0,
    delivery_cost: parseFloat($("rec-delivery").value) || 0,
    selling_price: parseFloat($("rec-selling").value) || null,
    description: $("rec-description").value.trim() || null,
    delivery_time: $("rec-delivery-time").value.trim() || null,
    show_on_menu: $("rec-show-menu").checked,
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
