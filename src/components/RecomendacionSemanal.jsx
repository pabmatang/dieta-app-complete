import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MenuSemanal.css'; // Reutilizar algunos estilos si aplica
import config from '../config'; // Importar la configuración

// Componente para mostrar una receta individual (similar a MenuSemanal.jsx)
const RecipeCard = ({ recipe, mealType, dayKey }) => {
  if (!recipe || recipe.error) {
    return (
      <div className="meal-slot error-slot">
        <p><strong>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}:</strong> {recipe.error || 'No disponible'}</p>
      </div>
    );
  }

  return (
    <div className="meal-option-card recommendation-card">
      <h4>{recipe.label}</h4>
      {recipe.image && <img src={recipe.image} alt={recipe.label} className="meal-image recommendation-recipe-image" />}
      <p>Calorías: {recipe.calories ? recipe.calories.toFixed(0) : 'N/A'} kcal</p>
      {recipe.url && <a href={recipe.url} target="_blank" rel="noopener noreferrer">Ver receta</a>}
      {/* Podríamos añadir botón de "marcar como favorito" o "reemplazar" aquí en el futuro */}
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

  // URL base de la API
  const apiUrl = config.apiUrl;

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
      } catch (err) {
        console.error('Error fetching user info for recommendations:', err);
        // No bloquear la funcionalidad principal si esto falla, pero mostrar un aviso
        setError('No se pudo cargar la información del perfil para personalizar las calorías.');
      }
    };
    fetchUserInfo();
  }, [token, apiUrl]);

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

                  return (
                    <div key={mealType} className="meal-slot">
                       <h4>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h4>
                       <RecipeCard recipe={mainRecommendation} mealType={mealType} dayKey={dayKey} />
                       {/* Opcional: Mostrar más opciones si se generan 
                       mealSlot.options.length > 1 && (
                        <details>
                          <summary>Otras opciones ({mealSlot.options.length -1})</summary>
                          {mealSlot.options.slice(1).map((option, index) => (
                            <RecipeCard key={index} recipe={option} mealType={mealType} dayKey={dayKey} />
                          ))}
                        </details>
                       )
                       */}
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