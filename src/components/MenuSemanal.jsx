import { useState, useEffect } from "react";
import axios from "axios";
import React from "react";
import "./MenuSemanal.css"; // Importamos el archivo CSS para los estilos
import "./Perfil.jsx";
import "./salidaIA.css";
import SelectorIngredientes from "./SelectorIngredientes";
import { BACKEND_URL } from '../config';


export default function MenuForm() {
  const [formData, setFormData] = useState({
    calories: 2000,
    diet: "",
    health: [],
    excluded: "",
    included: "",
    meals: ["desayuno", "comida", "cena"],
    meal_ratios: { desayuno: 0.3, comida: 0.4, cena: 0.3 },
    totalValid: true,
    num_options_per_meal: 3, // NUEVO: Valor por defecto para el número de opciones
  });

  // const [menu, setMenu] = useState(null); // REEMPLAZADO por generatedMenuWithOptions y selectedMenu
  const [generatedMenuWithOptions, setGeneratedMenuWithOptions] =
    useState(null); // Para la respuesta del backend
  const [selectedMenu, setSelectedMenu] = useState({}); // Para las elecciones del usuario

  const [loading, setLoading] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [alternativas, setAlternativas] = useState({});
  const [alternativaVisiblePara, setAlternativaVisiblePara] = useState(null);
  const [error, setError] = useState(null);
  const [incluir, setIncluir] = useState([]);
  const [excluir, setExcluir] = useState([]);
  const [shoppingList, setShoppingList] = useState(null);
  const [esFavorita, setEsFavorita] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [recetasFavoritas, setRecetasFavoritas] = useState(new Set());
  // const [esFavorita, setEsFavorita] = useState(null); // REEMPLAZADO por recetasFavoritas
  const [guardandoFavorito, setGuardandoFavorito] = useState(false); // Loader para acción de favorito


  // Efecto para inicializar/actualizar selectedMenu cuando generatedMenuWithOptions cambia
  useEffect(() => {
    if (generatedMenuWithOptions) {
      const initialSelected = {};
      // Usar un orden de días consistente, ej. el del backend o uno fijo
      const daysOrder = [
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
        "domingo",
      ];

      daysOrder.forEach((dayKey) => {
        // diaKey ej. "lunes", "miércoles"
        const dayDataFromServer =
          generatedMenuWithOptions[dayKey] ||
          generatedMenuWithOptions[dayKey.replace("é", "e").replace("á", "a")]; // Considerar alias del backend

        if (dayDataFromServer) {
          initialSelected[dayKey] = {};
          formData.meals.forEach((mealType) => {
            // mealType ej. "desayuno"
            const mealSlotData = dayDataFromServer[mealType]; // mealSlotData es MealSlotWithOptions
            if (
              mealSlotData &&
              mealSlotData.options &&
              mealSlotData.options.length > 0
            ) {
              initialSelected[dayKey][mealType] = mealSlotData.options[0]; // Default: primera opción
            } else if (mealSlotData && mealSlotData.error) {
              initialSelected[dayKey][mealType] = {
                error: mealSlotData.error,
                label: "Error",
                ingredients: [],
                calories: 0,
              }; // Placeholder para error
            } else {
              initialSelected[dayKey][mealType] = null; // No hay opciones ni error
            }
          });
        }
      });
      setSelectedMenu(initialSelected);
    } else {
      setSelectedMenu({});
    }
  }, [generatedMenuWithOptions, formData.meals]);

  const sugerirAlternativaSaludable = async (
    mealId,
    nombreComida,
    ingredientesComida
  ) => {
    try {
      const prompt = `Sugiere una alternativa más saludable a esta receta: "${nombreComida}" (ingredientes: ${ingredientesComida.join(
        ", "
      )}).
La nueva receta debe tener menos calorías, grasas o azúcares.
Responde únicamente con el siguiente formato exacto, sin explicaciones adicionales:
NUEVO_NOMBRE_RECETA :: INGREDIENTE_1, INGREDIENTE_2, INGREDIENTE_3 :: CALORIAS_ESTIMADAS
Donde CALORIAS_ESTIMADAS es solo un número (ej: Ensalada César Saludable :: Pollo a la parrilla, Lechuga romana, Aderezo ligero :: 350).`;

      const res = await fetch(`${BACKEND_URL}/ia/alternativa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (data.resultado) {
        setAlternativas((prev) => ({ ...prev, [mealId]: data.resultado }));
        setAlternativaVisiblePara(mealId); // Mostrar la alternativa para esta comida específica
      } else {
        console.error("La API no devolvió un resultado para la alternativa.");
        // Aquí podrías establecer un mensaje de error específico para esta alternativa
      }
      console.log("Respuesta de la API para alternativa:", data);
    } catch (error) {
      console.error("Error generando alternativa saludable:", error);
      // Aquí podrías establecer un mensaje de error específico para esta alternativa
    } finally {
      setLoading(false); // Finaliza el loader
    }
  };

  const aplicarAlternativa = (mealId, dia, tipo) => {
    const alternativaTexto = alternativas[mealId];
    if (!alternativaTexto) return;

    let nuevoNombre = "Alternativa Saludable"; // Nombre por defecto
    let nuevosIngredientes = [];
    let nuevasCalorias = null; // Calorías por defecto o si no se pueden parsear

    // Parsear la respuesta de la IA: "NOMBRE_RECETA :: ING1, ING2 :: CALORIAS"
    const parts = alternativaTexto.split(" :: ");
    if (parts.length === 3) {
      nuevoNombre = parts[0].trim();
      nuevosIngredientes = parts[1]
        .split(",")
        .map((ing) => ing.trim())
        .filter((ing) => ing);
      const caloriasParseadas = parseInt(parts[2].trim(), 10);
      if (!isNaN(caloriasParseadas)) {
        nuevasCalorias = caloriasParseadas;
      } else {
        console.warn(`Calorías no numéricas recibidas: ${parts[2].trim()}`);
      }
    } else {
      console.warn(
        `Formato de alternativa inesperado: ${alternativaTexto}. Se usará la cadena completa como nombre y sin ingredientes/calorías específicas.`
      );
      // Fallback: si el formato no es el esperado, podrías intentar un parseo más simple
      // o simplemente usar el texto como nombre y mantener ingredientes/calorías originales o un placeholder.
      // Por simplicidad, aquí solo se actualiza el nombre si el parseo falla.
      nuevoNombre = alternativaTexto; // O alguna otra lógica de fallback
      // nuevosIngredientes y nuevasCalorias permanecerán como sus valores por defecto/originales.
    }

    setSelectedMenu((prevSelectedMenu) => {
      const nuevoMenu = JSON.parse(JSON.stringify(prevSelectedMenu)); // Deep copy
      const comidaOriginal = nuevoMenu[dia]?.[tipoComida];
      if (comidaOriginal) {
        nuevoMenu[dia][tipoComida] = {
          ...comidaOriginal, // Mantener url, image, etc., de la opción original
          label: nuevoNombre,
          ingredients:
            nuevosIngredientes.length > 0
              ? nuevosIngredientes
              : comidaOriginal.ingredients || [],
          calories:
            nuevasCalorias !== null
              ? Math.round(nuevasCalorias)
              : comidaOriginal.calories || 0,
          esAlternativa: true, // Marcar como alternativa
          // Podrías querer limpiar la imagen/URL si la receta es muy diferente:
          // image: urlDePlaceholderAlternativa,
          // url: "#alternativa-aplicada",
        };
      }
      return nuevoMenu;
    });

    // Limpiar la alternativa guardada y ocultar la tarjeta
    setAlternativas((prev) => {
      const upd = { ...prev };
      delete upd[mealSlotId];
      return upd;
    });
    setAlternativaVisiblePara(null);
  };

  const cerrarAlternativa = () => {
    setAlternativaVisiblePara(null);
  };
  useEffect(() => {
    const fetchPerfil = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${BACKEND_URL}/perfil`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setPerfil(data);
        } else {
          const errorData = await res.json();
          setError(errorData.detail || "No se pudo obtener el perfil.");
        }
      } catch {}
    };

    fetchPerfil();
  }, []);

  const updateTotalValid = (meal_ratios) => {
    const total = Object.values(meal_ratios).reduce(
      (a, b) => a + parseFloat(b || 0),
      0
    );
    return Math.abs(total - 1) < 0.01;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let processedValue = value;
    if (
      type === "number" ||
      name === "calories" ||
      name === "num_options_per_meal"
    ) {
      processedValue = parseInt(value, 10);
      if (
        name === "num_options_per_meal" &&
        (processedValue < 1 || processedValue > 4)
      ) {
        // Opcional: clamp value or show error, for now just let it be, backend will cap.
        // For better UX, you might want to prevent invalid numbers here.
      }
    }
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handleCheckbox = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const health = new Set(prev.health);
      checked ? health.add(value) : health.delete(value);
      return { ...prev, health: Array.from(health) };
    });
  };
  const fetchMenu = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      // Si no hay token, redirige al login o muestra un error
      return;
    }

    const response = await fetch(`${BACKEND_URL}/generate-weekly-menu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(menuRequestData), // Aquí envías los datos que necesitas para generar el menú
    });

    const data = await response.json();
    if (response.ok) {
      // Maneja los datos del menú semanal
    } else {
      console.error("Error al generar el menú:", data);
    }
  };
  const handleMealChange = (index, field, fieldValue) => {
    setFormData((prev) => {
      const newMealsArray = [...prev.meals];
      const newRatiosObject = { ...prev.meal_ratios };
      const oldMealName = newMealsArray[index];

      if (field === "name") {
        newMealsArray[index] = fieldValue;
        if (oldMealName !== fieldValue && oldMealName !== undefined) {
          // Nombre realmente cambiado
          newRatiosObject[fieldValue] = newRatiosObject[oldMealName];
          delete newRatiosObject[oldMealName];
        }
      } else if (field === "ratio") {
        // Asegurarse que el nombre del ratio es el actual en el array de meals
        newRatiosObject[newMealsArray[index]] = parseFloat(fieldValue);
      }
      return {
        ...prev,
        meals: newMealsArray,
        meal_ratios: newRatiosObject,
        totalValid: updateTotalValid(newRatiosObject),
      };
    });
  };

  const addMeal = () => {
    setFormData((prev) => {
      const newMealName = `comidaExtra${prev.meals.length + 1}`;
      const newMealsArray = [...prev.meals, newMealName];
      const newRatiosObject = { ...prev.meal_ratios, [newMealName]: 0.1 }; // Ratio por defecto para nueva comida
      return {
        ...prev,
        meals: newMealsArray,
        meal_ratios: newRatiosObject,
        totalValid: updateTotalValid(newRatiosObject),
      };
    });
  };

  const removeMeal = (indexToRemove) => {
    setFormData((prev) => {
      const mealNameToRemove = prev.meals[indexToRemove];
      const newMealsArray = prev.meals.filter((_, i) => i !== indexToRemove);
      const newRatiosObject = { ...prev.meal_ratios };
      delete newRatiosObject[mealNameToRemove];
      return {
        ...prev,
        meals: newMealsArray,
        meal_ratios: newRatiosObject,
        totalValid: updateTotalValid(newRatiosObject),
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.totalValid) {
      setError("Las proporciones de las comidas deben sumar 100%.");
      return;
    }
    setLoading(true);
    setGeneratedMenuWithOptions(null); // Limpiar menú anterior con opciones
    setSelectedMenu({}); // Limpiar selecciones
    setShoppingList(null); // Limpiar lista de compra
    setError(null); // Limpiar errores previos

    const token = localStorage.getItem("token");

    const payload = {
      calories: formData.calories, // Ya es number por handleChange o se parsea en backend
      diet: formData.diet || undefined, // Enviar undefined si está vacío
      health: formData.health, // Ya es un array
      excluded: excluir, // Usar estado 'excluir' (array)
      included: incluir, // Usar estado 'incluir' (array)
      meals: formData.meals,
      meal_ratios: formData.meal_ratios,
      num_options_per_meal: formData.num_options_per_meal, // Nuevo campo
    };
    console.log("Payload a enviar:", JSON.stringify(payload, null, 2));
    try {
      const res = await axios.post(
        `${BACKEND_URL}/generate-weekly-menu`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }, // Enviar token si existe
        }
      );
      // console.log("Respuesta del backend (menú con opciones):", res.data);
      const menuData = res.data;
      setGeneratedMenuWithOptions(res.data);
      // Llamada para actualizar el perfil con el último menú generado
      await axios.post(
        `${BACKEND_URL}/guardar-menu`,
        {
          menu: menuData,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Ahora puedes guardar el menú también en el perfil del frontend si lo deseas
      setPerfil((prevPerfil) => ({
        ...prevPerfil,
        menu: menuData,
      }));
    } catch (err) {
      console.error(
        "Error generando el menú:",
        err.response?.data || err.message || err
      );
      setError(
        err.response?.data?.detail ||
          "Error generando el menú. Inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };
  // Nueva función para manejar la selección de una opción de comida
  const handleSelectMealOption = (dayKey, mealType, recipeOption) => {
    setSelectedMenu((prevSelectedMenu) => ({
      ...prevSelectedMenu,
      [dayKey]: {
        ...(prevSelectedMenu[dayKey] || {}),
        [mealType]: recipeOption,
      },
    }));
    // Opcional: limpiar alternativa si se cambia de opción
    const mealSlotId = `${dayKey}-${mealType}`;
    if (alternativaVisiblePara === mealSlotId) {
      cerrarAlternativa();
      setAlternativas((prev) => {
        const upd = { ...prev };
        delete upd[mealSlotId];
        return upd;
      });
    }
  };

  const fetchShoppingList = async () => {
    if (!selectedMenu || Object.keys(selectedMenu).length === 0) {
      setError(
        "Primero genera un menú y asegúrate de que todas las comidas deseadas estén seleccionadas."
      );
      return;
    }
    // Validación adicional: asegurarse que no hay 'null' o slots con error en selectedMenu
    for (const dayKey in selectedMenu) {
      for (const mealType in selectedMenu[dayKey]) {
        if (
          !selectedMenu[dayKey][mealType] ||
          selectedMenu[dayKey][mealType].error
        ) {
          setError(
            `Por favor, selecciona una opción válida para ${mealType} el ${dayKey}.`
          );
          return;
        }
      }
    }

    const token = localStorage.getItem("token");
    // No es necesario bloquear si no hay token, el backend puede manejarlo o ser público para esta acción
    // if (!token) { setError("Necesitas estar autenticado..."); return; }

    setLoading(true);
    setError(null);
    setShoppingList(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/generate-shopping-list`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Enviar token si existe
          },
          body: JSON.stringify({ menu: selectedMenu }), // Enviar el `selectedMenu`
        }
      );
      const data = await response.json();
      if (response.ok) {
        setShoppingList(data);
      } else {
        setError(
          data.detail ||
            "Error al generar la lista de compras desde el servidor."
        );
      }
    } catch (err) {
      console.error("Error de conexión al generar la lista de compras:", err);
      setError("Error de conexión al generar la lista de compras.");
    } finally {
      setLoading(false);
    }
  };

  function simpleMarkdownToHTML(text) {
    if (!text) return "";

    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    const lines = text.split("\n");

    let html = "";
    let inUL = false;
    let inOL = false;
    let inTable = false;
    let tableBuffer = [];

    const flushList = () => {
      if (inUL) {
        html += "</ul>";
        inUL = false;
      }
      if (inOL) {
        html += "</ol>";
        inOL = false;
      }
    };

    const flushTable = () => {
      if (!inTable || tableBuffer.length < 2) return;
      const headers = tableBuffer[0]
        .split("|")
        .map((h) => h.trim())
        .filter(Boolean);
      const rows = tableBuffer.slice(2).map((row) =>
        row
          .split("|")
          .map((cell) => cell.trim())
          .filter(Boolean)
      );

      html += "<table><thead><tr>";
      headers.forEach((header) => {
        html += `<th>${header}</th>`;
      });
      html += "</tr></thead><tbody>";
      rows.forEach((row) => {
        html += "<tr>";
        row.forEach((cell) => {
          html += `<td>${cell}</td>`;
        });
        html += "</tr>";
      });
      html += "</tbody></table>";
      tableBuffer = [];
      inTable = false;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Tabla Markdown
      if (trimmed.startsWith("|")) {
        flushList();
        inTable = true;
        tableBuffer.push(trimmed);
        return;
      }

      if (inTable && trimmed.match(/^\|?\s*-{2,}/)) {
        tableBuffer.push(trimmed);
        return;
      }

      if (inTable && trimmed.startsWith("|")) {
        tableBuffer.push(trimmed);
        return;
      }

      flushTable();

      // Lista no ordenada
      if (/^\*\s+/.test(trimmed)) {
        if (!inUL) {
          flushList();
          html += "<ul>";
          inUL = true;
        }
        html += `<li>${trimmed.replace(/^\*\s+/, "")}</li>`;
      }

      // Lista ordenada
      else if (/^\d+\.\s+/.test(trimmed)) {
        if (!inOL) {
          flushList();
          html += "<ol>";
          inOL = true;
        }
        html += `<li>${trimmed.replace(/^\d+\.\s+/, "")}</li>`;
      }

      // Título tipo “Título: valor”
      else if (trimmed.includes(":") && trimmed.indexOf(":") < 40) {
        flushList();
        const [key, ...rest] = trimmed.split(":");
        const value = rest.join(":").trim();
        html += `<p><strong>${key}:</strong> ${value}</p>`;
      }

      // Título de sección
      else if (
        /^(Nueva Receta|Instrucciones|Ingredientes|Información Nutricional|Diferencias con la Receta Original|Imagen Visual Sugerida)/.test(
          trimmed
        )
      ) {
        flushList();
        html += `<h4>${trimmed}</h4>`;
      }

      // Línea vacía
      else if (trimmed === "") {
        flushList();
      }

      // Otro texto
      else {
        flushList();
        html += `<p>${trimmed}</p>`;
      }
    });

    flushList();
    flushTable();

    return `<div>${html}</div>`;
  }

  function exportarMenuSemanalTXT() {
    // Ahora usa selectedMenu
    if (!selectedMenu || Object.keys(selectedMenu).length === 0) {
      alert("No hay menú seleccionado para exportar.");
      return;
    }
    let texto = "📅 Menú Semanal Seleccionado\n\n";
    const daysOrder = [
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
      "domingo",
    ];

    daysOrder.forEach((diaKey) => {
      // diaKey ej. "lunes", "miércoles"
      const comidasDelDia = selectedMenu[diaKey];
      if (comidasDelDia) {
        texto += `📌 ${diaKey.toUpperCase()}\n`;
        formData.meals.forEach((tipoComida) => {
          // tipoComida ej. "desayuno"
          const comidaSeleccionada = comidasDelDia[tipoComida];
          if (
            comidaSeleccionada &&
            !comidaSeleccionada.error &&
            comidaSeleccionada.label
          ) {
            texto += `- ${tipoComida}: ${comidaSeleccionada.label}\n`;
            if (comidaSeleccionada.calories) {
              texto += `  Calorías: ${Math.round(
                comidaSeleccionada.calories
              )} kcal\n`;
            }
            if (comidaSeleccionada.esAlternativa) {
              texto += `  (Alternativa saludable aplicada)\n`;
            }
          } else if (comidaSeleccionada && comidaSeleccionada.error) {
            texto += `- ${tipoComida}: ${comidaSeleccionada.error}\n`;
          } else {
            texto += `- ${tipoComida}: (No seleccionada o sin opciones)\n`;
          }
        });
        texto += "\n";
      }
    });

    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "menu_semanal_seleccionado.txt";
    link.click();
    URL.revokeObjectURL(link.href); // Limpiar
  }
  function exportarListaCompraTXT(shoppingList) {
    let texto = "🛒 Lista de la Compra\n\n";

    for (const [ingrediente, cantidad] of Object.entries(shoppingList)) {
      let cantidadStr = "";
      if (typeof cantidad === "number") {
        cantidadStr = cantidad.toFixed(2);
      } else if (typeof cantidad === "object" && cantidad.amount) {
        cantidadStr = `${cantidad.amount.toFixed(2)} ${cantidad.unit || ""}`;
      }

      texto += `- ${ingrediente}: ${cantidadStr}\n`;
    }

    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "lista_de_la_compra.txt";
    link.click();
  }

  

    const guardarComoFavorita = async (receta) => {
      setGuardando(true);
      setError(null);
      
      console.log("receta label",receta.label)
      const token = localStorage.getItem("token");
      try {
        await axios.post(`${BACKEND_URL}/guardar-favorita`, receta, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Receta guardada como favorita.");
        setEsFavorita("true");
      } catch (error) {
        console.error("Error guardando favorita:", error);
        setError("No se pudo guardar como favorita.");
      } finally {
        setGuardando(false);
      }
    };
  
    const toggleFavoritoHandler = async (recipeOption) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Debes iniciar sesión para guardar recetas favoritas.");
        return;
      }
      if (!recipeOption || !recipeOption.url) { // Usar URL como identificador único robusto
        console.error("Intento de marcar como favorita una receta sin URL:", recipeOption);
        setError("Esta receta no se puede marcar como favorita (falta identificador).");
        return;
      }
  
      const recipeId = recipeOption.url; // El identificador único de la receta
      const esActualmenteFavorita = recetasFavoritas.has(recipeId);
  
      setGuardandoFavorito(true); // Activar loader específico para esta acción
      setError(null);
  
      try {
        if (esActualmenteFavorita) {
          // ELIMINAR de favoritos
          await axios.post(`${BACKEND_URL}/eliminar-favorita`, 
            { recipe_url: recipeId }, // El backend necesita el identificador para saber cuál eliminar
            { headers: { Authorization: `Bearer ${token}` } }
          );
          alert("Receta eliminada como favorita.");
        } else {
          // AÑADIR a favoritos
          // Enviar suficientes datos para que el backend pueda guardarla si es necesario
          const payloadFavorito = {
              recipe_url: recipeOption.url,
              label: recipeOption.label,
              image: recipeOption.image,
              calories: recipeOption.calories,
              ingredients: recipeOption.ingredients,
              // Añade cualquier otro campo de recipeOption que quieras guardar en el backend
          };
          await axios.post(`${BACKEND_URL}/guardar-favorita`, 
              payloadFavorito,
              { headers: { Authorization: `Bearer ${token}` } }
          );
          alert("Receta guardada como favorita.");
        }
  
        // Actualizar el estado local (actualización optimista o tras confirmación)
        setRecetasFavoritas(prevFavoritas => {
          const nuevasFavoritas = new Set(prevFavoritas);
          if (esActualmenteFavorita) {
            nuevasFavoritas.delete(recipeId);
          } else {
            nuevasFavoritas.add(recipeId);
          }
          // Opcional: guardar en localStorage para persistencia simple si no hay carga desde backend
          // localStorage.setItem('misRecetasFavoritas', JSON.stringify(Array.from(nuevasFavoritas)));
          return nuevasFavoritas;
        });
  
      } catch (error) {
        console.error("Error al actualizar estado de favorito:", error.response?.data || error.message);
        setError("No se pudo actualizar el estado de favorito. Inténtalo de nuevo.");
        // Aquí podrías revertir el cambio optimista si la UI se actualizó antes y la llamada falló
      } finally {
        setGuardandoFavorito(false);
      }
    };  

  return (
    <div className="main-wrapper">
      <div className="form-container">
        <h2>Generar Menú Semanal Personalizado</h2>
        {perfil?.bmr && (
          <div className="metabolismo-info">
            <p>
              Tu TMB es de <strong>{perfil.bmr} kcal</strong>. Ajusta tus
              calorías deseadas:
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {/* Calorías */}
          <label
            htmlFor="caloriesInput"
            style={{ display: "block", marginBottom: "10px" }}
          >
            Calorías máximas diarias: <span>{formData.calories} kcal</span>
            <input
              id="caloriesInput"
              type="range"
              min="1000"
              max="4000"
              step="50"
              value={formData.calories}
              name="calories"
              onChange={handleChange}
              className="slider"
            />
          </label>

          {/* Número de Opciones */}
          <label
            htmlFor="numOptionsInput"
            style={{ display: "block", marginBottom: "10px" }}
          >
            Opciones por comida (1-4):
            <input
              id="numOptionsInput"
              type="number"
              name="num_options_per_meal"
              value={formData.num_options_per_meal}
              min="1"
              max="4"
              onChange={handleChange}
              style={{ width: "60px", marginLeft: "10px" }}
            />
          </label>

          {/* Dieta */}
          <label
            htmlFor="dietSelect"
            style={{ display: "block", marginBottom: "10px" }}
          >
            Tipo de Dieta:
            <select
              id="dietSelect"
              name="diet"
              value={formData.diet}
              onChange={handleChange}
            >
              <option value="">Cualquiera</option>
              <option value="balanced">Equilibrada</option>
              <option value="high-fiber">Alta en Fibra</option>
              <option value="high-protein">Alta en Proteína</option>
              <option value="low-carb">Baja en Carbohidratos</option>
              <option value="low-fat">Baja en Grasa</option>
              <option value="low-sodium">Baja en Sodio</option>
            </select>
          </label>

          {/* Restricciones de Salud (Intolerancias) */}
          <fieldset
            style={{
              marginBottom: "15px",
              padding: "10px",
              border: "1px solid #ccc",
            }}
          >
            <legend>Restricciones de Salud / Alergias:</legend>
            {[
              { label: "Sin Gluten", value: "gluten-free" },
              { label: "Vegano", value: "vegan" },
              { label: "Vegetariano", value: "vegetarian" },
              { label: "Sin Lácteos", value: "dairy-free" },
              { label: "Sin Huevo", value: "egg-free" },
              { label: "Sin Cacahuetes", value: "peanut-free" },
              { label: "Sin Frutos Secos de Árbol", value: "tree-nut-free" },
              { label: "Sin Soja", value: "soy-free" },
              { label: "Sin Pescado", value: "fish-free" },
              { label: "Sin Marisco", value: "shellfish-free" },
              // Puedes añadir más de la lista de Edamam: alcohol-free, celery-free, crustacean-free, lupine-free, mustard-free, pork-free, red-meat-free, sesame-free, wheat-free, etc.
            ].map((opt) => (
              <label
                key={opt.value}
                style={{
                  marginRight: "15px",
                  display: "inline-block",
                  fontSize: "0.9em",
                }}
              >
                <input
                  type="checkbox"
                  name="health"
                  value={opt.value}
                  checked={formData.health.includes(opt.value)}
                  onChange={handleCheckbox}
                />{" "}
                {opt.label}
              </label>
            ))}
          </fieldset>

          {/* Selector de Ingredientes (Incluir/Excluir) */}
          <div style={{ marginBottom: "15px" }}>
            <SelectorIngredientes
              onIncludeChange={setIncluir}
              onExcludeChange={setExcluir}
            />
          </div>

          {/* Comidas y Proporciones */}
          <h4>Comidas y proporciones de calorías:</h4>
          {formData.meals.map((mealName, index) => (
            <div key={mealName + index} className="meal-section">
              <input
                type="text"
                value={mealName}
                onChange={(e) =>
                  handleMealChange(index, "name", e.target.value)
                }
                className="meal-name"
                placeholder="Nombre Ej: Desayuno"
              />
              <div>
                <div className="input-row">
                  <label>Proporción ({mealName}):</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.meal_ratios[mealName] || 0}
                    onChange={(e) =>
                      handleMealChange(index, "ratio", e.target.value)
                    }
                    className={`slider ${
                      !formData.totalValid ? "invalid-slider" : ""
                    }`}
                  />{" "}
                </div>

                <span>
                  {((formData.meal_ratios[mealName] || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeMeal(index)}
                style={{ marginLeft: "10px", padding: "5px 8px" }}
              >
                Eliminar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addMeal}
            style={{ marginRight: "10px", marginTop: "5px" }}
          >
            Añadir tipo de comida
          </button>
          {!formData.totalValid && (
            <p
              className="error-message"
              style={{ color: "red", marginTop: "5px" }}
            >
              Las proporciones deben sumar 100% (Actual:{" "}
              {(
                Object.values(formData.meal_ratios).reduce(
                  (a, b) => a + parseFloat(b || 0),
                  0
                ) * 100
              ).toFixed(0)}
              %)
            </p>
          )}
          <br />
          <br />
          <button
            type="submit"
            disabled={!formData.totalValid || loading}
            style={{ padding: "10px 15px", fontSize: "1.1em" }}
          >
            {loading ? "Generando Menú..." : "Generar Menú con Opciones"}
          </button>
        </form>

        {error && (
          <p
            className="error-message"
            style={{
              color: "red",
              border: "1px solid red",
              padding: "10px",
              marginTop: "15px",
              borderRadius: "4px",
            }}
          >
            {error}
          </p>
        )}

        {/* --- Loader Principal --- */}
        {loading && !generatedMenuWithOptions && (
          <div
            className="loading"
            style={{ textAlign: "center", padding: "20px" }}
          >
            <p>Buscando opciones de menú... esto puede tardar un momento.</p>
            <div className="spinner"></div>{" "}
            {/* Asegúrate de tener estilos CSS para .spinner */}
          </div>
        )}

        {/* --- Visualización del Menú con Opciones --- */}
        {generatedMenuWithOptions && !loading && (
          <>
            <h3
              style={{
                marginTop: "30px",
                borderBottom: "1px solid #ccc",
                paddingBottom: "10px",
              }}
            >
              Menú Semanal Generado con Opciones:
            </h3>
            <p>
              Elige una opción para cada comida. La primera opción está
              seleccionada por defecto.
            </p>
            <div className="menu-grid">
              {" "}
              {/* Necesitarás estilos CSS para .menu-grid */}
              {[
                "lunes",
                "martes",
                "miercoles",
                "jueves",
                "viernes",
                "sabado",
                "domingo",
              ].map((diaKey) => {
                const dayData =
                  generatedMenuWithOptions[diaKey] ||
                  generatedMenuWithOptions[
                    diaKey.replace("é", "e").replace("á", "a")
                  ]; // Considerar alias
                if (!dayData)
                  return (
                    <div key={diaKey} className="day-card empty">
                      <h4>{diaKey.toUpperCase()}</h4>
                      <p>No hay datos para este día.</p>
                    </div>
                  );

                return (
                  <div key={diaKey} className="day-card">
                    {" "}
                    {/* Necesitarás estilos CSS para .day-card */}
                    <h4>{diaKey.toUpperCase()}</h4>
                    {formData.meals.map((tipoComida) => {
                      // Iterar sobre los tipos de comida del formulario
                      const mealSlotData = dayData[tipoComida]; // MealSlotWithOptions
                      const mealSlotId = `${diaKey}-${tipoComida}`;
                      const currentSelectedRecipeInSlot =
                        selectedMenu[diaKey]?.[tipoComida];
                      if (mealSlotData?.error) {
                        return (
                          <div
                            key={mealSlotId}
                            className="meal-slot error-slot"
                          >
                            <h5>{tipoComida}</h5>
                            <p>{mealSlotData.error}</p>
                          </div>
                        );
                      }
                      if (
                        !mealSlotData?.options ||
                        mealSlotData.options.length === 0
                      ) {
                        return (
                          <div
                            key={mealSlotId}
                            className="meal-slot empty-slot"
                          >
                            <h5>{tipoComida}</h5>
                            <p>No se encontraron opciones.</p>
                          </div>
                        );
                      }

                      return (
                        <div key={mealSlotId} className="meal-options-container">
                        <h5>{tipoComida}</h5>
                        {mealSlotData.options.map((recipeOpt, index) => {
                          const esFav = recetasFavoritas.has(recipeOpt.url); // Comprobar si es favorita
                          return (
                            <div
                              key={recipeOpt.url || `${mealSlotId}-opt-${index}`}
                              className={`meal-option-card ${currentSelectedRecipeInSlot?.url === recipeOpt.url && currentSelectedRecipeInSlot?.label === recipeOpt.label ? 'selected' : ''}`}
                            >
                              {/* --- BOTÓN DE FAVORITO --- */}
                              <button
                                onClick={() => toggleFavoritoHandler(recipeOpt)}
                                disabled={guardandoFavorito} // Deshabilitar mientras se guarda/elimina
                                className={`favorite-button ${esFav ? 'favorited' : ''}`} // Clases para estilo
                                title={esFav ? "Quitar de favoritos" : "Añadir a favoritos"}
                                style={{ 
                                  background: 'none', border: 'none', cursor: 'pointer', 
                                  fontSize: '2.5rem', // Tamaño de la estrella
                                  color: esFav ? 'gold' : '#ccc', // Estrella dorada si es fav, gris si no
                                  position: 'absolute', top: '5px', right: '5px', // Posicionar la estrella
                                  textShadow: esFav
      ? "0 0 2px #8B7500, 0 0 5px #8B7500" // filo oscuro dorado para estrella llena
      : "0 0 2px #444, 0 0 3px #444",     // filo gris oscuro para estrella vacía
                                }}
                              >
                                {esFav ? "⭐" : "☆"} 
                                {/* O usa caracteres: {esFav ? '★' : '☆'} */}
                              </button>
                              
                              <a href={recipeOpt.url} target="_blank" rel="noopener noreferrer" title={`Ver receta: ${recipeOpt.label}`}>
                                {recipeOpt.image && <img src={recipeOpt.image} alt={recipeOpt.label} />}
                                <p><strong>{recipeOpt.label}</strong></p>
                              </a>
                              <p>{Math.round(recipeOpt.calories)} kcal (por ración)</p>
                              <button
                                onClick={() => handleSelectMealOption(diaKey, tipoComida, recipeOpt)}
                                disabled={currentSelectedRecipeInSlot?.url === recipeOpt.url && currentSelectedRecipeInSlot?.label === recipeOpt.label}
                              >
                                {currentSelectedRecipeInSlot?.url === recipeOpt.url && currentSelectedRecipeInSlot?.label === recipeOpt.label ? 'Opción Elegida' : 'Elegir esta'}
                              </button>
                            </div>
                            
                          );
                        })}
                          
                          {/* Sección de Alternativa Saludable para la opción SELECCIONADA */}
                          {currentSelectedRecipeInSlot &&
                            !currentSelectedRecipeInSlot.error &&
                            currentSelectedRecipeInSlot.ingredients?.length >
                              0 && (
                              <div
                                className="comida-card-actions"
                                style={{
                                  marginTop: "10px",
                                  borderTop: "1px dashed #eee",
                                  paddingTop: "10px",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    sugerirAlternativaSaludable(
                                      mealSlotId,
                                      diaKey,
                                      tipoComida
                                    )
                                  }
                                  disabled={
                                    loading ||
                                    (alternativaVisiblePara !== null &&
                                      alternativaVisiblePara !== mealSlotId)
                                  }
                                >
                                  Sugerir alternativa a "
                                  {currentSelectedRecipeInSlot.label.substring(
                                    0,
                                    25
                                  )}
                                  ..."
                                </button>
                                {alternativaVisiblePara === mealSlotId &&
                                  alternativas[mealSlotId] && (
                                    <div className="alternativa-card">
                                      {" "}
                                      {/* Estilos para .alternativa-card */}
                                      <h4>Alternativa sugerida:</h4>
                                      <div
                                        className="alternativa-contenido"
                                        dangerouslySetInnerHTML={{
                                          __html: simpleMarkdownToHTML(
                                            alternativas[mealSlotId]
                                          ),
                                        }}
                                      />
                                      <button
                                        onClick={() =>
                                          aplicarAlternativa(
                                            mealSlotId,
                                            diaKey,
                                            tipoComida
                                          )
                                        }
                                      >
                                        Usar esta Alternativa
                                      </button>
                                      <button onClick={cerrarAlternativa}>
                                        Cerrar Sugerencia
                                      </button>
                                    </div>
                                  )}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div
              className="menu-actions"
              style={{
                marginTop: "25px",
                paddingTop: "20px",
                borderTop: "1px solid #ccc",
                display: "flex",
                gap: "15px",
              }}
            >
              <button
                onClick={fetchShoppingList}
                disabled={loading || Object.keys(selectedMenu).length === 0}
              >
                Generar Lista de Compras (del menú seleccionado)
              </button>
              <button
                onClick={exportarMenuSemanalTXT}
                disabled={Object.keys(selectedMenu).length === 0}
              >
                Exportar Menú Seleccionado (.txt)
              </button>
            </div>
          </>
        )}

        {/* --- Visualización de la Lista de la Compra --- */}
        {shoppingList && !loading && (
          <div className="shopping-list" style={{ marginTop: "30px" }}>
            <h3>Lista de la Compra:</h3>
            <table>
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
                    <td>{details.amount}</td>{" "}
                    {/* El backend ahora devuelve 'amount' y 'unit' */}
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => exportarListaCompraTXT(shoppingList)}
              style={{ marginTop: "10px" }}
            >
              Exportar Lista de Compra (.txt)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
