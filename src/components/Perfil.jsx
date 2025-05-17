import React, { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from '../config';
import './Perfil.css'; // Importar los nuevos estilos

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
  const [analisisNutricional, setAnalisisNutricional] = useState(null);
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState("");

  // Estados para la lista de la compra del menú guardado en perfil
  const [loadingShoppingListPerfil, setLoadingShoppingListPerfil] = useState(false);
  const [errorShoppingListPerfil, setErrorShoppingListPerfil] = useState("");

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
      const res = await axios.get(`${BACKEND_URL}/perfil`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("----- DEBUG PERFIL START -----");
      console.log("Raw res.data:", res.data);
      console.log("Type of res.data:", typeof res.data);

      if (res.data && typeof res.data === 'object') {
          console.log("Keys in res.data:", Object.keys(res.data));
          if (res.data.hasOwnProperty('recetas_favoritas')) {
              console.log("res.data.recetas_favoritas EXISTS. Value:", res.data.recetas_favoritas);
              console.log("Type of res.data.recetas_favoritas:", typeof res.data.recetas_favoritas);
          } else {
              console.log("res.data.recetas_favoritas DOES NOT EXIST.");
              if (res.data.hasOwnProperty('sale')) {
                 console.log("Found 'sale' key instead. Value:", res.data.sale);
                 console.log("Type of res.data.sale:", typeof res.data.sale);
              }
          }
      }
      
      setPerfil(res.data);
      let favoritasArray = []; 

      let favoriteData = null;
      if (res.data && res.data.hasOwnProperty('recetas_favoritas')) {
          favoriteData = res.data.recetas_favoritas;
          console.log("Using res.data.recetas_favoritas as source for favoriteData.");
      } else if (res.data && res.data.hasOwnProperty('sale')) {
          console.warn("res.data.recetas_favoritas not found. Trying 'sale' key based on logs.");
          favoriteData = res.data.sale;
          console.log("Using res.data.sale as source for favoriteData.");
      }

      if (favoriteData !== null && favoriteData !== undefined) {
        console.log("Raw favoriteData to be processed:", favoriteData);
        console.log("Type of favoriteData:", typeof favoriteData);
        try {
          if (typeof favoriteData === 'string') {
            console.log("Attempting JSON.parse on favoriteData (string).");
            favoritasArray = JSON.parse(favoriteData);
          } else if (Array.isArray(favoriteData)) {
            console.log("favoriteData is already an array.");
            favoritasArray = favoriteData;
          } else {
            console.warn("favoriteData is neither a string nor an array. Treating as empty. Type:", typeof favoriteData);
            favoritasArray = [];
          }

          if (!Array.isArray(favoritasArray)) {
              console.error("After initial processing, favoritasArray is NOT an array. Value:", favoritasArray, ". Resetting to [].");
              favoritasArray = [];
          } else {
              console.log("After initial processing, favoritasArray IS an array. Length:", favoritasArray.length);
          }
          
          // Deep log of array before filtering
          console.log("FavoritasArray before filtering (deep copy):", JSON.parse(JSON.stringify(favoritasArray)));

          const processedFavoritas = favoritasArray
            .filter(receta => {
              const isValid = receta && typeof receta === 'object' && receta.recipe_url;
              if (!isValid) {
                console.log("Filtering out invalid receta (recipe_url missing or not an object?):", receta);
              }
              return isValid;
            })
            .map((receta, index) => ({
              ...receta,
              id: `${receta.recipe_url}-${index}`,
              url: receta.recipe_url,
            }));
          
          console.log("Processed (filtered and mapped) favoritas:", processedFavoritas);
          setRecetasFavoritasData(processedFavoritas);

        } catch (e) {
          console.error("Error processing favoriteData. Raw favoriteData that caused error:", favoriteData, "Error:", e);
          setRecetasFavoritasData([]); 
        }
      } else {
        console.log("No data found in 'recetas_favoritas' or 'sale' properties. Setting favoritas to empty.");
        setRecetasFavoritasData([]);
      }
      
      console.log("----- DEBUG PERFIL END -----");
      
      setEditableData({
        peso: res.data.peso || "",
        actividad: res.data.actividad || "",
        objetivo: res.data.objetivo || "",
      });

      // Después de cargar el perfil, si hay un menú guardado, buscar su análisis
      if (res.data && res.data.last_generated_menu_json) {
        fetchAnalisisNutricional();
      } else {
        setAnalisisNutricional(null); // No hay menú, no hay análisis
      }

    } catch (err) {
      console.error("Error fetching perfil (outer catch):", err);
      setError("Error en la solicitud al servidor.");
      // Log error related to res.data if possible
      if (err.response) {
        console.error("Error response data:", err.response.data);
        console.error("Error response status:", err.response.status);
      }
      setRecetasFavoritasData([]); // Ensure it's reset on error too
      setAnalisisNutricional(null); // Asegurar que se limpia en caso de error al cargar perfil
      console.log("----- DEBUG PERFIL END (with error) -----");
    }
  };

  const fetchAnalisisNutricional = async () => {
    setLoadingAnalisis(true);
    setErrorAnalisis("");
    try {
      const res = await axios.get(`${BACKEND_URL}/perfil/analisis-nutricional`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalisisNutricional(res.data);
      console.log("Datos recibidos del análisis nutricional:", res.data);
    } catch (err) {
      console.error("Error fetching analisis nutricional:", err);
      let errorMessage = "Error al cargar el análisis nutricional.";
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      }
      setErrorAnalisis(errorMessage);
      setAnalisisNutricional(null);
    } finally {
      setLoadingAnalisis(false);
    }
  };

  const handleEditChange = (e) => {
    setEditableData({ ...editableData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await axios.patch(`${BACKEND_URL}/actualizar-perfil`, 
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
      console.log("Intentando eliminar receta. URL enviada al backend como recipe_url:", receta.url);
      
      const response = await axios.post(
        `${BACKEND_URL}/eliminar-favorita`, 
        { recipe_url: receta.url }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Log detallado de la respuesta del backend
      console.log("Respuesta del backend al eliminar:", { 
        status: response.status,
        data: response.data,
        headers: response.headers
      });

      if (response.status >= 200 && response.status < 300) { // Típicamente 200 OK, 201 Created, 204 No Content
        // Si el backend devuelve 204 No Content, response.data puede ser undefined o null.
        // Es importante que el backend sea consistente.
        console.log("Backend confirmó la eliminación (status 2xx). Actualizando UI localmente.");
        setRecetasFavoritasData(prevRecetas => 
          prevRecetas.filter(r => r.url !== receta.url)
        );
        setSuccess(response.data?.message || "Receta eliminada de favoritos correctamente.");
        // No llamamos a fetchPerfil() aquí para evitar que la receta reaparezca.
        // La UI se actualiza localmente y confiamos en que el backend está sincronizado.
      } else {
        // El backend respondió con un status de éxito, pero el contenido podría indicar un problema no esperado.
        console.warn("El backend respondió con status de éxito pero podría haber un problema:", response);
        setError(response.data?.message || "No se pudo eliminar la receta. Respuesta inesperada del servidor.");
        // En este caso, sí recargamos para estar seguros del estado del backend.
        fetchPerfil(); 
      }
      
    } catch (error) {
      console.error("Error en la petición axios al eliminar favorito:", error);
      if (error.response) {
        console.error("Respuesta del error del backend:", error.response.data);
        setError(error.response.data?.detail || error.response.data?.message || "No se pudo eliminar la receta de favoritos.");
      } else if (error.request) {
        setError("No se recibió respuesta del servidor al intentar eliminar.");
      } else {
        setError("Error al configurar la petición para eliminar la receta.");
      }
      // Si hubo un error, recargamos el perfil para asegurar que la UI refleje el estado real del backend.
      fetchPerfil();
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

  // --- FUNCIONES DE EXPORTACIÓN PARA EL MENÚ GUARDADO DEL PERFIL ---

  const descargarTextoComoArchivo = (texto, nombreArchivo) => {
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportarMenuGuardadoTXT = () => {
    if (!perfil || !perfil.last_generated_menu_json) {
      alert("No hay un menú guardado para exportar.");
      return;
    }
    try {
      const menuData = JSON.parse(perfil.last_generated_menu_json);
      if (!menuData || !menuData.menu) {
        alert("El formato del menú guardado no es válido.");
        return;
      }

      let texto = "📅 Menú Semanal Guardado (Perfil)\n\n";
      const daysOrder = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]; // Asegurar un orden

      daysOrder.forEach(diaKey => {
        const comidasDelDia = menuData.menu[diaKey];
        if (comidasDelDia) {
          texto += `📌 ${diaKey.charAt(0).toUpperCase() + diaKey.slice(1)}\n`;
          const mealTypesOrder = Object.keys(comidasDelDia); // O un orden fijo si lo tienes

          mealTypesOrder.forEach(tipoComida => {
            const datosComida = comidasDelDia[tipoComida];
            const comidaElegida = datosComida.selected || (datosComida.options && datosComida.options[0]);

            if (comidaElegida && !comidaElegida.error && comidaElegida.label) {
              texto += `- ${tipoComida.charAt(0).toUpperCase() + tipoComida.slice(1)}: ${comidaElegida.label}\n`;
              if (comidaElegida.calories) {
                texto += `  Calorías: ${Math.round(comidaElegida.calories)} kcal\n`;
              }
            } else if (comidaElegida && comidaElegida.error) {
              texto += `- ${tipoComida.charAt(0).toUpperCase() + tipoComida.slice(1)}: ${comidaElegida.error}\n`;
            } else {
              texto += `- ${tipoComida.charAt(0).toUpperCase() + tipoComida.slice(1)}: (No disponible o sin opciones)\n`;
            }
          });
          texto += "\n";
        }
      });
      descargarTextoComoArchivo(texto, "menu_guardado_perfil.txt");
    } catch (e) {
      console.error("Error al exportar el menú guardado:", e);
      alert("No se pudo exportar el menú guardado. Error en el formato.");
    }
  };

  const handleExportarListaCompraPerfil = async () => {
    if (!perfil || !perfil.last_generated_menu_json) {
      alert("No hay un menú guardado para generar una lista de la compra.");
      setErrorShoppingListPerfil("No hay menú guardado.");
      return;
    }

    let menuParaEnviar;
    try {
      const menuData = JSON.parse(perfil.last_generated_menu_json);
      if (!menuData || !menuData.menu) {
        alert("El formato del menú guardado no es válido para generar la lista.");
        setErrorShoppingListPerfil("Formato de menú inválido.");
        return;
      }
      
      menuParaEnviar = {};
      let hayComidasValidas = false;
      Object.entries(menuData.menu).forEach(([dayKey, dayData]) => {
        menuParaEnviar[dayKey] = {};
        Object.entries(dayData).forEach(([mealType, mealSlotData]) => {
          const recetaSeleccionada = mealSlotData.selected || (mealSlotData.options && mealSlotData.options[0]);
          if (recetaSeleccionada && !recetaSeleccionada.error && recetaSeleccionada.ingredients) {
             menuParaEnviar[dayKey][mealType] = recetaSeleccionada;
             hayComidasValidas = true;
          } else {
             menuParaEnviar[dayKey][mealType] = null;
          }
        });
      });

      if (!hayComidasValidas) {
        alert("El menú guardado no contiene recetas válidas con ingredientes para generar una lista de compras.");
        setErrorShoppingListPerfil("No hay recetas válidas con ingredientes.");
        return;
      }

    } catch (e) {
      console.error("Error parseando el menú guardado para lista de compras:", e);
      alert("Error al procesar el menú guardado para la lista de compras.");
      setErrorShoppingListPerfil("Error procesando menú.");
      return;
    }

    setLoadingShoppingListPerfil(true);
    setErrorShoppingListPerfil("");

    try {
      const response = await axios.post(
        `${BACKEND_URL}/generate-shopping-list`,
        { menu: menuParaEnviar },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && Object.keys(response.data).length > 0) {
        let textoLista = "🛒 Lista de la Compra (Menú Guardado del Perfil)\n\n";
        for (const [ingrediente, details] of Object.entries(response.data)) {
          let cantidadStr = details.amount % 1 === 0 ? String(details.amount) : details.amount.toFixed(2);
          if (details.unit && details.unit !== "unidad(es)") {
            cantidadStr += ` ${details.unit}`;
          }
          textoLista += `- ${ingrediente}: ${cantidadStr}\n`;
        }
        descargarTextoComoArchivo(textoLista, "lista_compra_perfil.txt");
      } else {
        alert("La lista de la compra generada está vacía.");
        setErrorShoppingListPerfil("Lista de compra vacía.");
      }
    } catch (err) {
      console.error("Error al generar la lista de compras del perfil:", err);
      alert(err.response?.data?.detail || "Error al generar la lista de compras desde el servidor.");
      setErrorShoppingListPerfil(err.response?.data?.detail || "Error del servidor.");
    } finally {
      setLoadingShoppingListPerfil(false);
    }
  };

  if (!perfil) {
    return (
      <div style={styles.container}>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  // Comprobar si hay recetas sin URL para mostrar botón de reparación
  const hayRecetasSinURL = recetasFavoritasData.some(receta => !receta || !receta.url);

  // Preparar el JSX para recetasFavoritasDisplay
  let recetasFavoritasDisplay = null;
  if (recetasFavoritasData.length > 0) {
    recetasFavoritasDisplay = (
      <div style={styles.menuContainer}>
        <div style={{ display: 'flex', /* justifyContent: 'space-between', */ alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ ...styles.menuTitle, flexGrow: 1, textAlign: 'center' }}>Recetas Favoritas</h3>
          
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
              backgroundColor: !receta.url ? '#fff0f0' : 'white'
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
                  <span style={{ fontWeight: 'bold', color: '#dc3545' }}>{receta.label || "Receta sin nombre ni URL"}</span>
                )}
              </p>
              <p>Calorías: {typeof receta.calories === 'number' ? receta.calories.toFixed(2) : 'N/A'} kcal</p>
              {/* Podríamos mostrar más detalles de la receta favorita si los tuviéramos */}
              {!receta.url && <p style={{color: 'red', fontSize: '0.8em'}}>Esta receta no tiene URL y podría no funcionar correctamente.</p>}
            </div>
            <button
              onClick={() => eliminarFavorito(receta)}
              disabled={eliminandoFavorito}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'transparent',
                border: 'none',
                color: '#dc3545',
                cursor: 'pointer',
                fontSize: '1.2rem',
              }}
            >
              &#x2716; 
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Preparar el JSX para menuSemanalContent (solo el contenido, no el contenedor)
  let menuSemanalContent = null; 
  if (perfil && perfil.last_generated_menu_json) {
    try {
      const menu = JSON.parse(perfil.last_generated_menu_json);
      menuSemanalContent = (
        <>
          {Object.entries(menu.menu).map(([dia, comidas]) => (
            <div key={dia} style={styles.daySection}>
              <h4 style={styles.dayTitle}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</h4>
              {Object.entries(comidas).map(([tipoComida, datosComida]) => {
                const comidaElegida = datosComida.selected || (datosComida.options && datosComida.options[0]);
                if (!comidaElegida) {
                  return <div key={tipoComida} style={styles.mealCard}><p>No hay datos para {tipoComida}.</p></div>;
                }
                return (
                  <div key={tipoComida} style={styles.mealCard}>
                    {comidaElegida.image && 
                      <img src={comidaElegida.image} alt={comidaElegida.label} style={styles.mealImage} />
                    }
                    <div>
                      <p style={{marginBottom: '5px'}}><strong>{tipoComida.charAt(0).toUpperCase() + tipoComida.slice(1)}:</strong></p>
                      <p style={{marginBottom: '3px'}}>
                        <a href={comidaElegida.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 'bold', color: '#007BFF', textDecoration: 'none' }}>
                          {comidaElegida.label}
                        </a>
                      </p>
                      <p style={{fontSize: '0.9em', marginBottom: '2px'}}>Calorías: {typeof comidaElegida.calories === 'number' ? comidaElegida.calories.toFixed(2) : 'N/A'} kcal</p>
                      {comidaElegida.protein_g !== undefined && <p style={{fontSize: '0.9em', marginBottom: '2px'}}>Proteínas: {comidaElegida.protein_g?.toFixed(2)} g</p>}
                      {comidaElegida.fat_g !== undefined && <p style={{fontSize: '0.9em', marginBottom: '2px'}}>Grasas: {comidaElegida.fat_g?.toFixed(2)} g</p>}
                      {comidaElegida.carbs_g !== undefined && <p style={{fontSize: '0.9em', marginBottom: '0px'}}>Carbohidratos: {comidaElegida.carbs_g?.toFixed(2)} g</p>}
                    </div>
      </div>
    );
              })}
            </div>
          ))}
        </>
      );
    } catch (e) {
      console.error("Error al parsear el JSON del menú semanal guardado:", e);
      menuSemanalContent = (<p style={{ color: "red" }}>No se pudo cargar el menú semanal guardado.</p>);
    }
  }

  // Renderizado del componente Perfil
  return (
    <div style={styles.container}>
      <h2 style={styles.mainTitle}>Perfil de Usuario</h2>
      {/* Mensajes globales de error/éxito para operaciones del perfil */}
      {error && !error.startsWith('Error al cargar el análisis nutricional') && <p style={{ color: "red", padding: "10px", backgroundColor: "#fff0f0", borderRadius: "5px", marginTop: "10px" }}>{error}</p>}
      {success && <p style={{ color: "green", padding: "10px", backgroundColor: "#f0fff0", borderRadius: "5px", marginTop: "10px" }}>{success}</p>}

      {/* Sección de Información Personal y Edición */}
      <div style={styles.section}> 
        <h3 style={styles.sectionTitle}>Información Personal</h3>
        {/* ... (párrafos de info: usuario, email, edad, genero, altura) ... */} 
        <p><strong>Nombre de usuario:</strong> {perfil.usuario}</p>
        <p><strong>Email:</strong> {perfil.email}</p>
        <p><strong>Edad:</strong> {perfil.edad || "No especificado"}</p>
        <p><strong>Género:</strong> {perfil.genero || "No especificado"}</p>
        <p><strong>Altura:</strong> {perfil.altura ? `${perfil.altura} cm` : "No especificado"}</p>

        <p>
          <strong>Peso:</strong>{" "}
          {editMode ? (
            <input
              type="number"
              name="peso"
              value={editableData.peso}
              onChange={handleEditChange}
              style={styles.inputField} 
            />
          ) : perfil.peso ? (
            `${perfil.peso} kg`
          ) : (
            "No especificado"
          )}
        </p>
        <p>
          <strong>Actividad física:</strong>{" "}
          {editMode ? (
            <select name="actividad" value={editableData.actividad} onChange={handleEditChange} style={styles.inputField}>
              <option value="">Selecciona nivel</option>
              <option value="sedentario">Sedentario</option>
              <option value="ligero">Ligero</option>
              <option value="moderado">Moderado</option>
              <option value="intenso">Intenso</option>
            </select>
          ) : (perfil.actividad || "No especificado")}
        </p>
        <p>
          <strong>Objetivo de peso:</strong>{" "}
          {editMode ? (
            <select name="objetivo" value={editableData.objetivo} onChange={handleEditChange} style={styles.inputField}>
              <option value="">Selecciona objetivo</option>
              <option value="Mantener peso">Mantener peso</option>
              <option value="Subir de peso">Subir de peso</option>
              <option value="Bajar de peso">Bajar de peso</option>
            </select>
          ) : (perfil.objetivo || "No especificado")}
        </p>
        <p><strong>Metabolismo Basal (BMR):</strong> {perfil.bmr ? `${perfil.bmr} kcal` : "No especificado"}</p>
        
        <div style={styles.buttonBox}>
        {editMode ? (
            <>
              <button style={styles.saveButton} onClick={handleSave}>Guardar</button>
              <button style={styles.cancelButton} onClick={() => setEditMode(false)}>Cancelar</button>
            </>
        ) : (
          <div style={{...styles.buttonBox, marginTop: "20px", marginBottom: "20px"}}>
            <button onClick={() => setEditMode(true)}>Editar</button>
          </div>
        )}
        </div>
      </div>

      {/* Sección de Recetas Favoritas */} 
      {recetasFavoritasDisplay}
      {hayRecetasSinURL && (
        <div style={{...styles.buttonBox, marginTop: '10px' }}>
            <button onClick={handleAttemptFixFavorites} style={styles.fixButton}>
                Intentar Reparar Favoritas Sin URL (Experimental)
            </button>
        </div>
      )}

      {/* Sección del Menú Semanal Guardado */}
      {menuSemanalContent && (
        <div style={styles.menuContainer}>
          <h3 style={styles.menuTitle}>Menú Semanal Guardado</h3>
          {menuSemanalContent}
          {/* Botones de exportación para el menú guardado */}
          <div style={{ ...styles.buttonBox, marginTop: '20px', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <button 
              onClick={exportarMenuGuardadoTXT}
              disabled={!perfil || !perfil.last_generated_menu_json}
              style={{padding: '8px 12px'}}
            >
              Exportar Menú Guardado (.txt)
            </button>
            <button 
              onClick={handleExportarListaCompraPerfil}
              disabled={!perfil || !perfil.last_generated_menu_json || loadingShoppingListPerfil}
              style={{padding: '8px 12px'}}
            >
              {loadingShoppingListPerfil ? "Generando y Exportando..." : "Exportar Lista de Compra (.txt)"}
            </button>
          </div>
          {errorShoppingListPerfil && <p style={{color: 'red', textAlign: 'center', marginTop: '10px'}}>{errorShoppingListPerfil}</p>}
        </div>
      )}
      {!menuSemanalContent && perfil && (
         <div style={styles.menuContainer}>
            <h3 style={styles.menuTitle}>Menú Semanal Guardado</h3>
            <p>No hay un menú semanal guardado actualmente.</p>
         </div>
      )}

      {/* Nueva Sección de Análisis Nutricional */}
      {/* Solo se muestra si hay un menú guardado que se pueda analizar */}
      {perfil && perfil.last_generated_menu_json && (
        <div style={styles.menuContainer}>
          <h3 style={styles.menuTitle}>Análisis Nutricional del Menú Semanal</h3>
          {loadingAnalisis && <p style={{textAlign: 'center'}}>Cargando análisis nutricional...</p>}
          {errorAnalisis && <p style={{ color: "red", textAlign: 'center' }}>{errorAnalisis}</p>}
          {analisisNutricional && !loadingAnalisis && !errorAnalisis && (
            <div>
              {/* Resumen Semanal */}
              {analisisNutricional.analisisSemanal && (
                <div style={{...styles.daySection, paddingBottom: '10px', marginBottom: '15px'}}> 
                  <h4 style={{...styles.dayTitle, fontSize: '1.2em'}}>Resumen Semanal</h4>
                  {/* Nueva presentación más visual para el resumen semanal */}
                  <div style={styles.summaryGrid}>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Calorías Totales:</span>
                      <span style={styles.summaryValue}>{analisisNutricional.analisisSemanal.totalCalorias?.toFixed(0)} kcal</span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Promedio Calorías/Día:</span>
                      <span style={styles.summaryValue}>{analisisNutricional.analisisSemanal.promedioCaloriasDia?.toFixed(0)} kcal ({analisisNutricional.analisisSemanal.diasConDatos} días)</span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Proteínas (Total | Promedio/Día):</span>
                      <span style={styles.summaryValue}>
                        {analisisNutricional.analisisSemanal.macronutrientes?.total_proteinas_g?.toFixed(0)} g | {analisisNutricional.analisisSemanal.macronutrientes?.promedio_proteinas_g_dia?.toFixed(0)} g
                      </span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Grasas (Total | Promedio/Día):</span>
                      <span style={styles.summaryValue}>
                        {analisisNutricional.analisisSemanal.macronutrientes?.total_grasas_g?.toFixed(0)} g | {analisisNutricional.analisisSemanal.macronutrientes?.promedio_grasas_g_dia?.toFixed(0)} g
                      </span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Carbohidratos (Total | Promedio/Día):</span>
                      <span style={styles.summaryValue}>
                        {analisisNutricional.analisisSemanal.macronutrientes?.total_carbohidratos_g?.toFixed(0)} g | {analisisNutricional.analisisSemanal.macronutrientes?.promedio_carbohidratos_g_dia?.toFixed(0)} g
                      </span>
                    </div>
                  </div>

                  {/* Gráfico de Distribución de Macronutrientes (Promedio Semanal) */}
                  {analisisNutricional.analisisSemanal && analisisNutricional.analisisSemanal.promedioCaloriasDia > 0 && (
                    <div className="macro-distribution-chart-container">
                      <h5>Distribución Calórica de Macronutrientes (Promedio Diario)</h5>
                      {(() => {
                        // Leer directamente de analisisSemanal.macronutrientes y analisisSemanal.promedioCaloriasDia
                        const macrosPromedio = analisisNutricional.analisisSemanal.macronutrientes;
                        // const promedioCaloriasKcal = analisisNutricional.analisisSemanal.promedioCaloriasDia; // Ya está en la condición externa

                        const caloriasProteinas = (macrosPromedio?.promedio_proteinas_g_dia || 0) * 4;
                        const caloriasGrasas = (macrosPromedio?.promedio_grasas_g_dia || 0) * 9;
                        const caloriasCarbohidratos = (macrosPromedio?.promedio_carbohidratos_g_dia || 0) * 4;
                        const totalCaloriasMacros = caloriasProteinas + caloriasGrasas + caloriasCarbohidratos;

                        if (totalCaloriasMacros === 0) {
                          return <p className="info-message">No hay datos de macronutrientes para generar el gráfico.</p>;
                        }
                        
                        const porcentajeProteinasNum = (caloriasProteinas / totalCaloriasMacros) * 100;
                        const porcentajeGrasasNum = (caloriasGrasas / totalCaloriasMacros) * 100;
                        let porcentajeCarbohidratosNum = 100 - porcentajeProteinasNum - porcentajeGrasasNum;
                        if (porcentajeCarbohidratosNum < 0) porcentajeCarbohidratosNum = 0;

                        const gradosProteinas = (porcentajeProteinasNum / 100) * 360;
                        const gradosGrasasFin = gradosProteinas + (porcentajeGrasasNum / 100) * 360;

                        const pieChartStyle = {
                          backgroundImage: `conic-gradient(\n                            var(--protein-color, #FF6384) 0deg ${gradosProteinas.toFixed(2)}deg,\n                            var(--fat-color, #FFCD56) ${gradosProteinas.toFixed(2)}deg ${gradosGrasasFin.toFixed(2)}deg,\n                            var(--carb-color, #36A2EB) ${gradosGrasasFin.toFixed(2)}deg 360deg\n                          )`
                        };

                        return (
                          <div className="pie-chart-macros-container">
                            <div className="pie-chart-macros" style={pieChartStyle} title="Distribución calórica de macronutrientes"></div>
                            <ul className="pie-chart-legend">
                              <li>
                                <span className="legend-color-box" style={{ backgroundColor: 'var(--protein-color, #FF6384)' }}></span>
                                Proteínas: {porcentajeProteinasNum.toFixed(1)}% ({macrosPromedio?.promedio_proteinas_g_dia?.toFixed(1) ?? 0}g)
                              </li>
                              <li>
                                <span className="legend-color-box" style={{ backgroundColor: 'var(--fat-color, #FFCD56)' }}></span>
                                Grasas: {porcentajeGrasasNum.toFixed(1)}% ({macrosPromedio?.promedio_grasas_g_dia?.toFixed(1) ?? 0}g)
                              </li>
                              <li>
                                <span className="legend-color-box" style={{ backgroundColor: 'var(--carb-color, #36A2EB)' }}></span>
                                Carbohidratos: {porcentajeCarbohidratosNum.toFixed(1)}% ({macrosPromedio?.promedio_carbohidratos_g_dia?.toFixed(1) ?? 0}g)
                              </li>
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Detalle Diario */}
              {analisisNutricional.analisisDiario && Object.keys(analisisNutricional.analisisDiario).length > 0 && (
                <div style={{marginTop: '20px'}}>
                  <h4 style={{...styles.dayTitle, fontSize: '1.2em'}}>Detalle Diario</h4>
                  {/* Nueva presentación más visual para el detalle diario */}
                  <div style={styles.dailyDetailGrid}>
                    {Object.entries(analisisNutricional.analisisDiario).map(([dia, datosDia]) => (
                      <div key={dia} style={styles.dailyCard}>
                        <h5 style={styles.dailyCardTitle}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</h5>
                        <p style={styles.dailyCardText}>Cal: {datosDia.totalCalorias?.toFixed(0)}</p>
                        <p style={styles.dailyCardText}>Prot: {datosDia.macronutrientes?.proteinas_g?.toFixed(0)}g</p>
                        <p style={styles.dailyCardText}>Grasas: {datosDia.macronutrientes?.grasas_g?.toFixed(0)}g</p>
                        <p style={styles.dailyCardText}>Carbs: {datosDia.macronutrientes?.carbohidratos_g?.toFixed(0)}g</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analisisNutricional.analisisDiario && Object.keys(analisisNutricional.analisisDiario).length === 0 && !loadingAnalisis && (
                 <p style={{textAlign: 'center', fontStyle: 'italic'}}>No hay datos diarios detallados disponibles para el análisis.</p>
              )}
            </div>
          )}
        </div>
      )}
      {/* Mensaje si el perfil cargó, no hay menú json, y no estamos cargando/con error de análisis */}
      {perfil && !perfil.last_generated_menu_json && !loadingAnalisis && !errorAnalisis && (
         <div style={styles.menuContainer}>
            <h3 style={styles.menuTitle}>Análisis Nutricional del Menú Semanal</h3>
            <p style={{textAlign: 'center'}}>No hay un menú semanal guardado para realizar un análisis.</p>
         </div>
      )}

    </div>
  );
};

const styles = {
  container: {
    maxWidth: "600px", // Aumentado para más contenido
    margin: "30px auto",
    padding: "20px",
    // border: "1px solid #ccc", // Quitado borde exterior general
    // borderRadius: "8px", // Quitado borde exterior general
    backgroundColor: "#f0f2f5", // Un color de fondo general más suave
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", // Fuente más moderna
  },
  mainTitle: {
    textAlign: "center",
    marginBottom: "25px",
    color: "#333",
    fontSize: "24px",
  },
  section: { // Estilo para el contenedor de Info Personal
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    marginBottom: "25px",
  },
  sectionTitle: {
    fontSize: "20px",
    color: "#333",
    borderBottom: "2px solid #eee",
    paddingBottom: "10px",
    marginBottom: "15px",
  },
  inputField: {
    width: 'calc(100% - 20px)',
    padding: '8px 10px',
    marginBottom: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  // ... (resto de los estilos: buttonBox, saveButton, editButton, cancelButton, menuContainer, menuTitle, daySection, dayTitle, mealCard, mealImage) ...
  // Asegúrate de que los estilos que faltan aquí de tu código original se mantengan o se adapten.
  // Añado algunos estilos que podrían faltar o necesitar ajustes:
  buttonBox: {
    marginTop: "15px",
    display: "flex",
    // Alineación de botones
  },
  editButton: {
    padding: '10px 15px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 15px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 15px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  fixButton: { // Estilo para el botón de reparar favoritas
    padding: '8px 12px',
    backgroundColor: '#ffc107',
    color: '#212529',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  // Estilos para el gráfico de macros
  macroChartContainer: {
    marginTop: '25px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
  },
  macroChartTitle: {
    fontSize: '1.1em',
    color: '#333',
    marginBottom: '15px',
    textAlign: 'center',
  },
  chartFlexContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '160px', // Altura suficiente para barras y etiquetas
    padding: '10px 0',
  },
  barWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '60px', // Ancho de cada "sección" de barra
  },
  bar: {
    width: '40px', // Ancho de la barra en sí
    borderRadius: '4px 4px 0 0', // Bordes redondeados arriba
    transition: 'height 0.5s ease-out',
    marginBottom: '5px', // Espacio entre barra y etiqueta inferior
  },
  proteinBarColor: { backgroundColor: '#3498db' }, // Azul
  fatBarColor: { backgroundColor: '#e67e22' },     // Naranja
  carbBarColor: { backgroundColor: '#2ecc71' },    // Verde
  barLabelTop: {
    fontSize: '0.8em',
    color: '#555',
    marginBottom: '3px',
  },
  barLabelBottom: {
    fontSize: '0.85em',
    color: '#333',
    marginTop: '3px',
  },
  // Estilos para menuContainer y su contenido (ya existentes, pero asegúrate que estén completos)
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
  daySection: { // Usado para el Menú Semanal y el Análisis Diario
    marginBottom: "15px", // Reducido un poco el margen inferior
    // No necesita borde inferior aquí si dayTitle lo tiene
  },
  dayTitle: { // Usado para el título del día en Menú Semanal y Análisis
    fontSize: "18px",
    color: "#444",
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: "6px",
    marginBottom: "10px",
  },
  mealCard: { // Usado para cada comida en el Menú Semanal
    display: "flex",
    gap: "15px",
    alignItems: "center",
    marginBottom: "15px",
    backgroundColor: "#f8f9fa",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #e9ecef",
  },
  mealImage: {
    width: "80px", // Ligeramente más grande
    height: "80px",
    objectFit: "cover",
    borderRadius: "6px", // Bordes redondeados para la imagen
  },
  // Nuevos estilos para la presentación de resumen y detalle diario
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr', // Una columna para móviles
    gap: '8px',
    fontSize: '0.9em',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  summaryLabel: {
    fontWeight: 'bold',
    color: '#555',
  },
  summaryValue: {
    color: '#333',
    textAlign: 'right',
  },
  dailyDetailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', // Columnas responsivas
    gap: '15px',
    marginTop: '10px',
  },
  dailyCard: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    padding: '12px',
    textAlign: 'center',
  },
  dailyCardTitle: {
    fontSize: '1em',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
    borderBottom: '1px solid #eee',
    paddingBottom: '5px',
  },
  dailyCardText: {
    fontSize: '0.85em',
    color: '#555',
    margin: '3px 0',
  },
};

export default Perfil;

