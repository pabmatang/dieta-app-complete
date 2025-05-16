// Función para actualizar los valores de las proporciones cuando se cambia el slider
function updateProportions() {
    const meal1 = document.getElementById("meal-1").value;
    const meal2 = document.getElementById("meal-2").value;
    const meal3 = document.getElementById("meal-3").value;
  
    document.getElementById("meal-1-val").textContent = meal1;
    document.getElementById("meal-2-val").textContent = meal2;
    document.getElementById("meal-3-val").textContent = meal3;
  
    // Llamar al backend para generar el menú
    fetch('/api/generate_menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meal_1_ratio: meal1 / 100,
        meal_2_ratio: meal2 / 100,
        meal_3_ratio: meal3 / 100
      })
    })
    .then(response => response.json())
    .then(data => {
      // Mostrar el menú en el frontend
      const menuDiv = document.getElementById("weekly-menu");
      menuDiv.innerHTML = ''; // Limpiar el contenido anterior
      data.menu.forEach(day => {
        menuDiv.innerHTML += `<h3>${day.name}</h3><p>${day.meal_1}</p><p>${day.meal_2}</p><p>${day.meal_3}</p>`;
      });
    });
  }
  