import './App.css'
import TeamTracker from "./pages/team-tracker";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TeamTracker />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;