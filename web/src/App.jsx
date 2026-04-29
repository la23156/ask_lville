import { Routes, Route } from "react-router-dom";
import ChatPage from "./components/ChatPage.jsx";
import JourneyPage from "./components/JourneyPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/journey" element={<JourneyPage />} />
      <Route path="/journey/:journeyId" element={<JourneyPage />} />
    </Routes>
  );
}
