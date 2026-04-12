import React from 'react';
import { Clock, Flame, Leaf, Utensils, ChevronRight, Heart, Calendar } from 'lucide-react';
import { Recipe } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onFavorite?: () => void;
  onPlan?: () => void;
  isFavorite?: boolean;
  key?: string | number;
}

export default function RecipeCard({ recipe, onClick, onFavorite, onPlan, isFavorite }: RecipeCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative h-48 bg-stone-100">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <Utensils size={48} />
          </div>
        )}
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {recipe.isVeg ? (
            <div className="bg-green-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
              <Leaf size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Veg</span>
            </div>
          ) : (
            <div className="bg-red-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
              <Flame size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Non-Veg</span>
            </div>
          )}
          {recipe.missingIngredientsCount !== undefined && recipe.missingIngredientsCount > 0 && (
            <div className="bg-amber-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {recipe.missingIngredientsCount} missing
            </div>
          )}
        </div>

        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.();
            }}
            className={cn(
              "p-2 rounded-xl backdrop-blur-md transition-all shadow-lg",
              isFavorite ? "bg-red-500 text-white" : "bg-white/80 text-stone-600 hover:bg-white"
            )}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onPlan) onPlan();
              else onClick();
            }}
            className="p-2 bg-white/80 backdrop-blur-md rounded-xl text-stone-600 hover:bg-white transition-all shadow-lg"
          >
            <Calendar size={18} className="text-orange-500" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex gap-3 text-white text-xs font-medium">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{recipe.prepTime}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Flame size={14} />
              <span>{recipe.calories} kcal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-stone-900 leading-tight group-hover:text-orange-600 transition-colors">
            {recipe.title}
          </h3>
          <ChevronRight size={18} className="text-stone-300 group-hover:text-orange-400 transition-transform group-hover:translate-x-1" />
        </div>
        <p className="text-stone-500 text-sm line-clamp-2 mb-4">
          {recipe.description}
        </p>
        
        <div className="flex flex-wrap gap-1.5">
          {recipe.mealType.slice(0, 2).map((type) => (
            <span key={type} className="px-2 py-1 bg-stone-50 text-stone-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
              {type}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
