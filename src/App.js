import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

function minutesBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function nowTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function WerkurenApp() {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem("werkuren");
    return saved ? JSON.parse(saved) : [];
  });

  const [name, setName] = useState(() => localStorage.getItem("technieker") || "");

  const [projects] = useState(["Installatie", "Service", "Verkoop"]);

  const [date, setDate] = useState(todayDate());
  const [project, setProject] = useState("Installatie");
  const [type, setType] = useState("werk");
  const [start, setStart] = useState(nowTime());
  const [end, setEnd] = useState("");

  const [timerStart, setTimerStart] = useState(null);
  const [liveSeconds, setLiveSeconds] = useState(0);

  useEffect(() => {
    localStorage.setItem("werkuren", JSON.stringify(entries));
    localStorage.setItem("technieker", name);
  }, [entries, name]);

  useEffect(() => {
    let interval;
    if (timerStart) {
      interval = setInterval(() => {
        setLiveSeconds(Math.floor((Date.now() - timerStart) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStart]);

  const addEntry = (s, e) => {
    if (!date || !s || !e) return;
    const minutes = minutesBetween(s, e);
    setEntries([...entries, { name, date, project, type, start: s, end: e, minutes }]);
  };

  const startTimer = () => {
    const now = Date.now();
    setTimerStart(now);
    setStart(nowTime());
    setEnd("");
    setLiveSeconds(0);
  };

  const stopTimer = () => {
    if (!timerStart) return;
    const endStr = nowTime();
    addEntry(start, endStr);
    setEnd(endStr);
    setTimerStart(null);
  };

  const workMinutes = entries.filter(e => e.type === "werk").reduce((s, e) => s + e.minutes, 0);
  const breakMinutes = entries.filter(e => e.type === "pauze").reduce((s, e) => s + e.minutes, 0);
  const overtime = Math.max(0, workMinutes / 60 - 160);

  const exportExcel = () => {
    const data = entries.map(e => ({
      Naam: e.name,
      Datum: e.date,
      Project: e.project,
      Type: e.type === "werk" ? "Werkuren" : "Pauze",
      Start: e.start,
      Einde: e.end,
      Uren: (e.minutes / 60).toFixed(2)
    }));

    data.push({ Naam: "", Datum: "", Project: "", Type: "", Start: "Werkuren", Einde: "", Uren: (workMinutes / 60).toFixed(2) });
    data.push({ Naam: "", Datum: "", Project: "", Type: "", Start: "Pauze", Einde: "", Uren: (breakMinutes / 60).toFixed(2) });
    data.push({ Naam: "", Datum: "", Project: "", Type: "", Start: "Overuren", Einde: "", Uren: overtime.toFixed(2) });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Werkuren");
    XLSX.writeFile(wb, "werkuren.xlsx");
  };

  const inputClass = "border border-gray-300 p-3 w-full rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";

  const formatLive = () => {
    const h = String(Math.floor(liveSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((liveSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(liveSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4 flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-6 overflow-hidden">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-2">⏰</div>
          <h1 className="text-2xl font-bold text-gray-800">Werkuren Tracker</h1>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Naam technieker"
            className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Project & Type */}
        <div className="space-y-3">
          <select
            value={project}
            onChange={e => setProject(e.target.value)}
            className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
          >
            {projects.map(p => <option key={p}>{p}</option>)}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setType("werk")}
              className={`flex-1 p-3 rounded-lg font-semibold transition-all ${type === "werk" ? "bg-purple-600 text-white scale-105 shadow-lg" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              💼 Werk
            </button>
            <button
              onClick={() => setType("pauze")}
              className={`flex-1 p-3 rounded-lg font-semibold transition-all ${type === "pauze" ? "bg-purple-600 text-white scale-105 shadow-lg" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              ☕ Pauze
            </button>
          </div>
        </div>

        {/* Time Inputs */}
        <div className="bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="flex-1 p-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <input
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="flex-1 p-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          {timerStart && (
            <div className="text-center text-3xl font-mono bg-white text-blue-600 p-4 rounded-lg shadow-md">
              {formatLive()}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => addEntry(start, end)}
            className="w-full bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg font-semibold shadow-lg transition-colors"
          >
            ➕ Voeg toe
          </button>
          <button
            onClick={timerStart ? stopTimer : startTimer}
            className={`w-full p-4 rounded-lg font-semibold shadow-lg transition-all ${timerStart ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-blue-500 hover:bg-blue-600"} text-white`}
          >
            {timerStart ? "⏹ Stop" : "▶️ Start"} Timer
          </button>
        </div>

        {/* Entries List */}
        <div className="max-h-40 overflow-y-auto space-y-2">
          {entries.map((e, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-3 flex justify-between items-center">
              <div>
                <div className="font-semibold text-sm">{e.date}</div>
                <div className="text-xs text-gray-600">{e.project} • {e.type === "werk" ? "💼 Werk" : "☕ Pauze"}</div>
              </div>
              <div className="text-lg font-bold text-purple-600">{(e.minutes / 60).toFixed(2)}h</div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-purple-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold">💼 Werkuren:</span>
            <span className="text-purple-600 font-bold">{(workMinutes / 60).toFixed(2)}h</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">☕ Pauze:</span>
            <span className="text-orange-600 font-bold">{(breakMinutes / 60).toFixed(2)}h</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold">⏰ Overuren:</span>
            <span className="text-red-600 font-bold">{overtime.toFixed(2)}h</span>
          </div>
        </div>

        {/* Export */}
        <button
          onClick={exportExcel}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white p-4 rounded-lg font-semibold shadow-lg transition-colors"
        >
          📊 Export Excel
        </button>
      </div>
    </div>
  );
}
