import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Plus, 
  Search, 
  Sparkles, 
  RefreshCw, 
  X,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanIngredientsFromImage, generateRecipes, getHotPicks } from '../services/geminiService';
import { Recipe } from '../types';
import RecipeCard from '../components/RecipeCard';
import { cn } from '../lib/utils';

import RecipeDetails from '../components/RecipeDetails';

interface HomeProps {
  ingredients: string[];
  setIngredients: React.Dispatch<React.SetStateAction<string[]>>;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  hotPicks: Recipe[];
  setHotPicks: React.Dispatch<React.SetStateAction<Recipe[]>>;
  selectedMealType: string;
  setSelectedMealType: React.Dispatch<React.SetStateAction<string>>;
  favorites: Recipe[];
  toggleFavorite: (recipe: Recipe) => void;
  onAddToShoppingList?: (items: { name: string, amount: string }[]) => void;
  onFinishCooking?: (recipe: Recipe) => void;
}

export default function Home({
  ingredients,
  setIngredients,
  recipes,
  setRecipes,
  hotPicks,
  setHotPicks,
  selectedMealType,
  setSelectedMealType,
  favorites,
  toggleFavorite,
  onAddToShoppingList,
  onFinishCooking
}: HomeProps) {
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showPlanOnOpen, setShowPlanOnOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const mealTypes = ['All', 'Breakfast', 'Snack', 'Lunch', 'Dinner', 'Dessert'];

  const commonIngredients = [
    // Vegetables
    'Tomato', 'Potato', 'Onion', 'Garlic', 'Ginger', 'Carrot', 'Spinach', 'Mushroom', 
    'Cauliflower', 'Cabbage', 'Broccoli', 'Bell Pepper', 'Cucumber', 'Eggplant', 
    'Green Peas', 'Okra', 'Zucchini', 'Sweet Potato', 'Radish', 'Pumpkin',
    // Spices & Herbs
    'Garam Masala', 'Turmeric', 'Cumin Seeds', 'Coriander Powder', 'Red Chili Powder',
    'Black Pepper', 'Cinnamon', 'Cardamom', 'Cloves', 'Bay Leaf', 'Mustard Seeds',
    'Fenugreek', 'Asafoetida', 'Coriander Leaves', 'Mint Leaves', 'Curry Leaves',
    // Grains & Legumes
    'Rice', 'Wheat Flour', 'Maida', 'Basmati Rice', 'Lentils', 'Chickpeas', 
    'Kidney Beans', 'Moong Dal', 'Toor Dal', 'Oats', 'Quinoa', 'Pasta', 'Noodles',
    // Dairy & Proteins
    'Milk', 'Paneer', 'Tofu', 'Chicken', 'Egg', 'Fish', 'Mutton', 'Prawns',
    'Cheese', 'Butter', 'Ghee', 'Yogurt', 'Cream',
    // Pantry Essentials
    'Olive Oil', 'Vegetable Oil', 'Mustard Oil', 'Salt', 'Sugar', 'Honey', 
    'Lemon', 'Vinegar', 'Soy Sauce', 'Bread', 'Baking Powder', 'Yeast'
  ];

  useEffect(() => {
    loadHotPicks();
  }, []);

  // Trigger re-fetch when meal type changes if ingredients are present
  useEffect(() => {
    if (ingredients.length > 0 && recipes.length > 0) {
      findRecipes();
    }
  }, [selectedMealType]);

  const [isRefreshingHotPicks, setIsRefreshingHotPicks] = useState(false);

  const loadHotPicks = async () => {
    setIsRefreshingHotPicks(true);
    try {
      const picks = await getHotPicks();
      setHotPicks(picks);
    } finally {
      setIsRefreshingHotPicks(false);
    }
  };

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = commonIngredients.filter(i => 
        i.toLowerCase().includes(inputValue.toLowerCase()) && !ingredients.includes(i)
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [inputValue, ingredients]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const detected = await scanIngredientsFromImage(base64);
        setIngredients(prev => Array.from(new Set([...prev, ...detected])));
      } catch (err) {
        console.error(err);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addIngredient = (name?: string) => {
    const val = name || inputValue.trim();
    if (val) {
      setIngredients(prev => Array.from(new Set([...prev, val])));
      setInputValue('');
      setSuggestions([]);
    }
  };

  const removeIngredient = (name: string) => {
    setIngredients(prev => prev.filter(i => i !== name));
  };

  const findRecipes = async () => {
    if (ingredients.length === 0) return;
    setIsGenerating(true);
    try {
      const results = await generateRecipes(ingredients, selectedMealType === 'All' ? undefined : selectedMealType);
      setRecipes(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative">
        <div className="max-w-2xl">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight"
          >
            What's in your <span className="text-orange-500">kitchen?</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-stone-500 text-lg"
          >
            Snap a photo of your ingredients and let AI find the perfect recipe for you.
          </motion.p>
        </div>

        {/* Scanner Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-10 bg-white rounded-[2rem] p-8 border border-stone-100 shadow-xl shadow-stone-200/50 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
          
          <div className="relative z-10">
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-stone-200 rounded-3xl bg-stone-50/50 mb-8 group hover:border-orange-300 transition-colors">
              <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Camera className="text-orange-500" size={32} />
              </div>
              <h3 className="font-bold text-stone-800 text-lg">Scan Your Ingredients</h3>
              <p className="text-stone-400 text-sm mb-6">Take a photo of your ingredients or type them in</p>
              
              <label className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-orange-200 active:scale-95">
                <Upload size={20} />
                <span>Upload Photo</span>
                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                      placeholder="Type ingredients (e.g. Tomato, Onion)"
                      className="w-full bg-stone-100 border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => addIngredient()}
                    className="bg-stone-100 text-stone-600 p-4 rounded-xl hover:bg-stone-200 transition-colors"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-100 z-20 overflow-hidden"
                    >
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => addIngredient(s)}
                          className="w-full text-left px-5 py-3 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-3"
                        >
                          <Plus size={16} className="text-stone-300" />
                          <span className="font-medium">{s}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {ingredients.map((ing) => (
                    <motion.span
                      key={ing}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-stone-100 text-stone-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 group hover:bg-orange-50 hover:text-orange-700 transition-colors"
                    >
                      {ing}
                      <button onClick={() => removeIngredient(ing)} className="text-stone-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>

              <button 
                onClick={findRecipes}
                disabled={ingredients.length === 0 || isGenerating}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                  ingredients.length > 0 
                    ? "bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600" 
                    : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                )}
              >
                {isGenerating ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <Sparkles size={20} />
                )}
                <span>Find Recipes {ingredients.length > 0 && `(${ingredients.length} ingredients)`}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Meal Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {mealTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedMealType(type)}
            className={cn(
              "px-6 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all",
              selectedMealType === type 
                ? "bg-white text-orange-600 shadow-sm border border-orange-100" 
                : "text-stone-500 hover:bg-stone-100"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Results Section */}
      {recipes.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="text-orange-500" size={24} />
              Perfect Matches
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.filter(r => (r.missingIngredientsCount || 0) === 0).map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onClick={() => {
                  setSelectedRecipe(recipe);
                  setShowPlanOnOpen(false);
                }} 
                isFavorite={favorites.some(f => f.title === recipe.title)}
                onFavorite={() => toggleFavorite(recipe)}
                onPlan={() => {
                  setSelectedRecipe(recipe);
                  setShowPlanOnOpen(true);
                }}
              />
            ))}
          </div>

          <div className="pt-8">
            <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2 mb-8">
              <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg">
                <RefreshCw size={20} />
              </span>
              Almost There <span className="text-stone-400 font-normal text-lg">— missing just 1-2 ingredients</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.filter(r => (r.missingIngredientsCount || 0) > 0).map((recipe) => (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  onClick={() => {
                    setSelectedRecipe(recipe);
                    setShowPlanOnOpen(false);
                  }} 
                  isFavorite={favorites.some(f => f.title === recipe.title)}
                  onFavorite={() => toggleFavorite(recipe)}
                  onPlan={() => {
                    setSelectedRecipe(recipe);
                    setShowPlanOnOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hot Picks Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-xl">
              <Flame className="text-orange-500" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-stone-900">Today's Hot Picks</h3>
              <p className="text-stone-400 text-sm">Fresh inspiration for your next meal</p>
            </div>
          </div>
          <button 
            onClick={loadHotPicks} 
            disabled={isRefreshingHotPicks}
            className="text-stone-400 hover:text-orange-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={cn(isRefreshingHotPicks && "animate-spin")} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotPicks.map((recipe) => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              onClick={() => {
                setSelectedRecipe(recipe);
                setShowPlanOnOpen(false);
              }} 
              isFavorite={favorites.some(f => f.title === recipe.title)}
              onFavorite={() => toggleFavorite(recipe)}
              onPlan={() => {
                setSelectedRecipe(recipe);
                setShowPlanOnOpen(true);
              }}
            />
          ))}
        </div>
      </section>

      <AnimatePresence>
        {selectedRecipe && (
          <RecipeDetails 
            recipe={selectedRecipe} 
            onClose={() => setSelectedRecipe(null)} 
            initialShowPlan={showPlanOnOpen}
            isFavorite={favorites.some(f => f.title === selectedRecipe.title)}
            onFavorite={() => toggleFavorite(selectedRecipe)}
            userIngredients={ingredients}
            onAddToShoppingList={onAddToShoppingList}
            onFinishCooking={onFinishCooking}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
