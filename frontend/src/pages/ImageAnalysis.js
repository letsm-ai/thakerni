import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../lib/api';
import { ImageSquare, Upload, SpinnerGap, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ImageAnalysis = () => {
  const { t, isRTL } = useLanguage();
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error(isRTL ? 'صيغة غير مدعومة. استخدم JPEG, PNG, أو WEBP' : 'Unsupported format. Use JPEG, PNG, or WEBP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isRTL ? 'الصورة كبيرة جداً (أقصى 10MB)' : 'Image too large (max 10MB)');
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const formData = new FormData();
      formData.append('file', image);
      formData.append('prompt', prompt || (isRTL ? 'حلل هذه الصورة بالتفصيل' : 'Describe this image in detail'));
      const res = await api.post('/image/analyze', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAnalysis(res.data.analysis);
      toast.success(isRTL ? 'تم التحليل!' : 'Analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.detail || (isRTL ? 'فشل التحليل' : 'Analysis failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImage(null);
    setPreview(null);
    setAnalysis(null);
    setPrompt('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto" data-testid="image-analysis-page">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">{isRTL ? 'تحليل الصور' : 'Image Analysis'}</h1>
        <p className="text-slate-500 mt-1">{isRTL ? 'ارفع صورة والمساعد الذكي يحللها لك' : 'Upload an image and AI will analyze it for you'}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              preview ? 'border-cyan-300 bg-cyan-50/30' : 'border-slate-200 bg-slate-50 hover:border-cyan-400 hover:bg-cyan-50/20'
            }`}
            data-testid="upload-zone"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="file-input"
            />
            {preview ? (
              <div className="space-y-3">
                <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-xl shadow-sm object-contain" />
                <p className="text-sm text-slate-500">{image?.name}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                  <Upload size={28} className="text-cyan-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">{isRTL ? 'ارفع صورة' : 'Upload an image'}</p>
                  <p className="text-sm text-slate-400 mt-1">JPEG, PNG, WEBP — {isRTL ? 'أقصى 10MB' : 'max 10MB'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              {isRTL ? 'السؤال (اختياري)' : 'Question (optional)'}
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none text-sm"
              placeholder={isRTL ? 'مثال: ايش مكتوب في الصورة؟' : 'e.g., What text is in this image?'}
              dir="auto"
              data-testid="prompt-input"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={!image || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-6 py-3 font-semibold hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
              data-testid="analyze-button"
            >
              {loading ? (
                <><SpinnerGap size={20} className="animate-spin" /> {isRTL ? 'جاري التحليل...' : 'Analyzing...'}</>
              ) : (
                <><MagnifyingGlass size={20} weight="bold" /> {isRTL ? 'حلّل الصورة' : 'Analyze Image'}</>
              )}
            </button>
            {preview && (
              <button
                onClick={handleClear}
                className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                data-testid="clear-button"
              >
                <Trash size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Result Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[300px] flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ImageSquare size={20} className="text-cyan-600" />
            {isRTL ? 'نتيجة التحليل' : 'Analysis Result'}
          </h3>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <SpinnerGap size={36} className="animate-spin text-cyan-500 mx-auto" />
                  <p className="text-sm text-slate-500">{isRTL ? 'يحلل الصورة بالذكاء الاصطناعي...' : 'AI is analyzing the image...'}</p>
                </div>
              </motion.div>
            ) : analysis ? (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-auto">
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap" dir="auto" data-testid="analysis-result">
                  {analysis}
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <ImageSquare size={48} className="text-slate-200 mx-auto" />
                  <p className="text-sm text-slate-400">{isRTL ? 'ارفع صورة وسنحللها لك' : 'Upload an image to get AI analysis'}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ImageAnalysis;
