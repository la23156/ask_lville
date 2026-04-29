import { useEffect, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatArea from "./components/ChatArea.jsx";
import ChatInputBar from "./components/ChatInputBar.jsx";
import EmptyState from "./components/EmptyState.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { api } from "./services/api.js";

export default function App() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { conversations } = await api.listConversations(user.id);
      setConversations(conversations || []);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
  };

  const selectConversation = async (id) => {
    setActiveId(id);
    try {
      const data = await api.getConversation(id);
      setMessages(
        (data.messages || []).map((m) => ({ role: m.role, content: m.content }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async (text) => {
    if (!user) return;
    const optimistic = [...messages, { role: "user", content: text }];
    setMessages(optimistic);
    setIsLoading(true);
    try {
      const res = await api.chat({
        question: text,
        conversation_id: activeId,
        user_id: user.id,
      });
      setActiveId(res.conversation_id);
      setMessages([
        ...optimistic,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
        },
      ]);
      refreshConversations();
    } catch (e) {
      setMessages([
        ...optimistic,
        {
          role: "assistant",
          content: `Sorry — something went wrong. (${e.message})`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSearch = async (q) => {
    if (!user) return;
    if (!q.trim()) return refreshConversations();
    try {
      const { conversations } = await api.searchConversations(user.id, q);
      setConversations(conversations || []);
    } catch (e) {
      console.error(e);
    }
  };

  const onRename = async (id, title) => {
    try {
      await api.renameConversation(id, title);
      refreshConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const onDelete = async (id) => {
    try {
      await api.deleteConversation(id);
      if (activeId === id) newChat();
      refreshConversations();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onNew={newChat}
        onSelect={selectConversation}
        onRename={onRename}
        onDelete={onDelete}
        onSearch={onSearch}
        onOpenProfile={() => setShowProfile(true)}
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <main className="flex-1 flex flex-col bg-lville-cream">
        {messages.length === 0 ? (
          <EmptyState
            onPickQuestion={(q) => sendMessage(q)}
            userName={user?.name}
          />
        ) : (
          <ChatArea messages={messages} isLoading={isLoading} />
        )}
        <ChatInputBar onSend={sendMessage} disabled={isLoading} />
      </main>
      {showProfile && user && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
