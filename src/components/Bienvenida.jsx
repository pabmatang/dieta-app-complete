import React from "react";
import "./Bienvenida.css"
import logo from '../imagenes/logo.jpeg';

function Bienvenida({ onStart }) {
  return (
    <div className="bienvenida-container">
      <h2>Bienvenido a la App Menú Saludable</h2>
     <img src={logo} alt="Imagen bienvenida" className="bienvenida-imagen" />
      <p>Tu asistente para crear menús semanales personalizados y saludables.</p>
      <button onClick={onStart}>Empezar</button>
    </div>
  );
}

export default Bienvenida;

