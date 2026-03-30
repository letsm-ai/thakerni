import React, { useState, useEffect, useRef, useCallback } from 'react';
import { whatsappApi } from '../lib/api';
import { WhatsappLogo, QrCode, CheckCircle, XCircle, ArrowClockwise, Power, WifiHigh } from '@phosphor-icons/react';
import QRCode from 'react-qr-code';

const WhatsApp = () => {
  const [status, setStatus] = useState({ connected: false, initializing: false });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, qrRes] = await Promise.all([
        whatsappApi.getStatus(),
        whatsappApi.getQR()
      ]);
      setStatus(statusRes.data);
      if (!statusRes.data.connected && qrRes.data.qr) {
        setQrCode(qrRes.data.qr);
      } else if (statusRes.data.connected) {
        setQrCode(null);
      }
      setError(null);
    } catch (err) {
      setError('Failed to connect to WhatsApp service');
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStatus();
      setLoading(false);
    };
    init();
  }, [fetchStatus]);

  // Auto-poll every 3s when not connected
  useEffect(() => {
    if (!status.connected) {
      pollRef.current = setInterval(fetchStatus, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status.connected, fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setQrCode(null);
    try {
      const res = await whatsappApi.connect();
      if (res.data.qr) {
        setQrCode(res.data.qr);
      }
      await fetchStatus();
    } catch (err) {
      setError('Failed to initiate WhatsApp connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await whatsappApi.disconnect();
      setStatus({ connected: false, initializing: false });
      setQrCode(null);
    } catch (err) {
      setError('Failed to disconnect');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto" data-testid="whatsapp-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">WhatsApp Integration</h1>
        <p className="text-slate-500 mt-1">Connect your WhatsApp to receive AI assistance</p>
      </div>

      {/* Status Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              status.connected ? 'bg-green-100' : 'bg-slate-100'
            }`}>
              <WhatsappLogo size={24} className={status.connected ? 'text-green-600' : 'text-slate-400'} weight="fill" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Connection Status</h2>
              <div className="flex items-center gap-2 mt-1">
                {status.connected ? (
                  <>
                    <CheckCircle size={16} className="text-green-500" weight="fill" />
                    <span className="text-sm text-green-600" data-testid="whatsapp-connected">Connected</span>
                    {status.user?.name && (
                      <span className="text-xs text-slate-400 ml-1">({status.user.name})</span>
                    )}
                  </>
                ) : status.initializing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-600" data-testid="whatsapp-initializing">Initializing...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="text-slate-400" weight="fill" />
                    <span className="text-sm text-slate-500" data-testid="whatsapp-disconnected">Not connected</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
            data-testid="refresh-status-button"
          >
            <ArrowClockwise size={20} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* QR Code Section */}
      {!status.connected && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode size={32} className="text-slate-400" />
            </div>

            <h2 className="text-lg font-semibold text-slate-900 font-heading mb-2">
              Connect WhatsApp
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Scan the QR code with WhatsApp to connect your account
            </p>

            {loading ? (
              <div className="py-8">
                <div className="w-8 h-8 border-2 border-[#002FA7] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-500 text-sm mt-4">Loading...</p>
              </div>
            ) : error ? (
              <div className="py-8 bg-red-50 rounded-lg border border-red-100">
                <p className="text-red-600 text-sm">{error}</p>
                <button
                  onClick={handleConnect}
                  className="mt-4 text-[#002FA7] font-semibold text-sm hover:underline"
                  data-testid="whatsapp-retry-button"
                >
                  Try again
                </button>
              </div>
            ) : qrCode ? (
              <div data-testid="whatsapp-qr-code">
                <div className="flex justify-center p-4 bg-white rounded-lg border border-slate-200">
                  <QRCode value={qrCode} size={220} />
                </div>
                <p className="text-slate-400 text-xs mt-3">QR code refreshes automatically. Scan within 60 seconds.</p>
              </div>
            ) : (
              <div className="py-8 bg-slate-50 rounded-lg border border-slate-200">
                <WifiHigh size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm mb-4">
                  No QR code available. Click the button below to generate one.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  data-testid="whatsapp-connect-button"
                >
                  {connecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating QR...
                    </>
                  ) : (
                    <>
                      <Power size={18} />
                      Generate QR Code
                    </>
                  )}
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="mt-6 text-left bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 text-sm mb-2">How to connect:</h3>
                <ol className="text-sm text-slate-600 space-y-2">
                  <li>1. Click "Generate QR Code" if no code is shown</li>
                  <li>2. Open WhatsApp on your phone</li>
                  <li>3. Go to Settings &rarr; Linked Devices</li>
                  <li>4. Tap "Link a Device"</li>
                  <li>5. Scan this QR code</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connected State */}
      {status.connected && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" weight="fill" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 font-heading mb-2">
              WhatsApp Connected
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              You can now receive AI assistance via WhatsApp messages
            </p>

            <div className="bg-slate-50 rounded-lg p-4 text-left mb-6">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Available commands:</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li><code className="bg-slate-200 px-1 rounded">create task: [description]</code></li>
                <li><code className="bg-slate-200 px-1 rounded">list tasks</code></li>
                <li><code className="bg-slate-200 px-1 rounded">complete task [number]</code></li>
                <li><code className="bg-slate-200 px-1 rounded">remind me [description]</code></li>
                <li><code className="bg-slate-200 px-1 rounded">help</code></li>
              </ul>
            </div>

            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors text-sm"
              data-testid="whatsapp-disconnect-button"
            >
              <Power size={16} />
              Disconnect WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsApp;
