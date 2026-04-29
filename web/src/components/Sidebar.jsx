import { Plus, Search, MessageSquare, Trash2, Pencil, X, User } from "lucide-react";
import { useState } from "react";

export default function Sidebar({
  conversations,
  activeId,
  onNew,
  onSelect,
  onRename,
  onDelete,
  onSearch,
  onOpenProfile,
  user,
  collapsed,
  onToggle,
}) {
  const [searchQ, setSearchQ] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  if (collapsed) {
    return (
      <div className="w-14 bg-lville-dark text-white flex flex-col items-center py-4 gap-3">
        <button onClick={onToggle} className="p-2 hover:bg-white/10 rounded">
          <MessageSquare className="w-5 h-5" />
        </button>
        <button onClick={onNew} className="p-2 hover:bg-white/10 rounded" title="New chat">
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 bg-lville-dark text-stone-100 flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-lville-red flex items-center justify-center font-bold">L</div>
          <div className="font-semibold">Ask Lville</div>
        </div>
        <button onClick={onToggle} className="p-1 hover:bg-white/10 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-lville-red hover:bg-red-700 text-white py-2 rounded font-medium"
        >
          <Plus className="w-4 h-4" /> New chat
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-stone-400" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              onSearch(e.target.value);
            }}
            placeholder="Search conversations"
            className="w-full pl-8 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded text-stone-100 placeholder-stone-500 focus:outline-none focus:border-lville-red"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-stone-500">
            No conversations yet.
          </div>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded cursor-pointer mb-1 ${
              activeId === c.id ? "bg-white/10" : "hover:bg-white/5"
            }`}
            onClick={() => editingId !== c.id && onSelect(c.id)}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0 text-stone-400" />
            {editingId === c.id ? (
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm border-b border-stone-500 focus:outline-none"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => {
                  if (editValue.trim()) onRename(c.id, editValue.trim());
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editValue.trim()) onRename(c.id, editValue.trim());
                    setEditingId(null);
                  } else if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <span className="flex-1 text-sm truncate">{c.title || "Untitled"}</span>
            )}
            <button
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(c.id);
                setEditValue(c.title || "");
              }}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-red-300"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this conversation?")) onDelete(c.id);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={onOpenProfile}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded text-sm"
        >
          <div className="w-7 h-7 rounded-full bg-lville-red flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span className="truncate">{user?.name || "Demo Lawrentian"}</span>
        </button>
      </div>
    </aside>
  );
}
