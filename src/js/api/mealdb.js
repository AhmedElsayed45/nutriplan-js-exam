export class MealApi {
  constructor() {
    this.baseUrl = "https://nutriplan-api.vercel.app/api";
    this.apiKey = "xRGnhxcXrKuX8hJpeeQE5Rac9b7dyQDpaMs5fWFL";
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const reason = data.error?.message || data.error || data.message || "Request failed";
      throw new Error(typeof reason === "string" ? reason : "Request failed");
    }

    return data;
  }

  getCategories() {
    return this.request("/meals/categories");
  }

  getAreas() {
    return this.request("/meals/areas");
  }

  searchMeals(query) {
    const params = new URLSearchParams({
      q: query || "",
      limit: "25"
    });
    return this.request(`/meals/search?${params}`);
  }

  filterMeals({ category = "", area = "" } = {}) {
    const params = new URLSearchParams({ limit: "25" });
    if (category) params.set("category", category);
    if (area) params.set("area", area);
    return this.request(`/meals/filter?${params}`);
  }

  getMeal(id) {
    return this.request(`/meals/${encodeURIComponent(id)}`);
  }

  async analyzeRecipe(recipeName, ingredients) {
    const data = await this.request("/nutrition/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify({
        recipeName,
        ingredients
      })
    });

    if (!data.success || !data.data) {
      const reason = data.error?.message || "Could not analyze this recipe";
      throw new Error(reason);
    }

    return data.data;
  }

  searchProducts(query) {
    const params = new URLSearchParams({
      q: query,
      limit: "24"
    });
    return this.request(`/products/search?${params}`);
  }

  getProduct(barcode) {
    return this.request(`/products/barcode/${encodeURIComponent(barcode)}`);
  }

  async getProductsByCategory(category) {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/category/${encodeURIComponent(category)}.json?page=1&page_size=24`);
      if (!response.ok) return { results: [] };
      const data = await response.json();
      const results = (data.products || []).map((item) => ({
        barcode: item.code || item._id || "",
        name: item.product_name || item.product_name_en || "Unknown Product",
        brand: item.brands || "",
        image: item.image_front_url || item.image_url || "",
        nutritionGrade: item.nutrition_grades || item.nutrition_grade_fr || "",
        novaGroup: item.nova_group || "",
        nutrients: {
          calories: item.nutriments?.["energy-kcal_100g"] || 0,
          protein: item.nutriments?.proteins_100g || 0,
          carbs: item.nutriments?.carbohydrates_100g || 0,
          fat: item.nutriments?.fat_100g || 0,
          sugar: item.nutriments?.sugars_100g || 0
        }
      }));
      return { results };
    } catch {
      return { results: [] };
    }
  }
}
