import React, { useState } from "react";

const UserInfoForm = ({ onComplete, token }) => {
  const [edad, setEdad] = useState("");
  const [genero, setGenero] = useState("");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [actividad, setActividad] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    console.log("Token enviado al backend:", token);
    try {
      const response = await fetch("http://localhost:8000/user-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          edad,
          genero,
          altura,
          peso,
          actividad,
          objetivo,
        }),
      });

      if (response.ok) {
        setSuccess("Datos guardados correctamente");
        onComplete(); // Avanza al menú semanal
      } else {
        const data = await response.json();
        setError(data.detail || "Error al guardar los datos");
      }
    } catch (err) {
      setError("Error en la solicitud");
    }
  };

  return (
    <div>
      <h2>Información del usuario</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          placeholder="Edad"
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
          required
        />
        <select value={genero} onChange={(e) => setGenero(e.target.value)} required>
          <option value="">Selecciona género</option>
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
          <option value="otro">Otro</option>
        </select>
        <input
          type="number"
          placeholder="Altura (cm)"
          value={altura}
          onChange={(e) => setAltura(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Peso (kg)"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          required
        />
        <select value={actividad} onChange={(e) => setActividad(e.target.value)} required>
          <option value="">Nivel de actividad</option>
          <option value="sedentario">Sedentario</option>
          <option value="ligero">Ligero</option>
          <option value="moderado">Moderado</option>
          <option value="intenso">Intenso</option>
        </select>
        <select
          value={objetivo} // Agregar el select para el objetivo de peso
          onChange={(e) => setObjetivo(e.target.value)}
          required
        >
          <option value="Mantener peso">Mantener peso</option>
          <option value="Subir de peso">Subir de peso</option>
          <option value="Bajar de peso">Bajar de peso</option>
        </select>
        <button type="submit">Guardar</button>
      </form>
      {success && <p style={{ color: "green" }}>{success}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default UserInfoForm;

