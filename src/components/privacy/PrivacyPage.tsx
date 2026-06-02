import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, Server, CloudOff, Key, Cookie, BarChart, Upload, Lock, X, Check, Cpu, Image } from 'lucide-react';
import { Button } from '@/components/common/ui';

interface PrivacyPageProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyPage({ open, onClose }: PrivacyPageProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md sm:max-w-lg lg:max-w-2xl bg-background border-l border-border z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" /> Privacy & Security
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 sm:p-6 space-y-8 max-w-xl">
              {/* Hero statement */}
              <div className="text-center py-6">
                <div className="text-4xl sm:text-5xl mb-4">🛡️</div>
                <h3 className="text-xl font-bold mb-2">Your Conversations Stay on Your Device</h3>
                <p className="text-muted-foreground">
                  Nothing is sent to any server. PrivateGPT Zero runs entirely in your browser.
                </p>
              </div>

              {/* How it works */}
              <section>
                <h4 className="font-semibold mb-3">How Local AI Works</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Unlike cloud AI services, PrivateGPT Zero performs AI inference directly on your device.
                  This improves privacy and allows unlimited concurrent users because compute resources
                  come from each user's hardware rather than a central server.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: <Cpu className="h-4 w-4 text-green-400" />, text: 'Model runs locally', desc: 'All inference on your device' },
                    { icon: <Check className="h-4 w-4 text-green-400" />, text: 'Internet for download only', desc: 'Only needed for initial model load' },
                    { icon: <Lock className="h-4 w-4 text-green-400" />, text: 'No account needed', desc: 'Just open and chat' },
                    { icon: <CloudOff className="h-4 w-4 text-green-400" />, text: 'No cloud dependency', desc: 'Works offline after download' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      {item.icon}
                      <div>
                        <div className="text-sm font-medium">{item.text}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Vision models */}
              <section>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4" /> Vision Models
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  PrivateGPT Zero supports multimodal vision models (marked with 🔍) that can analyze images
                  you upload. Even image analysis is performed entirely in your browser — no images are sent to any server.
                </p>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                  <strong>How it works:</strong> When you upload an image with a vision model loaded, the image
                  is converted to a format the model can understand and processed locally. Your images never
                  leave your device.
                </div>
              </section>

              {/* What we DON'T do */}
              <section>
                <h4 className="font-semibold mb-3">What We Never Do</h4>
                <div className="space-y-2">
                  {[
                    { icon: <Server className="h-4 w-4" />, title: 'No server-side inference', desc: 'AI processing never happens on a remote server' },
                    { icon: <BarChart className="h-4 w-4" />, title: 'No analytics or telemetry', desc: 'We don\'t track how you use the app' },
                    { icon: <Cookie className="h-4 w-4" />, title: 'No tracking cookies', desc: 'No cookies beyond what\'s needed for the app to function' },
                    { icon: <Upload className="h-4 w-4" />, title: 'No conversation uploads', desc: 'Your chats are never sent anywhere' },
                    { icon: <Key className="h-4 w-4" />, title: 'No authentication required', desc: 'No accounts, no passwords, no sign-ups' },
                    { icon: <Eye className="h-4 w-4" />, title: 'No data collection', desc: 'Zero data collection, period' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                      <div className="text-red-400 mt-0.5">{item.icon}</div>
                      <div>
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Data storage */}
              <section>
                <h4 className="font-semibold mb-3">Data Storage</h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <p className="text-sm">Conversations are stored locally using <strong>IndexedDB</strong> in your browser</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <p className="text-sm">Model files are cached by the browser for offline use</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <p className="text-sm">You can export and import conversations as JSON, Markdown, or plain text</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <p className="text-sm">Uploaded images for vision models are processed locally and never transmitted</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠</span>
                    <p className="text-sm">Clearing browser data will delete all conversations</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠</span>
                    <p className="text-sm">Private/Incognito mode data is lost when the session ends</p>
                  </div>
                </div>
              </section>

              {/* Scaling */}
              <section>
                <h4 className="font-semibold mb-3">Multi-User & Scaling</h4>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm">
                    PrivateGPT Zero is designed for stateless, static hosting. Each user's model execution,
                    conversations, and storage remain isolated within their own browser. The system scales
                    naturally because inference is performed on each user's device rather than a central server.
                    No shared server-side state exists between users.
                  </p>
                </div>
              </section>

              {/* Open source notice */}
              <section>
                <h4 className="font-semibold mb-3">Open Source</h4>
                <p className="text-sm text-muted-foreground">
                  This application uses open-source models running via WebLLM/MLC AI. The model execution
                  is verifiable — you can inspect the code running in your browser to confirm no data
                  is being transmitted. All model weights are downloaded from public CDN endpoints and
                  cached locally.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}