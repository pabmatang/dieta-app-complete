import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MenuSemanal.css'; // Reutilizar algunos estilos si aplica
import { BACKEND_URL } from '../config'; // Importar la configuración

// Componente para mostrar una receta individual (similar a MenuSemanal.jsx)
const RecipeCard = ({ recipe, mealType, dayKey, recetasFavoritas, toggleFavoritoHandler, guardandoFavorito }) => {
  if (!recipe || recipe.error) {
    return (
      <div className="meal-slot error-slot">
        <p><strong>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}:</strong> {recipe.error || 'No disponible'}</p>
      </div>
    );
  }

  // Verificar si es favorita (si tenemos recetasFavoritas y la URL)
  const esFavorita = recetasFavoritas && recipe.url && recetasFavoritas.has(recipe.url);

  return (
    <div className="meal-option-card recommendation-card" style={{ position: 'relative' }}>
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
    try {
      const response = await axios.post(
        `${apiUrl}/generar-menu-recomendado`,
        {},
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
    
    try {
      // Convertir el menú recomendado al formato que espera el endpoint /guardar-menu
      // El menú guardado necesita tener una estructura como { menu: {...} }
      const menuToSave = {
        menu: {}
      };
      
      // Para cada día en el menú recomendado
      Object.entries(recommendedMenu).forEach(([dayKey, dayData]) => {
        menuToSave.menu[dayKey] = {};
        
        // Para cada comida en el día
        Object.entries(dayData).forEach(([mealType, mealData]) => {
          // Si hay opciones disponibles, usar la primera como la seleccionada
          if (mealData && mealData.options && mealData.options.length > 0) {
            menuToSave.menu[dayKey][mealType] = {
              selected: mealData.options[0], // La primera opción como la seleccionada
              options: mealData.options     // Conservar todas las opciones por si se necesitan
            };
          } else if (mealData && mealData.error) {
            // Si hay un error, mantenerlo
            menuToSave.menu[dayKey][mealType] = { error: mealData.error };
          } else {
            // Si no hay datos, dejar como null
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

  // Orden de los días para mostrar consistentemente
  const daysOrder = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  return (
    <div className="menu-form-container recommendations-container">
      <h2>Recomendaciones de Menú Semanal</h2>
      <p>
        Genera un menú semanal personalizado basado en tus recetas favoritas (usadas como inspiración)
        y ajustado a tus necesidades calóricas según tu perfil.
      </p>
      {userInfo && (
        <div className="user-info-summary">
          <p><strong>Tu BMR:</strong> {userInfo.bmr ? `${userInfo.bmr} kcal` : 'No disponible'}</p>
          <p><strong>Nivel de Actividad:</strong> {userInfo.actividad || 'No disponible'}</p>
          <p><strong>Objetivo Actual:</strong> {userInfo.objetivo || 'No disponible'}</p>
        </div>
      )}
      <button onClick={handleGenerateRecommendations} disabled={loading} className="submit-button">
        {loading ? 'Generando...' : 'Obtener Mis Recomendaciones'}
      </button>

      {error && <p className="error-message">Error: {error}</p>}
      {saveSuccess && <p className="success-message" style={{color: 'green', padding: '10px', backgroundColor: '#f0fff0', borderRadius: '5px', marginTop: '10px'}}>{saveSuccess}</p>}

      {recommendedMenu && (
        <div className="generated-menu weekly-view">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h3>Tu Menú Semanal Recomendado:</h3>
            <button 
              onClick={saveMenuToProfile} 
              disabled={savingMenu}
              className="submit-button"
              style={{
                backgroundColor: '#28a745', 
                padding: '8px 16px',
                fontSize: '0.9rem'
              }}
            >
              {savingMenu ? 'Guardando...' : 'Guardar como mi menú semanal'}
            </button>
          </div>
          
          {daysOrder.map(dayKey => {
            const dayData = recommendedMenu[dayKey.toLowerCase()]; // El backend usa claves en minúscula
            if (!dayData) return <div key={dayKey} className="day-column"><h4>{dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}</h4><p>No hay datos.</p></div>;
            
            return (
              <div key={dayKey} className="day-column">
                <h3>{dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}</h3>
                {Object.entries(dayData).map(([mealType, mealSlot]) => {
                  // mealSlot puede ser null o no tener opciones
                  if (!mealSlot || !mealSlot.options || mealSlot.options.length === 0) {
                    let errorMessage = 'No hay opciones disponibles';
                    if (mealSlot && mealSlot.error) {
                      errorMessage = mealSlot.error;
                    }
                    return (
                      <div key={mealType} className="meal-slot">
                        <h4>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h4>
                        <p>{errorMessage}</p>
                      </div>
                    );
                  }
                  // Mostrar la primera opción como recomendación principal
                  const mainRecommendation = mealSlot.options[0]; 
                  console.log("Receta en RecomendacionSemanal:", {
                    label: mainRecommendation.label,
                    url: mainRecommendation.url,
                    tieneUrl: !!mainRecommendation.url
                  });

                  return (
                    <div key={mealType} className="meal-slot">
                       <h4>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h4>
                       <RecipeCard 
                         recipe={mainRecommendation} 
                         mealType={mealType} 
                         dayKey={dayKey} 
                         recetasFavoritas={recetasFavoritas}
                         toggleFavoritoHandler={toggleFavoritoHandler}
                         guardandoFavorito={guardandoFavorito}
                       />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecomendacionSemanal; 
