import { useState } from "react";
import axios from "axios";
import React from "react";

export default function MenuForm() {
  const [formData, setFormData] = useState({
    calories: "",
    diet: "",
    health: [],
    excluded: ""
  });

  const [recipes, setRecipes] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const health = new Set(prev.health);
      checked ? health.add(value) : health.delete(value);
      return { ...prev, health: Array.from(health) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      calories: parseInt(formData.calories),
      diet: formData.diet || undefined,
      health: formData.health,
      excluded: formData.excluded.split(",").map(x => x.trim())
    };

    try {
      const res = await axios.post("http://localhost:8000/generate-menu", payload);
      console.log("Respuesta del backend:", res.data);
      setRecipes(res.data.hits || []);
    } catch (err) {
      alert("Error generando el menú");
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Generar Menú Semanal</h2>
      <form onSubmit={handleSubmit}>
        <label>Calorías máximas: <input name="calories" value={formData.calories} onChange={handleChange} /></label><br />
        <label>Dieta: 
          <select name="diet" value={formData.diet} onChange={handleChange}>
            <option value="">--</option>
            <option value="low-carb">Low Carb</option>
            <option value="high-protein">High Protein</option>
          </select>
        </label><br />
        <label>Intolerancias:</label><br />
        <label><input type="checkbox" value="gluten-free" onChange={handleCheckbox} /> Sin gluten</label><br />
        <label><input type="checkbox" value="vegan" onChange={handleCheckbox} /> Vegano</label><br />
        <label>Ingredientes a excluir (separados por coma):<br />
          <input name="excluded" value={formData.excluded} onChange={handleChange} />
        </label><br />
        <button type="submit">Generar menú</button>
      </form>

      <h3>Recetas recomendadas:</h3>
      <ul>
        {recipes.map((r, i) => (
          <li key={i}>
            <a href={r.recipe.url} target="_blank" rel="noreferrer">{r.recipe.label}</a> – {Math.round(r.recipe.calories)} kcal
          </li>
        ))}
      </ul>
    </div>
  );
}
