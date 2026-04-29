import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import ChatArea from "./ChatArea.jsx";
import ChatInputBar from "./ChatInputBar.jsx";
import EmptyState from "./EmptyState.jsx";
import ProfileModal from "./ProfileModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [animateIdx, setAnimateIdx] = useState(-1);

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
    setAnimateIdx(-1);
  };

  const selectConversation = async (id) => {
    setActiveId(id);
    setAnimateIdx(-1);
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
      const next = [
        ...optimistic,
        { role: "assistant", content: res.answer, sources: res.sources },
      ];
      setMessages(next);
      setAnimateIdx(next.length - 1);
      refreshConversations();
    } catch (e) {
      setMessages([
        ...optimistic,
        { role: "assistant", content: `Sorry — something went wrong. (${e.message})` },
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
        onOpenJourney={() => navigate("/journey")}
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <main className="flex-1 flex flex-col bg-lville-cream">
        {messages.length === 0 ? (
          <EmptyState
            onPickQuestion={(q) => sendMessage(q)}
            onOpenJourney={() => navigate("/journey")}
            userName={user?.name}
          />
        ) : (
          <ChatArea
            messages={messages}
            isLoading={isLoading}
            animateIdx={animateIdx}
          />
        )}
        <ChatInputBar onSend={sendMessage} disabled={isLoading} />
      </main>
      {showProfile && user && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
