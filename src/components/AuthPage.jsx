import React, { useState } from "react";
import "./AuthPage.css";

const AuthPage = ({ onAuth }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false); // Determina si el formulario es para registro o login
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Lógica para enviar la información del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isRegistering ? "BACKEND_URL/register" : "BACKEND_URL/login";
    const payload = isRegistering
      ? { username, email, password }
      : { username, password }; // Solo username y password para login

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      
      if (response.ok) {
        if (isRegistering) {
          setSuccess(data.message);  // Muestra "Usuario creado correctamente"
          setUsername("");
          setEmail("");
          setPassword("");
        } else {
          onAuth(data.access_token);  // Para login
        }
      } else {
        setError(data.detail || "Error en la autenticación");
      }
    } catch (error) {
      setError("Hubo un error con la solicitud.");
    }
  };

  return (
    <div className="auth-container">
  <form className="auth-form" onSubmit={handleSubmit}>
    <input
      type="text"
      placeholder="Username"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
    />
    {isRegistering && (
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    )}
    <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />

    <div className="auth-buttons">
      <button type="submit">
        {isRegistering ? "Registrarse" : "Iniciar sesión"}
      </button>
      <button
        type="button"
        onClick={() => setIsRegistering(!isRegistering)}
      >
        {isRegistering ? "Iniciar sesión" : "Registrarse"}
      </button>
    </div>

    {error && <p className="auth-message error">{error}</p>}
    {success && <p className="auth-message success">{success}</p>}
  </form>
</div>
  );
};

export default AuthPage;

