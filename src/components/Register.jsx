import React, { useState } from "react";
import axios from "axios";
import "./Login.css";
import { BACKEND_URL } from '../config';

export default function Register({ onRegister }) {
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("BACKEND_URL/register", form);
      setSuccessMessage("Registro exitoso. Ahora puedes iniciar sesión.");
      setForm({ email: "", password: "", confirmPassword: "" }); // Limpiar formulario
    } catch (err) {
      setError("Error al registrar el usuario. Intenta de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Registrar una cuenta</h2>
      <form onSubmit={handleSubmit}>
        <label>Email:</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} required />

        <label>Contraseña:</label>
        <input name="password" type="password" value={form.password} onChange={handleChange} required />

        <label>Confirmar Contraseña:</label>
        <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required />

        <button type="submit" disabled={loading}>
          {loading ? "Cargando..." : "Registrar"}
        </button>

        {error && <p className="error">{error}</p>}
        {successMessage && <p className="success">{successMessage}</p>}
      </form>
    </div>
  );
}
