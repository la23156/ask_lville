import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { FORMS, ROLES } from "../data/lvilleData.js";
import { api } from "../services/api.js";

export default function ProfileModal({ user, onClose }) {
  const [profile, setProfile] = useState({
    role: "",
    grade: "",
    house: "",
    interests: "",
    classes_taken: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .getProfile(user.id)
      .then((p) =>
        setProfile({
          role: p.role || "",
          grade: p.grade || "",
          house: p.house || "",
          interests: (p.interests || []).join(", "),
          classes_taken: (p.classes_taken || []).join(", "),
        })
      )
      .catch(() => {});
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await api.saveProfile({
        user_id: user.id,
        ...profile,
        interests: profile.interests,
        classes_taken: profile.classes_taken,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Profile</h2>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Role">
            <select
              value={profile.role}
              onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              className="w-full border border-stone-300 rounded px-3 py-2 focus:outline-none focus:border-lville-red"
            >
              <option value="">Select…</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Form">
            <select
              value={profile.grade}
              onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
              className="w-full border border-stone-300 rounded px-3 py-2 focus:outline-none focus:border-lville-red"
            >
              <option value="">Select…</option>
              {FORMS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>

          <Field label="House">
            <input
              type="text"
              value={profile.house}
              onChange={(e) => setProfile({ ...profile, house: e.target.value })}
              placeholder="e.g. Cleve, Hamill, Stephens"
              className="w-full border border-stone-300 rounded px-3 py-2 focus:outline-none focus:border-lville-red"
            />
          </Field>

          <Field label="Interests (comma separated)">
            <input
              type="text"
              value={profile.interests}
              onChange={(e) =>
                setProfile({ ...profile, interests: e.target.value })
              }
              placeholder="e.g. crew, robotics, theater"
              className="w-full border border-stone-300 rounded px-3 py-2 focus:outline-none focus:border-lville-red"
            />
          </Field>

          <Field label="Classes taken (comma separated)">
            <input
              type="text"
              value={profile.classes_taken}
              onChange={(e) =>
                setProfile({ ...profile, classes_taken: e.target.value })
              }
              placeholder="e.g. EN301, MA401"
              className="w-full border border-stone-300 rounded px-3 py-2 focus:outline-none focus:border-lville-red"
            />
          </Field>
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-lville-red text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-stone-700 mb-1">{label}</div>
      {children}
    </label>
  );
}
