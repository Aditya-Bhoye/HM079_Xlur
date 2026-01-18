import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Send, X } from 'lucide-react';
import { getChatMessages, sendChatMessage, subscribeToChat, markMessagesAsRead } from '../../services/api';
import type { ChatMessage } from '../../services/types';
import './ChatInterface.css';

interface ChatInterfaceProps {
    rentalRequestId: string;
    onClose: () => void;
}

const ChatInterface = ({ rentalRequestId, onClose }: ChatInterfaceProps) => {
    const { user } = useUser();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadMessages();

        // Subscribe to real-time updates
        const channel = subscribeToChat(rentalRequestId, (newMsg) => {
            setMessages(prev => [...prev, newMsg]);
        });

        // Mark messages as read when opening chat
        if (user) {
            markMessagesAsRead(rentalRequestId, user.id);
        }

        return () => {
            channel.unsubscribe();
        };
    }, [rentalRequestId, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        const msgs = await getChatMessages(rentalRequestId);
        setMessages(msgs);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || !user || sending) return;

        setSending(true);
        try {
            const message: ChatMessage = {
                rental_request_id: rentalRequestId,
                sender_id: user.id,
                message: newMessage.trim(),
                read: false
            };

            const sent = await sendChatMessage(message);
            if (sent) {
                setNewMessage('');
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, msg) => {
        const dateKey = formatDate(msg.created_at);
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(msg);
        return groups;
    }, {} as Record<string, ChatMessage[]>);

    return (
        <div className="chat-interface">
            <div className="chat-header">
                <h3>Chat</h3>
                <button className="close-chat-btn" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className="chat-messages">
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                        <div className="date-divider">
                            <span>{date}</span>
                        </div>
                        {msgs.map((msg) => (
                            <div
                                key={msg.id}
                                className={`message ${msg.sender_id === user?.id ? 'sent' : 'received'}`}
                            >
                                <div className="message-bubble">
                                    <p>{msg.message}</p>
                                    <span className="message-time">{formatTime(msg.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input" onSubmit={handleSend}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                />
                <button type="submit" disabled={!newMessage.trim() || sending}>
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;
