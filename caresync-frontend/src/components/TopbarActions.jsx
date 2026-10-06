import { useCallback, useEffect, useRef, useState } from "react";
import { api, getSession } from "../lib/api";
import { useToast } from "../lib/Toast.jsx";

/**
 * Notification bell + chat button used in the top bar of every admin, doctor
 * and patient page.
 *
 *  - Bell: shows alerts for the logged-in user (emergency cases, appointment
 *    time changes, new bookings ...). New alerts also pop up as a toast.
 *  - Chat: admin <-> patient, admin <-> doctor, doctor <-> patient.
 */

const POLL_MS = 8000;
const CHAT_POLL_MS = 4000;

function timeAgo(value) {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (isNaN(then)) return "";
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 45) return "Just now";
  if (sec < 3600) return Math.round(sec / 60) + " min ago";
  if (sec < 86400) return Math.round(sec / 3600) + " hr ago";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function clockTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function initialsOf(name = "") {
  return (
    name
      .replace(/^Dr\.\s*/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

const ROLE_LABEL = { ADMIN: "Admin", DOCTOR: "Doctor", PATIENT: "Patient" };

export default function TopbarActions() {
  const toast = useToast();
  const session = getSession();

  const [panel, setPanel] = useState(null); // null | "notif" | "chat"
  const [notif, setNotif] = useState({ unread: 0, items: [] });
  const [msgUnread, setMsgUnread] = useState(0);

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null); // selected contact
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const wrapRef = useRef(null);
  const seenIds = useRef(null); // Set of notification ids we have already shown
  const threadRef = useRef(null);
  const activeRef = useRef(null);
  activeRef.current = active;

  // ---------- notifications + unread message badge (polling) ----------
  const refresh = useCallback(async () => {
    try {
      const [n, m] = await Promise.all([api.getNotifications(), api.getUnreadMessageCount()]);
      const items = (n && n.items) || [];
      setNotif({ unread: (n && n.unread) || 0, items });
      setMsgUnread((m && m.unread) || 0);

      if (seenIds.current === null) {
        seenIds.current = new Set(items.map((x) => x.id)); // first load: no pop-ups
      } else {
        items
          .filter((x) => !x.read && !seenIds.current.has(x.id))
          .reverse()
          .forEach((x) => {
            seenIds.current.add(x.id);
            toast(`${x.title} — ${x.message || ""}`.trim(), x.type === "EMERGENCY" ? "error" : "info");
          });
      }
    } catch {
      /* backend offline or token expired: ignore, the page itself reports errors */
    }
  }, [toast]);

  useEffect(() => {
    if (!session.token) return undefined;
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  // close the panels when clicking outside
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setPanel(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ---------- notification actions ----------
  async function openNotification(n) {
    try {
      if (!n.read) await api.markNotificationRead(n.id);
    } catch {
      /* ignore */
    }
    setPanel(null);
    refresh();
    if (n.link && !window.location.pathname.endsWith(n.link)) {
      window.location.href = n.link;
    }
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
      refresh();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  // ---------- chat ----------
  const loadContacts = useCallback(async () => {
    try {
      const list = await api.getChatContacts();
      setContacts(list || []);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setContactsLoading(false);
    }
  }, [toast]);

  const loadConversation = useCallback(async (contact, quiet) => {
    if (!contact) return;
    try {
      const list = await api.getConversation(contact.userId);
      // ignore a late answer for a conversation that is no longer open
      if (activeRef.current && activeRef.current.userId === contact.userId) {
        setMessages(list || []);
      }
    } catch (e) {
      if (!quiet) toast(e.message, "error");
    }
  }, [toast]);

  function toggleChat() {
    if (panel === "chat") {
      setPanel(null);
      return;
    }
    setPanel("chat");
    setContactsLoading(true);
    loadContacts();
  }

  function toggleNotif() {
    setPanel(panel === "notif" ? null : "notif");
    if (panel !== "notif") refresh();
  }

  function pickContact(c) {
    setActive(c);
    setMessages([]);
    setDraft("");
    activeRef.current = c;
    loadConversation(c, false).then(() => {
      refresh();
      loadContacts();
    });
  }

  // keep an open conversation (and the contact list) fresh
  useEffect(() => {
    if (panel !== "chat") return undefined;
    const t = setInterval(() => {
      loadContacts();
      if (activeRef.current) loadConversation(activeRef.current, true).then(refresh);
    }, CHAT_POLL_MS);
    return () => clearInterval(t);
  }, [panel, loadContacts, loadConversation, refresh]);

  // scroll to the newest message
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, active]);

  async function send() {
    const text = draft.trim();
    if (!text || !active || sending) return;
    setSending(true);
    try {
      await api.sendMessage(active.userId, text);
      setDraft("");
      await loadConversation(active, false);
      loadContacts();
    } catch (e) {
      toast(e.message || "Message could not be sent", "error");
    } finally {
      setSending(false);
    }
  }

  function onDraftKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const q = search.trim().toLowerCase();
  const shownContacts = contacts.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || (c.subtitle || "").toLowerCase().includes(q),
  );

  return (
    <div className="tba-wrap" ref={wrapRef}>
      {/* ---- bell ---- */}
      <div className="tba-slot">
        <button type="button" className="tba-btn" title="Notifications" onClick={toggleNotif}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            notifications
          </span>
          {notif.unread > 0 && <span className="tba-badge">{notif.unread > 99 ? "99+" : notif.unread}</span>}
        </button>

        {panel === "notif" && (
          <div className="tba-dropdown">
            <div className="tba-dd-head">
              <strong>Notifications</strong>
              {notif.unread > 0 && (
                <button type="button" className="tba-link" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            <div className="tba-dd-body">
              {notif.items.length === 0 && <div className="tba-empty">No notifications yet.</div>}
              {notif.items.map((n) => (
                <div
                  key={n.id}
                  className={"tba-item" + (n.read ? "" : " unread")}
                  onClick={() => openNotification(n)}
                >
                  <span
                    className="tba-dot"
                    style={{ background: n.type === "EMERGENCY" ? "#e05252" : n.type === "APPOINTMENT" ? "#0a7c7c" : "#6b8fa3" }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div className="tba-item-title">{n.title}</div>
                    {n.message && <div className="tba-item-msg">{n.message}</div>}
                    <div className="tba-item-time">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---- chat ---- */}
      <div className="tba-slot">
        <button type="button" className="tba-btn" title="Messages" onClick={toggleChat}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            chat
          </span>
          {msgUnread > 0 && <span className="tba-badge">{msgUnread > 99 ? "99+" : msgUnread}</span>}
        </button>

        {panel === "chat" && (
          <div className="tba-chat">
            <div className="tba-chat-list">
              <div className="tba-dd-head">
                <strong>Messages</strong>
              </div>
              <div style={{ padding: "8px 12px" }}>
                <input
                  className="tba-search"
                  placeholder="Search people..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="tba-contacts">
                {contactsLoading && <div className="tba-empty">Loading...</div>}
                {!contactsLoading && shownContacts.length === 0 && (
                  <div className="tba-empty">No one to chat with yet.</div>
                )}
                {shownContacts.map((c) => (
                  <div
                    key={c.userId}
                    className={"tba-contact" + (active && active.userId === c.userId ? " active" : "")}
                    onClick={() => pickContact(c)}
                  >
                    <div className={"tba-avatar role-" + c.role}>{initialsOf(c.name)}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="tba-c-name">
                        {c.name} <span className={"tba-role role-" + c.role}>{ROLE_LABEL[c.role] || c.role}</span>
                      </div>
                      <div className="tba-c-last">{c.lastMessage || c.subtitle || ""}</div>
                    </div>
                    {c.unread > 0 && <span className="tba-badge static">{c.unread}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="tba-chat-main">
              {!active ? (
                <div className="tba-chat-placeholder">
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#b7c9d3" }}>
                    forum
                  </span>
                  <div>Select someone to start chatting</div>
                </div>
              ) : (
                <>
                  <div className="tba-dd-head">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className={"tba-avatar role-" + active.role}>{initialsOf(active.name)}</div>
                      <div>
                        <strong>{active.name}</strong>
                        <div style={{ fontSize: 11, color: "#6b8fa3" }}>
                          {ROLE_LABEL[active.role] || active.role}
                          {active.subtitle ? " · " + active.subtitle : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="tba-thread" ref={threadRef}>
                    {messages.length === 0 && <div className="tba-empty">No messages yet. Say hello!</div>}
                    {messages.map((m) => (
                      <div key={m.id} className={"tba-msg " + (m.mine ? "mine" : "theirs")}>
                        <div className="tba-bubble">{m.content}</div>
                        <div className="tba-msg-time">{clockTime(m.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="tba-compose">
                    <textarea
                      rows={1}
                      placeholder="Type a message..."
                      value={draft}
                      maxLength={2000}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onDraftKey}
                    />
                    <button type="button" className="tba-send" onClick={send} disabled={sending || !draft.trim()}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        send
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .tba-wrap { display: flex; align-items: center; gap: 10px; }
        .tba-slot { position: relative; }
        .tba-btn {
          position: relative; width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid var(--border, #dde8ed); background: var(--white, #fff);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--slate, #1e3448);
        }
        .tba-btn:hover { background: var(--ice, #e8f4f4); }
        .tba-badge {
          position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; padding: 0 5px;
          border-radius: 9px; background: #e05252; color: #fff; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif;
        }
        .tba-badge.static { position: static; flex-shrink: 0; }
        .tba-dropdown {
          position: absolute; right: 0; top: 46px; width: 360px; max-width: 92vw; background: #fff;
          border: 1px solid var(--border, #dde8ed); border-radius: 12px;
          box-shadow: 0 12px 32px rgba(13,27,42,.18); z-index: 500; overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .tba-dd-head {
          display: flex; justify-content: space-between; align-items: center; padding: 12px 14px;
          border-bottom: 1px solid var(--border, #dde8ed); font-size: 14px; color: #0d1b2a;
        }
        .tba-link { background: none; border: none; color: #0a7c7c; font-size: 12px; font-weight: 600; cursor: pointer; }
        .tba-dd-body { max-height: 380px; overflow-y: auto; }
        .tba-empty { padding: 22px 14px; text-align: center; color: #6b8fa3; font-size: 13px; }
        .tba-item { display: flex; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #eef3f6; cursor: pointer; }
        .tba-item:hover { background: #f5fafb; }
        .tba-item.unread { background: #effafa; }
        .tba-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
        .tba-item-title { font-size: 13px; font-weight: 700; color: #0d1b2a; }
        .tba-item-msg { font-size: 12.5px; color: #1e3448; margin-top: 2px; line-height: 1.4; word-break: break-word; }
        .tba-item-time { font-size: 11px; color: #6b8fa3; margin-top: 3px; }

        .tba-chat {
          position: absolute; right: 0; top: 46px; width: 700px; max-width: 94vw; height: 480px; background: #fff;
          border: 1px solid var(--border, #dde8ed); border-radius: 12px; display: flex; overflow: hidden;
          box-shadow: 0 12px 32px rgba(13,27,42,.18); z-index: 500; font-family: 'DM Sans', sans-serif;
        }
        .tba-chat-list { width: 260px; border-right: 1px solid var(--border, #dde8ed); display: flex; flex-direction: column; flex-shrink: 0; }
        .tba-search {
          width: 100%; padding: 8px 12px; border: 1px solid var(--border, #dde8ed); border-radius: 18px;
          font-size: 13px; outline: none; font-family: inherit; background: #f2f7f9;
        }
        .tba-contacts { overflow-y: auto; flex: 1; }
        .tba-contact { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #eef3f6; }
        .tba-contact:hover { background: #f5fafb; }
        .tba-contact.active { background: #e8f4f4; }
        .tba-avatar {
          width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center;
          justify-content: center; font-size: 12px; font-weight: 700; color: #fff; background: #0a7c7c;
        }
        .tba-avatar.role-DOCTOR { background: #7c5cbf; }
        .tba-avatar.role-ADMIN { background: #1e3448; }
        .tba-avatar.role-PATIENT { background: #0a7c7c; }
        .tba-c-name { font-size: 13px; font-weight: 600; color: #0d1b2a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tba-c-last { font-size: 11.5px; color: #6b8fa3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .tba-role { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; padding: 1px 6px; border-radius: 8px; background: #eef3f6; color: #4c6a7c; margin-left: 4px; }

        .tba-chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .tba-chat-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #6b8fa3; font-size: 13px; }
        .tba-thread { flex: 1; overflow-y: auto; padding: 14px; background: #f7fafb; display: flex; flex-direction: column; gap: 8px; }
        .tba-msg { display: flex; flex-direction: column; max-width: 78%; }
        .tba-msg.mine { align-self: flex-end; align-items: flex-end; }
        .tba-msg.theirs { align-self: flex-start; align-items: flex-start; }
        .tba-bubble { padding: 8px 12px; border-radius: 14px; font-size: 13.5px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
        .tba-msg.mine .tba-bubble { background: #0a7c7c; color: #fff; border-bottom-right-radius: 4px; }
        .tba-msg.theirs .tba-bubble { background: #fff; color: #0d1b2a; border: 1px solid #dde8ed; border-bottom-left-radius: 4px; }
        .tba-msg-time { font-size: 10px; color: #8aa3b2; margin-top: 2px; }
        .tba-compose { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--border, #dde8ed); align-items: flex-end; }
        .tba-compose textarea {
          flex: 1; resize: none; border: 1px solid var(--border, #dde8ed); border-radius: 18px; padding: 8px 14px;
          font-family: inherit; font-size: 13.5px; outline: none; max-height: 90px;
        }
        .tba-send {
          width: 36px; height: 36px; border-radius: 50%; border: none; background: #0a7c7c; color: #fff;
          cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .tba-send:disabled { opacity: .45; cursor: not-allowed; }
        @media (max-width: 720px) {
          .tba-chat { flex-direction: column; height: 520px; }
          .tba-chat-list { width: 100%; height: 190px; border-right: none; border-bottom: 1px solid #dde8ed; }
        }
      `}</style>
    </div>
  );
}
