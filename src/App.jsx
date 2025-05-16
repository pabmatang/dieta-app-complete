import React, { useState, useEffect } from "react";
import MenuSemanal from "./components/MenuSemanal";
import AuthPage from "./components/AuthPage";
import UserInfoForm from "./components/UserInform";
import Navbar from "./components/NavBar";
import Perfil from "./components/Perfil";
import RecomendacionSemanal from "./components/RecomendacionSemanal";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Bienvenida from "./components/Bienvenida";
import { BACKEND_URL } from './config';



function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userInfoCompleted, setUserInfoCompleted] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // Estado para controlar la vista actual
  const [view, setView] = useState("bienvenida"); // "bienvenida", "login", "userInform", "menuSemanal", "perfil", "recomendaciones"
  // Función para cambiar la vista
  const goToLogin = () => setView("login");
  const goToUserInfo = () => setView("userInform");
  const goToMenuSemanal = () => setView("menuSemanal");
  const goToPerfil = () => setView("perfil");
  const goToRecomendaciones = () => setView("recomendaciones");

  const handleLogin = async (newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
  
    try {
      const res = await fetch(`${BACKEND_URL}/perfil`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });
  
      if (!res.ok) throw new Error("No se pudo obtener el perfil");
  
      const perfil = await res.json();
  
      const camposCompletos =
        perfil.edad &&
        perfil.genero &&
        perfil.altura &&
        perfil.peso &&
        perfil.actividad &&
        perfil.objetivo;
  
      setView(camposCompletos ? "menuSemanal" : "userInform");
    } catch (err) {
      console.error("Error verificando perfil tras login:", err);
      setView("userInform");
    }
  };
  

  const handleLogout = () => {
    setToken(null);
    setUserInfoCompleted(false); // Reinicia también el formulario
    setShowProfile(false);
    localStorage.removeItem("token");
    setView("bienvenida");
  };

  const handleStart = async () => {
    if (!token) {
      setView("auth");
      console.log("No hay token, redirigiendo a login");
      return;
    }
  
    try {
      const res = await fetch("http://localhost:8000/perfil", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (res.status === 401) {
        // Token expirado o inválido
        console.warn("Token expirado o inválido, redirigiendo a login");
        setView("auth");
        return;
      }
  
      if (!res.ok) {
        throw new Error("Error desconocido al obtener perfil");
      }
  
      const perfil = await res.json();
  
      const camposCompletos =
        perfil.edad &&
        perfil.genero &&
        perfil.altura &&
        perfil.peso &&
        perfil.actividad &&
        perfil.objetivo;
  
      setView(camposCompletos ? "menuSemanal" : "userInform");
    } catch (err) {
      console.error("Error al verificar perfil:", err);
      // Error general, podría ser de red, servidor caído, etc.
      setView("auth");
    }
  };

    
  

  return (
    <div>
      <Navbar
        setView={setView}
        onLogout={handleLogout}
        onShowProfile={() => setShowProfile(true)}
        token={token}
        goToBienvenida={() => setView("bienvenida")}
        goToMenuSemanal={handleStart}
        goToPerfil={goToPerfil}
        goToRecomendaciones={goToRecomendaciones}
      />
      {view === "bienvenida" && (
      <Bienvenida onStart={handleStart} token={token}/>
    )}
      
      {view === "auth" && <AuthPage onAuth={handleLogin} />}
      {view === "userInform" && (
        <UserInfoForm onComplete={goToMenuSemanal} token={token} />
      )}
      {view === "menuSemanal" && <MenuSemanal token={token} />}
      {view === "perfil" && <Perfil token={token}/>}
      {view === "recomendaciones" && <RecomendacionSemanal token={token} />}
      
    </div>
  );
}

export default App;
