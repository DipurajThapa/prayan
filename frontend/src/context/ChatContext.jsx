import { createContext, useCallback, useContext, useState } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [propertySlug, setPropertySlug] = useState(null);
  const [draft, setDraft] = useState("");

  const openChat = useCallback((opts = {}) => {
    if (opts.propertySlug !== undefined) setPropertySlug(opts.propertySlug);
    if (opts.prompt) setDraft(opts.prompt);
    setOpen(true);
  }, []);

  return (
    <ChatContext.Provider value={{ open, setOpen, openChat, propertySlug, setPropertySlug, draft, setDraft }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
