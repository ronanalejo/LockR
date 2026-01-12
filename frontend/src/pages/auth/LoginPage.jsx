import React, { useState } from "react";
import "./auth.css";
import iRESERVELOGO from "../../assets/images/logos/iRESERVELOGO.png";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login(email, password);

      if (response.success) {
        const userType = response.user.userType;

        if (userType === "student") {
          navigate("/student/dashboard");
        } else if (userType === "admin") {
          navigate("/admin/dashboard");
        }
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      <div id="ireserve-logo">
        <img src={iRESERVELOGO} alt="logo" />
      </div>

      <form onSubmit={handleSubmit}>
        <button id="google-btn" type="submit">
          Login using Google
        </button>
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
          <button id="login-btn" type="submit">
            Login
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
