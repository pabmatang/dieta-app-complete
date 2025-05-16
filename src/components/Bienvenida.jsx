import React from "react";
import "./Bienvenida.css"

function Bienvenida({ onStart }) {
  return (
    <div className="bienvenida-container">
      <h2>Bienvenido a la App Menú Saludable</h2>
      <img src="../imagenes/logo.jpeg" alt="Imagen bienvenida" className="bienvenida-imagen" />
      <p>Tu asistente para crear menús semanales personalizados y saludables.</p>
      <button onClick={onStart}>Empezar</button>
    </div>
  );
}

export default Bienvenida;

