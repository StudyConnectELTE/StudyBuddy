import './index.css';
import {Layout} from "./components/Layout";
import { BrowserRouter as Router, Routes, Route} from "react-router-dom";
import LoginPage from "./components/LoginPage";
import {RegisterPage} from "./components/RegisterPage";
import HomePage from "./components/HomePage";
import {ProfileSettingsPage} from "./components/ProfileSettingsPage";
import {SearchPage} from "./components/SearchPage";
import MyGroupsPage from "./components/MyGroupsPage";
import ForumPage from "./components/ForumPage";




export default function App() {
  return (
    <Router>  {/* ← EZ KELL! */}
      <Layout />
      
    </Router>
  );
}