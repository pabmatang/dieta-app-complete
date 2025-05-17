import React, { useState } from "react";
import "./NavBar.css"; // Asegúrate de tenerlo importado

function NavBar({ 
  goToBienvenida, 
  goToMenuSemanal, 
  goToPerfil, 
  goToRecomendaciones,
  onLogout, 
  token,
  setView
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuClick = () => {
    if (token) {
      goToMenuSemanal();
      setMenuOpen(false);
    } else {
      alert("Debes iniciar sesión para generar el menú.");
      setView("auth");
      setMenuOpen(false);
    }
  };

  const handleRecomendacionesClick = () => {
    if (token) {
      goToRecomendaciones();
      setMenuOpen(false);
    } else {
      alert("Debes iniciar sesión para ver recomendaciones.");
      setView("auth");
      setMenuOpen(false);
    }
  };

  const handlePerfilClick = () => {
    goToPerfil();
    setMenuOpen(false);
  };

  const handleInicioClick = () => {
    goToBienvenida();
    setMenuOpen(false);
  };

  const handleLogoutClick = () => {
    onLogout();
    setMenuOpen(false);
  };

  // Alternar el menú móvil
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="logo" onClick={handleInicioClick}>
          Menú Saludable
        </h1>
        
        {/* Hamburger Menu Icon */}
        <div className="menu-icon" onClick={toggleMenu}>
          <div className={`hamburger-line ${menuOpen ? 'open' : ''}`}></div>
          <div className={`hamburger-line ${menuOpen ? 'open' : ''}`}></div>
          <div className={`hamburger-line ${menuOpen ? 'open' : ''}`}></div>
        </div>
        
        {/* Navigation Links - will be shown/hidden based on menuOpen state */}
        <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>
          <li><button onClick={handleInicioClick}>Inicio</button></li>
          <li><button onClick={handleMenuClick}>Generar menú</button></li>
          <li><button onClick={handleRecomendacionesClick}>Recomendaciones</button></li>
          <li><button onClick={handlePerfilClick}>Perfil</button></li>
          {token && (
            <li><button onClick={handleLogoutClick}>Cerrar sesión</button></li>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default NavBar;




