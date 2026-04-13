import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Ingredient } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function scanIngredientsFromImage(base64Image: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Identify all food ingredients visible in this image. Return only a comma-separated list of ingredient names." },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }
    ]
  });

  const text = response.text || "";
  return text.split(',').map(i => i.trim()).filter(i => i.length > 0);
}

export async function generateRecipes(ingredients: string[], mealType?: string): Promise<Recipe[]> {
  const prompt = `Generate 5 recipe recommendations based on these ingredients: ${ingredients.join(', ')}. 
  ${mealType ? `The recipes should be suitable for ${mealType}.` : ""}
  Include a mix of "Perfect Matches" (using mostly these ingredients) and "Almost There" (missing 1-2 ingredients).
  For each recipe, provide: title, description, ingredients (name, amount, unit), instructions, prepTime, calories, macros (protein, carbs, fat), mealType (array), isVeg (boolean).
  Also indicate how many ingredients are missing from the provided list.`;

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  unit: { type: Type.STRING }
                }
              }
            },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            prepTime: { type: Type.NUMBER },
            calories: { type: Type.NUMBER },
            macros: {
              type: Type.OBJECT,
              properties: {
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER }
              }
            },
            mealType: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            isVeg: { type: Type.BOOLEAN },
            missingIngredientsCount: { type: Type.NUMBER },
            imageUrl: { type: Type.STRING }
          },
          required: ["title", "description", "ingredients", "instructions", "prepTime", "calories", "macros", "mealType", "isVeg"]
        }
      }
    }
  });

  try {
    const recipes = JSON.parse(response.text || "[]");
    return recipes.map((r: any, index: number) => ({
      ...r,
      id: r.id || `recipe-${Date.now()}-${index}`,
      imageUrl: r.imageUrl || `https://loremflickr.com/800/600/recipe,food,cooked,${encodeURIComponent(r.title.split(' ').slice(0, 3).join(','))}`
    }));
  } catch (e) {
    console.error("Failed to parse recipes", e);
    return [];
  }
}

export async function getHotPicks(): Promise<Recipe[]> {
  const prompt = `Suggest 4 "Today's Hot Picks" recipes that are trending, seasonal, and appetizing. 
  Randomness Seed: ${Math.random()}. Ensure variety from previous suggestions.
  Provide full details for each: title, description, ingredients, instructions, prepTime, calories, macros, mealType, isVeg.`;

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  unit: { type: Type.STRING }
                }
              }
            },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            prepTime: { type: Type.NUMBER },
            calories: { type: Type.NUMBER },
            macros: {
              type: Type.OBJECT,
              properties: {
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER }
              }
            },
            mealType: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            isVeg: { type: Type.BOOLEAN },
            imageUrl: { type: Type.STRING }
          }
        }
      }
    }
  });

  try {
    const recipes = JSON.parse(response.text || "[]");
    return recipes.map((r: any, index: number) => ({
      ...r,
      imageUrl: r.imageUrl || `https://loremflickr.com/800/600/recipe,food,cooked,${encodeURIComponent(r.title.split(' ').slice(0, 3).join(','))}`
    }));
  } catch (e) {
    return [];
  }
}

export async function suggestMealPlan(pantryItems: string[]) {
  const today = new Date().toLocaleDateString('en-CA');
  const prompt = `Based on these pantry items: ${pantryItems.join(', ')}, suggest a 7-day meal plan (Breakfast, Lunch, Dinner). 
  Return as a JSON array of objects with fields: date (YYYY-MM-DD), mealType (Breakfast, Lunch, Dinner), recipeTitle, calories (number), macros (object with protein, carbs, fat as numbers).
  Start from today: ${today}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            mealType: { type: Type.STRING },
            recipeTitle: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            macros: {
              type: Type.OBJECT,
              properties: {
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER }
              }
            }
          },
          required: ["date", "mealType", "recipeTitle", "calories", "macros"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
}
