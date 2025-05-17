import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MenuSemanal.css'; // Reutilizar algunos estilos si aplica
import { BACKEND_URL } from '../config'; // Importar la configuración

// Componente para mostrar una receta individual (similar a MenuSemanal.jsx)
const RecipeCard = ({ recipe, mealType, dayKey, recetasFavoritas, toggleFavoritoHandler, guardandoFavorito, numOptions, handleSelectRecipe, isSelectedRecipe }) => {
  if (!recipe || recipe.error) {
    return (
      <div className="meal-slot error-slot">
        <p><strong>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}:</strong> {recipe.error || 'No disponible'}</p>
      </div>
    );
  }

  // Verificar si es favorita (si tenemos recetasFavoritas y la URL)
  const esFavorita = recetasFavoritas && recipe.url && recetasFavoritas.has(recipe.url);
  const cardStyle = isSelectedRecipe ? { border: '3px solid #4CAF50', borderRadius: '8px', padding: '10px', margin: '5px 0' } : {padding: '10px', margin: '5px 0'};

  return (
    <div className="meal-option-card recommendation-card" style={{ ...cardStyle, position: 'relative' }}>
      {/* --- BOTÓN DE FAVORITO --- */}
      <button
        onClick={() => toggleFavoritoHandler && toggleFavoritoHandler(recipe)}
        disabled={guardandoFavorito}
        className={`favorite-button ${esFavorita ? 'favorited' : ''}`}
        title={esFavorita ? "Quitar de favoritos" : "Añadir a favoritos"}
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          fontSize: '2.5rem',
          color: esFavorita ? 'gold' : '#ccc',
          position: 'absolute', 
          top: '5px', 
          right: '5px',
          textShadow: esFavorita
            ? "0 0 2px #8B7500, 0 0 5px #8B7500" 
            : "0 0 2px #444, 0 0 3px #444",
          zIndex: 10
        }}
      >
        {esFavorita ? "⭐" : "☆"}
      </button>
      
      <h4>{recipe.label}</h4>
      {recipe.image && <img src={recipe.image} alt={recipe.label} className="meal-image recommendation-recipe-image" />}
      <p>Calorías: {recipe.calories ? recipe.calories.toFixed(0) : 'N/A'} kcal</p>
      
      {/* Link para ver la receta */}
      {recipe.url && <a href={recipe.url} target="_blank" rel="noopener noreferrer">Ver receta</a>}

      {/* Botón para seleccionar esta receta si hay múltiples opciones y no está ya seleccionada */}
      {numOptions > 1 && !isSelectedRecipe && handleSelectRecipe && (
        <button 
          onClick={() => handleSelectRecipe(dayKey, mealType, recipe)}
          className="select-recipe-button"
          style={{marginTop: '10px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px'}}
        >
          Elegir esta opción
        </button>
      )}
      {isSelectedRecipe && numOptions > 1 && (
        <p style={{marginTop: '10px', color: '#4CAF50', fontWeight: 'bold'}}>✓ Seleccionada</p>
      )}
    </div>
  );
};

const RecomendacionSemanal = ({ token }) => {
  const [recommendedMenu, setRecommendedMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null); // Para mostrar BMR y objetivo
  const [savingMenu, setSavingMenu] = useState(false); // Estado para controlar el guardado de menú
  const [saveSuccess, setSaveSuccess] = useState(''); // Mensaje de éxito al guardar menú
  
  // Estados para favoritos
  const [recetasFavoritas, setRecetasFavoritas] = useState(new Set());
  const [guardandoFavorito, setGuardandoFavorito] = useState(false);

  // Nuevos estados para la lista de la compra
  const [shoppingList, setShoppingList] = useState(null);
  const [loadingShoppingList, setLoadingShoppingList] = useState(false);
  const [errorShoppingList, setErrorShoppingList] = useState('');

  // Nuevo estado para el slider de calorías
  const [targetCalories, setTargetCalories] = useState(2000); // Valor inicial por defecto

  // Nuevo estado para las recetas seleccionadas por el usuario
  const [userSelectedRecipes, setUserSelectedRecipes] = useState({});

  // URL base de la API
  const apiUrl = BACKEND_URL;

  // Limpiar mensaje de éxito después de un tiempo
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Cargar información del perfil para mostrar BMR y objetivo
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${apiUrl}/perfil`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserInfo({
          bmr: res.data.bmr,
          objetivo: res.data.objetivo,
          actividad: res.data.actividad
        });
        
        // Establecer las calorías del slider basadas en el BMR si está disponible
        if (res.data.bmr) {
          setTargetCalories(Math.round(parseFloat(res.data.bmr) / 50) * 50); 
        }
        
        // Cargar recetas favoritas
        try {
          const resFavoritas = await axios.get(`${apiUrl}/favoritas`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resFavoritas.data && Array.isArray(resFavoritas.data.favoritas)) {
            // Extraer las URLs de las recetas favoritas
            const urlsFavoritas = resFavoritas.data.favoritas.map(fav => fav.recipe_url);
            setRecetasFavoritas(new Set(urlsFavoritas));
          }
        } catch (favError) {
          console.error('Error cargando recetas favoritas:', favError);
          setRecetasFavoritas(new Set());
        }
      } catch (err) {
        console.error('Error fetching user info for recommendations:', err);
        // No bloquear la funcionalidad principal si esto falla, pero mostrar un aviso
        setError('No se pudo cargar la información del perfil para personalizar las calorías.');
      }
    };
    fetchUserInfo();
  }, [token, apiUrl]);

  const handleCaloriesChange = (event) => {
    setTargetCalories(parseInt(event.target.value, 10));
  };

  // Función para manejar la selección de una receta por el usuario
  const handleSelectRecipe = (dayKey, mealType, recipe) => {
    setUserSelectedRecipes(prevSelected => ({
      ...prevSelected,
      [`${dayKey}-${mealType}`]: recipe // Guardar el objeto receta completo
    }));
  };

  // Función para manejar favoritos
  const toggleFavoritoHandler = async (recipeOption) => {
    if (!token) {
      setError("Debes iniciar sesión para guardar recetas favoritas.");
      return;
    }
    if (!recipeOption || !recipeOption.url) {
      console.error("Intento de marcar como favorita una receta sin URL:", recipeOption);
      setError("Esta receta no se puede marcar como favorita (falta identificador).");
      return;
    }

    const recipeId = recipeOption.url;
    const esActualmenteFavorita = recetasFavoritas.has(recipeId);

    setGuardandoFavorito(true);
    setError(null);

    try {
      if (esActualmenteFavorita) {
        // ELIMINAR de favoritos
        await axios.post(`${apiUrl}/eliminar-favorita`, 
          { recipe_url: recipeId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // AÑADIR a favoritos
        const payloadFavorito = {
            recipe_url: recipeOption.url,
            label: recipeOption.label,
            image: recipeOption.image,
            calories: recipeOption.calories,
            ingredients: recipeOption.ingredients || [],
        };
        await axios.post(`${apiUrl}/guardar-favorita`, 
            payloadFavorito,
            { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Actualizar el estado local
      setRecetasFavoritas(prevFavoritas => {
        const nuevasFavoritas = new Set(prevFavoritas);
        if (esActualmenteFavorita) {
          nuevasFavoritas.delete(recipeId);
        } else {
          nuevasFavoritas.add(recipeId);
        }
        return nuevasFavoritas;
      });

    } catch (error) {
      console.error("Error al actualizar estado de favorito:", error);
      setError("No se pudo actualizar el estado de favorito. Inténtalo de nuevo.");
    } finally {
      setGuardandoFavorito(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!token) {
      setError('Debes iniciar sesión para obtener recomendaciones.');
      return;
    }
    setLoading(true);
    setError('');
    setSaveSuccess('');
    setRecommendedMenu(null);
    setShoppingList(null); // Limpiar lista de compras anterior
    setErrorShoppingList('');
    setUserSelectedRecipes({}); // Limpiar selecciones de recetas del usuario

    const payload = {
      target_calories: targetCalories,
      // Podrías añadir más datos del perfil si el backend los necesita para refinar la selección
      // como userInfo.objetivo o userInfo.actividad
    };

    try {
      const response = await axios.post(
        `${apiUrl}/generar-menu-recomendado`,
        payload, // Enviar el payload con target_calories
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecommendedMenu(response.data);
    } catch (err) {
      console.error('Error generating recommended menu:', err);
      setError(err.response?.data?.detail || 'No se pudieron generar las recomendaciones.');
    }
    setLoading(false);
  };

  // Nueva función para guardar el menú en el perfil
  const saveMenuToProfile = async () => {
    if (!recommendedMenu || !token) return;
    
    setSavingMenu(true);
    setSaveSuccess('');
    setError('');
    setErrorShoppingList(''); // Limpiar error de lista de compras
    
    try {
      const menuToSave = {
        menu: {}
      };
      
      Object.entries(recommendedMenu).forEach(([dayKey, dayData]) => {
        menuToSave.menu[dayKey] = {};
        Object.entries(dayData).forEach(([mealType, mealData]) => {
          let selectedRecipeForMeal = null;
          const userChoiceKey = `${dayKey}-${mealType}`;

          if (userSelectedRecipes[userChoiceKey]) {
            selectedRecipeForMeal = userSelectedRecipes[userChoiceKey];
          } else if (mealData && mealData.options && mealData.options.length > 0) {
            selectedRecipeForMeal = mealData.options[0]; // Por defecto la primera
          }

          if (selectedRecipeForMeal) {
            menuToSave.menu[dayKey][mealType] = {
              selected: selectedRecipeForMeal,
              options: mealData.options // Conservar todas las opciones
            };
          } else if (mealData && mealData.error) {
            menuToSave.menu[dayKey][mealType] = { error: mealData.error };
          } else {
            menuToSave.menu[dayKey][mealType] = null;
          }
        });
      });
      
      // Guardar en el backend
      await axios.post(
        `${apiUrl}/guardar-menu`,
        menuToSave,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSaveSuccess('¡Menú guardado correctamente! Ahora aparecerá en tu perfil.');
    } catch (err) {
      console.error('Error saving menu to profile:', err);
      setError('No se pudo guardar el menú en tu perfil. Por favor, intenta de nuevo.');
    } finally {
      setSavingMenu(false);
    }
  };

  // --- FUNCIONALIDAD DE LISTA DE COMPRA Y EXPORTACIÓN ---

  const handleGenerarListaCompra = async () => {
    if (!recommendedMenu || Object.keys(recommendedMenu).length === 0) {
      setErrorShoppingList("Primero genera un menú de recomendaciones.");
      return;
    }

    const menuParaEnviar = {};
    let hayComidasValidas = false;

    Object.entries(recommendedMenu).forEach(([dayKey, dayData]) => {
      menuParaEnviar[dayKey] = {};
      Object.entries(dayData).forEach(([mealType, mealSlotData]) => {
        let recipeToSend = null;
        const userChoiceKey = `${dayKey}-${mealType}`;

        if (userSelectedRecipes[userChoiceKey]) {
          recipeToSend = userSelectedRecipes[userChoiceKey];
        } else if (mealSlotData && mealSlotData.options && mealSlotData.options.length > 0) {
          recipeToSend = mealSlotData.options[0]; // Tomar la primera opción por defecto
        }
        
        if (recipeToSend && !recipeToSend.error) {
          menuParaEnviar[dayKey][mealType] = recipeToSend;
          hayComidasValidas = true;
        } else {
          menuParaEnviar[dayKey][mealType] = null; // O manejar el error si existe
        }
      });
    });

    if (!hayComidasValidas) {
      setErrorShoppingList("El menú recomendado no contiene recetas válidas para generar una lista de compras.");
      return;
    }

    setLoadingShoppingList(true);
    setErrorShoppingList(null);
    setShoppingList(null);

    try {
      const response = await axios.post(
        `${apiUrl}/generate-shopping-list`,
        { menu: menuParaEnviar }, // Enviar el menú procesado (con la primera opción seleccionada)
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShoppingList(response.data);
    } catch (err) {
      console.error("Error al generar la lista de compras:", err);
      setErrorShoppingList(err.response?.data?.detail || "Error al generar la lista de compras desde el servidor.");
    } finally {
      setLoadingShoppingList(false);
    }
  };

  function exportarMenuRecomendadoTXT() {
    if (!recommendedMenu || Object.keys(recommendedMenu).length === 0) {
      alert("No hay menú recomendado para exportar.");
      return;
    }
    let texto = "📅 Menú Semanal Recomendado (Primera Opción)\n\n";
    
    daysOrder.forEach((diaKeyOriginal) => {
      // El backend para recomendaciones usa 'miercoles', pero la lógica de MenuSemanal.jsx usa 'miércoles' para el orden
      // Aseguramos consistencia al buscar en recommendedMenu
      const diaKey = diaKeyOriginal === 'miércoles' ? 'miercoles' : diaKeyOriginal;
      const comidasDelDia = recommendedMenu[diaKey];

      if (comidasDelDia) {
        texto += `📌 ${diaKey.charAt(0).toUpperCase() + diaKey.slice(1)}\n`;
        // Asumimos un orden fijo de comidas o el que venga del backend
        const mealTypesOrder = Object.keys(comidasDelDia); 

        mealTypesOrder.forEach((tipoComida) => {
          const mealSlotData = comidasDelDia[tipoComida];
          let recetaParaExportar = null;
          const userChoiceKey = `${diaKey}-${tipoComida}`; // Asegurar que diaKey y tipoComida coincidan con cómo se guardan en userSelectedRecipes

          if (userSelectedRecipes[userChoiceKey]) {
            recetaParaExportar = userSelectedRecipes[userChoiceKey];
          } else if (mealSlotData && mealSlotData.options && mealSlotData.options.length > 0) {
            recetaParaExportar = mealSlotData.options[0]; // Primera opción por defecto
          }
          
          if (recetaParaExportar) {
            texto += `- ${tipoComida.charAt(0).toUpperCase() + tipoComida.slice(1)}: ${recetaParaExportar.label}\n`;
            if (recetaParaExportar.calories) {
              texto += `  Calorías: ${Math.round(recetaParaExportar.calories)} kcal\n`;
            }
          } else if (mealSlotData && mealSlotData.error) {
            texto += `- ${tipoComida.charAt(0).toUpperCase() + tipoComida.slice(1)}: ${mealSlotData.error}\n`;
          } else {
            texto += `- ${tipoComida.charAt(0).toUpperCase() + tipoComida.slice(1)}: (No hay opción disponible)\n`;
          }
        });
        texto += "\n";
      }
    });

    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "menu_semanal_recomendado.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportarListaCompraRecomendadaTXT(currentShoppingList) {
    if (!currentShoppingList || Object.keys(currentShoppingList).length === 0) {
        alert("No hay lista de la compra para exportar.");
        return;
    }
    let texto = "🛒 Lista de la Compra (Menú Recomendado)\n\n";

    for (const [ingrediente, details] of Object.entries(currentShoppingList)) {
      let cantidadStr = details.amount.toFixed(2);
      if (details.unit && details.unit !== "unidad(es)") {
        cantidadStr += ` ${details.unit}`;
      }
      texto += `- ${ingrediente}: ${cantidadStr}\n`;
    }

    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "lista_de_la_compra_recomendada.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Orden de los días para mostrar consistentemente
  const daysOrder = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  return (
    <div className="menu-form-container recommendations-container">
      <h2>Recomendaciones Semanales Personalizadas</h2>
      <p>
        Ajusta tus calorías objetivo y genera un menú semanal personalizado basado en tus recetas favoritas 
        y necesidades calóricas.
      </p>
      {userInfo && (
        <div className="user-info-summary" style={{marginBottom: '15px'}}>
          <p><strong>Tu BMR (referencia):</strong> {userInfo.bmr ? `${Math.round(userInfo.bmr)} kcal` : 'Calculando...'}</p>
          {/* <p><strong>Nivel de Actividad:</strong> {userInfo.actividad || 'No disponible'}</p> */}
          {/* <p><strong>Objetivo Actual:</strong> {userInfo.objetivo || 'No disponible'}</p> */}
        </div>
      )}

      {/* Slider de Calorías */}
      <div className="form-group calories-slider-container" style={{marginBottom: '20px'}}>
        <label htmlFor="targetCaloriesRecomendacion" style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
          Calorías Objetivo: <span>{targetCalories} kcal</span>
        </label>
        <input
          type="range"
          id="targetCaloriesRecomendacion"
          name="targetCaloriesRecomendacion"
          min="1000"
          max="4000"
          step="50"
          value={targetCalories}
          onChange={handleCaloriesChange}
          className="calories-slider" // Puedes usar la clase global o definir una específica
          style={{width: '100%'}}
        />
      </div>

      <button onClick={handleGenerateRecommendations} disabled={loading || !token} className="submit-button">
        {loading ? 'Generando...' : 'Obtener Mis Recomendaciones'}
      </button>

      {loading && <p className="loading-message">Buscando recomendaciones...</p>}
      {error && <p className="error-message">{error}</p>}
      {saveSuccess && <p className="success-message">{saveSuccess}</p>}

      {recommendedMenu && (
        <div className="menu-display">
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <button onClick={saveMenuToProfile} disabled={savingMenu || !token} className="save-menu-button">
              {savingMenu ? "Guardando Menú..." : "Guardar este Menú"}
            </button>
          </div>

          {daysOrder.map(dayKey => {
            // El backend para recomendaciones usa 'miercoles', pero la lógica de MenuSemanal.jsx usa 'miércoles' para el orden
            // Aseguramos consistencia al buscar en recommendedMenu
            const dayData = recommendedMenu[dayKey] || recommendedMenu[dayKey.replace('é', 'e')];
            if (!dayData) return null;

            return (
              <div key={dayKey} className="day-column">
                <h3>{dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}</h3>
                {Object.entries(dayData).map(([mealType, mealData]) => (
                  <div key={mealType} className="meal-slot-recommendation">
                    <h4>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h4>
                    {mealData.options && mealData.options.length > 0 ? (
                      mealData.options.map((recipe, index) => (
                        <RecipeCard 
                          key={recipe.url || `${dayKey}-${mealType}-${index}`}
                          recipe={recipe} 
                          mealType={mealType}
                          dayKey={dayKey}
                          recetasFavoritas={recetasFavoritas}
                          toggleFavoritoHandler={toggleFavoritoHandler}
                          guardandoFavorito={guardandoFavorito}
                          numOptions={mealData.options.length}
                          handleSelectRecipe={handleSelectRecipe}
                          isSelectedRecipe={userSelectedRecipes[`${dayKey}-${mealType}`]?.url === recipe.url}
                        />
                      ))
                    ) : (
                      <RecipeCard recipe={mealData} mealType={mealType} dayKey={dayKey}/> // Para mostrar el error si existe
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          
          {/* Acciones del Menú Recomendado: Generar Lista de Compra y Exportar Menú */}
          <div
              className="menu-actions"
              style={{
                marginTop: "25px",
                paddingTop: "20px",
                borderTop: "1px solid #ccc",
                display: "flex",
                gap: "15px",
                justifyContent: "center"
              }}
            >
              <button
                onClick={handleGenerarListaCompra}
                disabled={loadingShoppingList || Object.keys(recommendedMenu).length === 0}
              >
                Generar Lista de Compras (Recomendado)
              </button>
              <button
                onClick={exportarMenuRecomendadoTXT}
                disabled={Object.keys(recommendedMenu).length === 0}
              >
                Exportar Menú Recomendado (.txt)
              </button>
            </div>
        </div>
      )}

      {/* --- Visualización de la Lista de la Compra --- */}
      {loadingShoppingList && <p className="loading-message" style={{textAlign: 'center', marginTop: '20px'}}>Generando lista de la compra...</p>}
      {errorShoppingList && <p className="error-message" style={{textAlign: 'center', marginTop: '20px'}}>{errorShoppingList}</p>}
      
      {shoppingList && !loadingShoppingList && Object.keys(shoppingList).length > 0 && (
        <div className="shopping-list-container" style={{ marginTop: "30px", padding: "20px", border: "1px solid #eee", borderRadius: "8px" }}>
          <h3 style={{textAlign: "center", marginBottom: "15px"}}>Lista de la Compra (Menú Recomendado)</h3>
          <table className="shopping-table">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(shoppingList).map(([ingredient, details]) => (
                <tr key={ingredient}>
                  <td>{ingredient}</td>
                  <td>{details.amount % 1 === 0 ? details.amount : details.amount.toFixed(2)} {details.unit !== "unidad(es)" ? details.unit : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => exportarListaCompraRecomendadaTXT(shoppingList)}
            style={{ display: "block", margin: "20px auto 0 auto" }}
            className="export-list-button"
          >
            Exportar Lista de Compra (.txt)
          </button>
        </div>
      )}
      {shoppingList && !loadingShoppingList && Object.keys(shoppingList).length === 0 && (
         <p style={{textAlign: 'center', marginTop: '20px', fontStyle: 'italic'}}>La lista de la compra está vacía o no se pudo generar.</p>
      )}

    </div>
  );
};

export default RecomendacionSemanal; 
