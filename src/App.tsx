import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import { BookOpen, Package, Calendar, ShoppingCart, LogIn, Loader2, Trash2, CheckCircle2, Circle, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './hooks/useAuth';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Recipe, PantryItem, MealPlanEntry, ShoppingListItem, UserGoals } from './types';
import RecipeCard from './components/RecipeCard';
import { cn } from './lib/utils';
import { suggestMealPlan } from './services/geminiService';
import { getDocs } from 'firebase/firestore';

// My Recipes Page
const MyRecipes = ({ favorites, toggleFavorite }: { favorites: Recipe[], toggleFavorite: (recipe: Recipe) => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-stone-900">My Recipes</h2>
        <span className="bg-stone-100 text-stone-600 px-4 py-1.5 rounded-full text-sm font-bold">{favorites.length} Saved</span>
      </div>
      
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-stone-100 p-6 rounded-full mb-6">
            <BookOpen size={48} className="text-stone-300" />
          </div>
          <p className="text-stone-500 max-w-md">Your saved recipe collection will appear here. Start scanning ingredients to find and save your favorites!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((recipe) => (
            <div key={recipe.id} className="relative group">
              <RecipeCard 
                recipe={recipe} 
                onClick={() => {}} 
                isFavorite={true}
                onFavorite={() => toggleFavorite(recipe)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Pantry Page
const Pantry = ({ items, user }: { items: PantryItem[], user: any }) => {
  const [newItem, setNewItem] = useState({ name: '', quantity: '', category: 'other' });

  const addItem = async () => {
    if (!user || !newItem.name) return;
    const path = `users/${user.uid}/pantry`;
    try {
      await addDoc(collection(db, path), {
        ...newItem,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
      setNewItem({ name: '', quantity: '', category: 'other' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeItem = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/pantry/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-stone-900">Smart Pantry</h2>
      
      <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Item Name</label>
          <input 
            type="text" 
            value={newItem.name}
            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
            placeholder="e.g. Eggs"
            className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Quantity</label>
          <input 
            type="text" 
            value={newItem.quantity}
            onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
            placeholder="12 pcs"
            className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button 
          onClick={addItem}
          className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
        >
          Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between group">
            <div>
              <h4 className="font-bold text-stone-900">{item.name}</h4>
              <p className="text-stone-400 text-sm">{item.quantity}</p>
            </div>
            <button 
              onClick={() => removeItem(item.id)}
              className="p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Meal Plan Page
const MealPlan = ({ 
  plans, 
  favorites, 
  recipes, 
  hotPicks, 
  userGoals 
}: { 
  plans: MealPlanEntry[], 
  favorites: Recipe[], 
  recipes: Recipe[], 
  hotPicks: Recipe[], 
  userGoals: UserGoals 
}) => {
  const { user } = useAuth();
  const [isSuggesting, setIsSuggesting] = useState(false);

  const removePlan = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/mealPlan/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleAISuggest = async () => {
    if (!user) return;
    setIsSuggesting(true);
    try {
      // Get pantry items to inform suggestions
      const pantryPath = `users/${user.uid}/pantry`;
      const pantrySnap = await getDocs(collection(db, pantryPath));
      const pantryItems = pantrySnap.docs.map(d => d.data().name);

      const suggestions = await suggestMealPlan(pantryItems);
      
      // Batch add suggestions
      const mealPlanPath = `users/${user.uid}/mealPlan`;
      for (const suggestion of suggestions) {
        await addDoc(collection(db, mealPlanPath), {
          ...suggestion,
          uid: user.uid,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const groupedPlans = plans.reduce((acc, plan) => {
    if (!acc[plan.date]) acc[plan.date] = [];
    acc[plan.date].push(plan);
    return acc;
  }, {} as Record<string, MealPlanEntry[]>);

  const sortedDates = Object.keys(groupedPlans).sort();

  // Calculate Daily Totals for Nutritional Tracking
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const todaysMeals = groupedPlans[today] || [];
  const dailyTotals = todaysMeals.reduce((acc, plan) => {
    // Search in all possible recipe sources
    const recipe = favorites.find(f => f.id === plan.recipeId || f.title === plan.recipeTitle) ||
                   recipes.find(r => r.id === plan.recipeId || r.title === plan.recipeTitle) ||
                   hotPicks.find(h => h.id === plan.recipeId || h.title === plan.recipeTitle);
    
    if (recipe) {
      acc.calories += recipe.calories;
      acc.protein += recipe.macros.protein;
      acc.carbs += recipe.macros.carbs;
      acc.fat += recipe.macros.fat;
    }
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Weekly Meal Plan</h2>
          <p className="text-stone-500">Organize your cooking for the week ahead</p>
        </div>
        <button 
          onClick={handleAISuggest}
          disabled={isSuggesting}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSuggesting ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
          AI Suggest Week
        </button>
      </div>

      {/* Nutritional Tracking Dashboard */}
      <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-stone-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Daily Nutrition Tracker</h3>
            <p className="text-stone-400">Tracking progress for <span className="text-orange-400 font-bold">Today</span></p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-auto">
            {[
              { label: 'Calories', current: dailyTotals.calories, goal: userGoals.calories, unit: 'kcal', color: 'bg-orange-500' },
              { label: 'Protein', current: dailyTotals.protein, goal: userGoals.protein, unit: 'g', color: 'bg-blue-500' },
              { label: 'Carbs', current: dailyTotals.carbs, goal: userGoals.carbs, unit: 'g', color: 'bg-yellow-500' },
              { label: 'Fat', current: dailyTotals.fat, goal: userGoals.fat, unit: 'g', color: 'bg-stone-500' }
            ].map(stat => (
              <div key={stat.label} className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                  <span>{stat.label}</span>
                  <span>{Math.round((stat.current / stat.goal) * 100)}%</span>
                </div>
                <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (stat.current / stat.goal) * 100)}%` }}
                    className={cn("h-full rounded-full", stat.color)}
                  />
                </div>
                <div className="text-sm font-bold">
                  {stat.current} <span className="text-stone-500 font-normal">/ {stat.goal}{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-10">
        {sortedDates.map((date) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-stone-900 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => {
                const plan = groupedPlans[date].find(p => p.mealType.toLowerCase() === type.toLowerCase());
                return (
                  <div key={type} className={cn(
                    "p-5 rounded-3xl border transition-all",
                    plan ? "bg-white border-stone-100 shadow-sm" : "bg-stone-50 border-dashed border-stone-200 opacity-60"
                  )}>
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">{type}</div>
                    {plan ? (
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-stone-900 leading-tight">{plan.recipeTitle}</h4>
                        <button 
                          onClick={() => removePlan(plan.id)}
                          className="text-stone-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-stone-300 text-sm italic">Nothing planned</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {plans.length === 0 && !isSuggesting && (
          <div className="text-center py-20 bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200">
            <Calendar size={48} className="text-stone-200 mx-auto mb-4" />
            <h3 className="text-stone-400 font-medium">No meals planned yet</h3>
            <p className="text-stone-300 text-sm mb-6">Let AI help you plan your week!</p>
            <button 
              onClick={handleAISuggest}
              className="text-orange-500 font-bold hover:underline"
            >
              Suggest a meal plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Shopping List Page
const ShoppingList = ({ items, user }: { items: ShoppingListItem[], user: any }) => {
  const [newItem, setNewItem] = useState({ name: '', amount: '' });

  const addItem = async () => {
    if (!user || !newItem.name) return;
    const path = `users/${user.uid}/shoppingList`;
    try {
      await addDoc(collection(db, path), {
        ...newItem,
        isBought: false,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
      setNewItem({ name: '', amount: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const toggleItem = async (id: string, isBought: boolean) => {
    if (!user) return;
    const path = `users/${user.uid}/shoppingList/${id}`;
    try {
      await updateDoc(doc(db, path), { isBought: !isBought });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const removeItem = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/shoppingList/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-stone-900">Shopping List</h2>
      
      <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Item Name</label>
          <input 
            type="text" 
            value={newItem.name}
            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
            placeholder="e.g. Milk"
            className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Amount</label>
          <input 
            type="text" 
            value={newItem.amount}
            onChange={(e) => setNewItem({...newItem, amount: e.target.value})}
            placeholder="1L"
            className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button 
          onClick={addItem}
          className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
        >
          Add
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between group">
            <button 
              onClick={() => toggleItem(item.id, item.isBought)}
              className="flex items-center gap-4 flex-1 text-left"
            >
              {item.isBought ? (
                <CheckCircle2 className="text-green-500" size={24} />
              ) : (
                <Circle className="text-stone-200" size={24} />
              )}
              <div className={item.isBought ? "line-through text-stone-300" : "text-stone-900"}>
                <h4 className="font-bold">{item.name}</h4>
                <p className="text-sm opacity-60">{item.amount}</p>
              </div>
            </button>
            <button 
              onClick={() => removeItem(item.id)}
              className="p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [activePage, setActivePage] = useState('scan');
  const { user, loading, login } = useAuth();

  // Lifted Home State
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [hotPicks, setHotPicks] = useState<Recipe[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<string>('All');
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  
  // New Lifted States
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanEntry[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals>({ calories: 2000, protein: 150, carbs: 200, fat: 70 });

  useEffect(() => {
    if (!user) return;
    
    // Favorites
    const favUnsubscribe = onSnapshot(query(collection(db, `users/${user.uid}/recipes`)), (snapshot) => {
      setFavorites(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Recipe)));
    });

    // Pantry
    const pantryUnsubscribe = onSnapshot(query(collection(db, `users/${user.uid}/pantry`)), (snapshot) => {
      setPantryItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PantryItem)));
    });

    // Shopping List
    const shopUnsubscribe = onSnapshot(query(collection(db, `users/${user.uid}/shoppingList`)), (snapshot) => {
      setShoppingList(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ShoppingListItem)));
    });

    // Meal Plan
    const mealUnsubscribe = onSnapshot(query(collection(db, `users/${user.uid}/mealPlan`)), (snapshot) => {
      setMealPlans(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MealPlanEntry)));
    });

    return () => {
      favUnsubscribe();
      pantryUnsubscribe();
      shopUnsubscribe();
      mealUnsubscribe();
    };
  }, [user]);

  const handleAddToShoppingList = async (items: { name: string, amount: string }[]) => {
    if (!user) return;
    const path = `users/${user.uid}/shoppingList`;
    for (const item of items) {
      await addDoc(collection(db, path), {
        ...item,
        isBought: false,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleFinishCooking = async (recipe: Recipe) => {
    if (!user) return;
    // Deduct from pantry
    for (const ing of recipe.ingredients) {
      const pantryItem = pantryItems.find(pi => pi.name.toLowerCase().includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(pi.name.toLowerCase()));
      if (pantryItem) {
        const path = `users/${user.uid}/pantry/${pantryItem.id}`;
        // Simple deduction logic: if quantity is a number, subtract. Otherwise just remove or leave as is.
        // For now, let's just remove the item if it's used, or we could implement more complex parsing.
        await deleteDoc(doc(db, path));
      }
    }
  };

  const toggleFavorite = async (recipe: Recipe) => {
    if (!user) return;
    const isFav = favorites.some(f => f.title === recipe.title);
    if (isFav) {
      const fav = favorites.find(f => f.title === recipe.title);
      if (fav?.id) {
        const path = `users/${user.uid}/recipes/${fav.id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    } else {
      const path = `users/${user.uid}/recipes`;
      try {
        await addDoc(collection(db, path), {
          ...recipe,
          uid: user.uid,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  const renderPage = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-orange-50 p-8 rounded-[2.5rem] mb-8">
            <LogIn size={64} className="text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900 mb-4">Welcome to FlavorAI</h2>
          <p className="text-stone-500 max-w-md mb-10 text-lg leading-relaxed">Sign in to save recipes, track your pantry, and plan your weekly meals with AI.</p>
          <button 
            onClick={login}
            className="bg-stone-900 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-stone-200 hover:bg-stone-800 transition-all active:scale-95 flex items-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      );
    }

    switch (activePage) {
      case 'scan': 
        return (
          <Home 
            ingredients={ingredients} 
            setIngredients={setIngredients}
            recipes={recipes}
            setRecipes={setRecipes}
            hotPicks={hotPicks}
            setHotPicks={setHotPicks}
            selectedMealType={selectedMealType}
            setSelectedMealType={setSelectedMealType}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onAddToShoppingList={handleAddToShoppingList}
            onFinishCooking={handleFinishCooking}
          />
        );
      case 'recipes': return <MyRecipes favorites={favorites} toggleFavorite={toggleFavorite} />;
      case 'pantry': return <Pantry items={pantryItems} user={user} />;
      case 'mealplan': return (
        <MealPlan 
          plans={mealPlans} 
          favorites={favorites} 
          recipes={recipes} 
          hotPicks={hotPicks} 
          userGoals={userGoals} 
        />
      );
      case 'shopping': return <ShoppingList items={shoppingList} user={user} />;
      default: return <Home 
        ingredients={ingredients} 
        setIngredients={setIngredients}
        recipes={recipes}
        setRecipes={setRecipes}
        hotPicks={hotPicks}
        setHotPicks={setHotPicks}
        selectedMealType={selectedMealType}
        setSelectedMealType={setSelectedMealType}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        onAddToShoppingList={handleAddToShoppingList}
        onFinishCooking={handleFinishCooking}
      />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <div className="text-center">
          <Loader2 className="animate-spin text-orange-500 mx-auto mb-4" size={48} />
          <p className="text-stone-400 font-medium">Loading FlavorAI...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {renderPage()}
    </Layout>
  );
}
