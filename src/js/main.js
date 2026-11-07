import { MealApi } from "./api/mealdb.js";
import { DAILY_GOALS, FoodLog } from "./state/appState.js";
import { Ui } from "./ui/components.js";

const HEADERS = {
  meals: ["Meals & Recipes", "Discover delicious and nutritious recipes tailored for you"],
  meal: ["Recipe Details", "View full recipe information and nutrition facts"],
  products: ["Product Scanner", "Search packaged foods by name or barcode"],
  foodlog: ["Food Log", "Track your daily nutrition and food intake"]
};

const GRADE_IDLE = {
  "": "bg-gray-100 text-gray-700 hover:bg-gray-200",
  a: "bg-green-100 text-green-700 hover:bg-green-200",
  b: "bg-lime-100 text-lime-700 hover:bg-lime-200",
  c: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  d: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  e: "bg-red-100 text-red-700 hover:bg-red-200"
};

const AREA_ACTIVE = "px-4 py-2 bg-emerald-600 text-white rounded-full font-medium text-sm whitespace-nowrap hover:bg-emerald-700 transition-all";
const AREA_IDLE = "px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium text-sm whitespace-nowrap hover:bg-gray-200 transition-all";

function siteRoot() {
  const base = document.querySelector("base");
  if (!base) return "/";
  const path = new URL(base.href, location.origin).pathname;
  return path.endsWith("/") ? path : `${path}/`;
}

class Router {
  constructor(listener) {
    this.listener = listener;
  }

  start() {
    window.addEventListener("popstate", () => this.listener(this.read()));
    const root = siteRoot();
    if (location.pathname === root || location.pathname === `${root}index.html`) {
      history.replaceState({ page: "meals" }, "", `${root}home`);
    }
    this.listener(this.read());
  }

  read() {
    const root = siteRoot();
    let path = decodeURIComponent(location.pathname);
    if (path.startsWith(root)) path = path.slice(root.length);
    path = path.replace(/^\/|\/$/g, "").replace(/^index\.html$/, "");
    if (path.startsWith("meal/")) return { name: "meal", id: path.slice(5) };
    if (path === "products" || path === "foodlog") return { name: path, id: "" };
    return { name: "meals", id: "" };
  }

  go(name, id = "") {
    const root = siteRoot();
    const next = name === "meals" ? `${root}home` : name === "meal" ? `${root}meal/${id}` : `${root}${name}`;
    if (location.pathname === next) {
      this.listener(this.read());
      return;
    }
    history.pushState({ page: name }, "", next);
    this.listener(this.read());
  }
}

class NutriPlan {
  constructor() {
    this.api = new MealApi();
    this.log = new FoodLog();
    this.ui = new Ui();
    this.router = new Router((route) => this.route(route));
    this.areas = [];
    this.categoryList = [];
    this.meals = [];
    this.mealIndex = new Map();
    this.nutritionCache = new Map();
    this.products = [];
    this.productIndex = new Map();
    this.category = "";
    this.area = "";
    this.query = "";
    this.productGrade = "";
    this.gradePicked = false;
    this.productCategory = "";
    this.productContext = null;
    this.view = "grid";
    this.activeMealId = "";
    this.openProductCode = "";
    this.mealsLoaded = false;
    this.overlayHidden = false;
    this.searchTimer = 0;
    this.mealRequest = 0;
    this.productRequest = 0;
    this.detailRequest = 0;
    this.routeMealId = "";
  }

  start() {
    this.cacheDom();
    this.prepareProductCategories();
    this.renderAreas();
    this.bindEvents();
    this.router.start();
  }

  cacheDom() {
    this.areaRow = document.getElementById("area-filters");
    this.categoriesGrid = document.getElementById("categories-grid");
    this.recipesGrid = document.getElementById("recipes-grid");
    this.recipesTitle = document.getElementById("recipes-title");
    this.recipesCount = document.getElementById("recipes-count");
    this.searchInput = document.getElementById("search-input");
    this.details = document.getElementById("meal-details");
    this.productsGrid = document.getElementById("products-grid");
    this.productsCount = document.getElementById("products-count");
    this.productSearch = document.getElementById("product-search-input");
    this.barcodeInput = document.getElementById("barcode-input");
    this.todaySection = document.getElementById("foodlog-today-section");
    this.dateLabel = document.getElementById("foodlog-date");
    this.chart = document.getElementById("weekly-chart");
    this.headerTitle = document.querySelector("#header h1");
    this.headerText = document.querySelector("#header p");
    this.gridButton = document.getElementById("grid-view-btn");
    this.listButton = document.getElementById("list-view-btn");
  }

  bindEvents() {
    document.addEventListener("click", (event) => this.onClick(event));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeModal();
        this.closeSidebar();
      }
    });

    this.searchInput.addEventListener("input", () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.applySearch(), 400);
    });

    this.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        clearTimeout(this.searchTimer);
        this.applySearch();
      }
    });

    this.productSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.searchProducts();
    });

    this.barcodeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.lookupBarcode();
    });
  }

  prepareProductCategories() {
    this.paintGrades();
  }

  async route(route) {
    this.setPage(route.name);

    try {
      if (route.name === "meal") {
        await this.openMeal(route.id);
      } else if (route.name === "meals" && !this.mealsLoaded) {
        await this.loadHome();
      } else if (route.name === "products" && this.products.length === 0) {
        this.renderProducts();
      } else if (route.name === "foodlog") {
        this.renderLog();
      }
    } finally {
      this.hideOverlay();
    }
  }

  setPage(name) {
    const mealsVisible = name === "meals";
    document.getElementById("search-filters-section").style.display = mealsVisible ? "" : "none";
    document.getElementById("meal-categories-section").style.display = mealsVisible ? "" : "none";
    document.getElementById("all-recipes-section").style.display = mealsVisible ? "" : "none";
    this.details.style.display = name === "meal" ? "block" : "none";
    document.getElementById("products-section").style.display = name === "products" ? "block" : "none";
    document.getElementById("foodlog-section").style.display = name === "foodlog" ? "block" : "none";

    const [title, text] = HEADERS[name] || HEADERS.meals;
    this.headerTitle.textContent = title;
    this.headerText.textContent = text;
    this.markNav(name === "meal" ? "meals" : name);
    this.closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  markNav(page) {
    document.querySelectorAll(".nav-link").forEach((link) => {
      const active = link.dataset.page === page;
      const base = "nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all";
      link.className = active
        ? `${base} bg-emerald-50 text-emerald-700`
        : `${base} text-gray-600 hover:bg-gray-50`;
      const label = link.querySelector("span");
      if (label) label.className = active ? "font-semibold" : "font-medium";
    });
  }

  async loadHome() {
    await Promise.all([this.loadCategories(), this.loadAreas(), this.loadMeals()]);
  }

  async loadAreas() {
    try {
      const data = await this.api.getAreas();
      const names = (data.results || [])
        .map((item) => item.name)
        .filter((name) => typeof name === "string" && name);
      if (names.length) this.areas = names;
    } catch {
    }
    this.renderAreas();
  }

  async loadCategories() {
    try {
      const data = await this.api.getCategories();
      this.categoryList = data.results || [];
      this.renderCategories();
    } catch {
      this.categoriesGrid.innerHTML = this.ui.empty("Categories are unavailable", "Check your connection and try again");
    }
  }

  async loadMeals() {
    const requestId = ++this.mealRequest;
    this.recipesTitle.textContent = "All Recipes";
    this.recipesCount.textContent = "Loading recipes...";
    this.recipesGrid.innerHTML = this.ui.spinner();

    try {
      const data = await this.fetchMeals();
      if (requestId !== this.mealRequest) return;
      this.meals = (data.results || []).slice(0, 25);
      this.meals.forEach((meal) => {
        if (meal?.id) this.mealIndex.set(String(meal.id), meal);
      });
      this.mealsLoaded = true;
      this.renderMeals();
    } catch {
      if (requestId !== this.mealRequest) return;
      this.recipesCount.textContent = "Could not load recipes";
      this.recipesGrid.innerHTML = this.ui.empty("Recipes are unavailable", "Check your connection and try again", "retry-meals", "Try again");
      this.refreshIcons(this.recipesGrid);
    }
  }

  fetchMeals() {
    if (this.query) return this.api.searchMeals(this.query);
    if (this.category) return this.api.filterMeals({ category: this.category });
    if (this.area) return this.api.filterMeals({ area: this.area });
    return this.api.searchMeals("chicken");
  }

  mealsCountText() {
    const count = this.meals.length;
    const noun = count === 1 ? "recipe" : "recipes";
    if (!count) return "No recipes found";
    if (this.query) return `Showing ${count} ${noun} for "${this.query}"`;
    if (this.category) return `Showing ${count} ${this.category} ${noun}`;
    if (this.area) return `Showing ${count} ${this.area} ${noun}`;
    return `Showing ${count} ${noun}`;
  }

  renderMeals() {
    const count = this.meals.length;
    this.recipesTitle.textContent = "All Recipes";
    this.recipesCount.textContent = this.mealsCountText();

    this.recipesGrid.classList.toggle("is-list", this.view === "list");
    this.recipesGrid.innerHTML = count
      ? this.meals.map((meal) => this.ui.mealCard(meal)).join("")
      : this.ui.empty("No recipes found", "Try another name, category, or area", "show-all-meals");
    this.refreshIcons(this.recipesGrid);
  }

  renderCategories() {
    this.categoriesGrid.innerHTML = this.ui.categoryCards(this.categoryList);
    this.refreshIcons(this.categoriesGrid);
  }

  renderAreas() {
    const buttons = [
      `<button type="button" class="${this.area ? AREA_IDLE : AREA_ACTIVE}" data-area="">All Cuisines</button>`
    ];

    this.areas.slice(0, 10).forEach((area) => {
      const label = area
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
      buttons.push(`<button type="button" class="${this.area === area ? AREA_ACTIVE : AREA_IDLE}" data-area="${label}">${label}</button>`);
    });

    this.areaRow.innerHTML = buttons.join("");
  }

  applySearch() {
    this.query = this.searchInput.value.trim();
    if (this.query) {
      this.category = "";
      this.area = "";
      this.renderAreas();
      this.renderCategories();
    }
    this.loadMeals();
  }

  selectCategory(name) {
    this.category = this.category === name ? "" : name;
    this.area = "";
    this.query = "";
    this.searchInput.value = "";
    this.renderAreas();
    this.renderCategories();
    this.loadMeals();
  }

  selectArea(area) {
    this.area = area;
    this.category = "";
    this.query = "";
    this.searchInput.value = "";
    this.renderAreas();
    this.renderCategories();
    this.loadMeals();
  }

  showAllMeals() {
    this.category = "";
    this.area = "";
    this.query = "";
    this.searchInput.value = "";
    this.renderAreas();
    this.renderCategories();
    this.loadMeals();
  }

  setView(view) {
    this.view = view;
    this.gridButton.className = view === "grid" ? "px-3 py-1.5 bg-white rounded-md shadow-sm" : "px-3 py-1.5";
    this.listButton.className = view === "list" ? "px-3 py-1.5 bg-white rounded-md shadow-sm" : "px-3 py-1.5";
    this.gridButton.querySelector("i").className = view === "grid"
      ? "fa-solid fa-table-cells text-gray-700"
      : "fa-solid fa-table-cells text-gray-500";
    this.listButton.querySelector("i").className = view === "list"
      ? "fa-solid fa-list text-gray-700"
      : "fa-solid fa-list text-gray-500";
    this.renderMeals();
  }

  slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async openMeal(slug) {
    const token = ++this.detailRequest;
    let meal = this.routeMealId ? this.mealIndex.get(String(this.routeMealId)) : null;
    this.routeMealId = "";

    if (!meal) {
      this.details.innerHTML = `<div class="max-w-6xl mx-auto">${this.ui.spinner()}</div>`;
      try {
        if (/^\d+$/.test(String(slug))) {
          meal = (await this.api.getMeal(slug)).result;
        } else {
          const data = await this.api.searchMeals(String(slug).replace(/-/g, " "));
          meal = (data.results || []).find((item) => this.slugify(item.name) === slug) || null;
        }
      } catch {
        meal = null;
      }
    }

    if (token !== this.detailRequest) return;

    if (!meal) {
      this.details.innerHTML = `<div class="max-w-6xl mx-auto">${this.ui.empty("Meal not found", "Go back and choose another recipe", "back-to-meals-btn", "Back to recipes")}</div>`;
      this.refreshIcons(this.details);
      return;
    }

    this.mealIndex.set(String(meal.id), meal);
    this.activeMealId = String(meal.id);
    const canonical = `${siteRoot()}meal/${this.slugify(meal.name)}`;
    if (location.pathname !== canonical) history.replaceState({ page: "meal" }, "", canonical);

    const nutrition = this.nutritionCache.get(String(meal.id)) || null;
    this.details.innerHTML = this.ui.mealPage(meal, nutrition);
    this.refreshIcons(this.details);
    if (!nutrition) this.fillNutrition(meal);
  }

  async fillNutrition(meal) {
    const mealId = String(meal.id);
    const ingredients = (meal.ingredients || [])
      .map((item) => `${item.measure || ""} ${item.ingredient || ""}`.trim())
      .filter(Boolean);
    let nutrition = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        nutrition = await this.api.analyzeRecipe(meal.name, ingredients);
        break;
      } catch {
        nutrition = null;
      }
    }

    if (this.activeMealId !== mealId) return;
    const box = document.getElementById("nutrition-facts-container");
    if (!box) return;

    if (!nutrition) {
      box.innerHTML = this.ui.nutritionError();
      this.refreshIcons(box);
      const button = document.getElementById("log-meal-btn");
      if (button) {
        button.disabled = true;
        button.className = "flex items-center gap-2 px-6 py-3 bg-red-100 text-red-500 rounded-xl font-semibold cursor-not-allowed transition-all";
        button.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i><span>Unavailable</span>`;
        this.refreshIcons(button);
      }
      return;
    }

    this.nutritionCache.set(mealId, nutrition);
    box.innerHTML = this.ui.nutrition(nutrition);
    this.refreshIcons(box);
    this.applyHero(nutrition);
  }

  applyHero(nutrition) {
    const servings = document.getElementById("hero-servings");
    const calories = document.getElementById("hero-calories");
    if (servings) servings.textContent = `${nutrition.servings || 1} servings`;
    if (calories) {
      calories.textContent = `${Math.round(Math.max(0, Number(nutrition.perServing?.calories) || 0))} cal/serving`;
    }

    const button = document.getElementById("log-meal-btn");
    if (!button) return;
    button.disabled = false;
    button.className = "flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all";
    button.removeAttribute("title");
    button.innerHTML = `<i class="fa-solid fa-clipboard-list"></i><span>Log This Meal</span>`;
    this.refreshIcons(button);
  }

  logCurrentMeal() {
    const meal = this.mealIndex.get(String(this.activeMealId));
    if (!meal || document.getElementById("log-meal-modal")) return;
    const nutrition = this.nutritionCache.get(String(this.activeMealId)) || null;
    document.body.insertAdjacentHTML("beforeend", this.ui.logMealModal(meal, nutrition));
    this.refreshIcons(document.getElementById("log-meal-modal"));
  }

  changeServings(step) {
    const input = document.getElementById("meal-servings");
    if (!input) return;
    const next = Math.round((parseFloat(input.value) + step) * 10) / 10;
    if (next < 0.5 || next > 10) return;
    input.value = Number.isInteger(next) ? String(next) : next.toFixed(1);
  }

  confirmLogMeal() {
    const meal = this.mealIndex.get(String(this.activeMealId));
    const input = document.getElementById("meal-servings");
    if (!meal || !input) return;
    const servings = parseFloat(input.value) || 1;
    const per = this.nutritionCache.get(String(this.activeMealId))?.perServing;
    document.getElementById("log-meal-modal")?.remove();
    this.addLogEntry({
      kind: "meal",
      name: meal.name,
      image: meal.thumbnail || "",
      detail: `${servings} serving${servings === 1 ? "" : "s"}`,
      servings,
      calories: Math.round(Math.max(0, Number(per?.calories) || 0) * servings),
      protein: Math.round(Math.max(0, Number(per?.protein) || 0) * servings),
      carbs: Math.round(Math.max(0, Number(per?.carbs) || 0) * servings),
      fat: Math.round(Math.max(0, Number(per?.fat) || 0) * servings)
    });
  }

  async searchProducts() {
    const query = this.productSearch.value.trim();
    if (!query) {
      await Swal.fire({
        icon: "info",
        title: "Type a product name",
        text: "Try Pepsi, Nutella, or Cheerios.",
        confirmButtonColor: "#059669"
      });
      return;
    }

    this.productCategory = "";
    this.productGrade = "";
    this.gradePicked = false;
    this.productContext = { type: "search", label: query };
    this.markProductCategory("");
    this.paintGrades();
    await this.loadProducts(() => this.api.searchProducts(query));
  }

  async lookupBarcode() {
    const code = this.barcodeInput.value.trim();
    if (!/^\d{6,}$/.test(code)) {
      await Swal.fire({
        icon: "error",
        title: "Enter a valid barcode",
        text: "Use the digits printed under the barcode.",
        confirmButtonColor: "#059669"
      });
      return;
    }

    const requestId = ++this.productRequest;
    this.productsCount.textContent = "Looking up barcode...";
    this.productsGrid.innerHTML = this.ui.spinner();

    try {
      const data = await this.api.getProduct(code);
      if (requestId !== this.productRequest) return;
      const product = data.result;
      if (!product) throw new Error("Product not found");
      this.rememberProducts([product]);
      this.productCategory = "";
      this.productGrade = "";
      this.gradePicked = false;
      this.productContext = { type: "barcode", label: code };
      this.markProductCategory("");
      this.paintGrades();
      this.renderProducts();
      this.openProduct(product.barcode);
    } catch {
      if (requestId !== this.productRequest) return;
      this.products = [];
      this.productsCount.textContent = "No product found";
      this.productsGrid.innerHTML = this.ui.empty("Barcode not found", "Check the number and try again");
      this.refreshIcons(this.productsGrid);
    }
  }

  async loadProductCategory(category) {
    this.productCategory = category;
    this.productContext = { type: "category", label: category.replaceAll("_", " ") };
    this.markProductCategory(category);
    this.productSearch.value = "";
    await this.loadProducts(() => this.api.getProductsByCategory(category));
  }

  async loadProducts(request) {
    const requestId = ++this.productRequest;
    this.productsCount.textContent = "Loading products...";
    this.productsGrid.innerHTML = this.ui.spinner();

    try {
      const data = await request();
      if (requestId !== this.productRequest) return;
      this.rememberProducts(data.results || []);
      this.renderProducts();
    } catch {
      if (requestId !== this.productRequest) return;
      this.productsCount.textContent = "Could not load products";
      this.productsGrid.innerHTML = this.ui.empty("Products are unavailable", "Check your connection and try again");
      this.refreshIcons(this.productsGrid);
    }
  }

  rememberProducts(list) {
    this.products = list;
    list.forEach((product) => {
      if (product?.barcode) this.productIndex.set(String(product.barcode), product);
    });
  }

  visibleProducts() {
    if (!this.productGrade) return this.products;
    return this.products.filter((product) => {
      return String(product.nutritionGrade || "").toLowerCase() === this.productGrade;
    });
  }

  renderProducts() {
    const visible = this.visibleProducts();
    const context = this.productContext;
    const emptyBox = this.ui.empty("No products to display", "Search for a product or browse by category", "", "", "fa-box-open");

    if (!this.products.length) {
      if (context?.type === "category") this.productsCount.textContent = `No products found in ${context.label}`;
      else if (context?.type === "search") this.productsCount.textContent = `No products found for "${context.label}"`;
      else this.productsCount.textContent = "Search for products to see results";
      this.productsGrid.innerHTML = emptyBox;
    } else if (!visible.length) {
      this.productsCount.textContent = "No products for this Nutri-Score";
      this.productsGrid.innerHTML = emptyBox;
    } else if (context?.type === "category") {
      this.productsCount.textContent = `Found ${visible.length} products in ${context.label}`;
      this.productsGrid.innerHTML = visible.map((product) => this.ui.productCard(product)).join("");
    } else if (context?.type === "search") {
      this.productsCount.textContent = `Found ${visible.length} products for "${context.label}"`;
      this.productsGrid.innerHTML = visible.map((product) => this.ui.productCard(product)).join("");
    } else {
      this.productsCount.textContent = `Found ${visible.length} products`;
      this.productsGrid.innerHTML = visible.map((product) => this.ui.productCard(product)).join("");
    }
    this.refreshIcons(this.productsGrid);
  }

  paintGrades() {
    document.querySelectorAll(".nutri-score-filter").forEach((button) => {
      const grade = button.dataset.grade || "";
      const ring = this.gradePicked && grade === this.productGrade ? " ring-2 ring-gray-900" : "";
      button.className = `nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all ${GRADE_IDLE[grade]}${ring}`;
    });
  }

  markProductCategory() {}

  setGrade(grade) {
    this.productGrade = grade;
    this.gradePicked = true;
    this.paintGrades();
    this.renderProducts();
  }

  openProduct(barcode) {
    const product = this.productIndex.get(String(barcode));
    if (!product) return;
    this.openProductCode = String(barcode);
    let modal = document.getElementById("product-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "product-modal";
      document.body.appendChild(modal);
    }
    modal.innerHTML = this.ui.productModal(product);
    modal.classList.add("is-open");
    this.refreshIcons(modal);

    const grams = modal.querySelector("#product-grams");
    const preview = modal.querySelector("#product-preview");
    grams.addEventListener("input", () => {
      const value = Math.max(0, Number(grams.value) || 0);
      preview.innerHTML = this.ui.productPreview(product.nutrients || {}, value);
    });
  }

  closeModal() {
    const modal = document.getElementById("product-modal");
    if (!modal) return;
    modal.classList.remove("is-open");
    this.openProductCode = "";
  }

  async confirmProductLog() {
    const product = this.productIndex.get(this.openProductCode);
    const gramsInput = document.getElementById("product-grams");
    const grams = Number(gramsInput?.value);

    if (!product || !Number.isInteger(grams) || grams < 1) {
      await Swal.fire({
        icon: "error",
        title: "Enter the amount in grams",
        confirmButtonColor: "#059669"
      });
      return;
    }

    const scale = grams / 100;
    const nutrients = product.nutrients || {};
    this.closeModal();
    this.addLogEntry({
      kind: "product",
      name: product.name || "Product",
      image: product.image || "",
      detail: `${grams} g`,
      calories: Math.round(Math.max(0, Number(nutrients.calories) || 0) * scale),
      protein: Math.round(Math.max(0, Number(nutrients.protein) || 0) * scale),
      carbs: Math.round(Math.max(0, Number(nutrients.carbs) || 0) * scale),
      fat: Math.round(Math.max(0, Number(nutrients.fat) || 0) * scale)
    });
  }

  async addLogEntry(entry) {
    const before = this.log.totals().calories;
    this.log.add(entry);
    const after = this.log.totals().calories;
    this.renderLog();

    if (before <= DAILY_GOALS.calories && after > DAILY_GOALS.calories) {
      await Swal.fire({
        icon: "warning",
        title: "Calorie limit reached",
        text: `${entry.name} was added. Today is now over the ${DAILY_GOALS.calories} kcal limit.`,
        confirmButtonColor: "#059669"
      });
      return;
    }

    if (entry.kind === "meal") {
      const servings = entry.servings || 1;
      await Swal.fire({
        title: "Meal Logged!",
        html: `<p class="text-gray-600">${entry.name} (${servings} serving${servings === 1 ? "" : "s"}) has been added to your daily log.</p>${entry.calories > 0 ? `<p class="text-emerald-600 font-semibold mt-2">+${entry.calories} calories</p>` : ""}`,
        icon: "success",
        confirmButtonColor: "#10b981",
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    await Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Added to today's food log",
      showConfirmButton: false,
      timer: 1700
    });
  }

  renderLog() {
    const items = this.log.items();
    const totals = this.log.totals();
    this.dateLabel.textContent = FoodLog.label(new Date());
    this.todaySection.innerHTML = this.ui.todayPanel(items, totals, DAILY_GOALS);
    this.refreshIcons(this.todaySection);
    const board = this.ui.weekBoard(this.log.week(), DAILY_GOALS.calories);
    this.chart.className = "";
    this.chart.style.height = "";
    this.chart.innerHTML = board.grid;
    const stats = document.getElementById("foodlog-stats");
    if (stats) {
      stats.innerHTML = board.stats;
      this.refreshIcons(stats);
    }
  }

  async clearLog() {
    const result = await Swal.fire({
      title: "Clear today's log?",
      text: "This removes every item logged today.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Clear all",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280"
    });

    if (!result.isConfirmed) return;
    this.log.clear();
    this.renderLog();
  }

  onClick(event) {
    if (event.target.closest("#header-menu-btn")) {
      document.getElementById("sidebar").classList.toggle("open");
      document.getElementById("sidebar-overlay").classList.toggle("active");
      return;
    }

    if (event.target.closest("#sidebar-close-btn") || event.target.closest("#sidebar-overlay")) {
      this.closeSidebar();
      return;
    }

    const nav = event.target.closest(".nav-link");
    if (nav) {
      event.preventDefault();
      this.closeSidebar();
      this.router.go(nav.dataset.page);
      return;
    }

    const areaButton = event.target.closest("[data-area]");
    if (areaButton && this.areaRow.contains(areaButton)) {
      this.selectArea(areaButton.dataset.area);
      return;
    }

    const categoryCard = event.target.closest("[data-category]");
    if (categoryCard && this.categoriesGrid.contains(categoryCard)) {
      this.selectCategory(categoryCard.dataset.category);
      return;
    }

    if (event.target.closest("#view-all-categories") || event.target.closest("#show-all-meals")) {
      this.showAllMeals();
      return;
    }

    if (event.target.closest("#retry-meals")) {
      this.loadMeals();
      return;
    }

    if (event.target.closest("#grid-view-btn")) {
      this.setView("grid");
      return;
    }

    if (event.target.closest("#list-view-btn")) {
      this.setView("list");
      return;
    }

    const mealCard = event.target.closest(".recipe-card");
    if (mealCard) {
      this.routeMealId = mealCard.dataset.mealId;
      const meal = this.mealIndex.get(String(this.routeMealId));
      this.router.go("meal", this.slugify(meal?.name || "meal"));
      return;
    }

    if (event.target.closest("#back-to-meals-btn")) {
      this.router.go("meals");
      return;
    }

    if (event.target.closest("#log-meal-btn")) {
      this.logCurrentMeal();
      return;
    }

    if (event.target.closest("#retry-nutrition-btn")) {
      const meal = this.mealIndex.get(String(this.activeMealId));
      if (meal) this.fillNutrition(meal);
      return;
    }

    if (event.target.closest("#decrease-servings")) {
      this.changeServings(-0.5);
      return;
    }

    if (event.target.closest("#increase-servings")) {
      this.changeServings(0.5);
      return;
    }

    if (event.target.closest("#cancel-log-meal")) {
      document.getElementById("log-meal-modal")?.remove();
      return;
    }

    if (event.target.id === "log-meal-modal") {
      event.target.remove();
      return;
    }

    if (event.target.closest("#confirm-log-meal")) {
      this.confirmLogMeal();
      return;
    }

    if (event.target.closest("#search-product-btn")) {
      this.searchProducts();
      return;
    }

    if (event.target.closest("#lookup-barcode-btn")) {
      this.lookupBarcode();
      return;
    }

    const gradeButton = event.target.closest(".nutri-score-filter");
    if (gradeButton) {
      this.setGrade(gradeButton.dataset.grade || "");
      return;
    }

    const categoryButton = event.target.closest(".product-category-btn");
    if (categoryButton) {
      this.loadProductCategory(categoryButton.dataset.category);
      return;
    }

    const productCard = event.target.closest(".product-card");
    if (productCard) {
      this.openProduct(productCard.dataset.barcode);
      return;
    }

    if (event.target.closest("#close-product-modal")) {
      this.closeModal();
      return;
    }

    if (event.target.id === "product-modal") {
      this.closeModal();
      return;
    }

    if (event.target.closest("#confirm-product-log")) {
      this.confirmProductLog();
      return;
    }

    const removeButton = event.target.closest(".remove-log-btn");
    if (removeButton) {
      this.log.remove(removeButton.dataset.logId);
      this.renderLog();
      return;
    }

    if (event.target.closest("#clear-foodlog")) {
      this.clearLog();
    }
  }

  closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("active");
  }

  hideOverlay() {
    if (this.overlayHidden) return;
    this.overlayHidden = true;
    const overlay = document.getElementById("app-loading-overlay");
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.style.display = "none";
    }, 500);
  }

  refreshIcons(node) {
    try {
      window.FontAwesome?.dom?.i2svg({ node });
    } catch {
      return;
    }
  }
}

new NutriPlan().start();
