import { useState } from "react";
import "./App.css";
// ha már nem kell a Vite/React logó, ezeket akár ki is veheted
// import reactLogo from "./assets/react.svg";
// import viteLogo from "/vite.svg";

import { RegisterPage } from "./components/RegisterPage";

function App() {
  const [user, setUser] = useState(null);

  const handleRegister = (userData) => {
    // itt azt csinálsz az adatokkal, amit akarsz (state, API hívás, stb.)
    setUser(userData);
    console.log("registered user:", userData);
  };

  const handleSwitchToLogin = () => {
    // később ide jöhet a LoginPage-re váltás
    console.log("switch to login");
  };

  return (
    <RegisterPage
      onRegister={handleRegister}
      onSwitchToLogin={handleSwitchToLogin}
    />
  );
}

export default App;
