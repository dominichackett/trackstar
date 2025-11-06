'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';

export default function AIChatPage() {
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'ai'; text: string }>>([]);
  const [input, setInput] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom of the chat history when messages update
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim()) {
      const userMessage = { type: 'user' as const, text: input.trim() };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setInput('');

      // Simulate AI response
      setTimeout(() => {
        const aiResponse = { type: 'ai' as const, text: `AI response to: "${userMessage.text}"` };
        setMessages((prevMessages) => [...prevMessages, aiResponse]);
        // In a real application, if voice input was used, trigger text-to-speech here.
      }, 1000);
    }
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // In a real application, you would integrate a Web Speech API (SpeechRecognition)
    // or a third-party voice-to-text service here.
    if (!isListening) {
      console.log('Starting voice recognition...');
      // Example: recognition.start();
    } else {
      console.log('Stopping voice recognition...');
      // Example: recognition.stop();
    }
    // For demonstration, simulate a voice input after a delay
    setTimeout(() => {
      const voiceText = "This is a simulated voice input.";
      const userMessage = { type: 'user' as const, text: voiceText };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      // Simulate AI voice response
      setTimeout(() => {
        const aiResponseText = `AI heard: "${voiceText}" and responds with voice.`;
        const aiResponse = { type: 'ai' as const, text: aiResponseText };
        setMessages((prevMessages) => [...prevMessages, aiResponse]);
        // Trigger text-to-speech for aiResponseText here.
        console.log('AI responding with voice:', aiResponseText);
      }, 1000);
    }, 2000);
  };

  const handleExportReport = () => {
    alert('Exporting report functionality would be implemented here.');
    // In a real application, format and download the chat history or a summary.
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>AI Chat / Ask the Engineer</h1>
      <div className={styles.chatWindow}>
        <div ref={chatHistoryRef} className={styles.chatHistory}>
          {messages.map((msg, index) => (
            <div key={index} className={`${styles.message} ${styles[msg.type]}`}>
              {msg.text}
            </div>
          ))}
        </div>
        <div className={styles.chatInputArea}>
          <input
            type="text"
            className={styles.chatInput}
            placeholder="Type your message or ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <button onClick={handleSendMessage} className={styles.sendButton}>Send</button>
          <button
            onClick={handleVoiceInput}
            className={`${styles.voiceButton} ${isListening ? styles.listening : ''}`}
          >
            {isListening ? 'Stop Listening' : 'Voice Input'}
          </button>
        </div>
      </div>
      <div className={styles.actions}>
        <button onClick={handleExportReport} className={styles.actionButton}>Export Conversation</button>
        {/* Placeholder for history of previous conversations */}
        <div className={styles.historyPlaceholder}>
          <h3>Previous Conversations</h3>
          <ul>
            <li>Conversation 1 (Date)</li>
            <li>Conversation 2 (Date)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
