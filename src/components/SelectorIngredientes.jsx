import React, { useState } from "react";

const commonIngredients = [
  "chicken", "beef", "pork", "lamb", "fish", "salmon", "tuna", "shrimp", "crab", "lobster",
  "milk", "cheese", "butter", "cream", "yogurt", "egg", "tofu", "soy", "wheat", "barley",
  "oats", "rye", "corn", "rice", "quinoa", "potato", "sweet potato", "tomato", "onion", "garlic",
  "lettuce", "spinach", "kale", "broccoli", "cauliflower", "carrot", "pepper", "zucchini", "cucumber",
  "apple", "banana", "orange", "lemon", "lime", "strawberry", "blueberry", "grape", "watermelon",
  "almond", "hazelnut", "cashew", "peanut", "walnut", "pistachio", "chickpea", "lentil", "bean", "peas",
  "sugar", "honey", "maple syrup", "salt", "black pepper", "cinnamon", "basil", "oregano", "parsley",
  "thyme", "rosemary", "mustard", "mayonnaise", "vinegar", "oil", "olive oil", "coconut oil", "chocolate",
  "vanilla", "flour", "bread", "pasta", "noodles", "bacon", "sausage", "ham"
];

const SelectorIngredientes = ({ onIncludeChange, onExcludeChange }) => {
    const [selectedInclude, setSelectedInclude] = useState([]);
    const [selectedExclude, setSelectedExclude] = useState([]);
  
    const toggleSelection = (ingredient, type) => {
      const [selected, setSelected, onChange] = 
        type === "include"
          ? [selectedInclude, setSelectedInclude, onIncludeChange]
          : [selectedExclude, setSelectedExclude, onExcludeChange];
  
      const updated = selected.includes(ingredient)
        ? selected.filter((i) => i !== ingredient)
        : [...selected, ingredient];
  
      setSelected(updated);
      onChange(updated);
    };
  
    const renderButtons = (selected, type) => (
      <div style={styles.grid}>
        {commonIngredients.map((ingredient) => (
          <button
            key={ingredient}
            type="button"
            onClick={() => toggleSelection(ingredient, type)}
            style={{
              ...styles.button,
              backgroundColor: selected.includes(ingredient) ? "#4f46e5" : "#e5e7eb",
              color: selected.includes(ingredient) ? "#fff" : "#000",
            }}
          >
            {ingredient}
          </button>
        ))}
      </div>
    );
  
    return (
      <div style={styles.container}>
        <div>
          <label style={styles.label}>Ingredients to Include:</label>
          {renderButtons(selectedInclude, "include")}
        </div>
        <div>
          <label style={styles.label}>Ingredients to Exclude:</label>
          {renderButtons(selectedExclude, "exclude")}
        </div>
      </div>
    );
  };
  
  const styles = {
    container: { display: "flex", gap: "40px", padding: "20px" },
    label: { fontWeight: "bold", display: "block", marginBottom: "8px" },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
      gap: "8px",
      maxHeight: "300px",
      overflowY: "auto",
    },
    button: {
      padding: "8px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "12px",
    },
  };
  
  export default SelectorIngredientes;