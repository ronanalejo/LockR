import React, { useState } from "react";
import './auth.css';
import iRESERVELOGO from "../../assets/images/logos/iRESERVELOGO.png";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Email:", email);
    console.log("Password:", password);
  };

  return (
    

    <div className="login-form">

    <div id="ireserve-logo">
        <img src={iRESERVELOGO} alt="logo" />
      </div>


      <form onSubmit={handleSubmit}>
    
          <button id="google-btn" type="submit">Login using Google</button>
          <p>OR</p>
    
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
    
          />
        </div>

        <div style={{ marginTop: "10px" }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
        
          />
        </div>

        <div>
          <button id="login-btn" type="submit">Login</button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
