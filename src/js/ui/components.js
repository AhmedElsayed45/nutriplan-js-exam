const CATEGORY_STYLES = {
  Beef: ["from-red-50 to-rose-50", "border-red-200", "hover:border-red-400", "from-red-400 to-rose-500", "fa-drumstick-bite"],
  Chicken: ["from-amber-50 to-orange-50", "border-amber-200", "hover:border-amber-400", "from-amber-400 to-orange-500", "fa-drumstick-bite"],
  Dessert: ["from-pink-50 to-rose-50", "border-pink-200", "hover:border-pink-400", "from-pink-400 to-rose-500", "fa-cake-candles"],
  Lamb: ["from-orange-50 to-amber-50", "border-orange-200", "hover:border-orange-400", "from-orange-400 to-amber-500", "fa-drumstick-bite"],
  Miscellaneous: ["from-slate-50 to-gray-50", "border-slate-200", "hover:border-slate-400", "from-slate-400 to-gray-500", "fa-bowl-rice"],
  Pasta: ["from-yellow-50 to-amber-50", "border-yellow-200", "hover:border-yellow-400", "from-yellow-400 to-amber-500", "fa-bowl-food"],
  Pork: ["from-rose-50 to-red-50", "border-rose-200", "hover:border-rose-400", "from-rose-400 to-red-500", "fa-bacon"],
  Seafood: ["from-cyan-50 to-blue-50", "border-cyan-200", "hover:border-cyan-400", "from-cyan-400 to-blue-500", "fa-fish"],
  Side: ["from-green-50 to-emerald-50", "border-green-200", "hover:border-green-400", "from-green-400 to-emerald-500", "fa-plate-wheat"],
  Starter: ["from-teal-50 to-cyan-50", "border-teal-200", "hover:border-teal-400", "from-teal-400 to-cyan-500", "fa-utensils"],
  Vegan: ["from-emerald-50 to-green-50", "border-emerald-200", "hover:border-emerald-400", "from-emerald-400 to-green-500", "fa-leaf"],
  Vegetarian: ["from-lime-50 to-green-50", "border-lime-200", "hover:border-lime-400", "from-lime-400 to-green-500", "fa-seedling"],
  Breakfast: ["from-yellow-50 to-orange-50", "border-yellow-200", "hover:border-yellow-400", "from-yellow-400 to-orange-500", "fa-egg"],
  Goat: ["from-stone-50 to-amber-50", "border-stone-200", "hover:border-stone-400", "from-stone-400 to-amber-500", "fa-paw"]
};

const GRADE_COLORS = {
  a: "bg-green-500",
  b: "bg-lime-500",
  c: "bg-yellow-500",
  d: "bg-orange-500",
  e: "bg-red-500"
};

const NOVA_COLORS = {
  1: "bg-green-500",
  2: "bg-lime-500",
  3: "bg-amber-500",
  4: "bg-red-500"
};

const NUTRIENT_REFERENCE = {
  protein: 50,
  carbs: 250,
  fat: 65,
  fiber: 28,
  sugar: 50,
  saturatedFat: 20
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function amount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, number);
}

function pretty(value) {
  const number = amount(value);
  if (number >= 100) return String(Math.round(number));
  const rounded = Math.round(number * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function percent(value, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((amount(value) / goal) * 100)));
}

function youtubeEmbed(url) {
  const match = String(url || "").match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : "";
}

function instructionSteps(meal) {
  if (Array.isArray(meal.instructions)) {
    return meal.instructions.map((step) => String(step || "").trim()).filter(Boolean);
  }

  return String(meal.instructions || "")
    .split(/\r?\n+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

function recipePreview(meal) {
  const text = instructionSteps(meal).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return "Delicious recipe to try!";
  return text.length > 100 ? `${text.slice(0, 100)}...` : text;
}

export class Ui {
  spinner() {
    return `
      <div class="flex items-center justify-center py-12 full-row">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    `;
  }

  empty(title, text, actionId = "", actionLabel = "Show all recipes", icon = "fa-search") {
    const action = actionId
      ? `<button id="${actionId}" type="button" class="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all">${escapeHtml(actionLabel)}</button>`
      : "";

    return `
      <div class="flex flex-col items-center justify-center py-12 text-center full-row">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <i class="fa-solid ${icon} text-gray-400 text-2xl"></i>
        </div>
        <p class="text-gray-500 text-lg">${escapeHtml(title)}</p>
        <p class="text-gray-400 text-sm mt-2">${escapeHtml(text)}</p>
        ${action}
      </div>
    `;
  }

  categoryCards(categories) {
    const order = ["Beef", "Chicken", "Dessert", "Lamb", "Miscellaneous", "Pasta", "Pork", "Seafood", "Side", "Starter", "Vegan", "Vegetarian"];
    const ordered = order
      .map((name) => categories.find((category) => category.name === name))
      .filter(Boolean);

    return ordered
      .map((category) => {
        const style = CATEGORY_STYLES[category.name] || CATEGORY_STYLES.Miscellaneous;
        const [wash, border, hover, iconWash, icon] = style;
        return `
          <div class="category-card bg-gradient-to-br ${wash} rounded-xl p-3 border ${border} ${hover} hover:shadow-md cursor-pointer transition-all group" data-category="${escapeHtml(category.name)}">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 bg-gradient-to-br ${iconWash} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <i class="fa-solid ${icon} text-sm text-white"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-900">${escapeHtml(category.name)}</h3>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  mealCard(meal) {
    const areaBadge = meal.area
      ? `<span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-lg"><i class="fa-solid fa-globe mr-1 text-blue-600"></i>${escapeHtml(meal.area)}</span>`
      : "";

    return `
      <div class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-meal-id="${escapeHtml(meal.id)}">
        <div class="recipe-media relative h-48 overflow-hidden bg-gray-100">
          <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${escapeHtml(meal.thumbnail)}" alt="${escapeHtml(meal.name)}" loading="lazy" onerror="this.classList.add('hidden')">
          <div class="absolute bottom-3 left-3 flex gap-2">
            <span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-lg"><i class="fa-solid fa-tag mr-1 text-emerald-600"></i>${escapeHtml(meal.category || "Meal")}</span>
            ${areaBadge}
          </div>
        </div>
        <div class="recipe-body p-4">
          <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">${escapeHtml(meal.name)}</h3>
          <p class="text-xs text-gray-600 mb-3 line-clamp-2">${escapeHtml(recipePreview(meal))}</p>
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-gray-900">
              <i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>
              ${escapeHtml(meal.category || "Various")}
            </span>
            <span class="font-semibold text-gray-500">
              <i class="fa-solid fa-globe text-blue-500 mr-1"></i>
              ${escapeHtml(meal.area || "International")}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  mealPage(meal, nutrition) {
    const steps = instructionSteps(meal);
    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];
    const extraTags = (Array.isArray(meal.tags) ? meal.tags : []).slice(0, 2);
    const embed = youtubeEmbed(meal.youtube);
    const servings = nutrition?.servings || 4;
    const perServing = nutrition?.perServing;

    const tagHtml = [
      meal.category ? `<span class="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">${escapeHtml(meal.category)}</span>` : "",
      meal.area ? `<span class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">${escapeHtml(meal.area)}</span>` : "",
      ...extraTags.map((tag) => `<span class="px-3 py-1 bg-purple-500 text-white text-sm font-semibold rounded-full">${escapeHtml(tag)}</span>`)
    ].join("");

    const ingredientHtml = ingredients
      .map((item) => {
        return `
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
            <input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300">
            <span class="text-gray-700">
              <span class="font-medium text-gray-900">${escapeHtml(item.measure || "")}</span>
              ${escapeHtml(item.ingredient || "")}
            </span>
          </div>
        `;
      })
      .join("");

    const stepHtml = steps
      .map((step, index) => {
        return `
          <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
            <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">${index + 1}</div>
            <p class="text-gray-700 leading-relaxed pt-2">${escapeHtml(step)}</p>
          </div>
        `;
      })
      .join("");

    const videoHtml = embed
      ? `
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-video text-red-500"></i>
            Video Tutorial
          </h2>
          <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
            <iframe src="${embed}" title="${escapeHtml(meal.name)} video" class="absolute inset-0 w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>
      `
      : "";

    return `
      <div class="max-w-6xl mx-auto">
        <button id="back-to-meals-btn" type="button" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors">
          <i class="fa-solid fa-arrow-left"></i>
          <span>Back to Recipes</span>
        </button>
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div class="relative h-80 md:h-96">
            <img src="${escapeHtml(meal.thumbnail)}" alt="${escapeHtml(meal.name)}" class="w-full h-full object-cover" onerror="this.classList.add('hidden')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-8">
              <div class="flex items-center gap-3 mb-3 flex-wrap">${tagHtml}</div>
              <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">${escapeHtml(meal.name)}</h1>
              <div class="flex items-center gap-6 text-white/90 flex-wrap">
                <span class="flex items-center gap-2">
                  <i class="fa-solid fa-clock"></i>
                  <span>30 min</span>
                </span>
                <span class="flex items-center gap-2">
                  <i class="fa-solid fa-utensils"></i>
                  <span id="hero-servings">${servings} servings</span>
                </span>
                <span class="flex items-center gap-2">
                  <i class="fa-solid fa-fire"></i>
                  <span id="hero-calories">${perServing ? `${Math.round(amount(perServing.calories))} cal/serving` : "Calculating..."}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-3 mb-8">
          ${perServing
            ? `<button id="log-meal-btn" type="button" class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all" data-meal-id="${escapeHtml(meal.id)}"><i class="fa-solid fa-clipboard-list"></i><span>Log This Meal</span></button>`
            : `<button id="log-meal-btn" type="button" class="flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-500 rounded-xl font-semibold cursor-not-allowed transition-all" data-meal-id="${escapeHtml(meal.id)}" disabled title="Waiting for nutrition data..."><i class="fa-solid fa-spinner fa-spin"></i><span>Calculating...</span></button>`}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-8">
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-list-check text-emerald-600"></i>
                Ingredients
                <span class="text-sm font-normal text-gray-500 ml-auto">${ingredients.length} items</span>
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${ingredientHtml}</div>
            </div>
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-shoe-prints text-emerald-600"></i>
                Instructions
              </h2>
              <div class="space-y-4">${stepHtml || `<p class="text-gray-500">No instructions were provided for this meal.</p>`}</div>
            </div>
            ${videoHtml}
          </div>
          <div class="space-y-6">
            <div class="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-chart-pie text-emerald-600"></i>
                Nutrition Facts
              </h2>
              <div id="nutrition-facts-container">
                ${nutrition ? this.nutrition(nutrition) : this.spinner()}
              </div>
            </div>
            ${meal.source ? `
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-sm font-semibold text-gray-900 mb-2">Recipe Source</h3>
                <a href="${escapeHtml(meal.source)}" target="_blank" class="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-2">
                  <i class="fa-solid fa-external-link"></i>
                  View Original Recipe
                </a>
              </div>
            ` : ""}
          </div>
        </div>
      </div>
    `;
  }

  nutrition(nutrition) {
    const per = nutrition.perServing || {};
    const total = nutrition.totals || {};
    const rows = [
      ["Protein", per.protein, "bg-emerald-500", NUTRIENT_REFERENCE.protein],
      ["Carbs", per.carbs, "bg-blue-500", NUTRIENT_REFERENCE.carbs],
      ["Fat", per.fat, "bg-purple-500", NUTRIENT_REFERENCE.fat],
      ["Fiber", per.fiber, "bg-orange-500", NUTRIENT_REFERENCE.fiber],
      ["Sugar", per.sugar, "bg-pink-500", NUTRIENT_REFERENCE.sugar],
      ["Saturated Fat", per.saturatedFat, "bg-red-500", NUTRIENT_REFERENCE.saturatedFat]
    ];

    const bars = rows
      .map(([label, value, color, goal]) => {
        const width = percent(value, goal);
        return `
          <div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full ${color}"></div>
                <span class="text-gray-700">${label}</span>
              </div>
              <span class="font-bold text-gray-900">${pretty(value)}g</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2 mt-2">
              <div class="${color} h-2 rounded-full" style="width: ${width}%"></div>
            </div>
          </div>
        `;
      })
      .join("");

    const extras = [
      ["Cholesterol", `${Math.round(amount(per.cholesterol))}mg`],
      ["Sodium", `${Math.round(amount(per.sodium))}mg`]
    ];

    const extraHtml = extras
      .map(([label, value]) => {
        return `
          <div class="flex justify-between">
            <span class="text-gray-600">${label}</span>
            <span class="font-medium">${value}</span>
          </div>
        `;
      })
      .join("");

    return `
      <p class="text-sm text-gray-500 mb-4">Per serving</p>
      <div class="text-center py-4 mb-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl">
        <p class="text-sm text-gray-600">Calories per serving</p>
        <p class="text-4xl font-bold text-emerald-600">${Math.round(amount(per.calories))}</p>
        <p class="text-xs text-gray-500 mt-1">Total: ${Math.round(amount(total.calories))} cal</p>
      </div>
      <div class="space-y-4">${bars}</div>
      <div class="mt-6 pt-6 border-t border-gray-100">
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Other</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">${extraHtml}</div>
      </div>
    `;
  }

  nutritionError() {
    return `
      <div class="text-center py-8">
        <i class="fa-solid fa-exclamation-circle text-3xl text-red-400 mb-3"></i>
        <p class="text-gray-600">Unable to load nutrition data</p>
        <button id="retry-nutrition-btn" type="button" class="mt-3 text-emerald-600 hover:text-emerald-700 font-medium text-sm">
          <i class="fa-solid fa-refresh mr-1"></i> Try Again
        </button>
      </div>
    `;
  }

  logMealModal(meal, nutrition) {
    const per = nutrition?.perServing;
    const facts = per
      ? `
        <div class="bg-emerald-50 rounded-xl p-4 mb-6">
          <p class="text-sm text-gray-600 mb-2">Estimated nutrition per serving:</p>
          <div class="grid grid-cols-4 gap-2 text-center">
            <div>
              <p class="text-lg font-bold text-emerald-600">${Math.round(amount(per.calories))}</p>
              <p class="text-xs text-gray-500">Calories</p>
            </div>
            <div>
              <p class="text-lg font-bold text-blue-600">${pretty(per.protein)}g</p>
              <p class="text-xs text-gray-500">Protein</p>
            </div>
            <div>
              <p class="text-lg font-bold text-amber-600">${pretty(per.carbs)}g</p>
              <p class="text-xs text-gray-500">Carbs</p>
            </div>
            <div>
              <p class="text-lg font-bold text-purple-600">${pretty(per.fat)}g</p>
              <p class="text-xs text-gray-500">Fat</p>
            </div>
          </div>
        </div>
      `
      : `
        <div class="bg-gray-50 rounded-xl p-4 mb-6">
          <p class="text-sm text-gray-500 text-center">Nutrition information not available for this meal</p>
        </div>
      `;

    return `
      <div id="log-meal-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
          <div class="flex items-center gap-4 mb-6">
            <img src="${escapeHtml(meal.thumbnail)}" alt="${escapeHtml(meal.name)}" class="w-16 h-16 rounded-xl object-cover">
            <div>
              <h3 class="text-xl font-bold text-gray-900">Log This Meal</h3>
              <p class="text-gray-500 text-sm">${escapeHtml(meal.name)}</p>
            </div>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Number of Servings</label>
            <div class="flex items-center gap-3">
              <button id="decrease-servings" type="button" class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <i class="fa-solid fa-minus text-gray-600"></i>
              </button>
              <input type="number" id="meal-servings" value="1" min="0.5" max="10" step="0.5" class="w-20 text-center text-xl font-bold border-2 border-gray-200 rounded-lg py-2">
              <button id="increase-servings" type="button" class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <i class="fa-solid fa-plus text-gray-600"></i>
              </button>
            </div>
          </div>
          ${facts}
          <div class="flex gap-3">
            <button id="cancel-log-meal" type="button" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all">Cancel</button>
            <button id="confirm-log-meal" type="button" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all">
              <i class="fa-solid fa-clipboard-list mr-2"></i>Log Meal
            </button>
          </div>
        </div>
      </div>
    `;
  }

  productCard(product) {
    const grade = String(product.nutritionGrade || "").toLowerCase();
    const gradeClass = GRADE_COLORS[grade] || "bg-gray-400";
    const gradeLabel = GRADE_COLORS[grade] ? grade.toUpperCase() : "N/A";
    const nova = Number(product.novaGroup);
    const novaHtml = NOVA_COLORS[nova]
      ? `<div class="absolute top-2 right-2 ${NOVA_COLORS[nova]} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" title="NOVA ${nova}">${nova}</div>`
      : "";
    const nutrients = product.nutrients || {};
    const image = product.image
      ? `<img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.classList.add('hidden')">`
      : `<i class="fa-solid fa-barcode text-gray-300 text-4xl"></i>`;

    return `
      <div class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-barcode="${escapeHtml(product.barcode)}">
        <div class="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
          ${image}
          <div class="absolute top-2 left-2 ${gradeClass} text-white text-xs font-bold px-2 py-1 rounded uppercase">Nutri-Score ${gradeLabel}</div>
          ${novaHtml}
        </div>
        <div class="p-4">
          <p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${escapeHtml(product.brand || "Unbranded")}</p>
          <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">${escapeHtml(product.name || "Product")}</h3>
          <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span><i class="fa-solid fa-fire mr-1"></i>${pretty(nutrients.calories)} kcal/100g</span>
          </div>
          <div class="grid grid-cols-4 gap-1 text-center">
            <div class="bg-emerald-50 rounded p-1.5">
              <p class="text-xs font-bold text-emerald-700">${pretty(nutrients.protein)}g</p>
              <p class="text-[10px] text-gray-500">Protein</p>
            </div>
            <div class="bg-blue-50 rounded p-1.5">
              <p class="text-xs font-bold text-blue-700">${pretty(nutrients.carbs)}g</p>
              <p class="text-[10px] text-gray-500">Carbs</p>
            </div>
            <div class="bg-purple-50 rounded p-1.5">
              <p class="text-xs font-bold text-purple-700">${pretty(nutrients.fat)}g</p>
              <p class="text-[10px] text-gray-500">Fat</p>
            </div>
            <div class="bg-orange-50 rounded p-1.5">
              <p class="text-xs font-bold text-orange-700">${pretty(nutrients.sugar)}g</p>
              <p class="text-[10px] text-gray-500">Sugar</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  productModal(product) {
    const nutrients = product.nutrients || {};
    const grade = String(product.nutritionGrade || "").toLowerCase();
    const gradeClass = GRADE_COLORS[grade] || "bg-gray-400";
    const gradeLabel = GRADE_COLORS[grade] ? grade.toUpperCase() : "N/A";
    const image = product.image
      ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="w-full h-48 object-contain bg-gray-50 rounded-xl">`
      : `<div class="w-full h-48 bg-gray-50 rounded-xl flex items-center justify-center"><i class="fa-solid fa-barcode text-4xl text-gray-300"></i></div>`;

    return `
      <div class="modal-card bg-white rounded-2xl shadow-lg p-6">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <p class="text-sm text-emerald-600 font-semibold">${escapeHtml(product.brand || "Unbranded")}</p>
            <h3 class="text-2xl font-bold text-gray-900">${escapeHtml(product.name || "Product")}</h3>
            <p class="text-xs text-gray-500 mt-1">Barcode ${escapeHtml(product.barcode || "")}</p>
          </div>
          <button id="close-product-modal" type="button" class="w-10 h-10 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        ${image}
        <div class="flex items-center gap-2 mt-4">
          <span class="px-3 py-1 ${gradeClass} text-white text-xs font-bold rounded-full">Nutri-Score ${gradeLabel}</span>
          ${product.novaGroup ? `<span class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">NOVA ${escapeHtml(product.novaGroup)}</span>` : ""}
        </div>
        <div class="mt-4">
          <label for="product-grams" class="text-sm font-semibold text-gray-700">Amount in grams</label>
          <input id="product-grams" type="number" min="1" step="1" value="100" class="w-full mt-2 px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
          <p class="text-xs text-gray-500 mt-2">Nutrition below is for the amount you enter. Packaged values are stored per 100g.</p>
        </div>
        <div id="product-preview" class="grid grid-cols-4 gap-2 text-center mt-4">
          ${this.productPreview(nutrients, 100)}
        </div>
        <button id="confirm-product-log" type="button" class="mt-6 w-full px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all">
          <i class="fa-solid fa-clipboard-list mr-2"></i>Add to Food Log
        </button>
      </div>
    `;
  }

  productPreview(nutrients, grams) {
    const scale = amount(grams) / 100;
    const cells = [
      ["Calories", Math.round(amount(nutrients.calories) * scale), "bg-emerald-50", "text-emerald-700"],
      ["Protein", `${pretty(amount(nutrients.protein) * scale)}g`, "bg-blue-50", "text-blue-700"],
      ["Carbs", `${pretty(amount(nutrients.carbs) * scale)}g`, "bg-amber-50", "text-amber-600"],
      ["Fat", `${pretty(amount(nutrients.fat) * scale)}g`, "bg-purple-50", "text-purple-700"]
    ];

    return cells
      .map(([label, value, bg, color]) => {
        return `
          <div class="${bg} rounded-xl p-3">
            <p class="text-lg font-bold ${color}">${value}</p>
            <p class="text-xs text-gray-500">${label}</p>
          </div>
        `;
      })
      .join("");
  }

  todayPanel(items, totals, goals) {
    const cards = [
      ["Calories", totals.calories, goals.calories, "kcal", "bg-emerald-50", "bg-emerald-500", totals.calories > goals.calories],
      ["Protein", totals.protein, goals.protein, "g", "bg-blue-50", "bg-blue-500", false],
      ["Carbs", totals.carbs, goals.carbs, "g", "bg-amber-50", "bg-amber-500", false],
      ["Fat", totals.fat, goals.fat, "g", "bg-purple-50", "bg-purple-500", false]
    ];

    const cardsHtml = cards
      .map(([label, value, goal, unit, bg, bar, over]) => {
        const width = percent(value, goal);
        const cardBg = over ? "bg-red-50" : bg;
        const barColor = over ? "bg-red-500" : bar;
        const note = label === "Calories" && over
          ? `<p class="text-xs text-red-600 mt-2 font-medium">Over the daily limit</p>`
          : label !== "Calories" && value >= goal
            ? `<p class="text-xs text-green-600 mt-2 font-medium">Goal met</p>`
            : "";
        return `
          <div class="${cardBg} rounded-xl p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-gray-700">${label}</span>
              <span class="text-sm text-gray-500">${Math.round(value)} / ${goal} ${unit}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div class="${barColor} h-2.5 rounded-full" style="width: ${width}%"></div>
            </div>
            ${note}
          </div>
        `;
      })
      .join("");

    const banner = totals.calories > goals.calories
      ? `
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
          <i class="fa-solid fa-triangle-exclamation mr-2"></i>
          You passed today's ${goals.calories} kcal limit.
        </div>
      `
      : "";

    const list = items.length
      ? items.map((item) => this.logItem(item)).join("")
      : `
        <div class="text-center py-12">
          <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-utensils text-gray-300 text-3xl"></i>
          </div>
          <p class="text-gray-500 font-medium mb-2">No food logged today</p>
          <p class="text-gray-400 text-sm mb-4">Start tracking your nutrition by logging meals or scanning products</p>
          <div class="flex justify-center gap-3">
            <a href="home" data-page="meals" class="nav-link inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all">
              <i class="fa-solid fa-plus"></i>
              Browse Recipes
            </a>
            <a href="products" data-page="products" class="nav-link inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              <i class="fa-solid fa-barcode"></i>
              Scan Product
            </a>
          </div>
        </div>
      `;

    return `
      <h3 class="text-lg font-bold text-gray-900 mb-4">
        <i class="fa-solid fa-fire text-orange-500 mr-2"></i>
        Today's Nutrition
      </h3>
      ${banner}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">${cardsHtml}</div>
      <div class="border-t border-gray-200 pt-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-gray-700">Logged Items (${items.length})</h4>
          <button id="clear-foodlog" type="button" class="text-red-500 hover:text-red-600 text-sm font-medium" style="display: ${items.length ? "inline-flex" : "none"}">
            <i class="fa-solid fa-trash mr-1"></i>Clear All
          </button>
        </div>
        <div id="logged-items-list" class="space-y-2">${list}</div>
      </div>
    `;
  }

  weekBoard(days, calorieGoal) {
    const cells = days
      .map((day) => {
        return `
          <div class="text-center ${day.today ? "bg-indigo-100 rounded-xl" : ""}">
            <p class="text-xs text-gray-500 mb-1">${escapeHtml(day.label)}</p>
            <p class="text-sm font-medium text-gray-900">${day.date}</p>
            <div class="mt-2 ${day.calories > 0 ? "text-emerald-600" : "text-gray-300"}">
              <p class="text-lg font-bold">${day.calories}</p>
              <p class="text-xs">kcal</p>
            </div>
            ${day.items > 0 ? `<p class="text-xs text-gray-400 mt-1">${day.items} items</p>` : ""}
          </div>
        `;
      })
      .join("");

    const totalCalories = days.reduce((sum, day) => sum + day.calories, 0);
    const totalItems = days.reduce((sum, day) => sum + day.items, 0);
    const average = totalCalories > 0 ? Math.round(totalCalories / 7) : 0;
    const onGoal = days.filter((day) => day.calories > 0 && day.calories >= calorieGoal * 0.8 && day.calories <= calorieGoal * 1.2).length;
    const stats = [
      ["Weekly Average", `${average} kcal`, "bg-emerald-100", "text-emerald-600", "fa-chart-line"],
      ["Total Items This Week", `${totalItems} items`, "bg-blue-100", "text-blue-600", "fa-utensils"],
      ["Days On Goal", `${onGoal} / 7`, "bg-purple-100", "text-purple-600", "fa-bullseye"]
    ];

    return {
      grid: `<div class="grid grid-cols-7 gap-2">${cells}</div>`,
      stats: stats
        .map(([label, value, bg, color, icon]) => {
          return `
            <div class="bg-white rounded-xl p-4 border-2 border-gray-200">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 ${bg} rounded-xl flex items-center justify-center">
                  <i class="fa-solid ${icon} ${color} text-xl"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">${label}</p>
                  <p class="text-xl font-bold text-gray-900">${value}</p>
                </div>
              </div>
            </div>
          `;
        })
        .join("")
    };
  }

  logItem(item) {
    const time = new Date(item.loggedAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
    const icon = item.kind === "product" ? "fa-barcode" : item.kind === "custom" ? "fa-pencil" : "fa-utensils";
    const thumb = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" class="w-12 h-12 rounded-lg object-cover" onerror="this.classList.add('hidden')">`
      : `<div class="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><i class="fa-solid ${icon}"></i></div>`;

    return `
      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
        ${thumb}
        <div class="flex-1">
          <p class="font-semibold text-gray-900 text-sm">${escapeHtml(item.name)}</p>
          <p class="text-xs text-gray-500">${Math.round(item.calories)} kcal · P ${Math.round(item.protein)}g · C ${Math.round(item.carbs)}g · F ${Math.round(item.fat)}g</p>
          <p class="text-xs text-gray-400">${escapeHtml(item.detail || "")} · ${time}</p>
        </div>
        <button type="button" class="remove-log-btn text-red-500 hover:text-red-600" data-log-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
  }
}
