const STORAGE_KEY = "nutriplan-food-log";

export const DAILY_GOALS = {
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 65
};

export class FoodLog {
  constructor() {
    this.days = this.read();
  }

  read() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.days));
  }

  static dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static label(date = new Date()) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric"
    });
  }

  items(date = new Date()) {
    const key = FoodLog.dateKey(date);
    return Array.isArray(this.days[key]) ? this.days[key] : [];
  }

  totals(date = new Date()) {
    return this.items(date).reduce(
      (sum, item) => {
        sum.calories += Number(item.calories) || 0;
        sum.protein += Number(item.protein) || 0;
        sum.carbs += Number(item.carbs) || 0;
        sum.fat += Number(item.fat) || 0;
        return sum;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  add(item, date = new Date()) {
    const key = FoodLog.dateKey(date);
    const entry = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      loggedAt: new Date().toISOString(),
      ...item
    };
    this.days[key] = [entry, ...this.items(date)];
    this.save();
    return entry;
  }

  remove(id, date = new Date()) {
    const key = FoodLog.dateKey(date);
    this.days[key] = this.items(date).filter((item) => item.id !== id);
    this.save();
  }

  clear(date = new Date()) {
    this.days[FoodLog.dateKey(date)] = [];
    this.save();
  }

  week() {
    const days = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const totals = this.totals(date);
      days.push({
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.getDate(),
        calories: Math.round(totals.calories),
        items: this.items(date).length,
        today: offset === 0
      });
    }

    return days;
  }
}
