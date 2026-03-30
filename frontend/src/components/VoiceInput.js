import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Microphone, Stop } from '@phosphor-icons/react';
import { toast } from 'sonner';

// Speech Recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceInput = ({ onResult, onListeningChange, className = '' }) => {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (onResult) {
          onResult(transcript);
        }
        toast.success(`Heard: "${transcript}"`, { duration: 2000 });
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (onListeningChange) onListeningChange(false);
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable it in your browser settings.');
        } else if (event.error === 'no-speech') {
          toast.info('No speech detected. Please try again.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (onListeningChange) onListeningChange(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onResult, onListeningChange]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (onListeningChange) onListeningChange(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        if (onListeningChange) onListeningChange(true);
        toast.info('Listening... Speak now', { duration: 2000 });
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  }, [isListening, onListeningChange]);

  if (!speechSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`p-2.5 rounded-md transition-all ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse' 
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      } ${className}`}
      title={isListening ? 'Stop listening' : 'Voice input'}
      data-testid="voice-input-button"
    >
      {isListening ? (
        <Stop size={20} weight="bold" />
      ) : (
        <Microphone size={20} weight="bold" />
      )}
    </button>
  );
};

export default VoiceInput;
