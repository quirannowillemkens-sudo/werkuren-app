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

  const inputClass = "border p-3 w-full rounded text-lg";

  const formatLive = () => {
    const h = String(Math.floor(liveSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((liveSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(liveSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4 space-y-4">
        <h1 className="text-2xl font-bold text-center">🕒 Werkuren App</h1>

        <label className="text-sm font-medium">Naam technieker</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Jouw naam" className={inputClass} />

        <label className="text-sm font-medium">Datum</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />

        <label className="text-sm font-medium">Project</label>
        <select value={project} onChange={e => setProject(e.target.value)} className={inputClass}>
          {projects.map(p => <option key={p}>{p}</option>)}
        </select>

        <label className="text-sm font-medium">Type uren</label>
        <div className="flex gap-2">
          <button onClick={() => setType("werk")} className={`flex-1 p-3 rounded ${type === "werk" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
            Werkuren
          </button>
          <button onClick={() => setType("pauze")} className={`flex-1 p-3 rounded ${type === "pauze" ? "bg-orange-500 text-white" : "bg-gray-200"}`}>
            Pauze
          </button>
        </div>

        <label className="text-sm font-medium">Tijd</label>
        <div className="flex gap-2">
          <input type="time" value={start} onChange={e => setStart(e.target.value)} className={inputClass} />
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} className={inputClass} />
        </div>

        {timerStart && (
          <div className="text-center text-xl font-mono">⏱ {formatLive()}</div>
        )}

        <button onClick={() => addEntry(start, end)} className="bg-blue-600 text-white p-3 w-full rounded text-lg">
          Handmatig toevoegen
        </button>

        <button onClick={timerStart ? stopTimer : startTimer} className={`p-3 w-full rounded text-lg ${timerStart ? "bg-red-600" : "bg-green-600"} text-white`}>
          {timerStart ? "⏹ Stop timer" : "▶️ Start timer"}
        </button>

        <div className="text-sm space-y-1">
          {entries.map((e, i) => (
            <div key={i} className="flex justify-between border-b py-1">
              <span>{e.date} – {e.project}</span>
              <span>{(e.minutes / 60).toFixed(2)} u</span>
            </div>
          ))}
        </div>

        <div className="font-semibold text-center">Werkuren: {(workMinutes / 60).toFixed(2)} u</div>
        <div className="text-center text-sm">Pauze: {(breakMinutes / 60).toFixed(2)} u</div>
        <div className="text-center text-sm text-red-600">Overuren: {overtime.toFixed(2)} u</div>

        <button onClick={exportExcel} className="bg-black text-white p-3 w-full rounded text-lg">
          📤 Exporteer naar Excel
        </button>
      </div>
    </div>
  );
}
