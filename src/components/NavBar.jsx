import React from "react";
import "./NavBar.css"; // Asegúrate de tenerlo importado

function NavBar({ 
  goToBienvenida, 
  goToMenuSemanal, 
  goToPerfil, 
  goToRecomendaciones,
  onLogout, 
  token 
}) {
  const handleMenuClick = () => {
    if (token) {
      goToMenuSemanal();
    } else {
      alert("Debes iniciar sesión para generar el menú.");
    }
  };

  const handleRecomendacionesClick = () => {
    if (token) {
      goToRecomendaciones();
    } else {
      alert("Debes iniciar sesión para ver recomendaciones.");
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="logo" onClick={goToBienvenida}>
          Menú Saludable
        </h1>
        <ul className="nav-links">
          <li><button onClick={goToBienvenida}>Inicio</button></li>
          <li><button onClick={handleMenuClick}>Generar menú</button></li>
          <li><button onClick={handleRecomendacionesClick}>Recomendaciones</button></li>
          <li><button onClick={goToPerfil}>Perfil</button></li>
          {token && (
            <li><button onClick={onLogout}>Cerrar sesión</button></li>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default NavBar;



