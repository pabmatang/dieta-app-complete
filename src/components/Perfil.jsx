import React, { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from '../config';

const Perfil = ({ token }) => {
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editableData, setEditableData] = useState({
    peso: "",
    actividad: "",
    objetivo: "",
  });
  const [success, setSuccess] = useState("");
  const [eliminandoFavorito, setEliminandoFavorito] = useState(false);
  const [recetasFavoritasData, setRecetasFavoritasData] = useState([]); // Estado separado para recetas favoritas
  const [forceUpdate, setForceUpdate] = useState(0); // Para forzar re-renderizado

  useEffect(() => {
    fetchPerfil();
  }, [token, forceUpdate]);

  // Temporizador para limpiar mensajes de éxito
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchPerfil = async () => {
    try {
      const res = await axios.get("BACKEND_URL/perfil", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Datos de perfil cargados:", res.data);
      setPerfil(res.data);
      
      // Parsear recetas favoritas y actualizar estado separado
      if (res.data.recetas_favoritas) {
        try {
          let favoritas = [];
          
          // Si es un string, intentar parsearlo
          if (typeof res.data.recetas_favoritas === 'string') {
            favoritas = JSON.parse(res.data.recetas_favoritas);
          } 
          // Si ya es un array, usarlo directamente
          else if (Array.isArray(res.data.recetas_favoritas)) {
            favoritas = res.data.recetas_favoritas;
          }
          
          // Filtrar recetas sin URL o propiedad undefined para evitar errores
          favoritas = favoritas.filter(receta => receta && receta.url);
          
          // Asignar un ID único a cada receta para mejorar el manejo de keys en React
          favoritas = favoritas.map((receta, index) => ({
            ...receta,
            id: `${receta.url}-${index}`
          }));
          
          setRecetasFavoritasData(favoritas);
          console.log("Recetas favoritas cargadas:", favoritas);
        } catch (e) {
          console.error("Error al parsear recetas favoritas:", e);
          setRecetasFavoritasData([]);
        }
      } else {
        setRecetasFavoritasData([]);
      }
      
      setEditableData({
        peso: res.data.peso || "",
        actividad: res.data.actividad || "",
        objetivo: res.data.objetivo || "",
      });
    } catch (err) {
      console.error("Error fetching perfil:", err);
      setError("Error en la solicitud al servidor.");
    }
  };

  const handleEditChange = (e) => {
    setEditableData({ ...editableData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await axios.patch("http://localhost:8000/actualizar-perfil", 
        editableData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchPerfil();
      setEditMode(false);
      setSuccess("Datos actualizados correctamente.");
    } catch (err) {
      console.error("Error guardando cambios:", err);
      setError("Error al actualizar los datos.");
    }
  };

  const eliminarFavorito = async (receta) => {
    if (!receta.url) {
      setError(`La receta "${receta.label || "sin nombre"}" no tiene URL y no se puede eliminar.`);
      return;
    }
    
    setEliminandoFavorito(true);
    setError("");
    setSuccess("");
    
    try {
      console.log("Eliminando receta con URL:", receta.url);
      
      // Enviar la URL de la receta en el formato que espera el backend
      await axios.post(
        "http://localhost:8000/eliminar-favorita", 
        { recipe_url: receta.url }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Actualización UI local inmediata para mejor experiencia
      setRecetasFavoritasData(prevRecetas => 
        prevRecetas.filter(r => r.url !== receta.url)
      );
      
      setSuccess("Receta eliminada de favoritos correctamente.");
      
      // Recargar perfil completo después de un breve retraso para sincronizar con el backend
      setTimeout(() => {
        fetchPerfil(); // Recargar datos del servidor
      }, 1000);
      
    } catch (error) {
      console.error("Error al eliminar favorito:", error);
      setError("No se pudo eliminar la receta de favoritos.");
      
      // Forzar recarga del perfil para asegurar sincronización
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 500);
    } finally {
      setEliminandoFavorito(false);
    }
  };

  // Función para refrescar manualmente los datos
  const refreshData = () => {
    setSuccess("Actualizando datos...");
    fetchPerfil()
      .then(() => setSuccess("Datos actualizados correctamente"))
      .catch(() => setError("Error al actualizar los datos"));
    setForceUpdate(prev => prev + 1);
  };

  if (!perfil) {
    return (
      <div style={styles.container}>
        <p>Cargando perfil...</p>
      </div>
    );
  }
  
  let menuSemanal = null;
  if (perfil.last_generated_menu_json) {
    try {
      const menu = JSON.parse(perfil.last_generated_menu_json);
      menuSemanal = (
        <div style={styles.menuContainer}>
          <h3 style={styles.menuTitle}>Menú Semanal</h3>
          {Object.entries(menu.menu).map(([dia, comidas]) => (
            <div key={dia}>
              <h2>{dia}</h2>
              {Object.entries(comidas).map(([tipoComida, datosComida]) => {
                // Verificar si hay datos de comida válidos
                if (!datosComida) return null;
                
                // Si datosComida tiene una propiedad 'selected', usamos esa
                // Si no, verificamos si options existe y tomamos la primera opción
                const comidaElegida = datosComida.selected || 
                                     (Array.isArray(datosComida.options) ? datosComida.options[0] : null);
                
                if (!comidaElegida) return null;

                return (
                  <div key={tipoComida}>
                    <h3>{tipoComida}</h3>
                    <div style={{ 
                      border: '1px solid #ccc', 
                      borderRadius: '10px', 
                      marginBottom: '10px', 
                      padding: '10px', 
                      display: 'flex', 
                      alignItems: 'center' 
                    }}>
                      <img 
                        src={comidaElegida.image} 
                        alt={comidaElegida.label} 
                        style={{ 
                          width: '100px', 
                          height: '100px', 
                          objectFit: 'cover', 
                          borderRadius: '8px', 
                          marginRight: '10px' 
                        }}
                      />
                      <div>
                        <p>
                          <a 
                            href={comidaElegida.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              fontWeight: 'bold', 
                              color: '#007BFF', 
                              textDecoration: 'none' 
                            }}
                          >
                            {comidaElegida.label}
                          </a>
                        </p>
                        <p>Calorías: {typeof comidaElegida.calories === 'number' ? comidaElegida.calories.toFixed(2) : 'N/A'} kcal</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    } catch (e) {
      console.error("Error al parsear el JSON del menú:", e);
      menuSemanal = (
        <p style={{ color: "red" }}>No se pudo cargar el menú semanal.</p>
      );
    }
  }

  // Comprobar si hay recetas sin URL para mostrar botón de reparación
  const hayRecetasSinURL = recetasFavoritasData.some(receta => !receta || !receta.url);

  let recetasFavoritas = null;

  if (recetasFavoritasData.length > 0) {
    recetasFavoritas = (
      <div style={styles.menuContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={styles.menuTitle}>Recetas Favoritas</h3>
          <button
            onClick={refreshData}
            style={{
              background: '#4caf50',
              border: 'none',
              borderRadius: '4px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: 'white'
            }}
          >
            Actualizar datos
          </button>
        </div>
        
        {recetasFavoritasData.map((receta) => (
          <div
            key={receta.id || `receta-${receta.url}`}
            style={{
              border: '1px solid #ccc',
              borderRadius: '10px',
              marginBottom: '10px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              backgroundColor: !receta.url ? '#fff0f0' : 'white' // Colorear de rojo claro las recetas sin URL
            }}
          >
            <img
              src={receta.image}
              alt={receta.label}
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'cover',
                borderRadius: '8px',
                marginRight: '10px'
              }}
            />
            <div style={{ flex: 1 }}>
              <p>
                {receta.url ? (
                  <a
                    href={receta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontWeight: 'bold',
                      color: '#007BFF',
                      textDecoration: 'none'
                    }}
                  >
                    {receta.label}
                  </a>
                ) : (
                  <span style={{ fontWeight: 'bold', color: '#ff5252' }}>
                    {receta.label} (URL faltante)
                  </span>
                )}
              </p>
              <p>Calorías: {typeof receta.calories === 'number' ? receta.calories.toFixed(2) : 'N/A'} kcal</p>
              <p style={{ fontStyle: 'italic', color: '#555' }}>
                Ingredientes: {receta.ingredients?.slice(0, 3).join(', ')}{receta.ingredients?.length > 3 ? '...' : ''}
              </p>
            </div>
            <button
              onClick={() => eliminarFavorito(receta)}
              disabled={eliminandoFavorito}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: receta.url ? 'pointer' : 'not-allowed',
                fontSize: '1.5rem',
                color: receta.url ? '#ff5252' : '#ccc',
                padding: '5px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                transition: 'background-color 0.2s'
              }}
              title={receta.url ? "Eliminar de favoritos" : "No se puede eliminar (falta URL)"}
              onMouseOver={(e) => receta.url && (e.currentTarget.style.backgroundColor = '#f0f0f0')}
              onMouseOut={(e) => receta.url && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    );
  } else if (perfil.recetas_favoritas) {
    recetasFavoritas = (
      <div style={styles.menuContainer}>
        <h3 style={styles.menuTitle}>Recetas Favoritas</h3>
        <p>No tienes recetas favoritas guardadas.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Perfil del Usuario</h2>
      <div style={styles.infoBox}>
        <p>
          <strong>Nombre de usuario:</strong> {perfil.usuario}
        </p>
        <p>
          <strong>Email:</strong> {perfil.email}
        </p>
        <p>
          <strong>Sexo:</strong> {perfil.genero || "No especificado"}
        </p>
        <p>
          <strong>Edad:</strong> {perfil.edad || "No especificado"}
        </p>

        <p>
          <strong>Peso (kg):</strong>{" "}
          {editMode ? (
            <input
              type="number"
              name="peso"
              value={editableData.peso}
              onChange={handleEditChange}
            />
          ) : (
            perfil.peso || "No especificado"
          )}
        </p>

        <p>
          <strong>Actividad física:</strong>{" "}
          {editMode ? (
            <select
              name="actividad"
              value={editableData.actividad}
              onChange={handleEditChange}
            >
              <option value="">Selecciona nivel</option>
              <option value="sedentario">Sedentario</option>
              <option value="ligero">Ligero</option>
              <option value="moderado">Moderado</option>
              <option value="intenso">Intenso</option>
            </select>
          ) : (
            perfil.actividad || "No especificado"
          )}
        </p>

        <p>
          <strong>Objetivo de peso:</strong>{" "}
          {editMode ? (
            <select
              name="objetivo"
              value={editableData.objetivo}
              onChange={handleEditChange}
            >
              <option value="">Selecciona objetivo</option>
              <option value="Mantener peso">Mantener peso</option>
              <option value="Subir de peso">Subir de peso</option>
              <option value="Bajar de peso">Bajar de peso</option>
            </select>
          ) : (
            perfil.objetivo || "No especificado"
          )}
        </p>
        <p>
          <strong>Metabolismo basal:</strong> {perfil.bmr || "No especificado"}
        </p>
        
        {/* Botones de edición movidos encima del menú semanal */}
        {editMode ? (
          <div style={{...styles.buttonBox, marginTop: "20px", marginBottom: "20px"}}>
            <button onClick={handleSave}>Guardar cambios</button>
            <button onClick={() => setEditMode(false)}>Cancelar</button>
          </div>
        ) : (
          <div style={{...styles.buttonBox, marginTop: "20px", marginBottom: "20px"}}>
            <button onClick={() => setEditMode(true)}>Editar</button>
          </div>
        )}
        
        {menuSemanal}
        {recetasFavoritas}
        
      </div>

      {success && <p style={{ color: "green", padding: "10px", backgroundColor: "#f0fff0", borderRadius: "5px", marginTop: "10px" }}>{success}</p>}
      {error && <p style={{ color: "red", padding: "10px", backgroundColor: "#fff0f0", borderRadius: "5px", marginTop: "10px" }}>{error}</p>}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "500px",
    margin: "30px auto",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    textAlign: "center",
    marginBottom: "20px",
  },
  infoBox: {
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "6px",
    boxShadow: "0 0 8px rgba(0,0,0,0.05)",
  },
  error: {
    color: "red",
  },
  buttonBox: {
    marginTop: "15px",
    display: "flex",
    justifyContent: "space-around",
  },
  menuContainer: {
    marginTop: "30px",
    backgroundColor: "#ffffff",
    padding: "15px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  menuTitle: {
    fontSize: "20px",
    marginBottom: "10px",
    textAlign: "center",
  },
  daySection: {
    marginBottom: "20px",
  },
  dayTitle: {
    fontSize: "18px",
    marginBottom: "8px",
    borderBottom: "1px solid #ddd",
    paddingBottom: "4px",
  },
  mealCard: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "10px",
    backgroundColor: "#f4f4f4",
    padding: "10px",
    borderRadius: "6px",
  },
  mealImage: {
    width: "60px",
    height: "60px",
    objectFit: "cover",
    borderRadius: "4px",
  },
};

export default Perfil;
