import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import JourneyWizard from "./JourneyWizard.jsx";
import JourneyResult from "./JourneyResult.jsx";
import { api } from "../services/api.js";
import { ArrowLeft, MapIcon } from "lucide-react";

export default function JourneyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { journeyId: routeId } = useParams();
  const [activeId, setActiveId] = useState(routeId || null);
  const [phase, setPhase] = useState(routeId ? "result" : "wizard");
  const [pastJourneys, setPastJourneys] = useState([]);

  useEffect(() => {
    if (user) {
      api
        .listJourneys(user.id)
        .then((r) => setPastJourneys(r.journeys || []))
        .catch(() => {});
    }
  }, [user, phase]);

  useEffect(() => {
    if (routeId) {
      setActiveId(routeId);
      setPhase("result");
    }
  }, [routeId]);

  const handleComplete = (id) => {
    setActiveId(id);
    setPhase("result");
    navigate(`/journey/${id}`, { replace: true });
  };

  const restart = () => {
    setActiveId(null);
    setPhase("wizard");
    navigate("/journey", { replace: true });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-50">
      <aside className="w-64 bg-lville-dark text-white flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-lville-red" />
          <div className="font-semibold">Course Journeys</div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="m-3 flex items-center gap-2 text-sm text-stone-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to chat
        </button>
        <button
          onClick={restart}
          className="mx-3 mb-3 bg-lville-red hover:bg-red-700 text-white py-2 rounded font-medium text-sm"
        >
          + New journey
        </button>

        <div className="flex-1 overflow-y-auto px-2">
          {pastJourneys.length === 0 && (
            <div className="px-3 py-2 text-xs text-stone-500">
              Your saved journeys will appear here.
            </div>
          )}
          {pastJourneys.map((j) => (
            <button
              key={j.id}
              onClick={() => {
                setActiveId(j.id);
                setPhase("result");
                navigate(`/journey/${j.id}`);
              }}
              className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${
                activeId === j.id
                  ? "bg-white/10"
                  : "hover:bg-white/5 text-stone-300"
              }`}
            >
              <div className="truncate text-stone-100">
                {j.title || "Untitled"}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">
                {j.status === "complete" ? "✓ complete" : "in progress"}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {phase === "wizard" ? (
          <JourneyWizard user={user} onComplete={handleComplete} />
        ) : (
          <JourneyResult journeyId={activeId} onRestart={restart} />
        )}
      </main>
    </div>
  );
}
