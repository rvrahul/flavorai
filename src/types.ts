export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';

export interface Ingredient {
  id: string;
  name: string;
  amount?: string;
  unit?: string;
  category?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: number; // in minutes
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  mealType: MealType[];
  isVeg: boolean;
  imageUrl?: string;
  missingIngredientsCount?: number;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  expiryDate?: string;
  category: string;
}

export interface MealPlanEntry {
  id: string;
  recipeId: string;
  recipeTitle: string;
  date: string;
  mealType: MealType;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  amount: string;
  isBought: boolean;
}

export interface UserGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
